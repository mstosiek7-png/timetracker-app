// =====================================================
// Modal dodawania nowej budowy
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { theme } from '../constants/theme';
import { supabase } from '../services/supabase';
import { ConstructionSiteInsert, AsphaltTypeInsert } from '../types/models';

interface NewConstructionModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NewConstructionModal({ visible, onClose }: NewConstructionModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [asphaltTypes, setAsphaltTypes] = useState<string[]>(['AC 11 D S']);
  const [newAsphaltType, setNewAsphaltType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Mutacja do dodawania nowej budowy
  const addConstructionMutation = useMutation({
    mutationFn: async (data: { 
      site: ConstructionSiteInsert; 
      asphaltTypes: Array<Omit<AsphaltTypeInsert, 'site_id'>>;
    }) => {
      // Pobierz ID aktualnego użytkownika
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      // 1. Dodaj budowę
      const { data: site, error: siteError } = await supabase
        .from('construction_sites')
        .insert([{
          ...data.site,
          created_by: userId
        }])
        .select()
        .single();

      if (siteError) throw siteError;

      // 2. Dodaj klasy asfaltu
      if (data.asphaltTypes.length > 0) {
        const asphaltTypesWithSiteId = data.asphaltTypes.map(type => ({
          ...type,
          site_id: site.id,
          created_by: userId
        }));

        const { error: asphaltError } = await supabase
          .from('asphalt_types')
          .insert(asphaltTypesWithSiteId);

        if (asphaltError) throw asphaltError;
      }

      return site;
    }
  });

  // Dodawanie nowej klasy asfaltu
  const handleAddAsphaltType = () => {
    if (newAsphaltType.trim()) {
      setAsphaltTypes([...asphaltTypes, newAsphaltType.trim()]);
      setNewAsphaltType('');
    }
  };

  // Usuwanie klasy asfaltu
  const handleRemoveAsphaltType = (index: number) => {
    if (asphaltTypes.length > 1) {
      const updated = [...asphaltTypes];
      updated.splice(index, 1);
      setAsphaltTypes(updated);
    } else {
      Alert.alert('Uwaga', 'Musi pozostać przynajmniej jedna klasa asfaltu');
    }
  };

  // Resetowanie formularza
  const resetForm = () => {
    setName('');
    setAddress('');
    setAsphaltTypes(['AC 11 D S']);
    setNewAsphaltType('');
    setIsSubmitting(false);
  };

  // Walidacja i zapis
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Nazwa budowy jest wymagana');
      return;
    }

    if (asphaltTypes.length === 0) {
      Alert.alert('Błąd', 'Dodaj przynajmniej jedną klasę asfaltu');
      return;
    }

    // Sprawdź czy użytkownik jest zalogowany
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Błąd', 'Musisz być zalogowany aby dodać budowę');
      return;
    }

    setIsSubmitting(true);

    const siteData: ConstructionSiteInsert = {
      name: name.trim(),
      address: address.trim() || null,
      status: 'active',
    };

    // site_id zostanie dodane później w mutacji
    const asphaltTypesData = asphaltTypes.map(type => ({
      name: type,
    }));

    addConstructionMutation.mutate(
      { site: siteData, asphaltTypes: asphaltTypesData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
          queryClient.invalidateQueries({ queryKey: ['site-statistics'] });
          resetForm();
          // Zamknij modal
          if (typeof onClose === 'function') {
            onClose();
          }
          Alert.alert('Sukces', 'Nowa budowa została dodana');
        },
        onError: (error) => {
          console.error('Błąd dodawania budowy:', error);
          Alert.alert('Błąd', 'Nie udało się dodać budowy');
          setIsSubmitting(false);
        }
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Nagłówek modalu */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nowa budowa</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              activeOpacity={0.6}
            >
              <Ionicons name="close-circle" size={28} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Nazwa budowy */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nazwa budowy *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="np. A40 Sanierung Abschnitt 3"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Adres */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adres</Text>
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="np. A40, 45127 Essen"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Klasy asfaltu */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Klasy asfaltu *</Text>
              <Text style={styles.inputHint}>Dodaj przynajmniej jedną klasę</Text>
              
              {/* Lista istniejących klas */}
              <View style={styles.asphaltTypesList}>
                {asphaltTypes.map((type, index) => (
                  <View key={index} style={styles.asphaltTypeItem}>
                    <Text style={styles.asphaltTypeText}>{type}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveAsphaltType(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.muted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Dodawanie nowej klasy */}
              <View style={styles.addAsphaltContainer}>
                <TextInput
                  style={styles.addAsphaltInput}
                  value={newAsphaltType}
                  onChangeText={setNewAsphaltType}
                  placeholder="np. SMA 11 S"
                  placeholderTextColor={theme.colors.muted}
                  onSubmitEditing={handleAddAsphaltType}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddAsphaltType}
                  disabled={!newAsphaltType.trim()}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={newAsphaltType.trim() ? theme.colors.card : theme.colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Przyciski akcji */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.saveButtonText}>Zapisywanie...</Text>
              ) : (
                <Text style={styles.saveButtonText}>Zapisz</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  modalContent: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  inputHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  asphaltTypesList: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  asphaltTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  asphaltTypeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  addAsphaltContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  addAsphaltInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
