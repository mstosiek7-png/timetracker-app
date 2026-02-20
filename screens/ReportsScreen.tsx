// ============================================================
// TimeTracker — Screen: ReportsScreen
// Plik: src/screens/ReportsScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppHeader, Badge, Checkbox, BottomNav, PrimaryButton } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useReports, ReportStats } from '../hooks/useReports';
import { useWorkers } from '../hooks/useWorkers';

type Props = { navigation: NativeStackNavigationProp<any> };
type RangeMode = 'current' | 'previous' | 'custom';
type ExportFormat = 'xlsx' | 'pdf';

export default function ReportsScreen({ navigation }: Props) {
  const { workers } = useWorkers();
  const { useReportStats, generateReport, savedReports } = useReports();

  const [rangeMode, setRangeMode] = useState<RangeMode>('current');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo]     = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]); // pusty = wszyscy
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
      await generateReport({ dateFrom, dateTo, workerIds: selectedWorkers, format: exportFormat, includeNotes });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader title="Raporty i Eksport" />

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalHours}h</Text>
          <Text style={styles.statLabel}>Łącznie godzin</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{stats.entryCount}</Text>
          <Text style={styles.statLabel}>Wpisy</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{stats.workerCount}</Text>
          <Text style={styles.statLabel}>Pracownicy</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: Spacing.lg }} />

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
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setSelectedWorkers([])}>
                <Text style={styles.filterAction}>Wszyscy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedWorkers(workers.map(w => w.id))}>
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
        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <PrimaryButton
            label="📥 Generuj raport"
            onPress={handleGenerate}
            loading={loading}
            fullWidth size="lg"
          />
        </View>

        {/* ─── Saved reports ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.savedHeader}>
            <Text style={styles.cardTitle}>Zapisane raporty</Text>
            <TouchableOpacity><Text style={{ fontSize: 18 }}>🔄</Text></TouchableOpacity>
          </View>
          {savedReports.length === 0 ? (
            <Text style={styles.emptyText}>Brak zapisanych raportów</Text>
          ) : (
            savedReports.map(r => (
              <View key={r.id} style={styles.savedReportItem}>
                <Text style={styles.savedReportName}>{r.name}</Text>
                <Text style={styles.savedReportDate}>{r.createdAt}</Text>
              </View>
            ))
          )}
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
  statsStrip: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.creamDark },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statBorder: { borderLeftWidth: 1, borderLeftColor: Colors.creamDark },
  statValue: { fontFamily: 'DMMono_700Bold', fontSize: FontSize.xl, color: Colors.orange },
  statLabel: { fontSize: 9, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.sm,
  },
  cardTitle: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  dateTabs: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  dateTab: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 4,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    alignItems: 'center',
  },
  dateTabActive: { backgroundColor: Colors.orange },
  dateTabText: { fontSize: 11, fontFamily: FontFamily.semiBold, color: Colors.grayDark, textAlign: 'center' },
  dateTabTextActive: { color: '#fff' },
  dateRangeRow: { flexDirection: 'row', gap: 10 },
  rangeLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  rangeBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  rangeBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.black },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  filterAction: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.orange },
  filterActionGray: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  filterHint: { fontSize: FontSize.sm, color: Colors.grayMid, marginBottom: Spacing.sm },
  workerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  workerFilterChip: {
    paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: Colors.creamDark, borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  workerFilterChipActive: { backgroundColor: Colors.orangePale, borderColor: Colors.orange },
  workerFilterText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.grayDark },
  workerFilterTextActive: { color: Colors.orange },
  exportCards: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  exportCard: {
    flex: 1, padding: Spacing.lg, borderRadius: Radius.sm,
    backgroundColor: Colors.cream, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', gap: 6,
  },
  exportCardSelected: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  exportIcon: { fontSize: 26 },
  exportName: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.black },
  exportNameSelected: { color: '#fff' },
  exportHint: { fontSize: FontSize.xs, color: Colors.grayMid },
  exportHintSelected: { color: 'rgba(255,255,255,0.8)' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesLabel: { fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.black },
  statusSummaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.cream,
  },
  statusHours: { fontFamily: 'DMMono_500Medium', fontSize: FontSize.md, fontWeight: '700', color: Colors.black },
  statusHoursZero: { color: Colors.grayMid },
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyText: { fontSize: FontSize.base, color: Colors.grayMid, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.md },
  savedReportItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cream,
  },
  savedReportName: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.black },
  savedReportDate: { fontSize: FontSize.sm, color: Colors.grayMid },
});
