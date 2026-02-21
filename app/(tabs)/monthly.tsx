// =====================================================
// MonthlyViewScreen - Widok miesięczny pracownika
// =====================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth,
         isSameMonth, isSameDay, addMonths, subMonths,
         startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';

import { useLocalSearchParams } from 'expo-router';

import { useEmployees } from '../../hooks/useEmployees';
import { useMonthlySummary } from '../../hooks/useTimeEntries';
import { TimeEntryStatus } from '../../types/models';
import { theme, StatusType } from '../../constants/theme';
import { Card, PageHeader, SectionTitle, StatBox, StatusBadge } from '../../components/ui/index';
import { formatHours } from '../../utils/formatting';

// =====================================================
// Types
// =====================================================

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  entries: Array<{
    hours: number;
    status: TimeEntryStatus;
    notes?: string | null;
  }>;
  totalHours: number;
}

// =====================================================
// Main Component
// =====================================================

export default function MonthlyViewScreen() {
  // URL params — workerId przekazywane po kliknięciu wpisu na dashboardzie
  const { workerId: paramWorkerId } = useLocalSearchParams<{ workerId?: string }>();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(paramWorkerId ?? '');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'summary'>('calendar');

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useMonthlySummary(
    selectedEmployeeId,
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );

  // =====================================================
  // Computed Values
  // =====================================================

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const startOfFirstWeek = startOfWeek(start, { weekStartsOn: 1 });
    const endOfLastWeek = endOfWeek(end, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: startOfFirstWeek, end: endOfLastWeek });

    return days.map(date => {
      const dayEntries = timeEntries.filter(entry =>
        isSameDay(parseISO(entry.date), date)
      );

      return {
        date,
        isCurrentMonth: isSameMonth(date, selectedDate),
        entries: dayEntries.map(entry => ({
          hours: entry.hours,
          status: entry.status,
          notes: entry.notes,
        })),
        totalHours: dayEntries.reduce((sum, entry) => sum + entry.hours, 0),
      };
    });
  }, [selectedDate, timeEntries]);

  const monthlyStats = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const workHours = timeEntries
      .filter(entry => entry.status === 'work')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const sickHours = timeEntries
      .filter(entry => entry.status === 'sick')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const vacationHours = timeEntries
      .filter(entry => entry.status === 'vacation')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const fzaHours = timeEntries
      .filter(entry => entry.status === 'fza')
      .reduce((sum, entry) => sum + entry.hours, 0);

    const daysWithEntries = new Set(timeEntries.map(entry => entry.date)).size;

    return {
      totalHours,
      workHours,
      sickHours,
      vacationHours,
      fzaHours,
      daysWithEntries,
      averagePerDay: daysWithEntries > 0 ? totalHours / daysWithEntries : 0,
    };
  }, [timeEntries]);

  // =====================================================
  // Handlers
  // =====================================================

  const handlePrevMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowEmployeeModal(false);
  };

  // =====================================================
  // Helper: split name into first/last
  // =====================================================

  const getNameParts = (fullName: string): { firstName: string; lastName: string } => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  // =====================================================
  // Render
  // =====================================================

  if (isLoadingEmployees) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Ładowanie pracowników...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. PageHeader */}
        <PageHeader subtitle="" title="" />

        {/* 2. Card "Pracownik" */}
        <Card style={styles.cardSpacing}>
          <SectionTitle text="PRACOWNIK" />

          {selectedEmployee ? (
            <View style={styles.employeeSection}>
              <View style={styles.employeeNameRow}>
                <Text style={styles.employeeFirstName}>
                  {getNameParts(selectedEmployee.name).firstName}
                </Text>
                <Text style={styles.employeeLastName}>
                  {getNameParts(selectedEmployee.name).lastName}
                </Text>
              </View>

              <StatusBadge
                status="work"
                label={selectedEmployee.active ? 'Aktywny' : 'Nieaktywny'}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => setShowEmployeeModal(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="account-switch"
              size={16}
              color={theme.colors.accent}
            />
            <Text style={styles.pillButtonText}>
              {selectedEmployee ? 'Zmień pracownika' : 'Wybierz pracownika'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Widok miesięczny - tylko jeśli wybrano pracownika */}
        {selectedEmployeeId ? (
          <>
            {/* 3. Card "Nawigacja miesiąca" */}
            <Card style={styles.cardSpacing}>
              <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrow}>
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={28}
                    color={theme.colors.dark}
                  />
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                  {format(selectedDate, 'LLLL yyyy', { locale: pl })}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={styles.navArrow}>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={28}
                    color={theme.colors.dark}
                  />
                </TouchableOpacity>
              </View>

              {/* Toggle Kalendarz | Podsumowanie */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    viewMode === 'calendar' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setViewMode('calendar')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      viewMode === 'calendar' && styles.toggleTextActive,
                    ]}
                  >
                    Kalendarz
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    viewMode === 'summary' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setViewMode('summary')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      viewMode === 'summary' && styles.toggleTextActive,
                    ]}
                  >
                    Podsumowanie
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {isLoadingEntries ? (
              <Card style={styles.cardSpacing}>
                <View style={styles.centeredContent}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                  <Text style={styles.loadingText}>Ładowanie danych...</Text>
                </View>
              </Card>
            ) : (
              <>
                {/* 4. Card "Podsumowanie miesiąca" */}
                <Card style={styles.cardSpacing}>
                  <SectionTitle text="PODSUMOWANIE MIESIĄCA" />

                  {/* Rząd 3 StatBoxów */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBoxWrapper}>
                      <StatBox
                        value={formatHours(monthlyStats.totalHours, true)}
                        label="Łącznie godzin"
                      />
                    </View>
                    <View style={styles.statBoxWrapper}>
                      <StatBox
                        value={String(monthlyStats.daysWithEntries)}
                        label="Dni z wpisami"
                      />
                    </View>
                    <View style={styles.statBoxWrapper}>
                      <StatBox
                        value={formatHours(monthlyStats.averagePerDay, true)}
                        label="Średnia/dzień"
                      />
                    </View>
                  </View>

                  {/* Separator */}
                  <View style={styles.separator} />

                  {/* Lista statusów */}
                  <View style={styles.statusList}>
                    <View style={styles.statusRow}>
                      <StatusBadge status="work" />
                      <Text style={styles.statusHours}>
                        {formatHours(monthlyStats.workHours, true)}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <StatusBadge status="sick" />
                      <Text style={styles.statusHours}>
                        {formatHours(monthlyStats.sickHours, true)}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <StatusBadge status="vacation" />
                      <Text style={styles.statusHours}>
                        {formatHours(monthlyStats.vacationHours, true)}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <StatusBadge status="fza" />
                      <Text style={styles.statusHours}>
                        {formatHours(monthlyStats.fzaHours, true)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Kalendarz lub szczegółowy widok */}
                {viewMode === 'calendar' ? (
                  <Card style={styles.cardSpacing}>
                    <SectionTitle text="KALENDARZ" />

                    {/* Nagłówki dni tygodnia */}
                    <View style={styles.weekDays}>
                      {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(day => (
                        <Text key={day} style={styles.weekDay}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    {/* Dni kalendarza */}
                    <View style={styles.calendarGrid}>
                      {calendarDays.map((day, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dayCell,
                            !day.isCurrentMonth && styles.dayCellOutside,
                            day.totalHours > 0 && styles.dayCellWithEntries,
                          ]}
                          onPress={() => {
                            // Można dodać nawigację do szczegółów dnia
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              !day.isCurrentMonth && styles.dayNumberOutside,
                            ]}
                          >
                            {format(day.date, 'd')}
                          </Text>

                          {day.entries.length > 0 && (
                            <View style={styles.dayEntries}>
                              {(() => {
                                // Oblicz godziny tylko dla wpisów "work"
                                const workHours = day.entries
                                  .filter(e => e.status === 'work')
                                  .reduce((sum, e) => sum + e.hours, 0);
                                return workHours > 0 ? (
                                  <Text style={styles.dayHours}>
                                    {formatHours(workHours, true)}
                                  </Text>
                                ) : null;
                              })()}
                              <View style={styles.statusIndicators}>
                                {day.entries.map((entry, idx) => {
                                  const statusColor = theme.colors.statusColors[entry.status as StatusType];
                                  const getStatusLabel = (status: TimeEntryStatus): string => {
                                    const labels: Record<TimeEntryStatus, string> = {
                                      work: 'P',
                                      sick: 'C',
                                      vacation: 'U',
                                      fza: 'F',
                                    };
                                    return labels[status];
                                  };
                                  return (
                                    <View
                                      key={idx}
                                      style={[
                                        styles.statusBadge,
                                        {
                                          backgroundColor: statusColor?.text ?? theme.colors.muted,
                                        },
                                      ]}
                                    >
                                      <Text style={styles.statusBadgeText}>
                                        {getStatusLabel(entry.status)}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Card>
                ) : (
                  <Card style={styles.cardSpacing}>
                    <SectionTitle text="SZCZEGÓŁOWY WYKAZ" />

                    {timeEntries.length === 0 ? (
                      <Text style={styles.emptyText}>
                        Brak wpisów dla wybranego miesiąca
                      </Text>
                    ) : (
                      <View style={styles.detailedList}>
                        {timeEntries.map(entry => (
                          <View key={entry.id} style={styles.entryItem}>
                            <View style={styles.entryHeader}>
                              <Text style={styles.entryDate}>
                                {format(parseISO(entry.date), 'dd.MM.yyyy')}
                              </Text>
                              <StatusBadge
                                status={entry.status as StatusType}
                                size="sm"
                              />
                            </View>
                            <View style={styles.entryDetails}>
                              <Text style={styles.entryHours}>
                                {formatHours(entry.hours, true)}
                              </Text>
                              {entry.notes && (
                                <Text style={styles.entryNotes}>
                                  {entry.notes}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card>
                )}
              </>
            )}
          </>
        ) : (
          <Card style={styles.cardSpacing}>
            <View style={styles.centeredContent}>
              <Text style={styles.infoText}>
                Wybierz pracownika, aby zobaczyć jego miesięczne podsumowanie
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Modal wyboru pracownika */}
      <Modal
        visible={showEmployeeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz pracownika</Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.dark}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.employeeList}>
              {employees
                .filter(emp => emp.active)
                .map(employee => (
                  <TouchableOpacity
                    key={employee.id}
                    style={styles.employeeItem}
                    onPress={() => handleSelectEmployee(employee.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.employeeItemName}>{employee.name}</Text>
                    <Text style={styles.employeeItemPosition}>
                      {employee.position}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEmployeeModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// Styles
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.lg,
    color: theme.colors.muted,
  },
  cardSpacing: {
    marginHorizontal: theme.spacing.lg,
    marginTop: 0,
  },

  // ── Employee Section ──
  employeeSection: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  employeeNameRow: {
    gap: 2,
  },
  employeeFirstName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  employeeLastName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accentLight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.md,
  },
  pillButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
  },

  // ── Month Navigation ──
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  navArrow: {
    padding: theme.spacing.xs,
  },
  monthTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    textTransform: 'capitalize',
  },

  // ── Toggle ──
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.dark,
  },
  toggleText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statBoxWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },

  // ── Status List ──
  statusList: {
    gap: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statusHours: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },

  // ── Calendar ──
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  weekDay: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.muted,
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: 40,
    height: 60,
    margin: 4,
    padding: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  dayCellOutside: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  dayCellWithEntries: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
  },
  dayNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  dayNumberOutside: {
    color: theme.colors.muted,
  },
  dayEntries: {
    alignItems: 'center',
    marginTop: 2,
    gap: 1,
  },
  dayHours: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  statusIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: 'white',
  },

  // ── Detailed List ──
  emptyText: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontStyle: 'italic',
    paddingVertical: theme.spacing.xl,
    fontSize: theme.fontSize.md,
  },
  infoText: {
    textAlign: 'center',
    fontSize: theme.fontSize.lg,
    color: theme.colors.muted,
    lineHeight: 24,
  },
  detailedList: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  entryItem: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  entryDate: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  entryDetails: {
    gap: theme.spacing.xs,
  },
  entryHours: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  entryNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.dark,
  },
  employeeList: {
    maxHeight: 300,
  },
  employeeItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  employeeItemName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  employeeItemPosition: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    marginTop: 2,
  },
  modalCloseButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
});
