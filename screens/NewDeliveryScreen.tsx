// ============================================================
// TimeTracker — Screen: NewDeliveryScreen
// Plik: src/screens/NewDeliveryScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { AppHeader, PrimaryButton, BottomNav } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius } from '../theme';
import { useBaustellen } from '../hooks/useBaustellen';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

const ASPHALT_CLASSES = ['AC 11', 'AC 11 D S', 'AC 32', 'SMA 11', 'SMA 8', 'MA 11'];

export default function NewDeliveryScreen({ navigation, route }: Props) {
  const siteId = route.params?.siteId;
  const { addDelivery, getSite } = useBaustellen();
  const site = getSite(siteId);

  const [asphaltClass, setAsphaltClass] = useState('');
  const [weight, setWeight] = useState('');
  const [waybill, setWaybill] = useState('');
  const [supplier, setSupplier] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const isValid = asphaltClass !== '' && weight !== '' && parseFloat(weight) > 0;

  async function handleCamera() {
    const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  }

  async function handleGallery() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  }

  async function handleSave() {
    await addDelivery({
      siteId,
      asphaltClass,
      tons: parseFloat(weight),
      waybill: waybill || undefined,
      supplier: supplier || undefined,
      photoUri: photoUri || undefined,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader
        title="Nowa dostawa"
        subtitle={site?.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: Spacing.lg }} />

        {/* ─── Asphalt class ─────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Klasa asfaltu</Text>
          <View style={styles.selectWrap}>
            {/* Simulated select — w produkcji użyj react-native-picker lub ActionSheet */}
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => {
                Alert.alert('Wybierz klasę asfaltu', '', ASPHALT_CLASSES.map(cls => ({
                  text: cls, onPress: () => setAsphaltClass(cls),
                })).concat([{ text: 'Anuluj', onPress: () => {} }]));
              }}
            >
              <Text style={[styles.selectText, !asphaltClass && styles.selectPlaceholder]}>
                {asphaltClass || 'Wybierz klasę asfaltu'}
              </Text>
              <Text style={styles.selectChevron}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Weight ────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Waga (tony)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="np. 24.5"
              placeholderTextColor={Colors.grayLight}
            />
            <Text style={styles.inputUnit}>t</Text>
          </View>
        </View>

        {/* ─── Waybill ───────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>List przewozowy <Text style={styles.optional}>(opcjonalnie)</Text></Text>
          <View style={[styles.inputWrap, { paddingRight: 52 }]}>
            <TextInput
              style={styles.input}
              value={waybill}
              onChangeText={setWaybill}
              placeholder="np. LS-20240318-001"
              placeholderTextColor={Colors.grayLight}
            />
          </View>
          {/* Scan button — requires expo-barcode-scanner */}
          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Scanner', { onScan: (code: string) => setWaybill(code) })}>
            <Text style={styles.scanIcon}>⬛</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Supplier ──────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Dostawca <Text style={styles.optional}>(opcjonalnie)</Text></Text>
          <TextInput
            style={styles.inputFull}
            value={supplier}
            onChangeText={setSupplier}
            placeholder="np. Kemna Bau"
            placeholderTextColor={Colors.grayLight}
          />
        </View>

        {/* ─── Photo ─────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Zdjęcie <Text style={styles.optional}>(opcjonalnie)</Text></Text>
          {photoUri ? (
            <View style={styles.photoPreview}>
              {/* Image preview */}
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                <Text style={styles.removePhotoText}>✕ Usuń zdjęcie</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoBtns}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Aparat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleGallery}>
                <Text style={styles.photoBtnIcon}>🖼</Text>
                <Text style={styles.photoBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.saveBar}>
        <PrimaryButton
          label="💾 Zapisz dostawę"
          onPress={handleSave}
          disabled={!isValid}
          fullWidth
          size="lg"
        />
      </View>

      <BottomNav active="Baustellen" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  fieldGroup: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.lg,
    position: 'relative',
  },
  fieldLabel: {
    fontSize: FontSize.xs, fontFamily: FontFamily.semiBold,
    color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  optional: { fontFamily: FontFamily.regular, textTransform: 'none', letterSpacing: 0, color: Colors.grayLight },
  selectWrap: {},
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    paddingVertical: 13, paddingHorizontal: 16,
  },
  selectText: { fontSize: FontSize.lg, fontFamily: FontFamily.medium, color: Colors.black },
  selectPlaceholder: { color: Colors.grayLight },
  selectChevron: { color: Colors.grayMid, fontSize: 12 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
  },
  input: {
    flex: 1, paddingVertical: 13, paddingHorizontal: 16,
    fontSize: FontSize.lg, fontFamily: FontFamily.medium, color: Colors.black,
  },
  inputUnit: { paddingRight: 16, fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.orange },
  inputFull: {
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    paddingVertical: 13, paddingHorizontal: 16,
    fontSize: FontSize.lg, fontFamily: FontFamily.medium, color: Colors.black,
  },
  scanBtn: {
    position: 'absolute', right: 16 + Spacing.lg, top: 42,
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center',
  },
  scanIcon: { fontSize: 18 },
  photoBtns: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.sm,
    paddingVertical: 14,
  },
  photoBtnIcon: { fontSize: 18 },
  photoBtnText: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  photoPreview: {
    height: 120, backgroundColor: Colors.creamDark,
    borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  removePhotoBtn: {},
  removePhotoText: { color: Colors.red, fontFamily: FontFamily.semiBold, fontSize: FontSize.base },
  saveBar: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.cream,
    borderTopWidth: 1, borderTopColor: Colors.creamDark,
  },
});
