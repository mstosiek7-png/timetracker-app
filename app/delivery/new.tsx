// =====================================================
// Dodaj Dostawę — Formularz dostawy
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { theme } from '../../constants/theme';
import { ASPHALT_CLASSES } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import { DeliveryInsert, AsphaltType } from '../../types/models';
import Card from '../../components/ui/Card';
import { useProcessImage } from '../../hooks/useOCR';

export default function NewDeliveryScreen() {
  const router = useRouter();
  const { site_id } = useLocalSearchParams();
  const queryClient = useQueryClient();

  // State
  const [selectedAsphaltClass, setSelectedAsphaltClass] = useState<string | null>(null);
  const [selectedAsphaltTypeId, setSelectedAsphaltTypeId] = useState<string | null>(null);
  const [showAsphaltPicker, setShowAsphaltPicker] = useState(false);
  const [newAsphaltClass, setNewAsphaltClass] = useState('');
  const [tons, setTons] = useState('');
  const [lieferscheinNr, setLieferscheinNr] = useState('');
  const [supplier, setSupplier] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Hooks
  const { mutateAsync: processImage } = useProcessImage();

  // Fetch site details
  const { data: site } = useQuery({
    queryKey: ['construction-site', site_id],
    queryFn: async () => {
      if (!site_id || typeof site_id !== 'string') throw new Error('Invalid site ID');
      const { data, error } = await supabase
        .from('construction_sites')
        .select('*')
        .eq('id', site_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!site_id,
  });

  // Fetch asphalt types for this site or create if not exists
  const { data: asphaltTypesMap = {} } = useQuery({
    queryKey: ['asphalt-types', site_id],
    queryFn: async () => {
      if (!site_id || typeof site_id !== 'string') throw new Error('Invalid site ID');
      
      // Fetch existing asphalt types for this site
      const { data: existing, error } = await supabase
        .from('asphalt_types')
        .select('*')
        .eq('site_id', site_id);
      
      if (error) throw error;
      
      // Create map of class name to ID
      const map: Record<string, string> = {};
      (existing || []).forEach((type: AsphaltType) => {
        map[type.name] = type.id;
      });
      
      return map;
    },
    enabled: !!site_id,
  });

  // Fetch last delivery for this site to get the last used asphalt class
  const { data: lastDelivery } = useQuery({
    queryKey: ['last-delivery', site_id],
    queryFn: async () => {
      if (!site_id || typeof site_id !== 'string') throw new Error('Invalid site ID');
      
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          asphalt_type_id,
          asphalt_types(name)
        `)
        .eq('site_id', site_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!site_id,
  });

  // Set last used asphalt class as default
  useEffect(() => {
    if (lastDelivery && Array.isArray(lastDelivery.asphalt_types) && lastDelivery.asphalt_types[0]?.name && !selectedAsphaltClass) {
      setSelectedAsphaltClass(lastDelivery.asphalt_types[0].name);
      setSelectedAsphaltTypeId(lastDelivery.asphalt_type_id);
    }
  }, [lastDelivery, selectedAsphaltClass]);

  // Handle asphalt class selection
  const handleAsphaltClassSelect = async (className: string) => {
    if (!site_id || typeof site_id !== 'string') return;

    setShowAsphaltPicker(false);
    setSelectedAsphaltClass(className);

    // Check if this class already exists for this site
    if (asphaltTypesMap[className]) {
      setSelectedAsphaltTypeId(asphaltTypesMap[className]);
      return;
    }

    // Create new asphalt type if it doesn't exist
    try {
      const { data, error } = await supabase
        .from('asphalt_types')
        .insert([
          {
            site_id,
            name: className,
          },
        ])
        .select()
        .single();

      if (error) {
        // If duplicate key error, fetch the existing one
        if (error.code === '23505') {
          const { data: existing, error: fetchError } = await supabase
            .from('asphalt_types')
            .select('id')
            .eq('site_id', site_id)
            .eq('name', className)
            .single();

          if (fetchError) throw fetchError;
          setSelectedAsphaltTypeId(existing.id);
          return;
        }
        throw error;
      }

      setSelectedAsphaltTypeId(data.id);
    } catch (error: any) {
      console.error('Error creating asphalt type:', error);
      Alert.alert('Błąd', 'Nie udało się dodać klasy asfaltu');
    }
  };

  // Handle adding new asphalt class
  const handleAddNewAsphaltClass = async () => {
    if (!newAsphaltClass.trim()) {
      Alert.alert('Błąd', 'Wpisz nazwę klasy asfaltu');
      return;
    }

    if (!site_id || typeof site_id !== 'string') return;

    try {
      const className = newAsphaltClass.trim().toUpperCase();
      const { data, error } = await supabase
        .from('asphalt_types')
        .insert([
          {
            site_id,
            name: className,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Info', 'Ta klasa asfaltu już istnieje');
          return;
        }
        throw error;
      }

      setNewAsphaltClass('');
      setSelectedAsphaltClass(className);
      setSelectedAsphaltTypeId(data.id);
      setShowAsphaltPicker(false);
    } catch (error: any) {
      console.error('Error adding new asphalt class:', error);
      Alert.alert('Błąd', 'Nie udało się dodać nowej klasy asfaltu');
    }
  };

  // Add delivery mutation
  const addDeliveryMutation = useMutation({
    mutationFn: async () => {
      if (!site_id || typeof site_id !== 'string') {
        throw new Error('Brakuje ID budowy');
      }

      if (!selectedAsphaltTypeId) {
        throw new Error('Wybierz klasę asfaltu');
      }

      if (!tons || parseFloat(tons) <= 0) {
        throw new Error('Wprowadź prawidłową ilość ton');
      }

      let photoUrl: string | null = null;

      // Upload photo if selected
      if (photoUri) {
        const fileName = `delivery-${site_id}-${Date.now()}.jpg`;

        // Read file and upload
        const response = await fetch(photoUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) {
          throw new Error(`Upload zdjęcia nie powiódł się`);
        }

        const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(fileName);
        photoUrl = urlData?.publicUrl || null;
      }

      // Create delivery
      const delivery: DeliveryInsert = {
        site_id: site_id,
        asphalt_type_id: selectedAsphaltTypeId,
        tons: parseFloat(tons),
        lieferschein_nr: lieferscheinNr || null,
        supplier: supplier || null,
        delivery_time: new Date().toISOString(),
        photo_url: photoUrl,
      };

      const { error } = await supabase.from('deliveries').insert([delivery]);
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('Invalidating construction-sites query...');
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
      queryClient.refetchQueries({ queryKey: ['construction-sites'] });
      queryClient.invalidateQueries({ queryKey: ['site-deliveries', site_id] });
      queryClient.invalidateQueries({ queryKey: ['site-summary', site_id] });
      queryClient.invalidateQueries({ queryKey: ['construction-site', site_id] });
      Alert.alert('Sukces', 'Dostawa została dodana', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Błąd', error.message || 'Nie udało się dodać dostawy');
    },
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoFileName(result.assets[0].fileName || 'Zdjęcie');
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoFileName('Zdjęcie z aparatu');
    }
  };

  // Handle scanning lieferschein
  const handleScanLieferschein = async () => {
    try {
      setIsScanning(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const imageUri = result.assets[0].uri;
        const ocrResult = await processImage(imageUri);

        // Try to extract lieferschein number and tons from OCR text
        if (ocrResult?.text) {
          console.log('OCR Text:', ocrResult.text);
          
          // Look for lieferschein number pattern (e.g., "LS-001" or similar)
          const numberMatch = ocrResult.text.match(/([A-Z]{0,3}[-]?\d{3,})/i);
          const extractedNumber = numberMatch ? numberMatch[0] : ocrResult.text.substring(0, 50);
          setLieferscheinNr(extractedNumber);

          // Look for weight/tons pattern - more flexible regex
          // Matches: 24.5, 24,5, 24.50, 024,50, 5.5, etc.
          const weightMatch = ocrResult.text.match(/(\d{1,3}[.,]\d{1,2}|\d+[.,]\d+)/);
          if (weightMatch) {
            const weight = weightMatch[1].replace(',', '.'); // normalize to dot
            console.log('Weight extracted:', weight);
            setTons(weight);
          } else {
            console.log('No weight found in text');
          }

          Alert.alert('Sukces', `Numer: ${extractedNumber}${weightMatch ? `\nWaga: ${weightMatch[1]} t` : '\n(Waga nie znaleziona)'}`);
        }
      }
    } catch (error: any) {
      console.error('Error scanning lieferschein:', error);
      Alert.alert('Błąd', 'Nie udało się zeskanować lieferscheinu');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.card} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerSite}>{site?.name || 'Budowa'}</Text>
          <Text style={styles.headerTitle}>Nowa dostawa</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formArea}>
          {/* 1. Klasa asfaltu */}
          <View>
            <Text style={styles.fieldLabel}>Klasa asfaltu</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => {
                setNewAsphaltClass('');
                setShowAsphaltPicker(true);
              }}
            >
              <Text style={styles.selectorButtonText}>
                {selectedAsphaltClass || 'Wybierz klasę asfaltu'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.dark} />
            </TouchableOpacity>
          </View>

          {/* 2. Waga (Tony) */}
          <View>
            <Text style={styles.fieldLabel}>Waga (tony)</Text>
            <View style={styles.textFieldWithButton}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="np. 24.5"
                value={tons}
                onChangeText={setTons}
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.muted}
              />
              {tons ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setTons('')}
                >
                  <Ionicons name="close" size={20} color={theme.colors.card} />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.fieldSuffix}>t</Text>
            </View>
          </View>

          {/* 3. Numer listu przewozowego */}
          <View>
            <Text style={styles.fieldLabel}>List przewozowy (opcjonalnie)</Text>
            <View style={styles.textFieldWithButton}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="np. LS-20240318-001"
                value={lieferscheinNr}
                onChangeText={setLieferscheinNr}
                placeholderTextColor={theme.colors.muted}
              />
              {lieferscheinNr ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setLieferscheinNr('')}
                >
                  <Ionicons name="close" size={20} color={theme.colors.card} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanLieferschein}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color={theme.colors.card} />
                ) : (
                  <Ionicons name="barcode" size={20} color={theme.colors.card} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Dostawca */}
          <View>
            <Text style={styles.fieldLabel}>Dostawca (opcjonalnie)</Text>
            <View style={styles.textField}>
              <TextInput
                style={styles.textInput}
                placeholder="np. Kemna Bau"
                value={supplier}
                onChangeText={setSupplier}
                placeholderTextColor={theme.colors.muted}
              />
            </View>
          </View>

          {/* 5. Zdjęcie */}
          <View>
            <Text style={styles.fieldLabel}>Zdjęcie (opcjonalnie)</Text>
            {photoUri ? (
              <Card style={styles.photoCard}>
                <View style={styles.photoSelected}>
                  <View style={styles.photoThumb}>
                    <Ionicons name="image" size={32} color={theme.colors.accent} />
                  </View>
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoName}>{photoFileName}</Text>
                    <Text style={styles.photoHint}>Dotknij aby zmienić</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setPhotoUri(null);
                      setPhotoFileName(null);
                    }}
                    style={styles.removePhotoBtn}
                  >
                    <Ionicons name="close" size={20} color={theme.colors.muted} />
                  </TouchableOpacity>
                </View>
              </Card>
            ) : null}

            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera" size={20} color={theme.colors.card} />
                <Text style={styles.photoButtonText}>Aparat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handlePickImage}
              >
                <Ionicons name="image" size={20} color={theme.colors.card} />
                <Text style={styles.photoButtonText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacing */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => addDeliveryMutation.mutate()}
          disabled={addDeliveryMutation.isPending}
        >
          {addDeliveryMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.card} />
          ) : (
            <Text style={styles.saveButtonText}>Zapisz dostawę</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Asphalt Class Picker Modal */}
      <Modal
        visible={showAsphaltPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAsphaltPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz klasę asfaltu</Text>
              <TouchableOpacity
                onPress={() => setShowAsphaltPicker(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.dark} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ASPHALT_CLASSES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedAsphaltClass === item && styles.pickerItemSelected,
                  ]}
                  onPress={() => handleAsphaltClassSelect(item)}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedAsphaltClass === item && styles.pickerItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Add new asphalt class section */}
            <View style={styles.addNewAsphaltSection}>
              <Text style={styles.addNewAsphaltLabel}>Dodaj nową klasę</Text>
              <View style={styles.addNewAsphaltContainer}>
                <TextInput
                  style={styles.addNewAsphaltInput}
                  placeholder="np. AC 24"
                  placeholderTextColor={theme.colors.muted}
                  value={newAsphaltClass}
                  onChangeText={setNewAsphaltClass}
                />
                <TouchableOpacity
                  style={styles.addNewAsphaltButton}
                  onPress={handleAddNewAsphaltClass}
                >
                  <Ionicons name="add" size={20} color={theme.colors.card} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingTop: 40,
    backgroundColor: theme.colors.accent,
    gap: theme.spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerSite: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.card,
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.card,
    marginTop: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  formArea: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  asphaltPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  asphaltPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  asphaltPillSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  asphaltPillText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  asphaltPillTextSelected: {
    color: theme.colors.card,
  },
  textField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textFieldWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  textInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  scanButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldSuffix: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  photoCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  photoSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  photoThumb: {
    width: 50,
    height: 50,
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  photoHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    marginTop: 2,
  },
  removePhotoBtn: {
    padding: theme.spacing.sm,
  },
  photoActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.dark,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  photoButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.card,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectorButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '80%',
    paddingTop: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  pickerItem: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerItemSelected: {
    backgroundColor: theme.colors.accentLight,
  },
  pickerItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  pickerItemTextSelected: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  addNewAsphaltSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  addNewAsphaltLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  addNewAsphaltContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  addNewAsphaltInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  addNewAsphaltButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
