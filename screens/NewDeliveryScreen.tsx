// ============================================================
// TimeTracker — Screen: NewDeliveryScreen
// Plik: src/screens/NewDeliveryScreen.tsx
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, Modal, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppHeader, PrimaryButton, BottomNav } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius } from '../theme';
import { useBaustellen } from '../hooks/useBaustellen';
import * as ImagePicker from 'expo-image-picker';

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

  const [classPicker, setClassPicker] = useState(false);
  const [newClassInput, setNewClassInput] = useState('');
  const [showNewClassInput, setShowNewClassInput] = useState(false);

  const [isScanning, setIsScanning] = useState(false);

  // Merge predefined + site-specific classes, deduplicated
  const availableClasses = useMemo(() => {
    const siteClasses = site?.asphaltClasses ?? [];
    const merged = [...new Set([...ASPHALT_CLASSES, ...siteClasses])];
    return merged.sort();
  }, [site?.asphaltClasses]);

  const isValid = asphaltClass !== '' && weight !== '' && parseFloat(weight) > 0;

  async function handleCamera() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Wymagany dostęp do kamery.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Błąd', 'Nie udało się otworzyć aparatu.');
    }
  }

  async function handleGallery() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Wymagany dostęp do galerii.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
    } catch (err) {
      console.error('Gallery error:', err);
      Alert.alert('Błąd', 'Nie udało się otworzyć galerii.');
    }
  }

  async function handleScanWaybill() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Wymagany dostęp do kamery.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      if (apiKey && asset.base64) {
        setIsScanning(true);
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: 'Odczytaj numer listu przewozowego / Lieferschein z tego dokumentu. Zwróć TYLKO sam numer, nic więcej. Jeśli nie możesz go znaleźć, zwróć pusty ciąg znaków.' },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${asset.base64}` } },
                ],
              }],
              max_tokens: 64,
            }),
          });
          const data = await response.json();
          const extracted = (data.choices?.[0]?.message?.content ?? '').trim();
          if (extracted) {
            setWaybill(extracted);
          } else {
            Alert.alert('OCR', 'Nie rozpoznano numeru — wpisz ręcznie.');
          }
        } finally {
          setIsScanning(false);
        }
      } else {
        // No OpenAI key — just set the photo so user can read it visually
        setPhotoUri(asset.uri);
        Alert.alert('Wskazówka', 'Brak klucza OpenAI. Odczytaj numer z zdjęcia i wpisz ręcznie.');
      }
    } catch (err) {
      setIsScanning(false);
      console.error('Scan error:', err);
    }
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
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => { setShowNewClassInput(false); setNewClassInput(''); setClassPicker(true); }}
            >
              <Text style={[styles.selectText, !asphaltClass && styles.selectPlaceholder]}>
                {asphaltClass || 'Wybierz klasę asfaltu'}
              </Text>
              <Text style={styles.selectChevron}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Asphalt class picker modal ────────────── */}
        <Modal visible={classPicker} transparent animationType="slide" onRequestClose={() => setClassPicker(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setClassPicker(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Klasa asfaltu</Text>

            <FlatList
              data={availableClasses}
              keyExtractor={item => item}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.classItem, asphaltClass === item && styles.classItemActive]}
                  onPress={() => { setAsphaltClass(item); setClassPicker(false); }}
                >
                  <Text style={[styles.classItemText, asphaltClass === item && styles.classItemTextActive]}>{item}</Text>
                  {asphaltClass === item && <Text style={styles.classCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.classDivider} />}
            />

            <View style={styles.classDivider} />

            {showNewClassInput ? (
              <View style={styles.newClassRow}>
                <TextInput
                  style={styles.newClassInput}
                  value={newClassInput}
                  onChangeText={setNewClassInput}
                  placeholder="np. AC 16"
                  placeholderTextColor={Colors.grayLight}
                  autoFocus
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.newClassConfirm, !newClassInput.trim() && { opacity: 0.4 }]}
                  disabled={!newClassInput.trim()}
                  onPress={() => {
                    const cls = newClassInput.trim().toUpperCase();
                    setAsphaltClass(cls);
                    setClassPicker(false);
                    setShowNewClassInput(false);
                    setNewClassInput('');
                  }}
                >
                  <Text style={styles.newClassConfirmText}>Dodaj</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addNewClassBtn} onPress={() => setShowNewClassInput(true)}>
                <Text style={styles.addNewClassText}>＋ Dodaj nową klasę</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalCancel} onPress={() => setClassPicker(false)}>
              <Text style={styles.modalCancelText}>Anuluj</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

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
          {/* Scan button — OCR */}
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanWaybill} disabled={isScanning}>
            {isScanning
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.scanIcon}>⬛</Text>
            }
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
  // ─── Class picker modal ────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.creamDark,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: FontSize.lg, fontFamily: FontFamily.semiBold,
    color: Colors.black, textAlign: 'center', marginBottom: 12,
    paddingHorizontal: Spacing.lg,
  },
  classItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
  },
  classItemActive: { backgroundColor: Colors.orange + '15' },
  classItemText: { fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.black },
  classItemTextActive: { color: Colors.orange, fontFamily: FontFamily.semiBold },
  classCheck: { fontSize: 18, color: Colors.orange },
  classDivider: { height: 1, backgroundColor: Colors.creamDark, marginHorizontal: Spacing.lg },
  addNewClassBtn: {
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  addNewClassText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.orange },
  newClassRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 8, gap: 10,
  },
  newClassInput: {
    flex: 1, backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    paddingVertical: 10, paddingHorizontal: 14,
    fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.black,
  },
  newClassConfirm: {
    backgroundColor: Colors.orange, borderRadius: Radius.sm,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  newClassConfirmText: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  modalCancel: {
    marginTop: 4, paddingVertical: 12, alignItems: 'center',
  },
  modalCancelText: { fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.grayMid },
});
