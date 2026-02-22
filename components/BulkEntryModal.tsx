// ============================================================
// TimeTracker — Component: BulkEntryModal
// Plik: src/components/BulkEntryModal.tsx
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Checkbox, PrimaryButton, OutlineButton } from './ui';
import { Colors, Spacing, FontFamily, FontSize, Radius } from '../theme';
import { useWorkers } from '../hooks/useWorkers';
import { useCreateBulkTimeEntries } from '../hooks/useTimeEntries';
import { useI18n } from '../i18n/I18nProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: (count: number) => void;
}

const STATUS_KEYS = ['Praca', 'Chorobowe', 'Urlop', 'FZA'];

interface WorkerRow {
  id: string;
  firstName: string;
  lastName: string;
  checked: boolean;
  hours: string;
  status: string;
}

export function BulkEntryModal({ visible, onClose, onSaved }: Props) {
  const { workers } = useWorkers();
  const createBulkEntries = useCreateBulkTimeEntries();
  const { t, language } = useI18n();

  const [defaultStartTime, setDefaultStartTime] = useState(new Date(new Date().setHours(8, 0, 0, 0)));
  const [defaultEndTime, setDefaultEndTime] = useState(new Date(new Date().setHours(16, 0, 0, 0)));
  const [defaultStatus, setDefaultStatus] = useState('Praca');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Calculate default hours from time range
  const defaultHours = defaultStatus === 'Praca' ? Math.max(0, (defaultEndTime.getTime() - defaultStartTime.getTime()) / 3600000) : 0;
  
  const [rows, setRows] = useState<WorkerRow[]>(() =>
    workers.map(w => ({ id: w.id, firstName: w.firstName, lastName: w.lastName, checked: true, hours: defaultHours.toFixed(2), status: 'Praca' }))
  );

  // Sync rows when workers change
  React.useEffect(() => {
    if (workers.length === 0) return;
    setRows(workers.map(w => ({
      id: w.id, firstName: w.firstName, lastName: w.lastName,
      checked: true, hours: defaultHours.toFixed(2), status: defaultStatus,
    })));
  }, [workers]); // workers is memoized in useWorkers — safe as dep

  const applyToAll = useCallback(() => {
    setRows(prev => prev.map(r => r.checked ? { ...r, hours: defaultHours.toFixed(2), status: defaultStatus } : r));
  }, [defaultHours, defaultStatus]);

  const toggleAll = (checked: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, checked })));
  };

  const updateRow = (id: string, patch: Partial<WorkerRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const selectedCount = rows.filter(r => r.checked).length;

  const formatDate = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const formatTime = (d: Date) =>
    d.toLocaleTimeString(language === 'de' ? 'de-DE' : 'pl-PL', { hour: '2-digit', minute: '2-digit' });

  const STATUS_DB: Record<string, string> = { 'Praca': 'work', 'Chorobowe': 'sick', 'Urlop': 'vacation', 'FZA': 'fza' };

  async function handleSave() {
    const entries = rows
      .filter(r => r.checked)
      .map(r => {
        // Calculate hours based on status - only for "Praca"
        const statusVal = STATUS_DB[r.status] ?? 'work';
        const hoursVal = statusVal === 'work' ? parseFloat(r.hours) || 0 : 0;
        return {
          employee_id: r.id,
          date: format(date, 'yyyy-MM-dd'),
          hours: hoursVal,
          status: statusVal as any,
          notes: null,
        };
      });
    await createBulkEntries.mutateAsync(entries);
    onSaved?.(entries.length);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          {/* ─── Colored header ────────────────────────── */}
          <View style={styles.colorHeader}>
            <View style={styles.handle} />
            <Text style={styles.headerTitle}>{t('Zbiorcze wprowadzanie godzin')}</Text>
            <Text style={styles.headerDate}>{t('Data')}: {formatDate(date)}</Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* ─── Default settings ──────────────────── */}
            <Text style={styles.sectionTitle}>{t('Ustawienia domyslne')}</Text>
            
            <View style={styles.defaultsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('Domyslny status')}</Text>
                <View style={styles.defaultStatusGroup}>
                  {STATUS_KEYS.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.defaultStatusChip, defaultStatus === s && styles.defaultStatusChipSelected]}
                      onPress={() => setDefaultStatus(s)}
                    >
                      {defaultStatus === s && <Text style={styles.checkMark}>✓ </Text>}
                      <Text style={[styles.defaultStatusText, defaultStatus === s && styles.defaultStatusTextSelected]}>{t(s)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ─── Godziny pracy (tylko dla Praca) */}
            {defaultStatus === 'Praca' && (
              <View style={styles.defaultsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('Godziny pracy')} *</Text>
                  <View style={styles.timeRow}>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                      <Text style={styles.timeBtnIcon}>🕐</Text>
                      <Text style={styles.timeBtnText}>{formatTime(defaultStartTime)}</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSep}>→</Text>
                    <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                      <Text style={styles.timeBtnIcon}>🕐</Text>
                      <Text style={styles.timeBtnText}>{formatTime(defaultEndTime)}</Text>
                    </TouchableOpacity>
                    <Text style={styles.totalHours}>{defaultHours.toFixed(1)}h</Text>
                  </View>
                  {showStartPicker && (
                    <DateTimePicker value={defaultStartTime} mode="time" is24Hour
                      onChange={(_, d) => { setShowStartPicker(false); if (d) setDefaultStartTime(d); }} />
                  )}
                  {showEndPicker && (
                    <DateTimePicker value={defaultEndTime} mode="time" is24Hour
                      onChange={(_, d) => { setShowEndPicker(false); if (d) setDefaultEndTime(d); }} />
                  )}
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.applyBtn} onPress={applyToAll}>
              <Text style={styles.applyBtnText}>↓ {t('Zastosuj do wszystkich')}</Text>
            </TouchableOpacity>

            {/* ─── Date ──────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('Data')}</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text>📅 </Text>
                <Text style={styles.dateBtnText}>{formatDate(date)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker value={date} mode="date"
                  onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
              )}
            </View>

            {/* ─── Workers table ─────────────────────── */}
            <View style={styles.section}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableSection}>{t('Pracownicy')}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => toggleAll(true)}>
                    <Text style={styles.selectAll}>{t('Zaznacz wszystkich')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleAll(false)}>
                    <Text style={styles.deselectAll}>{t('Odznacz wszystkich')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.countLabel}>{t('Wybrano')}: {selectedCount} {t('z')} {rows.length} {t('pracownikow')}</Text>

              {/* Table head */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, { width: 40 }]}>{t('Wybor')}</Text>
                <Text style={[styles.th, { flex: 1 }]}>{t('Pracownik')}</Text>
                {defaultStatus === 'Praca' && <Text style={[styles.th, { width: 70 }]}>{t('Godz.')}</Text>}
                <Text style={[styles.th, { width: 90 }]}>{t('Status')}</Text>
              </View>

              {rows.map(row => (
                <View key={row.id} style={styles.tableRow}>
                  {/* Checkbox */}
                  <View style={{ width: 40, alignItems: 'center' }}>
                    <Checkbox checked={row.checked} onToggle={() => updateRow(row.id, { checked: !row.checked })} />
                  </View>
                  {/* Name */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{row.firstName}</Text>
                    <Text style={styles.rowRole}>{row.lastName}</Text>
                  </View>
                  {/* Hours input - tylko dla Praca */}
                  {defaultStatus === 'Praca' && (
                    <View style={{ width: 70 }}>
                      <TextInput
                        style={styles.hoursInput}
                        value={row.hours}
                        onChangeText={v => updateRow(row.id, { hours: v })}
                        keyboardType="numeric"
                        maxLength={4}
                        editable={row.checked && row.status === 'Praca'}
                      />
                    </View>
                  )}
                  {/* Status mini-chips */}
                  <View style={{ width: 90 }}>
                    {STATUS_KEYS.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.miniChip, row.status === s && styles.miniChipSelected]}
                        onPress={() => row.checked && updateRow(row.id, { status: s })}
                      >
                        <Text style={[styles.miniChipText, row.status === s && styles.miniChipTextSelected]}>
                          {row.status === s ? '✓ ' : ''}{t(s).slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: Spacing.xxxl }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <OutlineButton label={t('Anuluj')} onPress={onClose} style={{ flex: 1, minHeight: 52 }} />
            <PrimaryButton
              label={`✓ ${t('Zapisz')} (${selectedCount})`}
              onPress={handleSave}
              disabled={selectedCount === 0}
              style={{ flex: 1, minHeight: 52 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  colorHeader: {
    backgroundColor: Colors.orange,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: FontSize.h3, fontFamily: FontFamily.bold, color: '#fff' },
  headerDate: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  body: { paddingHorizontal: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.black, marginTop: Spacing.xl, marginBottom: Spacing.md },
  section: { marginTop: Spacing.xl },
  label: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  defaultsRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    gap: 6,
  },
  timeBtnIcon: { fontSize: 18 },
  timeBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, color: Colors.orange },
  timeSep: { fontSize: 18, color: Colors.grayMid, fontFamily: FontFamily.bold },
  totalHours: { fontSize: FontSize.xl, fontFamily: 'DMMono_700Bold', color: Colors.orange, minWidth: 44, textAlign: 'right' },
  defaultHoursInput: {
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    fontFamily: 'DMMono_700Bold', fontSize: 22,
    paddingVertical: 10, textAlign: 'center',
    color: Colors.black,
  },
  defaultStatusGroup: { gap: 5 },
  defaultStatusChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: 12,
    backgroundColor: Colors.cream,
    borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.creamDark,
  },
  defaultStatusChipSelected: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  checkMark: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 13 },
  defaultStatusText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.grayDark },
  defaultStatusTextSelected: { color: '#fff' },
  applyBtn: {
    marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 9, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: Colors.orange,
    borderRadius: Radius.pill,
  },
  applyBtnText: { color: Colors.orange, fontFamily: FontFamily.semiBold, fontSize: FontSize.base },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    alignSelf: 'flex-start',
  },
  dateBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, color: Colors.orange },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  tableSection: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.black },
  selectAll: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.orange },
  deselectAll: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  countLabel: { fontSize: FontSize.sm, color: Colors.grayMid, marginBottom: 8 },
  tableHead: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.creamDark,
    paddingBottom: 6, marginBottom: 4,
  },
  th: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.7 },
  tableRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.creamDark,
    gap: 4,
  },
  rowName: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.black },
  rowRole: { fontSize: FontSize.xs, color: Colors.grayMid, marginTop: 1 },
  hoursInput: {
    backgroundColor: Colors.cream, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    fontFamily: 'DMMono_500Medium', fontSize: FontSize.lg,
    paddingVertical: 8, textAlign: 'center',
    color: Colors.black,
  },
  miniChip: {
    paddingVertical: 3, paddingHorizontal: 6,
    borderRadius: 4, borderWidth: 1.5, borderColor: Colors.creamDark,
    backgroundColor: Colors.cream, marginBottom: 3,
  },
  miniChipSelected: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  miniChipText: { fontSize: 10, fontFamily: FontFamily.semiBold, color: Colors.grayDark },
  miniChipTextSelected: { color: '#fff' },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.creamDark,
    justifyContent: 'center', alignItems: 'center',
  },
});
