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
import { AppHeader, Badge, Checkbox, BottomNav, PrimaryButton } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useReports } from '../hooks/useReports';
import { useWorkers } from '../hooks/useWorkers';
import { useI18n } from '../i18n/I18nProvider';
import {
  getISOWeek,
  getMonthBounds,
  navigateKW,
  getWeekDays,
  generateEinsatzplanPdf,
} from '../services/einsatzplanPdfService';
import { shareReport } from '../services/export';

type Props = { navigation: NativeStackNavigationProp<any> };
type ActiveTab = 'budowy' | 'pracownicy';
type RangeType = 'week' | 'month';
type ExportFormat = 'xlsx' | 'pdf';

const MONTH_NAMES_PL = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
];
const MONTH_NAMES_DE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];

function fmtDateShort(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.`;
}

export default function ReportsScreen({ navigation }: Props) {
  const { workers } = useWorkers();
  const { generateReport, savedReports, shareExistingReport, deleteReport } = useReports();
  const { t, language } = useI18n();

  const monthNames = language === 'de' ? MONTH_NAMES_DE : MONTH_NAMES_PL;

  // ── Tab state ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('budowy');

  // ── Budowy: Einsatzplan PDF ─────────────────────────────
  const [rangeType, setRangeType] = useState<RangeType>('week');

  const nowKW = getISOWeek(new Date());
  const [selectedKW, setSelectedKW] = useState(nowKW.kw);
  const [selectedKWYear, setSelectedKWYear] = useState(nowKW.year);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState(now.getFullYear());

  const [buildingPdf, setBuildingPdf] = useState(false);

  // ── Pracownicy: Lohnliste ───────────────────────────────
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(
    workers.map(w => w.id),
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [loadingLohn, setLoadingLohn] = useState(false);

  // Lohnliste uses current month as default
  const lohnDateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const lohnDateTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // ── Helpers ─────────────────────────────────────────────
  function toggleWorker(id: string) {
    setSelectedWorkers(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id],
    );
  }

  function kwLabel(): string {
    const days = getWeekDays(selectedKW, selectedKWYear);
    return `KW ${selectedKW} · ${fmtDateShort(days[0])} – ${fmtDateShort(days[4])}${selectedKWYear}`;
  }

  function monthLabel(): string {
    return `${monthNames[selectedMonth - 1]} ${selectedMonthYear}`;
  }

  function prevWeek() {
    const prev = navigateKW(selectedKW, selectedKWYear, -1);
    setSelectedKW(prev.kw);
    setSelectedKWYear(prev.year);
  }
  function nextWeek() {
    const next = navigateKW(selectedKW, selectedKWYear, 1);
    setSelectedKW(next.kw);
    setSelectedKWYear(next.year);
  }

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedMonthYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }
  function nextMonth() {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedMonthYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  // ── Handlers ────────────────────────────────────────────
  async function handleExportPdf() {
    console.log('[Reports] handleExportPdf pressed, rangeType:', rangeType);
    setBuildingPdf(true);
    try {
      let dateFrom: Date;
      let dateTo: Date;
      let rangeLabel: string;

      if (rangeType === 'week') {
        const days = getWeekDays(selectedKW, selectedKWYear);
        dateFrom = days[0];
        dateTo   = days[4];
        rangeLabel = `KW${selectedKW}_${selectedKWYear}`;
      } else {
        const bounds = getMonthBounds(selectedMonth, selectedMonthYear);
        dateFrom   = bounds.dateFrom;
        dateTo     = bounds.dateTo;
        rangeLabel = `${selectedMonthYear}_${String(selectedMonth).padStart(2, '0')}`;
      }

      const uri = await generateEinsatzplanPdf({ dateFrom, dateTo, rangeLabel });
      await shareReport(uri, language);
    } catch (err: any) {
      Alert.alert(t('Blad'), err?.message || t('Nie udalo sie wygenerowac raportu.'));
    } finally {
      setBuildingPdf(false);
    }
  }

  async function handleGenerateLohnliste() {
    console.log('[Reports] handleGenerateLohnliste pressed');
    setLoadingLohn(true);
    try {
      const workersToFilter = selectedWorkers.length === workers.length ? [] : selectedWorkers;
      await generateReport({
        dateFrom: lohnDateFrom,
        dateTo:   lohnDateTo,
        workerIds: workersToFilter,
        format: exportFormat,
        includeNotes,
        reportType: 'ai_lohnliste',
      });
    } catch (err: any) {
      Alert.alert(t('Blad'), err?.message || t('Nie udalo sie wygenerowac raportu.'));
    } finally {
      setLoadingLohn(false);
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader title={t('Raporty i Eksport')} />

      {/* ── Top tab toggle ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'budowy' && styles.tabActive]}
          onPress={() => setActiveTab('budowy')}
        >
          <Text style={[styles.tabText, activeTab === 'budowy' && styles.tabTextActive]}>
            {t('Budowy')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pracownicy' && styles.tabActive]}
          onPress={() => setActiveTab('pracownicy')}
        >
          <Text style={[styles.tabText, activeTab === 'pracownicy' && styles.tabTextActive]}>
            {t('Pracownicy')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ════════════════════════════════════════
            TAB A — BUDOWY (Einsatzplan PDF)
            ════════════════════════════════════════ */}
        {activeTab === 'budowy' && (
          <>
            {/* Typ zakresu */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('Zakres')}</Text>
              <View style={styles.rangeTypeRow}>
                <TouchableOpacity
                  style={[styles.rangeTypeBtn, rangeType === 'week' && styles.rangeTypeBtnActive]}
                  onPress={() => setRangeType('week')}
                >
                  <Text style={[styles.rangeTypeTxt, rangeType === 'week' && styles.rangeTypeTxtActive]}>
                    {t('Ten tydzien')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rangeTypeBtn, rangeType === 'month' && styles.rangeTypeBtnActive]}
                  onPress={() => setRangeType('month')}
                >
                  <Text style={[styles.rangeTypeTxt, rangeType === 'month' && styles.rangeTypeTxtActive]}>
                    {t('Ten miesiac')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* KW picker */}
            {rangeType === 'week' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Kalenderwoche</Text>
                <View style={styles.pickerRow}>
                  <TouchableOpacity style={styles.arrowBtn} onPress={prevWeek}>
                    <Text style={styles.arrowTxt}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerLabel}>{kwLabel()}</Text>
                  <TouchableOpacity style={styles.arrowBtn} onPress={nextWeek}>
                    <Text style={styles.arrowTxt}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Month picker */}
            {rangeType === 'month' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('Miesiac')}</Text>
                <View style={styles.pickerRow}>
                  <TouchableOpacity style={styles.arrowBtn} onPress={prevMonth}>
                    <Text style={styles.arrowTxt}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerLabel}>{monthLabel()}</Text>
                  <TouchableOpacity style={styles.arrowBtn} onPress={nextMonth}>
                    <Text style={styles.arrowTxt}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Export button */}
            <View style={styles.exportBtnWrap}>
              <PrimaryButton
                label={
                  rangeType === 'week'
                    ? t('Eksportuj tydzien PDF')
                    : t('Eksportuj miesiac PDF')
                }
                onPress={handleExportPdf}
                loading={buildingPdf}
                fullWidth
                size="lg"
              />
            </View>
          </>
        )}

        {/* ════════════════════════════════════════
            TAB B — PRACOWNICY (Lohnliste)
            ════════════════════════════════════════ */}
        {activeTab === 'pracownicy' && (
          <>
            {/* Worker filter */}
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
              <Text style={styles.filterHint}>
                {t('Wszyscy pracownicy (wybierz konkretnych jesli potrzebujesz)')}
              </Text>
              <View style={styles.workerChips}>
                {workers.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.workerFilterChip,
                      (selectedWorkers.length === 0 || selectedWorkers.includes(w.id)) &&
                        styles.workerFilterChipActive,
                    ]}
                    onPress={() => toggleWorker(w.id)}
                  >
                    <Text
                      style={[
                        styles.workerFilterText,
                        (selectedWorkers.length === 0 || selectedWorkers.includes(w.id)) &&
                          styles.workerFilterTextActive,
                      ]}
                    >
                      {w.firstName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Format selector */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('Opcje eksportu')}</Text>
              <View style={styles.exportCards}>
                <TouchableOpacity
                  style={[styles.exportCard, exportFormat === 'xlsx' && styles.exportCardSelected]}
                  onPress={() => setExportFormat('xlsx')}
                >
                  <Text style={styles.exportIcon}>📊</Text>
                  <Text style={[styles.exportName, exportFormat === 'xlsx' && styles.exportNameSelected]}>
                    Excel (.xlsx)
                  </Text>
                  <Text style={[styles.exportHint, exportFormat === 'xlsx' && styles.exportHintSelected]}>
                    {t('Edytowalny')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportCard, exportFormat === 'pdf' && styles.exportCardSelected]}
                  onPress={() => setExportFormat('pdf')}
                >
                  <Text style={styles.exportIcon}>📄</Text>
                  <Text style={[styles.exportName, exportFormat === 'pdf' && styles.exportNameSelected]}>
                    PDF (.pdf)
                  </Text>
                  <Text style={[styles.exportHint, exportFormat === 'pdf' && styles.exportHintSelected]}>
                    {t('Do druku')}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.notesRow}
                onPress={() => setIncludeNotes(v => !v)}
              >
                <Checkbox checked={includeNotes} onToggle={() => setIncludeNotes(v => !v)} />
                <Text style={styles.notesLabel}>{t('Uwzglednij notatki')}</Text>
              </TouchableOpacity>
            </View>

            {/* Saved reports */}
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
                            onPress: () => deleteReport(report.id),
                          },
                        ],
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

            {/* Generate */}
            <View style={styles.exportBtnWrap}>
              <PrimaryButton
                label={t('Wygeneruj Lohnliste')}
                onPress={handleGenerateLohnliste}
                loading={loadingLohn}
                fullWidth
                size="lg"
              />
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="Reports" onNavigate={s => navigation.navigate(s)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },

  // Tab toggle
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white, ...Shadows.sm },
  tabText: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.grayMid },
  tabTextActive: { color: Colors.orange },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.md, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.grayMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Range type (tydzień / miesiąc)
  rangeTypeRow: { flexDirection: 'row', gap: 8 },
  rangeTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.creamDark,
  },
  rangeTypeBtnActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  rangeTypeTxt: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.grayMid },
  rangeTypeTxtActive: { color: '#fff' },

  // KW / month picker
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowTxt: { fontSize: 22, color: Colors.orange, fontFamily: FontFamily.bold },
  pickerLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.black,
  },

  // Workers filter
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  workerActions: { flexDirection: 'row', gap: 10 },
  filterAction: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.orange },
  filterActionGray: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.grayMid },
  filterHint: { fontSize: 11, color: Colors.grayMid, marginBottom: 12 },
  workerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  workerFilterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  workerFilterChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  workerFilterText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.orange },
  workerFilterTextActive: { color: '#fff' },

  // Export format cards
  exportCards: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  exportCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cream,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 6,
  },
  exportCardSelected: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  exportIcon: { fontSize: 26 },
  exportName: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black },
  exportNameSelected: { color: '#fff' },
  exportHint: { fontSize: 11, color: Colors.grayMid },
  exportHintSelected: { color: 'rgba(255,255,255,0.8)' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesLabel: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black },

  // Saved reports
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

  exportBtnWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
});
