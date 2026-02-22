// =====================================================
// Delivery Detail Page — Szczegoly dostawy
// =====================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import Card from '../../components/ui/Card';
import SectionTitle from '../../components/ui/SectionTitle';

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
    ? new Date(delivery.delivery_time).toLocaleString('pl-PL', {
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
        <Text style={styles.errorText}>Nie udalo sie zaladowac dostawy</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonError}>
          <Text style={styles.backButtonText}>Wroc</Text>
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
          <Text style={styles.headerSubtitle}>Dostawa</Text>
          <Text style={styles.headerTitleText}>
            {asphaltName || 'Nieznany typ'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.tonsCard}>
          <View style={styles.tonsRow}>
            <View style={styles.tonsBox}>
              <Text style={styles.tonsValue}>{formatTons(delivery)}</Text>
              <Text style={styles.tonsUnit}>t</Text>
            </View>
            <View style={styles.tonsInfo}>
              <Text style={styles.tonsLabel}>{asphaltName || 'Klasa asfaltu'}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionTitle text="Szczegoly" />
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Budowa</Text>
              <Text style={styles.detailValue}>{siteName || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Data i godzina</Text>
              <Text style={styles.detailValue}>{timeLabel}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dostawca</Text>
              <Text style={styles.detailValue}>{delivery.supplier || 'Brak firmy'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lieferschein</Text>
              <Text style={styles.detailValue}>{delivery.lieferschein_nr || '—'}</Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle text="Zdjecie" />
          <Card style={styles.photoCard}>
            {delivery.photo_url ? (
              <Image source={{ uri: delivery.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={28} color={theme.colors.muted} />
                <Text style={styles.photoText}>Brak zdjecia</Text>
              </View>
            )}
          </Card>
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
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
});
