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
import { Checkbox, PrimaryButton, OutlineButton } from './ui';
import { Colors, Spacing, FontFamily, FontSize, Radius } from '../theme';
import { useWorkers } from '../hooks/useWorkers';
import { useCreateBulkTimeEntries } from '../hooks/useTimeEntries';

interface Props { visible: boolean; onClose: () => void; }

const STATUSES = ['Praca', 'Chorobowe', 'Urlop', 'FZA'];

interface WorkerRow {
  id: string;
  firstName: string;
  lastName: string;
  checked: boolean;
  hours: string;
  status: string;
}

export function BulkEntryModal({ visible, onClose }: Props) {
  const { workers } = useWorkers();
  const createBulkEntries = useCreateBulkTimeEntries();

  const [defaultHours, setDefaultHours] = useState('8');
  const [defaultStatus, setDefaultStatus] = useState('Praca');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rows, setRows] = useState<WorkerRow[]>(() =>
    workers.map(w => ({ id: w.id, firstName: w.firstName, lastName: w.lastName, checked: true, hours: '8', status: 'Praca' }))
  );

  // Sync rows when workers change
  React.useEffect(() => {
    if (workers.length === 0) return;
    setRows(workers.map(w => ({
      id: w.id, firstName: w.firstName, lastName: w.lastName,
      checked: true, hours: defaultHours, status: defaultStatus,
    })));
  }, [workers]); // workers is memoized in useWorkers — safe as dep

  const applyToAll = useCallback(() => {
    setRows(prev => prev.map(r => r.checked ? { ...r, hours: defaultHours, status: defaultStatus } : r));
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

  const STATUS_DB: Record<string, string> = { 'Praca': 'work', 'Chorobowe': 'sick', 'Urlop': 'vacation', 'FZA': 'fza' };

  async function handleSave() {
    const entries = rows
      .filter(r => r.checked)
      .map(r => ({
        employee_id: r.id,
        date: date.toISOString().split('T')[0],
        hours: parseFloat(r.hours) || 0,
        status: (STATUS_DB[r.status] ?? 'work') as any,
        notes: null,
      }));
    await createBulkEntries.mutateAsync(entries);
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
            <Text style={styles.headerTitle}>Zbiorcze wprowadzanie godzin</Text>
            <Text style={styles.headerDate}>Data: {formatDate(date)}</Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* ─── Default settings ──────────────────── */}
            <Text style={styles.sectionTitle}>Ustawienia domyślne</Text>
            <View style={styles.defaultsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Domyślne godziny</Text>
                <TextInput
                  style={styles.defaultHoursInput}
                  value={defaultHours}
                  onChangeText={setDefaultHours}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Domyślny status</Text>
                <View style={styles.defaultStatusGroup}>
                  {STATUSES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.defaultStatusChip, defaultStatus === s && styles.defaultStatusChipSelected]}
                      onPress={() => setDefaultStatus(s)}
                    >
                      {defaultStatus === s && <Text style={styles.checkMark}>✓ </Text>}
                      <Text style={[styles.defaultStatusText, defaultStatus === s && styles.defaultStatusTextSelected]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={applyToAll}>
              <Text style={styles.applyBtnText}>↓ Zastosuj do wszystkich</Text>
            </TouchableOpacity>

            {/* ─── Date ──────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>Data</Text>
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
                <Text style={styles.tableSection}>Pracownicy</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => toggleAll(true)}>
                    <Text style={styles.selectAll}>Zaznacz wszystkich</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleAll(false)}>
                    <Text style={styles.deselectAll}>Odznacz wszystkich</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.countLabel}>Wybrano: {selectedCount} z {rows.length} pracowników</Text>

              {/* Table head */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, { width: 40 }]}>Wybór</Text>
                <Text style={[styles.th, { flex: 1 }]}>Pracownik</Text>
                <Text style={[styles.th, { width: 70 }]}>Godz.</Text>
                <Text style={[styles.th, { width: 90 }]}>Status</Text>
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
                  {/* Hours input */}
                  <View style={{ width: 70 }}>
                    <TextInput
                      style={styles.hoursInput}
                      value={row.hours}
                      onChangeText={v => updateRow(row.id, { hours: v })}
                      keyboardType="numeric"
                      maxLength={4}
                      editable={row.checked}
                    />
                  </View>
                  {/* Status mini-chips */}
                  <View style={{ width: 90 }}>
                    {STATUSES.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.miniChip, row.status === s && styles.miniChipSelected]}
                        onPress={() => row.checked && updateRow(row.id, { status: s })}
                      >
                        <Text style={[styles.miniChipText, row.status === s && styles.miniChipTextSelected]}>
                          {row.status === s ? '✓ ' : ''}{s.slice(0, 3)}
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
            <OutlineButton label="Anuluj" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton
              label={`✓ Zapisz (${selectedCount})`}
              onPress={handleSave}
              disabled={selectedCount === 0}
              style={{ flex: 2 }}
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
  defaultsRow: { flexDirection: 'row', gap: 12 },
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
  },
});
