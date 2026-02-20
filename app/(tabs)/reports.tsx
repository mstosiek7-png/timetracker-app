// =====================================================
// Reports Screen - Export and Analytics
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  generateExcelReport,
  generatePdfReport,
  shareReport,
  getSavedReports,
  deleteReport,
  ExportOptions,
} from '../../services/export';
import { useEmployees } from '../../hooks/useEmployees';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { theme } from '../../constants/theme';
import { Card, PageHeader, SectionTitle, FAB, StatusBadge, StatBox } from '../../components/ui';

// Types
type ExportFormat = 'excel' | 'pdf';
type DateRangeType = 'thisMonth' | 'lastMonth' | 'custom';

// =====================================================
// Main Component
// =====================================================

export default function ReportsScreen() {
  // State
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('thisMonth');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [savedReports, setSavedReports] = useState<Array<{
    uri: string;
    name: string;
    size: number;
    modified: Date;
  }>>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useTimeEntries({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  });

  // Effects
  useEffect(() => {
    loadSavedReports();
    updateDateRange();
  }, [dateRangeType]);

  // =====================================================
  // Date Range Handlers
  // =====================================================

  const updateDateRange = () => {
    const now = new Date();
    
    switch (dateRangeType) {
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      // custom pozostawia obecne daty
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setDateRangeType('custom');
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setDateRangeType('custom');
    }
  };

  // =====================================================
  // Employee Selection
  // =====================================================

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map(emp => emp.id));
  };

  const clearEmployeeSelection = () => {
    setSelectedEmployees([]);
  };

  // =====================================================
  // Export Functions
  // =====================================================

  const handleExport = async () => {
    if (startDate > endDate) {
      Alert.alert('Błąd', 'Data początkowa nie może być późniejsza niż data końcowa');
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        startDate,
        endDate,
        employeeIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
        includeNotes,
        format: exportFormat,
      };

      let fileUri: string;
      
      if (exportFormat === 'excel') {
        fileUri = await generateExcelReport(options);
      } else {
        fileUri = await generatePdfReport(options);
      }

      // Natychmiast uruchom udostępnianie po wygenerowaniu
      await shareReport(fileUri);
      loadSavedReports();
    } catch (error) {
      Alert.alert(
        'Błąd',
        error instanceof Error ? error.message : 'Nie udało się wygenerować raportu'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // =====================================================
  // Saved Reports Management
  // =====================================================

  const loadSavedReports = async () => {
    setIsLoadingReports(true);
    try {
      const reports = await getSavedReports();
      setSavedReports(reports);
    } catch (error) {
      console.error('Błąd ładowania zapisanych raportów:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleShareReport = async (uri: string) => {
    try {
      await shareReport(uri);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się udostępnić raportu');
    }
  };

  const handleDeleteReport = async (uri: string, name: string) => {
    Alert.alert(
      'Usuń raport',
      `Czy na pewno chcesz usunąć raport "${name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReport(uri);
              loadSavedReports();
              Alert.alert('Sukces', 'Raport został usunięty');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć raportu');
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // Statistics Calculation
  // =====================================================

  const calculateStats = () => {
    const filteredEntries = selectedEmployees.length > 0
      ? timeEntries.filter(entry => selectedEmployees.includes(entry.employee_id))
      : timeEntries;

    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const workHours = filteredEntries
      .filter(entry => entry.status === 'work')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const sickHours = filteredEntries
      .filter(entry => entry.status === 'sick')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const vacationHours = filteredEntries
      .filter(entry => entry.status === 'vacation')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const fzaHours = filteredEntries
      .filter(entry => entry.status === 'fza')
      .reduce((sum, entry) => sum + entry.hours, 0);

    return {
      totalHours: totalHours.toFixed(2),
      workHours: workHours.toFixed(2),
      sickHours: sickHours.toFixed(2),
      vacationHours: vacationHours.toFixed(2),
      fzaHours: fzaHours.toFixed(2),
      entriesCount: filteredEntries.length,
      employeesCount: new Set(filteredEntries.map(entry => entry.employee_id)).size,
    };
  };

  const stats = calculateStats();

  // =====================================================
  // Render
  // =====================================================

  if (isLoadingEmployees || isLoadingEntries) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Ładowanie danych...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. PageHeader */}
        <PageHeader subtitle="" title="" />

        {/* 2. StatBoxy podsumowania */}
        <View style={styles.statsRow}>
          <StatBox
            label="Łącznie godzin"
            value={stats.totalHours}
            color={theme.colors.accent}
          />
          <StatBox
            label="Wpisy"
            value={stats.entriesCount.toString()}
            color={theme.colors.dark}
          />
          <StatBox
            label="Pracownicy"
            value={stats.employeesCount.toString()}
            color={theme.colors.dark}
          />
        </View>

        {/* 3. Card "Zakres dat" */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="ZAKRES DAT" />
          
          <View style={styles.rangeButtons}>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                dateRangeType === 'thisMonth' && styles.rangeButtonActive,
              ]}
              onPress={() => setDateRangeType('thisMonth')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  dateRangeType === 'thisMonth' && styles.rangeButtonTextActive,
                ]}
              >
                Bieżący miesiąc
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.rangeButton,
                dateRangeType === 'lastMonth' && styles.rangeButtonActive,
              ]}
              onPress={() => setDateRangeType('lastMonth')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  dateRangeType === 'lastMonth' && styles.rangeButtonTextActive,
                ]}
              >
                Poprzedni miesiąc
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.rangeButton,
                dateRangeType === 'custom' && styles.rangeButtonActive,
              ]}
              onPress={() => setDateRangeType('custom')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  dateRangeType === 'custom' && styles.rangeButtonTextActive,
                ]}
              >
                Niestandardowy
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Od:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={theme.colors.dark}
                />
                <Text style={styles.dateText}>
                  {format(startDate, 'dd.MM.yyyy', { locale: pl })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Do:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={theme.colors.dark}
                />
                <Text style={styles.dateText}>
                  {format(endDate, 'dd.MM.yyyy', { locale: pl })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
            />
          )}
        </Card>

        {/* 4. Card "Pracownicy" */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="PRACOWNICY" />
          
          <View style={styles.employeeActions}>
            <TouchableOpacity
              style={styles.pillButton}
              onPress={selectAllEmployees}
              activeOpacity={0.7}
            >
              <Text style={styles.pillButtonText}>Wszyscy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pillButton}
              onPress={clearEmployeeSelection}
              activeOpacity={0.7}
            >
              <Text style={styles.pillButtonText}>Wyczyść</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {selectedEmployees.length === 0
              ? 'Wszyscy pracownicy (wybierz konkretnych jeśli potrzebujesz)'
              : `Wybrano: ${selectedEmployees.length} pracowników`}
          </Text>

          <ScrollView horizontal style={styles.employeeScroll}>
            <View style={styles.employeeChips}>
              {employees.map(employee => (
                <TouchableOpacity
                  key={employee.id}
                  style={[
                    styles.employeeChip,
                    selectedEmployees.includes(employee.id) && styles.employeeChipActive,
                  ]}
                  onPress={() => toggleEmployeeSelection(employee.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.employeeChipText,
                      selectedEmployees.includes(employee.id) && styles.employeeChipTextActive,
                    ]}
                  >
                    {employee.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* 5. Card "Opcje eksportu" */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="OPCJE EKSPORTU" />
          
          <View style={styles.formatButtons}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                exportFormat === 'excel' && styles.formatButtonActive,
              ]}
              onPress={() => setExportFormat('excel')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="microsoft-excel"
                size={24}
                color={exportFormat === 'excel' ? '#FFFFFF' : theme.colors.dark}
              />
              <Text
                style={[
                  styles.formatButtonText,
                  exportFormat === 'excel' && styles.formatButtonTextActive,
                ]}
              >
                Excel (.xlsx)
              </Text>
              <Text style={styles.formatHint}>Edytowalny</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.formatButton,
                exportFormat === 'pdf' && styles.formatButtonActive,
              ]}
              onPress={() => setExportFormat('pdf')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="file-document"
                size={24}
                color={exportFormat === 'pdf' ? '#FFFFFF' : theme.colors.dark}
              />
              <Text
                style={[
                  styles.formatButtonText,
                  exportFormat === 'pdf' && styles.formatButtonTextActive,
                ]}
              >
                PDF (.pdf)
              </Text>
              <Text style={styles.formatHint}>Do druku</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.optionToggle}
            onPress={() => setIncludeNotes(!includeNotes)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={includeNotes ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={includeNotes ? theme.colors.accent : theme.colors.muted}
            />
            <Text style={styles.optionToggleText}>Uwzględnij notatki</Text>
          </TouchableOpacity>
        </Card>

        {/* 6. Card "Podsumowanie statusów" */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="PODSUMOWANIE STATUSÓW" />
          
          <View style={styles.statusSummary}>
            <View style={styles.statusItem}>
              <StatusBadge status="work" label="Praca" />
              <Text style={[styles.statusValue, { color: theme.colors.statusColors.work.text }]}>{stats.workHours} h</Text>
            </View>
            <View style={styles.statusItem}>
              <StatusBadge status="sick" label="Chorobowe" />
              <Text style={[styles.statusValue, { color: theme.colors.statusColors.sick.text }]}>{stats.sickHours} h</Text>
            </View>
            <View style={styles.statusItem}>
              <StatusBadge status="vacation" label="Urlop" />
              <Text style={[styles.statusValue, { color: theme.colors.statusColors.vacation.text }]}>{stats.vacationHours} h</Text>
            </View>
            <View style={styles.statusItem}>
              <StatusBadge status="fza" label="FZA" />
              <Text style={[styles.statusValue, { color: theme.colors.statusColors.fza.text }]}>{stats.fzaHours} h</Text>
            </View>
          </View>
        </Card>

        {/* 7. Przycisk "Generuj raport" - FAB pełna szerokość */}
        <View style={styles.fabContainer}>
          <FAB
            label={isExporting ? 'Generowanie...' : 'Generuj raport'}
            onPress={handleExport}
            disabled={isExporting}
            fullWidth
          />
        </View>

        {/* 8. Card "Zapisane raporty" */}
        <Card style={styles.cardSpacing}>
          <View style={styles.sectionHeader}>
            <SectionTitle text="ZAPISANE RAPORTY" />
            <TouchableOpacity
              onPress={loadSavedReports}
              disabled={isLoadingReports}
              activeOpacity={0.7}
              style={styles.refreshButton}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={theme.colors.accent}
              />
            </TouchableOpacity>
          </View>

          {isLoadingReports ? (
            <ActivityIndicator style={styles.reportsLoading} color={theme.colors.accent} />
          ) : savedReports.length === 0 ? (
            <Text style={styles.emptyText}>
              Brak zapisanych raportów
            </Text>
          ) : (
            savedReports.map(report => (
              <View key={report.uri} style={styles.reportItem}>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportName}>
                    {report.name}
                  </Text>
                  <Text style={styles.reportDetails}>
                    {format(report.modified, 'dd.MM.yyyy HH:mm')} •{' '}
                    {(report.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
                <View style={styles.reportActions}>
                  <TouchableOpacity
                    onPress={() => handleShareReport(report.uri)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={20}
                      color={theme.colors.dark}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteReport(report.uri, report.name)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={20}
                      color={theme.colors.dark}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// Styles
// =====================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    fontWeight: '600',
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginTop: 0,
    gap: theme.spacing.sm,
  },

  // ── Card Spacing ──
  cardSpacing: {
    marginHorizontal: theme.spacing.lg,
    marginTop: 0,
  },

  // ── Date Range ──
  rangeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  rangeButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  rangeButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  rangeButtonTextActive: {
    color: '#FFFFFF',
  },

  // ── Separator ──
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },

  // ── Date Picker ──
  dateRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },

  // ── Employee Selection ──
  employeeActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  pillButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  employeeScroll: {
    maxHeight: 120,
  },
  employeeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  employeeChip: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  employeeChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  employeeChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  employeeChipTextActive: {
    color: '#FFFFFF',
  },

  // ── Export Format ──
  formatButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  formatButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  formatButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  formatButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
  formatHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },

  // ── Option Toggle ──
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  optionToggleText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },

  // ── Status Summary ──
  statusSummary: {
    gap: theme.spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },

  // ── FAB ──
  fabContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  refreshButton: {
    padding: theme.spacing.xs,
  },

  // ── Saved Reports ──
  reportsLoading: {
    marginVertical: theme.spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontStyle: 'italic',
    paddingVertical: theme.spacing.xl,
    fontSize: theme.fontSize.md,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  reportDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  reportActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});