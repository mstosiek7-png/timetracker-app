// ============================================================
// TimeTracker — Screen: ReportsScreen
// Plik: src/screens/ReportsScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppHeader, Badge, Checkbox, BottomNav, PrimaryButton } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useReports } from '../hooks/useReports';
import { useWorkers } from '../hooks/useWorkers';

type Props = { navigation: NativeStackNavigationProp<any> };
type RangeMode = 'current' | 'previous' | 'custom';
type ExportFormat = 'xlsx' | 'pdf';

export default function ReportsScreen({ navigation }: Props) {
  const { workers } = useWorkers();
  const { useReportStats, generateReport } = useReports();

  const [rangeMode, setRangeMode] = useState<RangeMode>('current');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo]     = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(workers.map(w => w.id)); // domyślnie wszyscy zaznaczeni
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: stats = { totalHours: 0, entryCount: 0, workerCount: workers.length, byStatus: { praca: 0, chorobowe: 0, urlop: 0, fza: 0 } } } =
    useReportStats({ dateFrom, dateTo, workerIds: selectedWorkers });

  function setRange(mode: RangeMode) {
    setRangeMode(mode);
    const now = new Date();
    if (mode === 'current') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1));
      setDateTo(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (mode === 'previous') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      setDateTo(new Date(now.getFullYear(), now.getMonth(), 0));
    }
  }

  function toggleWorker(id: string) {
    setSelectedWorkers(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  }

  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });

  async function handleGenerate() {
    setLoading(true);
    try {
      // Jeśli selectedWorkers zawiera wszystkich pracowników, wyślij puste (oznacza: wszyscy)
      const workersToFilter = selectedWorkers.length === workers.length ? [] : selectedWorkers;
      await generateReport({ dateFrom, dateTo, workerIds: workersToFilter, format: exportFormat, includeNotes });
      // Success message removed - share dialog will appear automatically
    } catch (error) {
      console.error('Generate report error:', error);
      Alert.alert('Błąd', 'Nie udało się wygenerować raportu: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader title="Raporty i Eksport" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── Date range ────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Zakres dat</Text>
          <View style={styles.dateTabs}>
            {(['current','previous','custom'] as RangeMode[]).map((mode, i) => (
              <TouchableOpacity
                key={mode}
                style={[styles.dateTab, rangeMode === mode && styles.dateTabActive]}
                onPress={() => setRange(mode)}
              >
                <Text style={[styles.dateTabText, rangeMode === mode && styles.dateTabTextActive]}>
                  {['Bieżący miesiąc','Poprzedni miesiąc','Niestandardowy'][i]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dateRangeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>Od:</Text>
              <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowFromPicker(true)}>
                <Text>📅 </Text>
                <Text style={styles.rangeBtnText}>{fmt(dateFrom)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>Do:</Text>
              <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowToPicker(true)}>
                <Text>📅 </Text>
                <Text style={styles.rangeBtnText}>{fmt(dateTo)}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showFromPicker && <DateTimePicker value={dateFrom} mode="date"
            onChange={(_, d) => { setShowFromPicker(false); if (d) { setDateFrom(d); setRangeMode('custom'); }}} />}
          {showToPicker && <DateTimePicker value={dateTo} mode="date"
            onChange={(_, d) => { setShowToPicker(false); if (d) { setDateTo(d); setRangeMode('custom'); }}} />}
        </View>

        {/* ─── Workers filter ────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.filterHeader}>
            <Text style={styles.cardTitle}>Pracownicy</Text>
            <View style={styles.workerActions}>
              <TouchableOpacity onPress={() => setSelectedWorkers(workers.map(w => w.id))}>
                <Text style={styles.filterAction}>Zaznacz wszystkich</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedWorkers([])}>
                <Text style={styles.filterActionGray}>Wyczyść</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.filterHint}>Wszyscy pracownicy (wybierz konkretnych jeśli potrzebujesz)</Text>
          <View style={styles.workerChips}>
            {workers.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[styles.workerFilterChip,
                  (selectedWorkers.length === 0 || selectedWorkers.includes(w.id)) && styles.workerFilterChipActive]}
                onPress={() => toggleWorker(w.id)}
              >
                <Text style={[styles.workerFilterText,
                  (selectedWorkers.length === 0 || selectedWorkers.includes(w.id)) && styles.workerFilterTextActive]}>
                  {w.firstName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Export options ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Opcje eksportu</Text>
          <View style={styles.exportCards}>
            <TouchableOpacity
              style={[styles.exportCard, exportFormat === 'xlsx' && styles.exportCardSelected]}
              onPress={() => setExportFormat('xlsx')}
            >
              <Text style={styles.exportIcon}>📊</Text>
              <Text style={[styles.exportName, exportFormat === 'xlsx' && styles.exportNameSelected]}>Excel (.xlsx)</Text>
              <Text style={[styles.exportHint, exportFormat === 'xlsx' && styles.exportHintSelected]}>Edytowalny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportCard, exportFormat === 'pdf' && styles.exportCardSelected]}
              onPress={() => setExportFormat('pdf')}
            >
              <Text style={styles.exportIcon}>📄</Text>
              <Text style={[styles.exportName, exportFormat === 'pdf' && styles.exportNameSelected]}>PDF (.pdf)</Text>
              <Text style={[styles.exportHint, exportFormat === 'pdf' && styles.exportHintSelected]}>Do druku</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.notesRow} onPress={() => setIncludeNotes(v => !v)}>
            <Checkbox checked={includeNotes} onToggle={() => setIncludeNotes(v => !v)} />
            <Text style={styles.notesLabel}>Uwzględnij notatki</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Status summary ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Podsumowanie statusów</Text>
          {[
            { key: 'praca',     label: 'PRACA',      hours: stats.byStatus.praca },
            { key: 'chorobowe', label: 'CHOROBOWE',  hours: stats.byStatus.chorobowe },
            { key: 'urlop',     label: 'URLOP',       hours: stats.byStatus.urlop },
            { key: 'fza',       label: 'FZA',         hours: stats.byStatus.fza },
          ].map(s => (
            <View key={s.key} style={styles.statusSummaryRow}>
              <Badge label={s.label} variant={s.key as any} />
              <Text style={[styles.statusHours, s.hours === 0 && styles.statusHoursZero]}>{s.hours}h</Text>
            </View>
          ))}
        </View>

        {/* ─── Generate ──────────────────────────────── */}
        <View style={styles.exportBtnWrap}>
          <PrimaryButton
            label="⬇ Eksportuj raport"
            onPress={handleGenerate}
            loading={loading}
            fullWidth size="lg"
          />
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="Reports" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.sm,
  },
  cardTitle: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  dateTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  dateTab: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 6,
    backgroundColor: Colors.cream, borderRadius: 20,
    alignItems: 'center',
  },
  dateTabActive: { backgroundColor: Colors.orange, ...Shadows.sm, shadowColor: Colors.orange },
  dateTabText: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.grayMid, textAlign: 'center' },
  dateTabTextActive: { color: '#fff' },
  dateRangeRow: { flexDirection: 'row', gap: 10 },
  rangeLabel: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  rangeBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cream, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  rangeBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.black },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  workerActions: { flexDirection: 'row', gap: 10 },
  filterAction: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.orange },
  filterActionGray: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.grayMid },
  filterHint: { fontSize: 11, color: Colors.grayMid, marginBottom: 12 },
  workerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  workerFilterChip: {
    paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.orange,
  },
  workerFilterChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  workerFilterText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.orange },
  workerFilterTextActive: { color: '#fff' },
  exportCards: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  exportCard: {
    flex: 1, padding: Spacing.lg, borderRadius: Radius.sm,
    backgroundColor: Colors.cream, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', gap: 6,
  },
  exportCardSelected: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  exportIcon: { fontSize: 26 },
  exportName: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black },
  exportNameSelected: { color: '#fff' },
  exportHint: { fontSize: 11, color: Colors.grayMid },
  exportHintSelected: { color: 'rgba(255,255,255,0.8)' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesLabel: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black },
  statusSummaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.cream,
  },
  statusHours: { fontFamily: 'DMMono_500Medium', fontSize: 17, fontWeight: '900', color: Colors.black },
  statusHoursZero: { color: Colors.grayMid },
  exportBtnWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
});
