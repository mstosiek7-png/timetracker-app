// =====================================================
// Dashboard Screen - TimeTracker Main Dashboard
// =====================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Modal,
  Portal,
  Card as PaperCard,
  Title,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatBox } from '../../components/ui/StatBox';
import { FAB } from '../../components/ui/FAB';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { EmptyState } from '../../components/ui/EmptyState';

import { useEmployees } from '../../hooks/useEmployees';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { useTimeEntryStats } from '../../hooks/useTimeEntries';
import TimeEntryForm from '../../components/time/TimeEntryForm';
import BulkTimeEntryModal from '../../components/time/BulkTimeEntryModal';
import { EmployeeList } from '../../components/employee/EmployeeList';
import { EmployeeForm } from '../../components/employee/EmployeeForm';
import { useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '../../hooks/useTimeEntries';
import { TimeEntry, TimeEntryInsert, TimeEntryStatus } from '../../types/models';

// =====================================================
// Helper Functions
// =====================================================

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    work: 'Praca',
    sick: 'Chorobowe',
    vacation: 'Urlop',
    fza: 'FZA',
  };
  return labels[status] || status;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// =====================================================
// Main Component
// =====================================================

export default function DashboardScreen() {
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [showBulkEntryModal, setShowBulkEntryModal] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | null>(null);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [showFullEmployeeList, setShowFullEmployeeList] = useState(false);

  // Hooks
  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    error: employeesError,
    refetch: refetchEmployees,
  } = useEmployees();

  const {
    data: timeEntries = [],
    isLoading: isLoadingEntries,
    error: timeEntriesError,
    refetch: refetchEntries,
  } = useTimeEntries();

  const { data: stats } = useTimeEntryStats();
  const { mutateAsync: createTimeEntry, isPending: isCreating } = useCreateTimeEntry();
  const { mutateAsync: updateTimeEntry, isPending: isUpdating } = useUpdateTimeEntry();
  const { mutateAsync: deleteTimeEntry } = useDeleteTimeEntry();

  // =====================================================
  // Handlers
  // =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchEmployees(), refetchEntries()]);
    } catch (error) {
      console.error('Błąd odświeżania danych:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeEntrySubmit = async (data: TimeEntryInsert | TimeEntry) => {
    try {
      if (selectedTimeEntry) {
        const { id, ...updateData } = data as TimeEntry;
        await updateTimeEntry({ id: selectedTimeEntry.id, ...updateData });
        Alert.alert('Sukces', 'Wpis czasu pracy został zaktualizowany');
      } else {
        await createTimeEntry(data as TimeEntryInsert);
        Alert.alert('Sukces', 'Nowy wpis czasu pracy został dodany');
      }
      setShowTimeEntryModal(false);
      setSelectedTimeEntry(null);
    } catch (error) {
      Alert.alert('Błąd', error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania');
    }
  };

  const handleTimeEntryCancel = () => {
    setShowTimeEntryModal(false);
    setSelectedTimeEntry(null);
  };

  const handleEditTimeEntry = (timeEntry: TimeEntry) => {
    setSelectedTimeEntry(timeEntry);
    setShowTimeEntryModal(true);
  };

  const handleDeleteTimeEntry = (timeEntry: TimeEntry) => {
    Alert.alert(
      'Usuń wpis',
      `Czy na pewno chcesz usunąć wpis z ${format(new Date(timeEntry.date), 'dd.MM.yyyy')}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTimeEntry(timeEntry.id);
              Alert.alert('Sukces', 'Wpis został usunięty');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć wpisu');
            }
          },
        },
      ]
    );
  };

  const handleBulkEntrySuccess = () => {
    setShowBulkEntryModal(false);
    Alert.alert('Sukces', 'Zbiorcze wpisy zostały dodane');
  };

  // =====================================================
  // Render
  // =====================================================

  const isLoading = isLoadingEmployees || isLoadingEntries;
  const hasError = employeesError || timeEntriesError;

  if (isLoading && !hasError) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Ładowanie dashboardu...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Błąd ładowania danych</Text>
        <Text style={styles.errorText}>
          {employeesError?.message || timeEntriesError?.message || 'Wystąpił nieoczekiwany błąd'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            if (employeesError) refetchEmployees();
            if (timeEntriesError) refetchEntries();
          }}
        >
          <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeEmployeesCount = employees.filter((emp) => emp.active).length;
  const recentEntries = timeEntries.slice(0, 5);
  const today = format(new Date(), 'dd.MM.yyyy', { locale: pl });

  const statusData: { status: TimeEntryStatus; label: string; hours: string }[] = [
    { status: 'work', label: 'PRACA', hours: `${stats?.workHours?.toFixed(1) || '0.0'}h` },
    { status: 'sick', label: 'CHOROBOWE', hours: `${stats?.sickHours?.toFixed(1) || '0.0'}h` },
    { status: 'vacation', label: 'URLOPY', hours: `${stats?.vacationHours?.toFixed(1) || '0.0'}h` },
    { status: 'fza', label: 'FZA', hours: `${stats?.fzaHours?.toFixed(1) || '0.0'}h` },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. PageHeader */}
      <PageHeader
        title=""
        subtitle=""
        rightAction={
          <View style={styles.headerRightContainer}>
            <Text style={styles.headerDate}>{today}</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/auth/sign-in')}
            >
              <Ionicons name="log-in-outline" size={20} color={theme.colors.accent} />
              <Text style={styles.loginButtonText}>Logowanie</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View
        style={styles.scrollContent}
      >
        {/* 2. Szybkie akcje */}
        <Card>
          <SectionTitle text="SZYBKIE AKCJE" />
          <View style={styles.fabRow}>
            <FAB
              label="+ Dodaj wpis"
              icon="✏️"
              onPress={() => setShowTimeEntryModal(true)}
            />
            <TouchableOpacity
              style={styles.fabDark}
              onPress={() => setShowBulkEntryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.fabDarkIcon}>📋</Text>
              <Text style={styles.fabDarkLabel}>Zbiorczo</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 3. Ostatnie wpisy */}
        <Card>
          <SectionTitle
            text="OSTATNIE WPISY"
            rightText="Zobacz wszystkie"
            onRightPress={() => {}}
          />
          {recentEntries.length === 0 ? (
            <EmptyState
              icon="⏱️"
              title="Brak wpisów"
              subtitle="Dodaj pierwszy wpis czasu pracy"
            />
          ) : (
            <View style={styles.entriesList}>
              {recentEntries.map((entry) => {
                const employee = employees.find((emp) => emp.id === entry.employee_id);
                const statusColor = theme.colors.statusColors[entry.status as TimeEntryStatus]?.text || theme.colors.accent;
                return (
                  <Card key={entry.id} leftBorderColor={statusColor}>
                    <View style={styles.entryRow}>
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryEmployee}>
                          {employee?.name || 'Nieznany pracownik'}
                        </Text>
                        <Text style={styles.entryDate}>
                          {format(new Date(entry.date), 'dd.MM.yyyy')} • {entry.hours}h
                        </Text>
                        {entry.notes ? (
                          <Text style={styles.entryNotes} numberOfLines={1}>
                            {entry.notes}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.entryActions}>
                        <StatusBadge status={entry.status as TimeEntryStatus} size="sm" />
                        <View style={styles.entryButtons}>
                          <TouchableOpacity onPress={() => handleEditTimeEntry(entry)} style={styles.iconBtn}>
                            <Text style={styles.iconBtnText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteTimeEntry(entry)} style={styles.iconBtn}>
                            <Text style={styles.iconBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </Card>

        {/* 4. Wszyscy pracownicy — kliknięcie otwiera widok miesięczny */}
        <Card>
          <SectionTitle text="PRACOWNICY" />
          {employees.length === 0 ? (
            <EmptyState icon="👥" title="Brak pracowników" />
          ) : (
            <View style={styles.pillsContainer}>
              {employees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={styles.pill}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/monthly',
                      params: { employeeId: emp.id },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.pillAvatar}>
                    <Text style={styles.pillInitials}>{getInitials(emp.name)}</Text>
                  </View>
                  <Text style={styles.pillName}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* 7. Zarządzanie pracownikami */}
        <Card>
          <SectionTitle
            text="ZARZĄDZANIE PRACOWNIKAMI"
            rightText="Zobacz wszystkich"
            onRightPress={() => setShowFullEmployeeList(true)}
          />
          {employees.slice(0, 2).map((emp) => (
            <TouchableOpacity
              key={emp.id}
              style={styles.employeeCard}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/monthly',
                  params: { employeeId: emp.id },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{emp.name}</Text>
                <Text style={styles.employeePosition}>{emp.position || '—'}</Text>
              </View>
              <StatusBadge status={emp.active ? 'work' : 'fza'} size="sm" />
            </TouchableOpacity>
          ))}
          <View style={styles.managementActions}>
            <TouchableOpacity
              style={styles.addEmployeeBtn}
              onPress={() => setShowEmployeeManagement(true)}
            >
              <Text style={styles.addEmployeeBtnText}>+ Dodaj pracownika</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      {/* Modal dla pojedynczego wpisu */}
      <Portal>
        <Modal
          visible={showTimeEntryModal}
          onDismiss={handleTimeEntryCancel}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard>
            <PaperCard.Content>
              <Title style={styles.modalTitle}>
                {selectedTimeEntry ? 'Edytuj wpis czasu pracy' : 'Dodaj nowy wpis czasu pracy'}
              </Title>

              <TimeEntryForm
                onSubmit={handleTimeEntrySubmit}
                onCancel={handleTimeEntryCancel}
                initialData={selectedTimeEntry || undefined}
                isLoading={isCreating || isUpdating}
                submitButtonText={selectedTimeEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
              />
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>

      {/* Modal dla zbiorczego wpisu */}
      <BulkTimeEntryModal
        visible={showBulkEntryModal}
        onDismiss={() => setShowBulkEntryModal(false)}
        onSuccess={handleBulkEntrySuccess}
      />

      {/* Modal dla dodawania pracownika */}
      <EmployeeForm
        visible={showEmployeeManagement}
        onClose={() => setShowEmployeeManagement(false)}
        mode="create"
      />

      {/* Modal dla pełnej listy pracowników z akcjami */}
      {showFullEmployeeList && (
        <Portal>
          <Modal
            visible={showFullEmployeeList}
            onDismiss={() => setShowFullEmployeeList(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <PaperCard>
              <PaperCard.Content>
                <Title style={styles.modalTitle}>Zarządzanie pracownikami</Title>
                <EmployeeList
                  showActions={true}
                  onEmployeePress={() => {}}
                />
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setShowFullEmployeeList(false)}
                >
                  <Text style={styles.closeModalBtnText}>Zamknij</Text>
                </TouchableOpacity>
              </PaperCard.Content>
            </PaperCard>
          </Modal>
        </Portal>
      )}
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
    paddingTop: 0,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    paddingBottom: 100,
    gap: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.lg,
    color: theme.colors.muted,
  },
  errorTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.statusColors.sick.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
  },
  retryButtonText: {
    color: theme.colors.card,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },

  // Header
  headerDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Status grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statusTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '30%',
    marginBottom: theme.spacing.xs,
  },
  statusHours: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },

  // FAB row
  fabRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  fabDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  fabDarkIcon: {
    fontSize: theme.fontSize.md,
    color: theme.colors.card,
  },
  fabDarkLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },

  // Entries list
  entriesList: {
    gap: theme.spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryEmployee: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  entryDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginTop: 2,
  },
  entryNotes: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  entryActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  entryButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  iconBtn: {
    padding: theme.spacing.xs,
  },
  iconBtnText: {
    fontSize: theme.fontSize.md,
  },

  // Pills (active employees)
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  pillAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInitials: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.card,
  },
  pillName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },

  // Employee cards
  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  employeePosition: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginTop: 2,
  },
  managementActions: {
    marginTop: theme.spacing.md,
  },
  addEmployeeBtn: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  addEmployeeBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.accent,
  },

  // Modals
  modalContainer: {
    margin: theme.spacing.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.dark,
  },
  closeModalBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  closeModalBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.mid,
  },

  // Header right container
  headerRightContainer: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
  },
  loginButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
