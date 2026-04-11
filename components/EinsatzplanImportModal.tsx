// =====================================================
// EinsatzplanImportModal — OCR import flow
// Step 1: scan & auto-save immediately
// Step 2: review/correct name, address, tons
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

type Step = 'idle' | 'loading' | 'review' | 'saving';

interface SavedRow {
  einsatzplanId: string;
  constructionSiteId: string;
  date: string;
  siteName: string;
  siteAddress: string | null;
  tonnenPlan: number | null;
  mischgut: string | null;
  isNew: boolean; // was auto-created
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported?: (firstDate: string) => void;
}

const PROGRESS_MESSAGES_PL = [
  'Analizuję Einsatzplan...',
  'Rozpoznawanie tekstu...',
  'Zapisuję dane...',
];
const PROGRESS_MESSAGES_DE = [
  'Einsatzplan wird analysiert...',
  'Text wird erkannt...',
  'Daten werden gespeichert...',
];

export default function EinsatzplanImportModal({ visible, onClose, onImported }: Props) {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [savedRows, setSavedRows] = useState<SavedRow[]>([]);
  const [firstDate, setFirstDate] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ rowIdx: number; field: 'name' | 'address' | 'tons'; value: string } | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progressMsgs = language === 'de' ? PROGRESS_MESSAGES_DE : PROGRESS_MESSAGES_PL;

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

      // 1. OCR
      const { result: parsed, documentId: docId } = await runEinsatzplanOcr(imageUri, userId);

      // 2. Match or auto-create sites
      const siteMatches: Record<string, string> = {};
      const siteIsNew: Record<string, boolean> = {};

      for (const day of parsed.days) {
        if (siteMatches[day.kostenstelle]) continue;

        const match = await matchSite(day.kostenstelle);
        if (match?.siteId) {
          siteMatches[day.kostenstelle] = match.siteId;
          siteIsNew[day.kostenstelle] = false;
        } else {
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
          if (newSite) {
            siteMatches[day.kostenstelle] = newSite.id;
            siteIsNew[day.kostenstelle] = true;
          }
        }
      }

      // 3. Save einsatzplan rows
      await saveEinsatzplanRows(parsed, docId, userId, siteMatches);

      // 4. Fetch saved rows for review
      const siteIds = Object.values(siteMatches);
      const dates = parsed.days.map(d => d.date).filter(Boolean);

      const { data: epRows } = await supabase
        .from('einsatzplan')
        .select('id, date, construction_site_id, mischgut, tonnen_plan, construction_sites(name, address)')
        .in('construction_site_id', siteIds)
        .in('date', dates);

      const rows: SavedRow[] = (epRows ?? []).map((r: any) => ({
        einsatzplanId: r.id,
        constructionSiteId: r.construction_site_id,
        date: r.date,
        siteName: Array.isArray(r.construction_sites) ? r.construction_sites[0]?.name : r.construction_sites?.name,
        siteAddress: Array.isArray(r.construction_sites) ? r.construction_sites[0]?.address : r.construction_sites?.address,
        tonnenPlan: r.tonnen_plan,
        mischgut: r.mischgut,
        isNew: siteIsNew[parsed.days.find(d => siteMatches[d.kostenstelle] === r.construction_site_id)?.kostenstelle ?? ''] ?? false,
      }));

      rows.sort((a, b) => a.date.localeCompare(b.date));

      queryClient.invalidateQueries({ queryKey: ['einsatzplan-week'] });
      queryClient.invalidateQueries({ queryKey: ['baustellen-week'] });
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });

      stopProgressMessages();
      setSavedRows(rows);
      setFirstDate(parsed.days[0]?.date ?? null);
      setStep('review');
    } catch (err) {
      stopProgressMessages();
      setStep('idle');
      const msg = err instanceof OcrError ? err.message : t('Nie udalo sie wygenerowac raportu.');
      Alert.alert(t('Blad'), msg, [
        { text: t('Anuluj'), style: 'cancel' },
        { text: t('Sprobuj ponownie'), onPress: handleImport },
      ]);
    }
  }

  function updateRow(idx: number, fields: Partial<SavedRow>) {
    setSavedRows(prev => prev.map((r, i) => i === idx ? { ...r, ...fields } : r));
  }

  async function handleSaveCorrections() {
    setStep('saving');
    try {
      for (const row of savedRows) {
        await Promise.all([
          supabase
            .from('construction_sites')
            .update({ name: row.siteName, address: row.siteAddress })
            .eq('id', row.constructionSiteId),
          supabase
            .from('einsatzplan')
            .update({ tonnen_plan: row.tonnenPlan })
            .eq('id', row.einsatzplanId),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ['einsatzplan-week'] });
      queryClient.invalidateQueries({ queryKey: ['baustellen-week'] });
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
      setStep('idle');
      if (firstDate) onImported?.(firstDate);
      else onClose();
    } catch (err: any) {
      setStep('review');
      Alert.alert(t('Blad'), err?.message ?? t('Nie udalo sie zapisac wpisow'));
    }
  }

  function handleSkipCorrections() {
    setStep('idle');
    setSavedRows([]);
    if (firstDate) onImported?.(firstDate);
    else onClose();
  }

  function handleCancel() {
    stopProgressMessages();
    setStep('idle');
    setSavedRows([]);
    setFirstDate(null);
    setEditingField(null);
    onClose();
  }

  function commitEdit() {
    if (!editingField) return;
    const { rowIdx, field, value } = editingField;
    if (field === 'name') updateRow(rowIdx, { siteName: value });
    else if (field === 'address') updateRow(rowIdx, { siteAddress: value || null });
    else if (field === 'tons') {
      const v = parseFloat(value.replace(',', '.'));
      updateRow(rowIdx, { tonnenPlan: isNaN(v) ? null : v });
    }
    setEditingField(null);
  }

  function renderEditableField(rowIdx: number, field: 'name' | 'address' | 'tons', displayValue: string, placeholder?: string) {
    const isEditing = editingField?.rowIdx === rowIdx && editingField?.field === field;
    if (isEditing) {
      return (
        <TextInput
          style={styles.fieldInput}
          value={editingField!.value}
          onChangeText={v => setEditingField({ rowIdx, field, value: v })}
          keyboardType={field === 'tons' ? 'decimal-pad' : 'default'}
          onBlur={commitEdit}
          autoFocus
          placeholder={placeholder}
        />
      );
    }
    return (
      <TouchableOpacity onPress={() => setEditingField({ rowIdx, field, value: displayValue })}>
        <Text style={[styles.fieldValue, styles.editable]}>
          {displayValue || <Text style={styles.fieldPlaceholder}>{placeholder ?? '—'}</Text>}
        </Text>
      </TouchableOpacity>
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
            {step === 'review'
              ? (language === 'de' ? 'Importiert — Korrekturen' : 'Zaimportowano — Korekty')
              : t('Importuj plan')}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Loading */}
        {(step === 'loading' || step === 'saving') && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <Text style={styles.loadingMsg}>{progressMsg || t('Ladowanie danych...')}</Text>
          </View>
        )}

        {/* Idle */}
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

        {/* Review / corrections */}
        {step === 'review' && (
          <>
            <View style={styles.reviewBanner}>
              <Text style={styles.reviewBannerText}>
                ✅  {language === 'de'
                  ? `${savedRows.length} Einträge importiert. Korrekturen möglich:`
                  : `${savedRows.length} wpisów zapisanych. Możesz poprawić:`}
              </Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {savedRows.map((row, idx) => (
                <View key={row.einsatzplanId} style={[styles.dayCard, row.isNew && styles.dayCardNew]}>
                  {row.isNew && (
                    <Text style={styles.newBadge}>
                      {language === 'de' ? '✦ Neue Baustelle' : '✦ Nowa budowa'}
                    </Text>
                  )}

                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{t('Data')}</Text>
                    <Text style={styles.fieldValue}>{row.date}</Text>
                  </View>

                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{language === 'de' ? 'Baustelle' : 'Budowa'}</Text>
                    {renderEditableField(idx, 'name', row.siteName, 'Nazwa budowy')}
                  </View>

                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{t('Adres')}</Text>
                    {renderEditableField(idx, 'address', row.siteAddress ?? '', 'Adres')}
                  </View>

                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{t('Plan')} (t)</Text>
                    {renderEditableField(idx, 'tons', row.tonnenPlan !== null ? String(row.tonnenPlan) : '', 'np. 350')}
                  </View>

                  {row.mischgut ? (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{t('Klasa asfaltu')}</Text>
                      <Text style={styles.fieldValue}>{row.mischgut}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.bottomBar}>
              <View style={styles.bottomBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleSkipCorrections}>
                  <Text style={styles.cancelBtnText}>{language === 'de' ? 'Überspringen' : 'Pomiń'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCorrections}>
                  <Text style={styles.confirmBtnText}>{language === 'de' ? 'Korrekturen speichern' : 'Zapisz korekty'}</Text>
                </TouchableOpacity>
              </View>
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

  reviewBanner: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  reviewBannerText: { fontSize: 13, fontFamily: FontFamily.bold, color: '#2d9a5c' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: 12 },

  dayCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orange,
    gap: 10,
    ...Shadows.sm,
  },
  dayCardNew: { borderLeftColor: '#2d9a5c' },
  newBadge: { fontSize: 11, fontFamily: FontFamily.bold, color: '#2d9a5c', marginBottom: 2 },

  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  fieldLabel: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.grayMid, flex: 1 },
  fieldValue: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black, flex: 2, textAlign: 'right' },
  fieldPlaceholder: { color: Colors.grayMid, fontFamily: FontFamily.medium },
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
  confirmBtnText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#fff' },
});
