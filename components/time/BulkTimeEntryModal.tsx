// =====================================================
// BulkTimeEntryModal - Zbiorcze wprowadzanie godzin
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Modal,
  Portal,
  Button,
  TextInput,
  Text,
  Divider,
  Chip,
  HelperText,
  ActivityIndicator,
  DataTable,
  Checkbox,
  Surface,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { TimeEntryInsert, TimeEntryStatus } from '../../types/models';
import { useEmployees } from '../../hooks/useEmployees';
import { useCreateBulkTimeEntries } from '../../hooks/useTimeEntries';

// =====================================================
// Types
// =====================================================

interface BulkTimeEntryModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

interface EmployeeEntry {
  id: string;
  name: string;
  position: string;
  hours: string;
  status: TimeEntryStatus;
  selected: boolean;
}

// =====================================================
// Main Component
// =====================================================

export default function BulkTimeEntryModal({
  visible,
  onDismiss,
  onSuccess,
}: BulkTimeEntryModalProps) {
  // State
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [defaultHours, setDefaultHours] = useState<string>('8');
  const [defaultStatus, setDefaultStatus] = useState<TimeEntryStatus>('work');
  const [employeeEntries, setEmployeeEntries] = useState<EmployeeEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { mutateAsync: createBulkEntries, isPending } = useCreateBulkTimeEntries();

  // =====================================================
  // Effects
// =====================================================

  useEffect(() => {
    if (employees.length > 0) {
      const initialEntries = employees
        .filter(emp => emp.active)
        .map(employee => ({
          id: employee.id,
          name: employee.name,
          position: employee.position,
          hours: defaultHours,
          status: defaultStatus,
          selected: true,
        }));
      setEmployeeEntries(initialEntries);
    }
  }, [employees, defaultHours, defaultStatus]);

  // =====================================================
  // Handlers
// =====================================================

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const updateEmployeeEntry = (
    employeeId: string,
    updates: Partial<Omit<EmployeeEntry, 'id' | 'name' | 'position'>>
  ) => {
    setEmployeeEntries(prev =>
      prev.map(entry =>
        entry.id === employeeId ? { ...entry, ...updates } : entry
      )
    );
  };

  const toggleAllSelection = (selected: boolean) => {
    setEmployeeEntries(prev =>
      prev.map(entry => ({ ...entry, selected }))
    );
  };

  const applyDefaultToAll = () => {
    setEmployeeEntries(prev =>
      prev.map(entry => ({
        ...entry,
        hours: defaultHours,
        status: defaultStatus,
      }))
    );
  };

  const validateEntries = (): boolean => {
    const hasInvalidHours = employeeEntries.some(entry => {
      const hoursNum = parseFloat(entry.hours);
      return entry.selected && (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24);
    });

    if (hasInvalidHours) {
      Alert.alert('Błąd', 'Wprowadź poprawne wartości godzin (0-24) dla wybranych pracowników');
      return false;
    }

    const hasSelectedEmployees = employeeEntries.some(entry => entry.selected);
    if (!hasSelectedEmployees) {
      Alert.alert('Błąd', 'Wybierz co najmniej jednego pracownika');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateEntries()) {
      return;
    }

    setIsSaving(true);

    try {
      const selectedEntries = employeeEntries.filter(entry => entry.selected);
      const timeEntriesData: TimeEntryInsert[] = selectedEntries.map(entry => ({
        employee_id: entry.id,
        date: format(date, 'yyyy-MM-dd'),
        hours: parseFloat(entry.hours),
        status: entry.status,
        notes: null,
      }));

      await createBulkEntries(timeEntriesData);

      Alert.alert(
        'Sukces',
        `Dodano wpisy dla ${selectedEntries.length} pracowników`,
        [{ text: 'OK', onPress: handleClose }]
      );

      onSuccess?.();
    } catch (error) {
      Alert.alert(
        'Błąd',
        error instanceof Error ? error.message : 'Nie udało się zapisać wpisów'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setEmployeeEntries([]);
    onDismiss();
  };

  // =====================================================
  // Render
// =====================================================

  const isValidHours = (hoursStr: string) => {
    const hoursNum = parseFloat(hoursStr);
    return !isNaN(hoursNum) && hoursNum > 0 && hoursNum <= 24;
  };

  const selectedCount = employeeEntries.filter(entry => entry.selected).length;
  const isLoading = isLoadingEmployees || isPending || isSaving;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.container}>
          <ScrollView>
            {/* Nagłówek */}
            <View style={styles.header}>
              <Text style={styles.title}>Zbiorcze wprowadzanie godzin</Text>
              <Text style={styles.subtitle}>
                Data: {format(date, 'dd.MM.yyyy', { locale: pl })}
              </Text>
            </View>

            <Divider style={styles.divider} />

            {/* Ustawienia domyślne */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ustawienia domyślne</Text>
              
              <View style={styles.defaultSettings}>
                <View style={styles.defaultInput}>
                  <Text style={styles.label}>Domyślne godziny</Text>
                  <TextInput
                    value={defaultHours}
                    onChangeText={setDefaultHours}
                    placeholder="8"
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.smallInput}
                    error={!isValidHours(defaultHours)}
                  />
                  <HelperText type="error" visible={!isValidHours(defaultHours)}>
                    Nieprawidłowe godziny
                  </HelperText>
                </View>

                <View style={styles.defaultInput}>
                  <Text style={styles.label}>Domyślny status</Text>
                  <View style={styles.statusChips}>
                    {(['work', 'sick', 'vacation', 'fza'] as TimeEntryStatus[]).map(stat => (
                      <Chip
                        key={stat}
                        selected={defaultStatus === stat}
                        onPress={() => setDefaultStatus(stat)}
                        style={styles.statusChip}
                      >
                        {getStatusLabel(stat)}
                      </Chip>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.defaultActions}>
                <Button
                  mode="outlined"
                  onPress={() => applyDefaultToAll()}
                  disabled={isLoading}
                  compact
                >
                  Zastosuj do wszystkich
                </Button>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Kalendarz */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data</Text>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
                icon="calendar"
                disabled={isLoading}
              >
                Wybierz datę
              </Button>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Lista pracowników */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pracownicy</Text>
                <View style={styles.sectionActions}>
                  <Button
                    mode="text"
                    onPress={() => toggleAllSelection(true)}
                    disabled={isLoading}
                    compact
                  >
                    Zaznacz wszystkich
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => toggleAllSelection(false)}
                    disabled={isLoading}
                    compact
                  >
                    Odznacz wszystkich
                  </Button>
                </View>
              </View>

              <Text style={styles.hint}>
                Wybrano: {selectedCount} z {employeeEntries.length} pracowników
              </Text>

              {isLoadingEmployees ? (
                <ActivityIndicator style={styles.loading} />
              ) : (
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Wybór</DataTable.Title>
                    <DataTable.Title>Pracownik</DataTable.Title>
                    <DataTable.Title numeric>Godziny</DataTable.Title>
                    <DataTable.Title>Status</DataTable.Title>
                  </DataTable.Header>

                  {employeeEntries.map(entry => (
                    <DataTable.Row key={entry.id}>
                      <DataTable.Cell>
                        <Checkbox
                          status={entry.selected ? 'checked' : 'unchecked'}
                          onPress={() =>
                            updateEmployeeEntry(entry.id, { selected: !entry.selected })
                          }
                          disabled={isLoading}
                        />
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={styles.employeeName}>{entry.name}</Text>
                        <Text style={styles.employeePosition}>{entry.position}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        <TextInput
                          value={entry.hours}
                          onChangeText={hours =>
                            updateEmployeeEntry(entry.id, { hours })
                          }
                          keyboardType="numeric"
                          mode="outlined"
                          style={styles.hoursInput}
                          dense
                          disabled={isLoading || !entry.selected}
                          error={!isValidHours(entry.hours) && entry.selected}
                        />
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <View style={styles.statusSelect}>
                          {(['work', 'sick', 'vacation', 'fza'] as TimeEntryStatus[]).map(stat => (
                            <Chip
                              key={stat}
                              selected={entry.status === stat}
                              onPress={() =>
                                updateEmployeeEntry(entry.id, { status: stat })
                              }
                              disabled={isLoading || !entry.selected}
                              style={styles.smallChip}
                              compact
                            >
                              {getStatusLabel(stat).substring(0, 3)}
                            </Chip>
                          ))}
                        </View>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              )}
            </View>

            {/* Przyciski */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleClose}
                style={styles.cancelButton}
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={isLoading}
                disabled={isLoading || selectedCount === 0}
                style={styles.saveButton}
                icon="check-all"
              >
                Zapisz ({selectedCount})
              </Button>
            </View>
          </ScrollView>
        </Surface>
      </Modal>
    </Portal>
  );
}

// =====================================================
// Helper Functions
// =====================================================

function getStatusLabel(status: TimeEntryStatus): string {
  const labels = {
    work: 'Praca',
    sick: 'Chorobowe',
    vacation: 'Urlop',
    fza: 'FZA',
  };
  return labels[status];
}

// =====================================================
// Styles
// =====================================================

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    maxHeight: '80%',
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196f3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  divider: {
    marginHorizontal: 20,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  defaultSettings: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  defaultInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  smallInput: {
    backgroundColor: 'white',
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    margin: 2,
  },
  defaultActions: {
    alignItems: 'flex-start',
  },
  dateButton: {
    alignSelf: 'flex-start',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  loading: {
    marginVertical: 40,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  employeePosition: {
    fontSize: 12,
    color: '#666',
  },
  hoursInput: {
    width: 80,
    backgroundColor: 'white',
  },
  statusSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  smallChip: {
    height: 24,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});