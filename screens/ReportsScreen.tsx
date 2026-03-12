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
import { useI18n } from '../i18n/I18nProvider';

type Props = { navigation: NativeStackNavigationProp<any> };
type RangeMode = 'current' | 'previous' | 'custom';
type ExportFormat = 'xlsx' | 'pdf';

export default function ReportsScreen({ navigation }: Props) {
  const { workers } = useWorkers();
  const { generateReport, savedReports, shareExistingReport, deleteReport } = useReports();
  const { t } = useI18n();

  const [rangeMode, setRangeMode] = useState<RangeMode>('current');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo]     = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(workers.map(w => w.id)); // domyślnie wszyscy zaznaczeni
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'employees' | 'construction'>('employees');

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
      await generateReport({ 
        dateFrom, 
        dateTo, 
        workerIds: workersToFilter, 
        format: exportFormat, 
        includeNotes,
        reportType
      });
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
      <AppHeader title={t('Raporty i Eksport')} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── Report Type ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Rodzaj raportu')}</Text>
          <View style={styles.reportTypeRow}>
            <TouchableOpacity 
              style={[styles.reportTypeBtn, reportType === 'employees' && styles.reportTypeBtnActive]}
              onPress={() => setReportType('employees')}
            >
              <Text style={[styles.reportTypeBtnText, reportType === 'employees' && styles.reportTypeBtnTextActive]}>
                {t('Godziny pracowników')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reportTypeBtn, reportType === 'construction' && styles.reportTypeBtnActive]}
              onPress={() => setReportType('construction')}
            >
              <Text style={[styles.reportTypeBtnText, reportType === 'construction' && styles.reportTypeBtnTextActive]}>
                {t('Zestawienie budów')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Date range ────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Zakres dat')}</Text>
          <View style={styles.dateTabs}>
            {(['current','previous','custom'] as RangeMode[]).map((mode, i) => (
              <TouchableOpacity
                key={mode}
                style={[styles.dateTab, rangeMode === mode && styles.dateTabActive]}
                onPress={() => setRange(mode)}
              >
                <Text style={[styles.dateTabText, rangeMode === mode && styles.dateTabTextActive]}>
                  {[t('Biezacy miesiac'), t('Poprzedni miesiac'), t('Niestandardowy')][i]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dateRangeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>{t('Od')}:</Text>
              <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowFromPicker(true)}>
                <Text>📅 </Text>
                <Text style={styles.rangeBtnText}>{fmt(dateFrom)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>{t('Do')}:</Text>
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
        {reportType === 'employees' && (
          <View style={styles.card}>
            <View style={styles.filterHeader}>
              <Text style={styles.cardTitle}>{t('Pracownicy')}</Text>
              <View style={styles.workerActions}>
                <TouchableOpacity onPress={() => setSelectedWorkers(workers.map(w => w.id))}>
                  <Text style={styles.filterAction}>{t('Zaznacz wszystkich')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedWorkers([])}>
                  <Text style={styles.filterActionGray}>{t('Wyczysc')}</Text>
                </TouchableOpacity>
              </View>
            </View>
              <Text style={styles.filterHint}>{t('Wszyscy pracownicy (wybierz konkretnych jesli potrzebujesz)')}</Text>
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
        )}

        {/* ─── Export options ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Opcje eksportu')}</Text>
          <View style={styles.exportCards}>
            <TouchableOpacity
              style={[styles.exportCard, exportFormat === 'xlsx' && styles.exportCardSelected]}
              onPress={() => setExportFormat('xlsx')}
            >
              <Text style={styles.exportIcon}>📊</Text>
              <Text style={[styles.exportName, exportFormat === 'xlsx' && styles.exportNameSelected]}>Excel (.xlsx)</Text>
              <Text style={[styles.exportHint, exportFormat === 'xlsx' && styles.exportHintSelected]}>{t('Edytowalny')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportCard, exportFormat === 'pdf' && styles.exportCardSelected]}
              onPress={() => setExportFormat('pdf')}
            >
              <Text style={styles.exportIcon}>📄</Text>
              <Text style={[styles.exportName, exportFormat === 'pdf' && styles.exportNameSelected]}>PDF (.pdf)</Text>
              <Text style={[styles.exportHint, exportFormat === 'pdf' && styles.exportHintSelected]}>{t('Do druku')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.notesRow} onPress={() => setIncludeNotes(v => !v)}>
            <Checkbox checked={includeNotes} onToggle={() => setIncludeNotes(v => !v)} />
            <Text style={styles.notesLabel}>{t('Uwzglednij notatki')}</Text>
          </TouchableOpacity>
          {reportType === 'construction' && (
            <Text style={{ fontSize: 11, color: Colors.orange, fontFamily: FontFamily.bold, marginTop: 10 }}>
              * {t('Zestawienie budów')}
            </Text>
          )}
        </View>

        {/* ─── Saved reports ─────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Zapisane raporty')}</Text>
          {savedReports.length === 0 ? (
            <Text style={styles.emptyReports}>{t('Brak zapisanych raportow')}</Text>
          ) : (
            savedReports.map(report => (
              <TouchableOpacity
                key={report.id}
                style={styles.savedReportRow}
                onPress={() => shareExistingReport(report)}
                onLongPress={() => {
                  Alert.alert(
                    t('Usun raport'),
                    `${t('Czy na pewno chcesz usunac raport')} "${report.name}"?`,
                    [
                      { text: t('Anuluj'), style: 'cancel' },
                      { 
                        text: t('Usun'), 
                        style: 'destructive',
                        onPress: () => deleteReport(report.id)
                      },
                    ]
                  );
                }}
              >
                <View>
                  <Text style={styles.savedReportName}>{report.name}</Text>
                  <Text style={styles.savedReportMeta}>{report.createdAt}</Text>
                </View>
                <Text style={styles.savedReportAction}>{t('Udostepnij')}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ─── Generate ──────────────────────────────── */}
        <View style={styles.exportBtnWrap}>
          <PrimaryButton
            label={t('Wygeneruj raport')}
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
  emptyReports: { fontSize: 12, color: Colors.grayMid, fontStyle: 'italic' },
  savedReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  savedReportName: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black },
  savedReportMeta: { fontSize: 11, color: Colors.grayMid, marginTop: 2 },
  savedReportAction: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.orange },
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
  reportTypeRow: { flexDirection: 'row', gap: 8 },
  reportTypeBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: Colors.cream, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.creamDark,
  },
  reportTypeBtnActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  reportTypeBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.grayMid },
  reportTypeBtnTextActive: { color: '#fff' },
});
