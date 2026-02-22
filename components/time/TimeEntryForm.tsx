// =====================================================
// TimeEntryForm Component - Formularz wpisu czasu pracy
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Button,
  TextInput,
  RadioButton,
  Text,
  Divider,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { de, pl } from 'date-fns/locale';

import { TimeEntry, TimeEntryInsert, TimeEntryStatus } from '../../types/models';
import { useEmployees } from '../../hooks/useEmployees';
import { formatHours } from '../../utils/formatting';
import { useI18n } from '../../i18n/I18nProvider';

// =====================================================
// Types
// =====================================================

interface TimeEntryFormProps {
  onSubmit: (data: TimeEntryInsert | TimeEntry) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TimeEntry>;
  isLoading?: boolean;
  submitButtonText?: string;
}

// =====================================================
// Main Component
// =====================================================

export default function TimeEntryForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  submitButtonText = 'Zapisz',
}: TimeEntryFormProps) {
  // State
  const [employeeId, setEmployeeId] = useState<string>(initialData?.employee_id || '');
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const [startTime, setStartTime] = useState<Date>(new Date(new Date().setHours(8, 0, 0)));
  const [endTime, setEndTime] = useState<Date>(new Date(new Date().setHours(16, 0, 0)));
  const [status, setStatus] = useState<TimeEntryStatus>(initialData?.status || 'work');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const { t, language } = useI18n();
  const locale = language === 'de' ? de : pl;

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();

  // =====================================================
  // Handlers
// =====================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Oblicz godziny tylko dla wpisów "praca"
    const calculatedHours = status === 'work' ? calculateHours() : 0;
    const formData: TimeEntryInsert = {
      employee_id: employeeId,
      date: format(date, 'yyyy-MM-dd'),
      hours: calculatedHours,
      status,
      notes: notes.trim() || null,
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Błąd zapisywania wpisu:', error);
    }
  };

  const calculateHours = (): number => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMinutes / 60;
    // Zwróć dokładną wartość (zostanie zapisana do bazy danych)
    return diffHours;
  };

  const validateForm = (): boolean => {
    if (!employeeId) {
      return false;
    }
    if (!date) {
      return false;
    }
    // Walidacja godzin tylko dla wpisów "praca"
    if (status === 'work' && startTime >= endTime) {
      return false;
    }
    return true;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  // =====================================================
  // Render
// =====================================================

  const isTimeValid = status === 'work' ? startTime < endTime : true;

  const isFormValid = employeeId && date && isTimeValid;

  const submitLabel = t(submitButtonText);

  const getStatusLabel = (statusValue: TimeEntryStatus): string => {
    const labels: Record<TimeEntryStatus, string> = {
      work: t('Praca'),
      sick: t('Chorobowe'),
      vacation: t('Urlop'),
      fza: t('FZA'),
    };
    return labels[statusValue];
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.form}>
        {/* Wybór pracownika */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('Pracownik')} *</Text>
          {isLoadingEmployees ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            <View style={styles.radioGroup}>
              {employees
                .filter(emp => emp.active)
                .map(employee => (
                  <View key={employee.id} style={styles.radioRow}>
                    <RadioButton
                      value={employee.id}
                      status={employeeId === employee.id ? 'checked' : 'unchecked'}
                      onPress={() => setEmployeeId(employee.id)}
                    />
                    <Text>{employee.name} ({employee.position})</Text>
                  </View>
                ))}
            </View>
          )}
          <HelperText type="error" visible={!employeeId}>
            {t('Wybierz pracownika')}
          </HelperText>
        </View>

        <Divider style={styles.divider} />

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('Data')} *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(date, 'dd.MM.yyyy', { locale })}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('Status')} *</Text>
          <View style={styles.radioGroup}>
            {(['work', 'sick', 'vacation', 'fza'] as TimeEntryStatus[]).map(stat => (
              <View key={stat} style={styles.radioRow}>
                <RadioButton
                  value={stat}
                  status={status === stat ? 'checked' : 'unchecked'}
                  onPress={() => setStatus(stat)}
                />
                <Text>{getStatusLabel(stat)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Godziny - tylko dla wpisów "praca" */}
        {status === 'work' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>{t('Godziny pracy')} *</Text>
              <View style={styles.timeRangeContainer}>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.timeLabel}>{t('Od')}</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowStartTimePicker(true)}
                    style={styles.timeButton}
                    icon="clock-in"
                  >
                    {format(startTime, 'HH:mm')}
                  </Button>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display="spinner"
                      onChange={onStartTimeChange}
                    />
                  )}
                </View>

                <View style={styles.timeInputWrapper}>
                  <Text style={styles.timeLabel}>{t('Do')}</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowEndTimePicker(true)}
                    style={styles.timeButton}
                    icon="clock-out"
                  >
                    {format(endTime, 'HH:mm')}
                  </Button>
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      display="spinner"
                      onChange={onEndTimeChange}
                    />
                  )}
                </View>

                <View style={styles.timeResultWrapper}>
                  <Text style={styles.timeLabel}>{t('Razem')}</Text>
                  <Text style={styles.hoursResult}>{formatHours(calculateHours(), true)}</Text>
                </View>
              </View>
              {startTime >= endTime && (
                <HelperText type="error">
                  {t('Godzina koncowa musi byc pozniejsza niz poczatkowa')}
                </HelperText>
              )}
              <HelperText type="info">
                {t('Godziny obliczane sa automatycznie')}
              </HelperText>
            </View>

            <Divider style={styles.divider} />
          </>
        )}

        {/* Notatki */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('Notatki (opcjonalnie)')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('Dodaj notatki do wpisu...')}
            multiline
            numberOfLines={3}
            style={styles.textArea}
            mode="outlined"
          />
          <HelperText type="info">
            {t('Notatki moga zawierac szczegoly dotyczace pracy')}
          </HelperText>
        </View>

        <Divider style={styles.divider} />

        {/* Przyciski */}
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={onCancel}
            style={styles.cancelButton}
            disabled={isLoading}
          >
            {t('Anuluj')}
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!isFormValid || isLoading}
            style={styles.submitButton}
          >
            {submitLabel}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

// =====================================================
// Styles
// =====================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioGroup: {
    marginLeft: -8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  divider: {
    marginVertical: 12,
  },
  dateButton: {
    alignSelf: 'flex-start',
  },
  timeButton: {
    alignSelf: 'flex-start',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeResultWrapper: {
    flex: 0.8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  hoursResult: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginTop: 4,
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    minHeight: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
  loading: {
    marginVertical: 20,
  },
});