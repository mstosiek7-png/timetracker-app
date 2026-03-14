// =====================================================
// Delivery Detail Page — Szczegoly dostawy
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import Card from '../../components/ui/Card';
import SectionTitle from '../../components/ui/SectionTitle';
import { useI18n } from '../../i18n/I18nProvider';

const ASPHALT_CLASSES = [
  'AC 5 D S', 'AC 8 D S', 'AC 11 D S', 'AC 16 D S',
  'AC 16 B S', 'AC 22 B S',
  'AC 22 T S', 'AC 32 T S', 'AC 32 TN',
  'SMA 5 S', 'SMA 8 S', 'SMA 11 S', 'SMA 16 S',
  'MA 8 S', 'MA 11 S',
  'PA 8', 'PA 11',
];

interface DeliveryDetailRow {
  id: string;
  tons: number | string | null;
  delivery_time: string;
  supplier: string | null;
  lieferschein_nr: string | null;
  photo_url: string | null;
  asphalt_type_id?: string | null;
  site_id?: string | null;
  asphalt_type_name?: string | null;
  site_name?: string | null;
  total_tons?: number | string | null;
  weight?: number | string | null;
  tony?: number | string | null;
  asphalt_types?: { name: string | null } | { name: string | null }[] | null;
  construction_sites?: { name: string | null } | { name: string | null }[] | null;
}

