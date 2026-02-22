// =====================================================
// EmployeeForm Component - Formularz dodawania/edytowania pracownika
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useCreateEmployee, useUpdateEmployee } from '../../hooks/useEmployees';
import { OutlineButton, PrimaryButton, Checkbox } from '../ui';
import { Colors, Spacing, FontFamily, FontSize, Radius } from '../../theme';
import { EmployeeInsert, EmployeeUpdate } from '../../types/models';
import { useI18n } from '../../i18n/I18nProvider';

interface EmployeeFormProps {
  visible: boolean;
  onClose: () => void;
  employee?: {
    id: string;
    name: string;
    position: string;
    active: boolean;
  };
  mode?: 'create' | 'edit';
}

export function EmployeeForm({
  visible,
  onClose,
  employee,
  mode = 'create',
}: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    position: employee?.position || '',
    active: employee?.active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useI18n();

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('Imie i nazwisko sa wymagane');
    }

    if (!formData.position.trim()) {
      newErrors.position = t('Stanowisko jest wymagane');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: formData.name.trim(),
          position: formData.position.trim(),
          active: formData.active,
        });

        Alert.alert(t('Sukces'), t('Pracownik zostal dodany pomyslnie'));
      } else if (employee) {
        await updateMutation.mutateAsync({
          id: employee.id,
          name: formData.name.trim(),
          position: formData.position.trim(),
          active: formData.active,
        });

        Alert.alert(t('Sukces'), t('Dane pracownika zostaly zaktualizowane'));
      }

      handleClose();
    } catch (error) {
      Alert.alert(
        t('Blad'),
        error instanceof Error ? error.message : t('Wystapil nieoczekiwany blad')
      );
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      position: '',
      active: true,
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          {/* ─── Colored header ────────────────────── */}
          <View style={styles.colorHeader}>
            <View style={styles.handle} />
            <Text style={styles.headerTitle}>{mode === 'create' ? t('Dodaj pracownika') : t('Edytuj pracownika')}</Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* ─── Name ──────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('Imie i nazwisko')}</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder={t('Np. Jan Kowalski')}
                maxLength={255}
                autoCapitalize="words"
                placeholderTextColor={Colors.grayLight}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* ─── Position ──────────────────────────– */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('Stanowisko')}</Text>
              <TextInput
                style={[styles.input, errors.position && styles.inputError]}
                value={formData.position}
                onChangeText={(value) => handleInputChange('position', value)}
                placeholder={t('Np. Kierownik budowy')}
                maxLength={100}
                autoCapitalize="words"
                placeholderTextColor={Colors.grayLight}
              />
              {errors.position && <Text style={styles.errorText}>{errors.position}</Text>}
            </View>

            {/* ─── Active checkbox ───────────────────── */}
            <View style={styles.section}>
              <View style={styles.checkboxRow}>
                <Checkbox checked={formData.active} onToggle={() => handleInputChange('active', !formData.active)} />
                <Text style={styles.checkboxLabel}>{t('Aktywny pracownik')}</Text>
              </View>
              <Text style={styles.helperText}>{t('Nieaktywni pracownicy nie beda wyswietlani przy dodawaniu godzin')}</Text>
            </View>

            <View style={{ height: Spacing.xxxl }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <OutlineButton label={t('Anuluj')} onPress={handleClose} style={{ flex: 1, minHeight: 52 }} />
            <PrimaryButton
              label={mode === 'create' ? t('Dodaj pracownika') : t('Zapisz')}
              onPress={handleSubmit}
              loading={isLoading}
              style={{ flex: 1, minHeight: 52 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  colorHeader: {
    backgroundColor: Colors.orange,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: FontSize.h3, fontFamily: FontFamily.bold, color: '#fff' },
  body: { paddingHorizontal: Spacing.xl },
  section: { marginTop: Spacing.xl },
  label: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    fontFamily: FontFamily.regular, fontSize: FontSize.md,
    paddingVertical: 12, paddingHorizontal: 14,
    color: Colors.black,
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: FontSize.xs, color: '#ef4444', marginTop: Spacing.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.sm },
  checkboxLabel: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.black },
  helperText: { fontSize: FontSize.xs, color: Colors.grayMid, fontStyle: 'italic', marginTop: Spacing.xs },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.creamDark,
    justifyContent: 'center', alignItems: 'center',
  },
});

export { EmployeeForm };