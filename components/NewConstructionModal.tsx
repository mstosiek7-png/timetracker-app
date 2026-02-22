// ============================================================
// NewConstructionModal â€” new design system
// ============================================================
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { PrimaryButton, OutlineButton } from './ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useBaustellen } from '../hooks/useBaustellen';
import { useI18n } from '../i18n/I18nProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  siteDate?: string;
}

const DEFAULT_TYPES = ['AC 11 D S'];

export default function NewConstructionModal({ visible, onClose, siteDate }: Props) {
  const { createSite } = useBaustellen();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [asphaltTypes, setAsphaltTypes] = useState<string[]>(DEFAULT_TYPES);
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setAddress('');
    setAsphaltTypes(DEFAULT_TYPES);
    setNewType('');
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function addType() {
    const t = newType.trim();
    if (t && !asphaltTypes.includes(t)) {
      setAsphaltTypes(prev => [...prev, t]);
    }
    setNewType('');
  }

  function removeType(i: number) {
    if (asphaltTypes.length <= 1) {
      Alert.alert(t('Uwaga'), t('Musi byc przynajmniej jedna klasa asfaltu'));
      return;
    }
    setAsphaltTypes(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('Blad'), t('Podaj nazwe budowy'));
      return;
    }
    setSaving(true);
    try {
      await createSite({
        name: name.trim(),
        address: address.trim() || undefined,
        siteDate,
      });
      Alert.alert(t('Sukces'), t('Budowa zostala dodana'));
      handleClose();
    } catch (e: any) {
      Alert.alert(t('Blad'), e.message ?? t('Nie udalo sie dodac budowy'));
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('Nowa budowa')}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeX}>âś•</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={styles.label}>{t('Nazwa budowy')} *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('np. A40 Sanierung Abschnitt 3')}
              placeholderTextColor={Colors.grayLight}
            />

            {/* Address */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>{t('Adres')}</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder={t('np. A40, 45127 Essen')}
              placeholderTextColor={Colors.grayLight}
            />

            {/* Asphalt types */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>{t('Klasy asfaltu')}</Text>
            {asphaltTypes.map((t, i) => (
              <View key={i} style={styles.typeRow}>
                <Text style={styles.typeText}>{t}</Text>
                <TouchableOpacity onPress={() => removeType(i)} style={styles.removeBtn}>
                  <Text style={styles.removeX}>âś•</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={newType}
                onChangeText={setNewType}
                placeholder={t('np. SMA 11 S')}
                placeholderTextColor={Colors.grayLight}
                onSubmitEditing={addType}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, !newType.trim() && { opacity: 0.4 }]}
                onPress={addType}
                disabled={!newType.trim()}
              >
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <OutlineButton label={t('Anuluj')} onPress={handleClose} style={{ flex: 1 }} />
            <PrimaryButton label={t('Zapisz')} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: Colors.black },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.creamDark,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: Colors.grayMid, fontFamily: FontFamily.semiBold },
  body: { padding: Spacing.xl },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.grayMid,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.creamDark,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.creamDark,
  },
  typeText: { fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.black },
  removeBtn: { padding: 4 },
  removeX: { fontSize: 13, color: Colors.grayMid },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  addBtn: {
    width: 48, height: 48, borderRadius: Radius.sm,
    backgroundColor: Colors.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.creamDark,
  },
});
