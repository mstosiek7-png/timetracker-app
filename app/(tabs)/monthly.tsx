// =====================================================
// MonthlyViewScreen - Widok miesięczny pracownika
// =====================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth,
         isSameMonth, isSameDay, addMonths, subMonths,
         startOfWeek, endOfWeek } from 'date-fns';
import { de, pl } from 'date-fns/locale';

import { useLocalSearchParams } from 'expo-router';

import { useEmployees } from '../../hooks/useEmployees';
import { useCreateTimeEntry, useDeleteTimeEntry, useMonthlySummary } from '../../hooks/useTimeEntries';
import { TimeEntryStatus } from '../../types/models';
import { theme, StatusType } from '../../constants/theme';
import { Card, PageHeader, SectionTitle, StatBox, StatusBadge } from '../../components/ui/index';
import { formatHours } from '../../utils/formatting';
import { useI18n } from '../../i18n/I18nProvider';

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
  const { workerId: paramWorkerId } = useLocalSearchParams<{ workerId?: string | string[] }>();
  const normalizedWorkerId = Array.isArray(paramWorkerId) ? paramWorkerId[0] : paramWorkerId;

  const today = new Date();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(normalizedWorkerId ?? '');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'summary'>('calendar');
  const [editDay, setEditDay] = useState<Date | null>(null);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<TimeEntryStatus>('work');
  const [editHours, setEditHours] = useState('8');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t, language } = useI18n();
  const locale = language === 'de' ? de : pl;
  const weekDayLabels = language === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'So', 'Nd'];

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useMonthlySummary(
    selectedEmployeeId,
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );
  const createTimeEntry = useCreateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  // =====================================================
  // Computed Values
  // =====================================================

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  useEffect(() => {
    if (normalizedWorkerId && normalizedWorkerId !== selectedEmployeeId) {
      setSelectedEmployeeId(normalizedWorkerId);
    }
    // Only run when normalizedWorkerId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedWorkerId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const statusOptions: Array<{ value: TimeEntryStatus; label: string }> = [
    { value: 'work', label: t('Praca') },
    { value: 'sick', label: t('Chorobowe') },
    { value: 'vacation', label: t('Urlop') },
    { value: 'fza', label: t('FZA') },
  ];

  const openDayEditor = (date: Date) => {
    if (!selectedEmployeeId) {
      return;
    }
    const existingEntry = timeEntries.find(entry => isSameDay(parseISO(entry.date), date));
    setEditDay(date);
    setEditEntryId(existingEntry?.id ?? null);
    setEditStatus(existingEntry?.status ?? 'work');
    setEditHours(existingEntry ? String(existingEntry.hours) : '8');
    setEditError('');
    setIsEditOpen(true);
  };

  const closeDayEditor = () => {
    setIsEditOpen(false);
    setEditError('');
  };

  const handleDeleteDay = async () => {
    if (!editEntryId) {
      return;
    }
    Alert.alert(t('Usun wpis'), t('Czy na pewno usunac ten wpis?'), [
      { text: t('Anuluj'), style: 'cancel' },
      {
        text: t('Usun'),
        style: 'destructive',
        onPress: async () => {
          await deleteTimeEntry.mutateAsync(editEntryId);
          closeDayEditor();
          showToast(t('Wpis usuniety.'));
        },
      },
    ]);
  };

  const handleSaveDay = async () => {
    if (!selectedEmployeeId || !editDay) {
      return;
    }
    const hoursValue = editStatus === 'work' ? parseFloat(editHours) || 0 : 0;
    if (editStatus === 'work' && hoursValue <= 0) {
      setEditError(t('Wprowadz poprawne godziny dla statusu Praca.'));
      return;
    }
    await createTimeEntry.mutateAsync({
      employee_id: selectedEmployeeId,
      date: format(editDay, 'yyyy-MM-dd'),
      hours: hoursValue,
      status: editStatus,
      notes: null,
    });
    closeDayEditor();
  };

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
        <Text style={styles.loadingText}>{t('Ladowanie pracownikow...')}</Text>
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
          <SectionTitle text={t('PRACOWNIK')} />

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
                label={selectedEmployee.active ? t('Aktywny') : t('Nieaktywny')}
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
              {selectedEmployee ? t('Zmien pracownika') : t('Wybierz pracownika')}
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
                  {format(selectedDate, 'LLLL yyyy', { locale })}
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
                    {t('Kalendarz')}
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
                    {t('Podsumowanie')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {isLoadingEntries ? (
              <Card style={styles.cardSpacing}>
                <View style={styles.centeredContent}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                  <Text style={styles.loadingText}>{t('Ladowanie danych...')}</Text>
                </View>
              </Card>
            ) : (
              <>
                {/* 4. Card "Podsumowanie miesiąca" */}
                <Card style={styles.cardSpacing}>
                  <SectionTitle text={t('PODSUMOWANIE MIESIACA')} />

                  {/* Rząd 3 StatBoxów */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBoxWrapper}>
                      <StatBox
                        value={formatHours(monthlyStats.totalHours, true)}
                          label={t('Lacznie godzin')}
                      />
                    </View>
                    <View style={styles.statBoxWrapper}>
                      <StatBox
                        value={String(monthlyStats.daysWithEntries)}
                          label={t('Dni z wpisami')}
                      />
                    </View>
                    <View style={styles.statBoxWrapper}>
                      <StatBox
                        value={formatHours(monthlyStats.averagePerDay, true)}
                          label={t('Srednia/dzien')}
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
                    <SectionTitle text={t('KALENDARZ')} />

                    {/* Nagłówki dni tygodnia */}
                    <View style={styles.weekDays}>
                      {weekDayLabels.map(day => (
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
                            isSameDay(day.date, today) && styles.dayCellToday,
                          ]}
                          onPress={() => openDayEditor(day.date)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              !day.isCurrentMonth && styles.dayNumberOutside,
                              isSameDay(day.date, today) && styles.dayNumberToday,
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
                    <SectionTitle text={t('SZCZEGOLY WYKAZ')} />

                    {timeEntries.length === 0 ? (
                      <Text style={styles.emptyText}>
                        {t('Brak wpisow dla wybranego miesiaca')}
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
                {t('Wybierz pracownika, aby zobaczyc jego miesieczne podsumowanie')}
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
              <Text style={styles.modalTitle}>{t('Wybierz pracownika')}</Text>
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
              <Text style={styles.modalCloseText}>{t('Zamknij')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Modal edycji dnia */}
      <Modal
        visible={isEditOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDayEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>{t('Edycja dnia')}</Text>
            <Text style={styles.editSubtitle}>
              {editDay ? format(editDay, 'dd.MM.yyyy', { locale }) : ''}
            </Text>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('Status')}</Text>
              <View style={styles.statusChipRow}>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusChip,
                      editStatus === option.value && styles.statusChipActive,
                    ]}
                    onPress={() => {
                      setEditStatus(option.value);
                      setEditError('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        editStatus === option.value && styles.statusChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {editStatus === 'work' && (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>{t('Godziny')}</Text>
                <TextInput
                  style={styles.hoursInput}
                  value={editHours}
                  onChangeText={(value) => {
                    setEditHours(value);
                    if (editError) {
                      setEditError('');
                    }
                  }}
                  keyboardType="numeric"
                  placeholder={t('np. 8')}
                />
              </View>
            )}

            {!!editError && <Text style={styles.editErrorText}>{editError}</Text>}

            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.btnSecondary} onPress={closeDayEditor}>
                <Text style={styles.btnSecondaryText}>{t('Anuluj')}</Text>
              </TouchableOpacity>
              {editEntryId && (
                <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteDay}>
                  <Text style={styles.btnDangerText}>{t('Usun')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSaveDay}
                activeOpacity={0.8}
              >
                <Text style={styles.btnPrimaryText}>{t('Zapisz')}</Text>
              </TouchableOpacity>
            </View>
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
     justifyContent: 'space-between',
     marginBottom: theme.spacing.sm,
     paddingHorizontal: 0,
  },
  weekDay: {
     fontSize: theme.fontSize.sm,
     fontWeight: '600',
     color: theme.colors.muted,
     width: 40,
     textAlign: 'center',
     marginHorizontal: 0,
  },
  calendarGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     justifyContent: 'space-between',
     width: '100%',
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
    backgroundColor: theme.colors.statusColors.work.bg,
    borderColor: theme.colors.statusColors.work.text,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  dayNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  dayNumberOutside: {
    color: theme.colors.muted,
  },
  dayNumberToday: {
    color: theme.colors.accent,
    fontWeight: '700',
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
  editModal: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
  },
  editTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  editSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginTop: 4,
  },
  editSection: {
    marginTop: theme.spacing.lg,
  },
  editLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  statusChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  statusChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: theme.colors.accent,
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    backgroundColor: theme.colors.background,
  },
  editErrorText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: theme.colors.dark,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnDanger: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.errorLight,
    borderWidth: 1,
    borderColor: theme.colors.error,
    alignItems: 'center',
  },
  btnDangerText: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.spacing.xl,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: theme.colors.dark,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
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