export default function DeliveryDetailScreen() {
  const router = useRouter();
  const { id: deliveryId } = useLocalSearchParams();
  const { t, language } = useI18n();
  const queryClient = useQueryClient();

  const [editVisible, setEditVisible] = useState(false);
  const [editTons, setEditTons] = useState('');
  const [editClass, setEditClass] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openEdit = () => {
    if (!delivery) return;
    setEditTons(formatTons(delivery));
    setEditClass(delivery.asphalt_type_name ?? '');
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!delivery || typeof deliveryId !== 'string') return;
    const tons = parseFloat(editTons.replace(',', '.'));
    if (!Number.isFinite(tons) || tons <= 0) {
      Alert.alert('Błąd', 'Podaj prawidłową ilość ton');
      return;
    }
    setIsSaving(true);
    try {
      let asphaltTypeId = delivery.asphalt_type_id ?? null;
      if (editClass !== delivery.asphalt_type_name && editClass && delivery.site_id) {
        const { data: existing } = await supabase
          .from('asphalt_types')
          .select('id')
          .eq('site_id', delivery.site_id)
          .eq('name', editClass)
          .single();
        if (existing) {
          asphaltTypeId = existing.id;
        } else {
          const { data: created, error: cErr } = await supabase
            .from('asphalt_types')
            .insert({ site_id: delivery.site_id, name: editClass })
            .select('id')
            .single();
          if (cErr) throw cErr;
          asphaltTypeId = created?.id ?? null;
        }
      }
      const { error } = await supabase
        .from('deliveries')
        .update({ tons, asphalt_type_id: asphaltTypeId })
        .eq('id', deliveryId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['delivery-detail', deliveryId] });
      await queryClient.invalidateQueries({ queryKey: ['site-deliveries', delivery.site_id] });
      await queryClient.invalidateQueries({ queryKey: ['site-summary', delivery.site_id] });
      await queryClient.invalidateQueries({ queryKey: ['baustellen'] });
      await queryClient.invalidateQueries({ queryKey: ['baustellen-week'] });
      setEditVisible(false);
    } catch (err) {
      Alert.alert('Błąd', err instanceof Error ? err.message : 'Nie udało się zapisać');
    } finally {
      setIsSaving(false);
    }
  };

  const { data: delivery, isLoading, error } = useQuery({
    queryKey: ['delivery-detail', deliveryId],
    queryFn: async () => {
      if (!deliveryId || typeof deliveryId !== 'string') {
        throw new Error('Invalid delivery ID');
      }

      const { data, error: fetchError } = await supabase
        .from('deliveries')
        .select('id, tons, delivery_time, supplier, lieferschein_nr, photo_url, site_id, asphalt_type_id, asphalt_types(name), construction_sites(name)')
        .eq('id', deliveryId)
        .single();

      if (fetchError) throw fetchError;

      const asphaltTypeName = Array.isArray(data?.asphalt_types)
        ? data?.asphalt_types?.[0]?.name
        : (data as any)?.asphalt_types?.name;
      const siteName = Array.isArray(data?.construction_sites)
        ? data?.construction_sites?.[0]?.name
        : (data as any)?.construction_sites?.name;

      return {
        ...(data as DeliveryDetailRow),
        asphalt_type_name: asphaltTypeName ?? null,
        site_name: siteName ?? null,
      } as DeliveryDetailRow;
    },
    enabled: !!deliveryId,
  });

  const formatTons = (row: DeliveryDetailRow) => {
    const raw = row.tons ?? row.total_tons ?? row.weight ?? row.tony;
    const parsed = typeof raw === 'string'
      ? parseFloat(raw.replace(',', '.'))
      : Number(raw);
    return Number.isFinite(parsed) ? parsed.toFixed(1) : '0.0';
  };

  const asphaltName = delivery?.asphalt_type_name ?? null;
  const siteName = delivery?.site_name ?? null;

  const timeLabel = delivery?.delivery_time
    ? new Date(delivery.delivery_time).toLocaleString(language === 'de' ? 'de-DE' : 'pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '—';

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (error || !delivery) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{t('Nie udalo sie zaladowac dostawy')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonError}>
          <Text style={styles.backButtonText}>{t('Wroc')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.card} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerSubtitle}>{t('Dostawa')}</Text>
          <Text style={styles.headerTitleText}>
            {asphaltName || t('Nieznany typ')}
          </Text>
        </View>
        <TouchableOpacity onPress={openEdit} style={styles.editButton}>
          <Ionicons name="pencil-outline" size={18} color={theme.colors.card} />
          <Text style={styles.editButtonText}>Edytuj</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.tonsCard}>
          <View style={styles.tonsRow}>
            <View style={styles.tonsBox}>
              <Text style={styles.tonsValue}>{formatTons(delivery)}</Text>
              <Text style={styles.tonsUnit}>t</Text>
            </View>
            <View style={styles.tonsInfo}>
              <Text style={styles.tonsLabel}>{asphaltName || t('Klasa asfaltu')}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionTitle text={t('Szczegoly')} />
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('Budowa')}</Text>
              <Text style={styles.detailValue}>{siteName || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('Data i godzina')}</Text>
              <Text style={styles.detailValue}>{timeLabel}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('Dostawca')}</Text>
              <Text style={styles.detailValue}>{delivery.supplier || t('Brak firmy')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lieferschein</Text>
              <Text style={styles.detailValue}>{delivery.lieferschein_nr || '—'}</Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle text={t('Zdjecie')} />
          <Card style={styles.photoCard}>
            {delivery.photo_url ? (
              <Image source={{ uri: delivery.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={28} color={theme.colors.muted} />
                <Text style={styles.photoText}>{t('Brak zdjecia')}</Text>
              </View>
            )}
          </Card>
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edytuj dostawę</Text>

            <Text style={styles.fieldLabel}>Tony (t)</Text>
            <TextInput
              style={styles.fieldInput}
              value={editTons}
              onChangeText={setEditTons}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.fieldLabel}>Klasa asfaltu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll} contentContainerStyle={styles.classScrollContent}>
              {ASPHALT_CLASSES.map(cls => (
                <TouchableOpacity
                  key={cls}
                  style={[styles.classChip, editClass === cls && styles.classChipSelected]}
                  onPress={() => setEditClass(cls)}
                >
                  <Text style={[styles.classChipText, editClass === cls && styles.classChipTextSelected]}>{cls}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {editClass ? (
              <Text style={styles.selectedClass}>Wybrano: <Text style={{ fontWeight: '800' }}>{editClass}</Text></Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>{isSaving ? '⏳' : 'Zapisz'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
  },
  backButtonError: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
  },
  backButtonText: {
    color: theme.colors.card,
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingTop: 40,
    backgroundColor: theme.colors.accent,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerTitleText: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.card,
    marginTop: theme.spacing.xs,
  },

  tonsCard: {
    marginBottom: theme.spacing.lg,
  },
  tonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  tonsBox: {
    width: 72,
    height: 72,
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tonsValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
    color: theme.colors.accent,
    lineHeight: theme.fontSize.xl + 4,
  },
  tonsUnit: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  tonsInfo: {
    flex: 1,
  },
  tonsLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },
  detailCard: {
    gap: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.dark,
  },

  photoCard: {
    padding: theme.spacing.md,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  photoPlaceholder: {
    height: 200,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  photoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  editButtonText: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.card },
  // modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: theme.spacing.lg, paddingBottom: 36,
  },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.dark, marginBottom: theme.spacing.lg },
  fieldLabel: {
    fontSize: theme.fontSize.xs, fontWeight: '700', color: theme.colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: theme.colors.background, borderRadius: theme.radius.md,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  classScroll: { marginBottom: 8 },
  classScrollContent: { gap: 8, paddingBottom: 4 },
  classChip: {
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  classChipSelected: { backgroundColor: theme.colors.accentLight, borderColor: theme.colors.accent },
  classChipText: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.mid },
  classChipTextSelected: { color: theme.colors.accent, fontWeight: '800' },
  selectedClass: { fontSize: theme.fontSize.sm, color: theme.colors.muted, marginBottom: theme.spacing.lg },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: theme.radius.pill,
    alignItems: 'center', backgroundColor: theme.colors.background,
  },
  cancelBtnText: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.muted },
  saveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: theme.radius.pill,
    alignItems: 'center', backgroundColor: theme.colors.accent,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: theme.fontSize.md, fontWeight: '700', color: '#fff' },
});
