// ============================================================
// TimeTracker — Component: AddEntryModal / EditEntryModal
// Plik: src/components/AddEntryModal.tsx
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RadioOption, StatusChip, PrimaryButton, OutlineButton } from './ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useWorkers } from '../hooks/useWorkers';
import {
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useTimeEntry,
} from '../hooks/useTimeEntries';

interface Props {
  visible: boolean;
  onClose: () => void;
  entryId?: string;  // jeśli podany → tryb edycji
}

const STATUSES = ['Praca', 'Chorobowe', 'Urlop', 'FZA'];

export function AddEntryModal({ visible, onClose, entryId }: Props) {
  const { workers } = useWorkers();
  const createEntry  = useCreateTimeEntry();
  const updateEntry  = useUpdateTimeEntry();
  const { data: existingEntry } = useTimeEntry(entryId ?? '');

  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(16, 0, 0, 0)));
  const [status, setStatus] = useState('Praca');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Jeśli tryb edycji — załaduj dane wpisu
  useEffect(() => {
    if (entryId && existingEntry) {
      setSelectedWorker(existingEntry.employee_id);
      setDate(new Date(existingEntry.date));
      setStatus(existingEntry.status === 'work' ? 'Praca'
        : existingEntry.status === 'sick' ? 'Chorobowe'
        : existingEntry.status === 'vacation' ? 'Urlop'
        : 'FZA');
    }
  }, [entryId, existingEntry, visible]);

  const totalHours = status === 'Praca' ? Math.max(0, (endTime.getTime() - startTime.getTime()) / 3600000) : 0;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const STATUS_DB: Record<string, string> = { 'Praca': 'work', 'Chorobowe': 'sick', 'Urlop': 'vacation', 'FZA': 'fza' };

  async function handleSave() {
    if (!selectedWorker) return;
    const dbStatus = STATUS_DB[status] ?? 'work';
    if (entryId) {
      await updateEntry.mutateAsync({
        id: entryId,
        employee_id: selectedWorker,
        date: date.toISOString().split('T')[0],
        hours: totalHours,
        status: dbStatus as any,
        notes: null,
      });
    } else {
      await createEntry.mutateAsync({
        employee_id: selectedWorker,
        date: date.toISOString().split('T')[0],
        hours: totalHours,
        status: dbStatus as any,
        notes: null,
      });
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{entryId ? 'Edytuj wpis' : 'Dodaj wpis czasu pracy'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* ─── Worker ──────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>Pracownik *</Text>
              <View style={styles.radioGroup}>
                {workers.map(w => (
                  <RadioOption
                    key={w.id}
                    label={`${w.firstName} (${w.lastName})`}
                    selected={selectedWorker === w.id}
                    onPress={() => setSelectedWorker(w.id)}
                  />
                ))}
              </View>
            </View>

            {/* ─── Date ────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>Data *</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateBtnIcon}>📅</Text>
                <Text style={styles.dateBtnText}>{formatDate(date)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date} mode="date"
                  onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
                />
              )}
            </View>

            {/* ─── Status ──────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>Status *</Text>
              <View style={styles.statusChips}>
                {STATUSES.map(s => (
                  <StatusChip key={s} label={s} selected={status === s} onPress={() => setStatus(s)} />
                ))}
              </View>
            </View>

            {/* ─── Hours (tylko dla Pracy) ───────────────────────────────── */}
            {status === 'Praca' && (
              <View style={styles.section}>
                <Text style={styles.label}>Godziny pracy *</Text>
                <View style={styles.timeRow}>
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.timeBtnIcon}>🕐</Text>
                    <Text style={styles.timeBtnText}>{formatTime(startTime)}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeSep}>→</Text>
                  <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.timeBtnIcon}>🕐</Text>
                    <Text style={styles.timeBtnText}>{formatTime(endTime)}</Text>
                  </TouchableOpacity>
                  <Text style={styles.totalHours}>{totalHours.toFixed(0)}h</Text>
                </View>
                <Text style={styles.timeHint}>Godziny obliczane są automatycznie</Text>
                {showStartPicker && (
                  <DateTimePicker value={startTime} mode="time" is24Hour
                    onChange={(_, d) => { setShowStartPicker(false); if (d) setStartTime(d); }} />
                )}
                {showEndPicker && (
                  <DateTimePicker value={endTime} mode="time" is24Hour
                    onChange={(_, d) => { setShowEndPicker(false); if (d) setEndTime(d); }} />
                )}
              </View>
            )}

            <View style={{ height: Spacing.xxxl }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <OutlineButton label="Anuluj" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton
              label="💾 Zapisz wpis"
              onPress={handleSave}
              disabled={!selectedWorker}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.grayLight,
    alignSelf: 'center', marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.xl, paddingBottom: 0,
  },
  modalTitle: { fontSize: FontSize.xxl, fontFamily: FontFamily.bold, color: Colors.black },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: Colors.grayDark, fontFamily: FontFamily.medium },
  body: { paddingHorizontal: Spacing.xl },
  section: { marginTop: Spacing.xl },
  label: {
    fontSize: FontSize.xs, fontFamily: FontFamily.semiBold,
    color: Colors.grayMid, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  radioGroup: { gap: Spacing.sm },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    alignSelf: 'flex-start',
  },
  dateBtnIcon: { fontSize: 15 },
  dateBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.orange },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
  },
  timeBtnIcon: { fontSize: 14 },
  timeBtnText: { fontSize: FontSize.lg, fontFamily: 'DMMono_500Medium', color: Colors.orange },
  timeSep: { fontSize: 18, color: Colors.grayMid, fontFamily: FontFamily.regular },
  totalHours: { fontSize: FontSize.xxl, fontFamily: 'DMMono_700Bold', color: Colors.orange, minWidth: 44, textAlign: 'right' },
  timeHint: { fontSize: FontSize.xs, color: Colors.grayMid, marginTop: 5 },
  statusChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.creamDark,
  },
});
