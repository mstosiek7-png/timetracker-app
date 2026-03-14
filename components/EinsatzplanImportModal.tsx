// =====================================================
// EinsatzplanImportModal — OCR import flow
// =====================================================
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';
import { runEinsatzplanOcr, matchSite, saveEinsatzplanRows, OcrError } from '../services/ocrService';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, FontFamily, Radius, Shadows } from '../theme';
import { useI18n } from '../i18n/I18nProvider';
import { EinsatzplanOcrDay, EinsatzplanOcrResult } from '../types/models';

type Step = 'idle' | 'loading' | 'preview' | 'saving';

interface DayState extends EinsatzplanOcrDay {
  matchedSiteId: string | null;
  matchedSiteName: string | null;
  matchScore: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported?: (firstDate: string) => void;
}

const PROGRESS_MESSAGES_PL = [
  'Analizuję Einsatzplan...',
  'Rozpoznawanie tekstu...',
  'Przygotowuję podgląd...',
];
const PROGRESS_MESSAGES_DE = [
  'Einsatzplan wird analysiert...',
  'Text wird erkannt...',
  'Vorschau wird vorbereitet...',
];

export default function EinsatzplanImportModal({ visible, onClose, onImported }: Props) {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [ocrResult, setOcrResult] = useState<EinsatzplanOcrResult | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [days, setDays] = useState<DayState[]>([]);
  const [activeSites, setActiveSites] = useState<{ id: string; name: string }[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editField, setEditField] = useState<{ key: keyof EinsatzplanOcrDay; value: string } | null>(null);
  const progressMsgs = language === 'de' ? PROGRESS_MESSAGES_DE : PROGRESS_MESSAGES_PL;
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startProgressMessages() {
    let idx = 0;
    setProgressMsg(progressMsgs[0]);
    progressIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % progressMsgs.length;
      setProgressMsg(progressMsgs[idx]);
    }, 2000);
  }

  function stopProgressMessages() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  async function handleImport() {
    const net = await NetInfo.fetch();
    if (net.isConnected === false) {
      Alert.alert(t('Blad'), t('Ta funkcja wymaga polaczenia z internetem'));
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('Brak uprawnien'), t('Wymagany dostep do galerii.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const imageUri = result.assets[0].uri;
    setStep('loading');
    startProgressMessages();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? '';

      const { result: parsed, documentId: docId } = await runEinsatzplanOcr(imageUri, userId);

      // Load active sites for matching
      const { data: sites } = await supabase
        .from('construction_sites')
        .select('id, name')
        .eq('status', 'active');
      setActiveSites(sites ?? []);

      // Match sites for each day
      const dayStates: DayState[] = await Promise.all(
        parsed.days.map(async (day) => {
          const match = await matchSite(day.kostenstelle);
          return {
            ...day,
            matchedSiteId: match?.siteId ?? null,
            matchedSiteName: match?.siteName ?? null,
            matchScore: match?.score ?? 0,
          };
        }),
      );

      setOcrResult(parsed);
      setDocumentId(docId);
      setDays(dayStates);
      stopProgressMessages();
      setStep('preview');
    } catch (err) {
      stopProgressMessages();
      setStep('idle');
      const msg =
        err instanceof OcrError
          ? err.message
          : t('Nie udalo sie wygenerowac raportu.');
      Alert.alert(t('Blad'), msg, [
        { text: t('Anuluj'), style: 'cancel' },
        { text: t('Sprobuj ponownie'), onPress: handleImport },
      ]);
    }
  }

  async function handleConfirm() {
    if (!ocrResult || !documentId) return;
    setStep('saving');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? '';

      const siteMatches: Record<string, string> = {};

      for (const day of days) {
        if (siteMatches[day.kostenstelle]) continue;

        if (day.matchedSiteId) {
          siteMatches[day.kostenstelle] = day.matchedSiteId;
        } else {
          // No match — auto-create a new construction site from OCR data
          console.log('[Import] Auto-creating site:', day.kostenstelle, day.adresse);
          const { data: newSite, error } = await supabase
            .from('construction_sites')
            .insert({
              name: day.kostenstelle,
              address: day.adresse ?? null,
              status: 'active',
              created_by: userId,
            })
            .select('id')
            .single();

          if (error) throw new Error(`Nie udało się utworzyć budowy "${day.kostenstelle}": ${error.message}`);
          if (newSite) siteMatches[day.kostenstelle] = newSite.id;
        }
      }
      await saveEinsatzplanRows(ocrResult, documentId, userId, siteMatches);
      queryClient.invalidateQueries({ queryKey: ['einsatzplan-week'] });
      queryClient.invalidateQueries({ queryKey: ['baustellen-week'] });
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
      setStep('idle');
      const firstDate = ocrResult.days[0]?.date;
      if (firstDate) onImported?.(firstDate);
      else onClose();
    } catch (err: any) {
      console.error('[Import] handleConfirm error:', err?.message, err);
      setStep('preview');
      Alert.alert(t('Blad'), err?.message ?? t('Nie udalo sie zapisac wpisow'));
    }
  }

  function handleCancel() {
    stopProgressMessages();
    setStep('idle');
    setOcrResult(null);
    setDocumentId(null);
    setDays([]);
    onClose();
  }

  function updateDayField(idx: number, field: keyof EinsatzplanOcrDay, value: string | number | null) {
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    );
  }

  function assignSite(dayIdx: number, siteId: string, siteName: string) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, matchedSiteId: siteId, matchedSiteName: siteName, matchScore: 1.0 }
          : d,
      ),
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === 'preview' && ocrResult
              ? `${t('Podglad importu')} KW${ocrResult.kw}`
              : t('Importuj plan')}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Loading step */}
        {(step === 'loading' || step === 'saving') && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <Text style={styles.loadingMsg}>{progressMsg || t('Ladowanie danych...')}</Text>
          </View>
        )}

        {/* Idle step */}
        {step === 'idle' && (
          <View style={styles.idleState}>
            <Text style={styles.idleIcon}>📋</Text>
            <Text style={styles.idleTitle}>{t('Importuj plan')}</Text>
            <Text style={styles.idleSubtitle}>
              {language === 'de'
                ? 'Wähle ein Foto des Einsatzplans aus der Galerie'
                : 'Wybierz zdjęcie Einsatzplanu z galerii'}
            </Text>
            <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
              <Text style={styles.importBtnText}>📷  {t('Importuj plan')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview step */}
        {step === 'preview' && (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {days.map((day, idx) => {
                const lowConf = day.confidence < 0.8;
                return (
                  <View
                    key={`${day.date}-${idx}`}
                    style={[styles.dayCard, lowConf && styles.dayCardWarning]}
                  >
                    {lowConf && (
                      <Text style={styles.warningBadge}>⚠️  {language === 'de' ? 'Niedrige Erkennungsgenauigkeit' : 'Niska pewność rozpoznania'}</Text>
                    )}

                    {/* Date */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{t('Data')}</Text>
                      <Text style={styles.fieldValue}>{day.date}</Text>
                    </View>

                    {/* Kostenstelle + Adresse */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{t('Kostenstelle')}</Text>
                      <Text style={styles.fieldValue}>{day.kostenstelle}</Text>
                    </View>
                    {day.adresse ? (
                      <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>{t('Adres')}</Text>
                        <Text style={styles.fieldValue}>{day.adresse}</Text>
                      </View>
                    ) : null}

                    {/* Mischgut */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{t('Klasa asfaltu')}</Text>
                      {editingIdx === idx && editField?.key === 'mischgut' ? (
                        <TextInput
                          style={styles.fieldInput}
                          value={editField.value}
                          onChangeText={(v) => setEditField({ key: 'mischgut', value: v })}
                          onBlur={() => {
                            updateDayField(idx, 'mischgut', editField!.value || null);
                            setEditingIdx(null);
                            setEditField(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <TouchableOpacity onPress={() => { setEditingIdx(idx); setEditField({ key: 'mischgut', value: day.mischgut ?? '' }); }}>
                          <Text style={[styles.fieldValue, styles.editable]}>{day.mischgut || '—'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Tonnen Plan */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{t('Plan')} (t)</Text>
                      {editingIdx === idx && editField?.key === 'tonnen_plan' ? (
                        <TextInput
                          style={styles.fieldInput}
                          value={editField.value}
                          onChangeText={(v) => setEditField({ key: 'tonnen_plan', value: v })}
                          keyboardType="decimal-pad"
                          onBlur={() => {
                            const val = parseFloat(editField!.value.replace(',', '.'));
                            updateDayField(idx, 'tonnen_plan', isNaN(val) ? null : val);
                            setEditingIdx(null);
                            setEditField(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <TouchableOpacity onPress={() => { setEditingIdx(idx); setEditField({ key: 'tonnen_plan', value: day.tonnen_plan !== null ? String(day.tonnen_plan) : '' }); }}>
                          <Text style={[styles.fieldValue, styles.editable]}>
                            {day.tonnen_plan !== null ? `${day.tonnen_plan} t` : '—'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Site match */}
                    <View style={styles.matchRow}>
                      {day.matchedSiteId ? (
                        <Text style={day.matchScore < 0.5 ? styles.matchWeak : styles.matchOk}>
                          {day.matchScore < 0.5 ? '⚠️  ' : '✓  '}{day.matchedSiteName}
                          {day.matchScore < 0.5 ? (language === 'de' ? ' (unsicher)' : ' (niepewne)') : ''}
                        </Text>
                      ) : (
                        <Text style={styles.matchNew}>
                          ➕  {language === 'de' ? `Wird neu erstellt: ${day.kostenstelle}` : `Zostanie utworzona: ${day.kostenstelle}`}
                        </Text>
                      )}
                      {activeSites.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.siteChips}>
                          {activeSites.map((site) => (
                            <TouchableOpacity
                              key={site.id}
                              style={[styles.siteChip, day.matchedSiteId === site.id && styles.siteChipActive]}
                              onPress={() => assignSite(idx, site.id, site.name)}
                            >
                              <Text style={[styles.siteChipText, day.matchedSiteId === site.id && styles.siteChipTextActive]}>
                                {site.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Bottom actions */}
            <View style={styles.bottomBar}>
              {(() => {
                const matched = days.filter(d => d.matchedSiteId).length;
                const total = days.length;
                const skipped = total - matched;
                return (
                  <View style={{ flex: 1, gap: 10 }}>
                    {skipped > 0 && (
                      <Text style={styles.importSummary}>
                        {language === 'de'
                          ? `${matched} von ${total} werden importiert · ${skipped} übersprungen`
                          : `${matched} z ${total} zostanie zapisanych · ${skipped} pominięte`}
                      </Text>
                    )}
                    <View style={styles.bottomBtns}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                        <Text style={styles.cancelBtnText}>{t('Anuluj')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleConfirm}
                      >
                        <Text style={styles.confirmBtnText}>{t('Zatwierdz i importuj')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.orange,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 24, fontFamily: FontFamily.bold },
  title: { color: '#fff', fontSize: 17, fontFamily: FontFamily.bold, flex: 1, textAlign: 'center' },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: Spacing.xl },
  loadingMsg: { fontSize: 15, fontFamily: FontFamily.medium, color: Colors.grayMid, textAlign: 'center' },

  idleState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  idleIcon: { fontSize: 56 },
  idleTitle: { fontSize: 20, fontFamily: FontFamily.bold, color: Colors.black },
  idleSubtitle: { fontSize: 14, fontFamily: FontFamily.medium, color: Colors.grayMid, textAlign: 'center' },
  importBtn: {
    marginTop: 8,
    backgroundColor: Colors.orange,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  importBtnText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: 12, paddingBottom: 120 },

  dayCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orange,
    gap: 8,
    ...Shadows.sm,
  },
  dayCardWarning: { borderLeftColor: '#f97316' },
  warningBadge: { fontSize: 12, fontFamily: FontFamily.bold, color: '#f97316', marginBottom: 4 },

  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.grayMid, flex: 1 },
  fieldValue: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black, flex: 2, textAlign: 'right' },
  editable: { color: Colors.orange, textDecorationLine: 'underline' },
  fieldInput: {
    flex: 2,
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.black,
    borderBottomWidth: 2,
    borderBottomColor: Colors.orange,
    textAlign: 'right',
    paddingVertical: 2,
  },

  matchRow: { marginTop: 4 },
  matchOk: { fontSize: 12, fontFamily: FontFamily.bold, color: '#22c55e', marginBottom: 6 },
  matchWeak: { fontSize: 12, fontFamily: FontFamily.bold, color: '#f97316', marginBottom: 6 },
  matchNew: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.orange, marginBottom: 6 },
  matchWarning: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.grayMid, marginBottom: 8 },
  siteChips: { flexGrow: 0 },
  siteChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.orange,
    marginRight: 8,
    backgroundColor: Colors.white,
  },
  siteChipActive: { backgroundColor: Colors.orange },
  siteChipText: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.orange },
  siteChipTextActive: { color: '#fff' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.creamDark,
  },
  importSummary: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.grayMid,
    textAlign: 'center',
  },
  bottomBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cream,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.grayMid },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orange,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: Colors.creamDark },
  confirmBtnText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#fff' },
});
