// =====================================================
// EinsatzplanView — Plan vs Real weekly cards
// =====================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEinsatzplan } from '../../hooks/useEinsatzplan';
import { calcDiff, formatTonnen, parseRealInput } from '../../utils/einsatzplanDiff';
import { Colors, Spacing, FontFamily, Radius, Shadows } from '../../theme';
import { useI18n } from '../../i18n/I18nProvider';
import { supabase } from '../../services/supabase';

interface Props {
  weekStart: Date;
  selectedKey: string; // 'YYYY-MM-DD'
}

export default function EinsatzplanView({ weekStart, selectedKey }: Props) {
  const { t } = useI18n();
  const { data, isLoading, isError, updateTonnenReal } = useEinsatzplan(weekStart);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const dayData = data.filter((e) => e.date === selectedKey);

  async function handleSave(id: string, tonnen_plan: number | null) {
    const parsed = parseRealInput(editValue);
    if (parsed === null) {
      Alert.alert(t('Blad'), t('Nieprawidlowe godziny'));
      return;
    }
    setSavingId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateTonnenReal(id, parsed, user?.id ?? '');
      setEditingId(null);
      setEditValue('');
    } catch {
      Alert.alert(t('Blad'), t('Nie udalo sie zapisac wpisow'));
    } finally {
      setSavingId(null);
    }
  }

  function startEdit(id: string, current: number | null) {
    setEditingId(id);
    setEditValue(current !== null ? String(current).replace('.', ',') : '');
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.orange} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('Nieznany blad')}</Text>
      </View>
    );
  }

  if (dayData.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{t('Brak planu na ten dzien')}</Text>
        <Text style={styles.emptySubtext}>{t('Importuj Einsatzplan aby zobaczyc plan')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {dayData.map((entry) => {
        const diff = calcDiff(entry.tonnen_plan, entry.tonnen_real);
        const isEditing = editingId === entry.id;
        const isSaving = savingId === entry.id;
        const siteName = entry.construction_sites?.name ?? '—';
        const siteAddr = entry.construction_sites?.address ?? null;

        return (
          <View key={entry.id} style={styles.card}>
            {/* Site name + mischgut */}
            <View style={styles.cardHeader}>
              <Text style={styles.siteName}>{siteName}</Text>
              {entry.mischgut ? (
                <View style={styles.mischgutTag}>
                  <Text style={styles.mischgutText}>{entry.mischgut}</Text>
                </View>
              ) : null}
            </View>
            {siteAddr ? <Text style={styles.siteAddr}>{siteAddr}</Text> : null}

            {/* Plan / Real / Diff row */}
            <View style={styles.dataRow}>
              {/* Plan */}
              <View style={styles.dataCell}>
                <Text style={styles.dataLabel}>{t('Plan')}</Text>
                <Text style={styles.dataValue}>{formatTonnen(entry.tonnen_plan)}</Text>
              </View>

              {/* Real — editable */}
              <View style={styles.dataCell}>
                <Text style={styles.dataLabel}>{t('Real')}</Text>
                {isEditing ? (
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="decimal-pad"
                      autoFocus
                      placeholder="0,0"
                      placeholderTextColor={Colors.grayMid}
                      onSubmitEditing={() => handleSave(entry.id, entry.tonnen_plan)}
                    />
                    <Text style={styles.inputUnit}>t</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => startEdit(entry.id, entry.tonnen_real)}>
                    <Text style={[styles.dataValue, styles.editableValue]}>
                      {formatTonnen(entry.tonnen_real)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Diff */}
              <View style={styles.dataCell}>
                <Text style={styles.dataLabel}>{t('Roznica')}</Text>
                {diff ? (
                  <Text style={[styles.dataValue, { color: diff.color }]}>{diff.label}</Text>
                ) : (
                  <Text style={[styles.dataValue, { color: Colors.grayMid }]}>—</Text>
                )}
              </View>
            </View>

            {/* Save/Cancel buttons when editing */}
            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setEditingId(null); setEditValue(''); }}
                >
                  <Text style={styles.cancelBtnText}>{t('Anuluj')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => handleSave(entry.id, entry.tonnen_plan)}
                  disabled={isSaving}
                >
                  {isSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveBtnText}>{t('Zapisz')}</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingBottom: 100 },
  center: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  emptySubtext: { fontSize: 12, fontFamily: FontFamily.medium, color: Colors.grayMid, marginTop: 6 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orange,
    ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  siteName: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.black, flexShrink: 1 },
  siteAddr: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.grayMid, marginBottom: 12 },
  mischgutTag: { backgroundColor: Colors.orangePale, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  mischgutText: { fontSize: 11, fontFamily: FontFamily.semiBold, color: Colors.orange },

  dataRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dataCell: { flex: 1, alignItems: 'center', gap: 4 },
  dataLabel: { fontSize: 9, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.5 },
  dataValue: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.black },
  editableValue: { color: Colors.orange, textDecorationLine: 'underline' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.orange,
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.black,
    minWidth: 50,
    textAlign: 'center',
    paddingVertical: 2,
  },
  inputUnit: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.grayMid },

  editActions: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.cream },
  cancelBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.grayMid },
  saveBtn: { paddingVertical: 7, paddingHorizontal: 20, borderRadius: 20, backgroundColor: Colors.orange },
  saveBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: '#fff' },
});
