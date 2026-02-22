// ============================================================
// TimeTracker — Screen: CalculatorScreen
// Plik: src/screens/CalculatorScreen.tsx
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader, BottomNav } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const ADDONS = [
  { label: '+ 5%',    value: 5    },
  { label: '+ 10%',   value: 10   },
  { label: 'Własny %', value: -1  },
];

export default function CalculatorScreen({ navigation }: Props) {
  const [density, setDensity]     = useState(2.40);
  const [area, setArea]           = useState('');
  const [thickness, setThickness] = useState('');
  const [addon, setAddon]         = useState<number | null>(null);
  const [customAddon, setCustomAddon] = useState('');
  const [showDensityModal, setShowDensityModal] = useState(false);
  const [densityInput, setDensityInput] = useState(density.toFixed(2));

  const DENSITY_PRESETS = [2.20, 2.30, 2.40, 2.50, 2.60];

  const areaNum      = parseFloat(area)      || 0;
  const thicknessNum = parseFloat(thickness) || 0;
  const baseResult   = (areaNum * thicknessNum * density) / 100;

  const addonPercent = addon === -1
    ? (parseFloat(customAddon) || 0)
    : (addon ?? 0);

  const totalResult = baseResult * (1 + addonPercent / 100);

  const hasResult = areaNum > 0 && thicknessNum > 0;

  const fmt = (n: number) => hasResult ? n.toFixed(2) : '—';

  function editDensity() {
    setDensityInput(density.toFixed(2));
    setShowDensityModal(true);
  }

  function saveDensity() {
    const v = parseFloat(densityInput.replace(',', '.'));
    if (!isNaN(v) && v > 0) {
      setDensity(v);
      setShowDensityModal(false);
    } else {
      Alert.alert('Błąd', 'Podaj poprawną gęstość (t/m³).');
    }
  }

  function clearAll() {
    setArea('');
    setThickness('');
    setAddon(null);
    setCustomAddon('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader title="Kalkulator Asfaltu" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: Spacing.lg }} />

        {/* ─── Density ───────────────────────────────── */}
        <View style={styles.densityCard}>
          <View>
            <Text style={styles.densityLabel}>Gęstość materiału</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={styles.densityValue}>{density.toFixed(2)}</Text>
              <Text style={styles.densityUnit}>t/m³</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.densityEditBtn} onPress={editDensity}>
            <Text style={styles.densityEditText}>✏️ Zmień gęstość</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.densityPresetRow}>
          {DENSITY_PRESETS.map((preset) => {
            const label = preset.toFixed(2);
            const isActive = density.toFixed(2) === label;
            return (
              <TouchableOpacity
                key={label}
                style={[styles.densityPresetChip, isActive && styles.densityPresetChipActive]}
                onPress={() => {
                  setDensity(preset);
                  setDensityInput(label);
                }}
              >
                <Text style={[styles.densityPresetText, isActive && styles.densityPresetTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Inputs ────────────────────────────────── */}
        <View style={styles.inputsRow}>
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Powierzchnia</Text>
              <Text style={styles.inputUnit}>m²</Text>
            </View>
            <TextInput
              style={styles.inputField}
              value={area}
              onChangeText={setArea}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.grayLight}
            />
          </View>
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Grubość warstwy</Text>
              <Text style={styles.inputUnit}>cm</Text>
            </View>
            <TextInput
              style={styles.inputField}
              value={thickness}
              onChangeText={setThickness}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.grayLight}
            />
          </View>
        </View>

        {/* ─── Formula bar ───────────────────────────── */}
        <View style={styles.formulaBar}>
          <Text style={styles.formulaText}>
            <Text style={styles.formulaAccent}>{areaNum || '—'}</Text>
            {' '}m² ×{' '}
            <Text style={styles.formulaAccent}>{thicknessNum || '—'}</Text>
            {' '}cm ×{' '}
            <Text style={styles.formulaAccent}>{density.toFixed(2)}</Text>
            {' '}t/m³ ÷ 100 ={' '}
            <Text style={styles.formulaAccent}>{fmt(baseResult)}</Text>
            {' '}t
          </Text>
        </View>

        {/* ─── Result ────────────────────────────────── */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Wynik bazowy</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={styles.resultValue}>{fmt(baseResult)}</Text>
            <Text style={styles.resultUnit}>t</Text>
          </View>
        </View>

        {/* ─── Addon ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Naddatek</Text>
          <View style={styles.addonRow}>
            {ADDONS.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.addonChip, addon === (a.value === -1 ? -1 : a.value) && styles.addonChipSelected]}
                onPress={() => setAddon(prev => prev === (a.value === -1 ? -1 : a.value) ? null : (a.value === -1 ? -1 : a.value))}
              >
                <Text style={[styles.addonChipText, addon === (a.value === -1 ? -1 : a.value) && styles.addonChipTextSelected]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {addon === -1 && (
            <View style={{ marginTop: Spacing.md }}>
              <TextInput
                style={styles.customAddonInput}
                value={customAddon}
                onChangeText={setCustomAddon}
                keyboardType="decimal-pad"
                placeholder="Podaj %"
                placeholderTextColor={Colors.grayLight}
              />
            </View>
          )}
        </View>

        {/* ─── Summary strip ─────────────────────────── */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Wynik bazowy</Text>
            <Text style={styles.summaryValue}>{fmt(baseResult)} t</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>RAZEM</Text>
            <Text style={styles.summaryTotalValue}>{fmt(totalResult)} t</Text>
          </View>
          {hasResult && addon !== null && (
            <Text style={styles.summaryFormula}>
              {fmt(baseResult)} t + {addonPercent}% = {fmt(totalResult)} t
            </Text>
          )}
        </View>

        {/* ─── Clear ─────────────────────────────────── */}
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearBtnText}>↺ Wyczyść kalkulator</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="Calculator" onNavigate={(s) => navigation.navigate(s)} />

      <Modal
        transparent
        visible={showDensityModal}
        animationType="fade"
        onRequestClose={() => setShowDensityModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDensityModal(false)}
        />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Zmień gęstość</Text>
          <Text style={styles.modalSubtitle}>Podaj nową gęstość (t/m³)</Text>
          <View style={styles.presetRow}>
            {DENSITY_PRESETS.map((preset) => {
              const label = preset.toFixed(2);
              const isActive = densityInput.replace(',', '.') === label;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => setDensityInput(label)}
                >
                  <Text style={[styles.presetText, isActive && styles.presetTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={styles.modalInput}
            value={densityInput}
            onChangeText={setDensityInput}
            keyboardType="decimal-pad"
            placeholder="np. 2.40"
            placeholderTextColor={Colors.grayLight}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={() => setShowDensityModal(false)}
            >
              <Text style={styles.modalBtnGhostText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={saveDensity}
            >
              <Text style={styles.modalBtnPrimaryText}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  densityCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  densityLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  densityValue: { fontFamily: 'DMMono_700Bold', fontSize: 32, color: Colors.orange },
  densityUnit: { fontSize: FontSize.sm, color: Colors.grayMid },
  densityEditBtn: {
    backgroundColor: Colors.creamDark, borderRadius: Radius.pill,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  densityEditText: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.grayDark },
  densityPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  densityPresetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.creamDark,
    backgroundColor: Colors.cream,
  },
  densityPresetChipActive: { borderColor: Colors.orange, backgroundColor: Colors.orangePale },
  densityPresetText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.grayDark },
  densityPresetTextActive: { color: Colors.orange },
  inputsRow: { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  inputCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, ...Shadows.sm },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { fontSize: 9, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.7 },
  inputUnit: { fontSize: 9, color: Colors.grayLight },
  inputField: { fontFamily: 'DMMono_700Bold', fontSize: 26, color: Colors.black },
  formulaBar: {
    backgroundColor: Colors.black, borderRadius: Radius.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, alignItems: 'center',
  },
  formulaText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  formulaAccent: { color: Colors.orange, fontFamily: FontFamily.bold },
  resultCard: {
    backgroundColor: Colors.orange, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.xl, alignItems: 'center',
  },
  resultLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  resultValue: { fontFamily: 'DMMono_700Bold', fontSize: 44, color: '#fff' },
  resultUnit: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.sm,
  },
  cardTitle: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  addonRow: { flexDirection: 'row', gap: 8 },
  addonChip: {
    flex: 1, paddingVertical: 10,
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    alignItems: 'center',
  },
  addonChipSelected: { backgroundColor: Colors.orangePale, borderColor: Colors.orange },
  addonChipText: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.grayDark },
  addonChipTextSelected: { color: Colors.orange },
  customAddonInput: {
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.orange,
    paddingVertical: 12, paddingHorizontal: 16,
    fontSize: FontSize.lg, color: Colors.black, fontFamily: FontFamily.medium,
  },
  summaryStrip: {
    backgroundColor: Colors.black, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  summaryLabel: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.6)' },
  summaryValue: { fontFamily: 'DMMono_500Medium', fontSize: FontSize.md, color: 'rgba(255,255,255,0.85)' },
  summaryTotal: { paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4 },
  summaryTotalLabel: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryTotalValue: { fontFamily: 'DMMono_700Bold', fontSize: 22, color: Colors.orange },
  summaryFormula: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 4 },
  clearBtn: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.creamDark, borderRadius: Radius.sm,
    paddingVertical: 12, alignItems: 'center',
  },
  clearBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.grayMid },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 320,
    transform: [{ translateX: -160 }, { translateY: -140 }],
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  modalTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.black, marginBottom: 4 },
  modalSubtitle: { fontSize: FontSize.sm, color: Colors.grayMid, marginBottom: Spacing.md },
  modalInput: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.creamDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: FontSize.lg,
    fontFamily: FontFamily.medium,
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center' },
  modalBtnGhost: { backgroundColor: Colors.creamDark },
  modalBtnGhostText: { color: Colors.black, fontFamily: FontFamily.semiBold, fontSize: FontSize.base },
  modalBtnPrimary: { backgroundColor: Colors.orange },
  modalBtnPrimaryText: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: FontSize.base },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.creamDark,
    backgroundColor: Colors.cream,
  },
  presetChipActive: { borderColor: Colors.orange, backgroundColor: Colors.orangePale },
  presetText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.grayDark },
  presetTextActive: { color: Colors.orange },
});
