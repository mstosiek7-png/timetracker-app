import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

// Constants
const DENSITY_KEY = '@calculator_density';
const DEFAULT_DENSITY = 2.40;
const DENSITY_STEP = 0.01;
const DECIMAL_PLACES = 1;

// Types
type AdditiveOption = '5' | '10' | 'custom' | null;

const CalculatorScreen = () => {
  // State
  const [area, setArea] = useState<string>('');
  const [thickness, setThickness] = useState<string>('');
  const [density, setDensity] = useState<number>(DEFAULT_DENSITY);
  const [densityInput, setDensityInput] = useState<string>(DEFAULT_DENSITY.toString());
  const [isEditingDensity, setIsEditingDensity] = useState<boolean>(false);
  const [customPercent, setCustomPercent] = useState<string>('');
  const [activeAdditive, setActiveAdditive] = useState<AdditiveOption>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calculations
  const parsedArea = parseFloat(area.replace(',', '.'));
  const parsedThickness = parseFloat(thickness.replace(',', '.'));
  
  const hasValidInput = !isNaN(parsedArea) && parsedArea > 0 && 
                        !isNaN(parsedThickness) && parsedThickness > 0;
  
  const baseResult = hasValidInput 
    ? (parsedArea * parsedThickness * density / 100)
    : 0;

  const addPercent = activeAdditive === '5' ? 5 :
                     activeAdditive === '10' ? 10 :
                     activeAdditive === 'custom' ? parseFloat(customPercent.replace(',', '.')) || 0 :
                     0;
  
  const additiveAmount = baseResult * (addPercent / 100);
  const totalResult = baseResult + additiveAmount;

  // Load saved density on mount
  useEffect(() => {
    loadDensity();
  }, []);

  const loadDensity = async () => {
    try {
      const saved = await AsyncStorage.getItem(DENSITY_KEY);
      if (saved) {
        const value = parseFloat(saved);
        if (!isNaN(value) && value > 0) {
          setDensity(value);
          setDensityInput(value.toString());
        }
      }
    } catch (error) {
      console.error('Error loading density:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDensity = async () => {
    try {
      await AsyncStorage.setItem(DENSITY_KEY, density.toString());
      setIsEditingDensity(false);
      Alert.alert('Sukces', 'Gęstość zapisana.');
    } catch (error) {
      console.error('Error saving density:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać gęstości.');
    }
  };

  const handleNumberInput = (text: string, setter: (val: string) => void) => {
    const sanitized = text.replace(/[^0-9.,]/g, '');
    setter(sanitized);
  };

  const handleAdditiveSelect = (option: AdditiveOption) => {
    setActiveAdditive(activeAdditive === option ? null : option);
  };

  const resetCalculator = () => {
    setArea('');
    setThickness('');
    setCustomPercent('');
    setActiveAdditive(null);
    Keyboard.dismiss();
  };

  const formatNumber = (num: number): string => {
    if (num === 0) return '—';
    return num.toFixed(DECIMAL_PLACES);
  };

  const getAdditiveLabel = (): string => {
    if (!activeAdditive) return '';
    if (activeAdditive === '5') return '+ 5%';
    if (activeAdditive === '10') return '+ 10%';
    if (activeAdditive === 'custom' && customPercent) return `+ ${customPercent}%`;
    return '';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <PageHeader
        subtitle=""
        title=""
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Density Card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gęstość materiału</Text>
          <Card>
            <View style={styles.densityRow}>
              <Text style={styles.densityLabel}>Gęstość</Text>
              <View style={styles.densityValueContainer}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <>
                    <Text style={styles.densityValue}>{density.toFixed(2)}</Text>
                    <Text style={styles.densityUnit}>t/m³</Text>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditingDensity(!isEditingDensity)}
            >
              <Ionicons name="pencil" size={14} color={theme.colors.mid} />
              <Text style={styles.editButtonText}>Zmień gęstość</Text>
            </TouchableOpacity>

            {isEditingDensity && (
              <View style={styles.editMode}>
                <View style={styles.editInputRow}>
                  <TextInput
                    style={styles.densityInput}
                    value={densityInput}
                    onChangeText={(text) => {
                      const sanitized = text.replace(/[^0-9.,]/g, '');
                      setDensityInput(sanitized);
                      const val = parseFloat(sanitized.replace(',', '.'));
                      if (!isNaN(val) && val > 0 && val <= 4) {
                        setDensity(val);
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholder="np. 2.40"
                    returnKeyType="done"
                    onSubmitEditing={saveDensity}
                    onBlur={() => Keyboard.dismiss()}
                    autoFocus={true}
                  />
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingDensity(false);
                      Keyboard.dismiss();
                      // Przywróć poprzednią wartość z AsyncStorage
                      loadDensity();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveDensity}>
                    <Text style={styles.saveButtonText}>Zapisz</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Input Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dane</Text>
          
          <Card style={styles.inputCard}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>POWIERZCHNIA</Text>
              <Text style={styles.fieldUnit}>m²</Text>
            </View>
            <TextInput
              style={styles.numberInput}
              value={area}
              onChangeText={(text) => handleNumberInput(text, setArea)}
              placeholder="0"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onBlur={() => Keyboard.dismiss()}
            />
          </Card>

          <Card style={styles.inputCard}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>GRUBOŚĆ WARSTWY</Text>
              <Text style={styles.fieldUnit}>cm</Text>
            </View>
            <TextInput
              style={styles.numberInput}
              value={thickness}
              onChangeText={(text) => handleNumberInput(text, setThickness)}
              placeholder="0"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onBlur={() => Keyboard.dismiss()}
            />
          </Card>
        </View>

        {/* Formula Preview */}
        <View style={styles.formulaContainer}>
          <View style={styles.formula}>
            <Text style={styles.formulaValue}>{area || '—'}</Text>
            <Text style={styles.formulaOperator}>m² ×</Text>
            <Text style={styles.formulaValue}>{thickness || '—'}</Text>
            <Text style={styles.formulaOperator}>cm ×</Text>
            <Text style={styles.formulaValue}>{density.toFixed(2)}</Text>
            <Text style={styles.formulaOperator}>t/m³ ÷ 100 =</Text>
            <Text style={styles.formulaResult}>
              {hasValidInput ? `${formatNumber(baseResult)} t` : '— t'}
            </Text>
          </View>
        </View>

        {/* Base Result */}
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>WYNIK BAZOWY</Text>
          <View style={styles.resultValueContainer}>
            <Text style={styles.resultValue}>
              {hasValidInput ? formatNumber(baseResult) : '—'}
            </Text>
            <Text style={styles.resultUnit}>t</Text>
          </View>
        </View>

        {/* Additive Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Naddatek</Text>
          <Card>
            <Text style={styles.additiveTitle}>Wybierz naddatek</Text>

            {/* +5% */}
            <TouchableOpacity
              style={[
                styles.checkboxRow,
                activeAdditive === '5' && styles.checkboxRowActive,
              ]}
              onPress={() => handleAdditiveSelect('5')}
            >
              <View style={styles.checkboxLeft}>
                <View style={[
                  styles.checkbox,
                  activeAdditive === '5' && styles.checkboxActive,
                ]}>
                  {activeAdditive === '5' && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>+ 5%</Text>
              </View>
              <Text style={styles.checkboxResult}>
                {hasValidInput ? `+${formatNumber(baseResult * 0.05)} t` : ''}
              </Text>
            </TouchableOpacity>

            {/* +10% */}
            <TouchableOpacity
              style={[
                styles.checkboxRow,
                activeAdditive === '10' && styles.checkboxRowActive,
              ]}
              onPress={() => handleAdditiveSelect('10')}
            >
              <View style={styles.checkboxLeft}>
                <View style={[
                  styles.checkbox,
                  activeAdditive === '10' && styles.checkboxActive,
                ]}>
                  {activeAdditive === '10' && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>+ 10%</Text>
              </View>
              <Text style={styles.checkboxResult}>
                {hasValidInput ? `+${formatNumber(baseResult * 0.10)} t` : ''}
              </Text>
            </TouchableOpacity>

            {/* Custom % */}
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[
                  styles.customHeader,
                  activeAdditive === 'custom' && styles.checkboxRowActive,
                ]}
                onPress={() => handleAdditiveSelect('custom')}
              >
                <View style={styles.checkboxLeft}>
                  <View style={[
                    styles.checkbox,
                    activeAdditive === 'custom' && styles.checkboxActive,
                  ]}>
                    {activeAdditive === 'custom' && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Własny %</Text>
                </View>
                <Text style={styles.checkboxResult}>
                  {hasValidInput && activeAdditive === 'custom' && customPercent
                    ? `+${formatNumber(baseResult * (parseFloat(customPercent.replace(',', '.')) || 0) / 100)} t`
                    : ''
                  }
                </Text>
              </TouchableOpacity>

              {activeAdditive === 'custom' && (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customPercentInput}
                    value={customPercent}
                    onChangeText={(text) => handleNumberInput(text, setCustomPercent)}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onBlur={() => Keyboard.dismiss()}
                  />
                  <Text style={styles.percentSign}>%</Text>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Final Sum */}
        <Card style={styles.finalSumCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Wynik bazowy</Text>
            <Text style={styles.summaryValue}>
              {hasValidInput ? `${formatNumber(baseResult)} t` : '— t'}
            </Text>
          </View>

          {hasValidInput && activeAdditive && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{getAdditiveLabel()}</Text>
                <Text style={styles.summaryValue}>+{formatNumber(additiveAmount)} t</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>RAZEM</Text>
            <View style={styles.totalValueContainer}>
              <Text style={styles.totalValue}>
                {hasValidInput ? formatNumber(totalResult) : '—'}
              </Text>
              <Text style={styles.totalUnit}>t</Text>
            </View>
          </View>

          <Text style={styles.formulaText}>
            {hasValidInput
              ? activeAdditive
                ? `${formatNumber(baseResult)} t + ${addPercent}% (${formatNumber(additiveAmount)} t) = ${formatNumber(totalResult)} t`
                : `${formatNumber(baseResult)} t`
              : '— t + —% = — t'
            }
          </Text>
        </Card>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetCalculator}
        >
          <Text style={styles.resetButtonText}>↺ Wyczyść kalkulator</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  densityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  densityLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  densityValueContainer: {
    alignItems: 'flex-end',
  },
  densityValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  densityUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.mid,
    marginLeft: 4,
  },
  editMode: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  densityInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  saveButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.mid,
  },
  inputCard: {
    marginBottom: theme.spacing.sm,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  fieldUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
  },
  numberInput: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.dark,
    paddingVertical: theme.spacing.xs,
    minHeight: 30,
  },
  formulaContainer: {
    marginVertical: theme.spacing.sm,
  },
  formula: {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 3,
  },
  formulaValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    color: theme.colors.accent,
    fontVariant: ['tabular-nums'],
  },
  formulaOperator: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.4)',
  },
  formulaResult: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  resultBox: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  resultLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  resultValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  resultValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  resultUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  additiveTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  checkboxRowActive: {
    backgroundColor: '#FFF8F4',
  },
  checkboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkboxLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  checkboxResult: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
    fontVariant: ['tabular-nums'],
  },
  customRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 0,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 0,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  customPercentInput: {
    width: 70,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    color: theme.colors.dark,
    textAlign: 'center',
  },
  percentSign: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  finalSumCard: {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.5)',
  },
  summaryValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.accent,
    fontVariant: ['tabular-nums'],
  },
  totalUnit: {
    fontSize: theme.fontSize.md,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },
  formulaText: {
    fontSize: theme.fontSize.xs,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'right',
    marginTop: 2,
  },
  resetButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  resetButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default CalculatorScreen;