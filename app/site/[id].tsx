// =====================================================
// Site Detail Page — Szczegóły budowy
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { ConstructionSite } from '../../types/models';
import { useBaustellen } from '../../hooks/useBaustellen';

// Components
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionTitle from '../../components/ui/SectionTitle';
import FAB from '../../components/ui/FAB';

interface SiteSummaryRow {
  asphalt_type_name: string;
  delivery_count: number;
  total_tons: number;
}

interface DeliveryRow {
  delivery_id: string;
  asphalt_type_name: string | null;
  tons: number | string | null;
  lieferschein_nr: string | null;
  supplier: string | null;
  delivery_time: string;
  photo_url: string | null;
  created_at: string;
}

export default function SiteDetailScreen() {
  const router = useRouter();
  const { id: siteId, day } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteSite } = useBaustellen();

  // Fetch site details
  const { data: site, isLoading: siteLoading, error: siteError } = useQuery({
    queryKey: ['construction-site', siteId],
    queryFn: async () => {
      if (!siteId || typeof siteId !== 'string') {
        throw new Error('Invalid site ID');
      }

      const { data, error } = await supabase
        .from('construction_sites')
        .select(`*`)
        .eq('id', siteId)
        .single();

      if (error) throw error;
      return data as ConstructionSite;
    },
    enabled: !!siteId,
  });

  // Fetch summary table data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['site-summary', siteId],
    queryFn: async () => {
      if (!siteId || typeof siteId !== 'string') {
        throw new Error('Invalid site ID');
      }

      const { data, error } = await supabase.rpc('get_site_summary', {
        p_site_id: siteId,
      });

      if (error) throw error;
      return (data || []) as SiteSummaryRow[];
    },
    enabled: !!siteId,
  });

  // Fetch deliveries
  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['site-deliveries', siteId],
    queryFn: async () => {
      if (!siteId || typeof siteId !== 'string') {
        throw new Error('Invalid site ID');
      }

      const { data, error } = await supabase.rpc('get_site_deliveries', {
        p_site_id: siteId,
      });

      if (error) throw error;
      return (data || []) as DeliveryRow[];
    },
    enabled: !!siteId,
  });

  useEffect(() => {
    if (deliveries && deliveries.length > 0) {
      console.log('Deliveries sample:', deliveries[0]);
    }
  }, [deliveries]);

  const handleDelete = () => {
    if (!siteId || typeof siteId !== 'string') {
      Alert.alert('Błąd', 'Nie można usunąć budowy - brak ID');
      return;
    }

    Alert.alert(
      'Potwierdzenie usunięcia',
      `Czy na pewno chcesz usunąć budowę "${site?.name}"? Ta akcja jest nieodwracalna.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => {
            (async () => {
              setIsDeleting(true);
              try {
                await deleteSite(siteId);
                await queryClient.invalidateQueries({ queryKey: ['construction-site', siteId] });
                await queryClient.invalidateQueries({ queryKey: ['site-summary', siteId] });
                await queryClient.invalidateQueries({ queryKey: ['site-deliveries', siteId] });
                await queryClient.invalidateQueries({ queryKey: ['baustellen-week'] });
                Alert.alert('Sukces', 'Budowa zostala usunieta');
                router.back();
              } catch (error) {
                console.error('Błąd usuwania budowy:', error);
                Alert.alert('Błąd', error instanceof Error ? error.message : 'Nie udało się usunąć budowy');
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handleAddDelivery = () => {
    if (siteId && typeof siteId === 'string') {
      const dayParam = typeof day === 'string' ? `&day=${encodeURIComponent(day)}` : '';
      router.push(`/delivery/new?site_id=${siteId}${dayParam}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['construction-site', siteId] });
    await queryClient.invalidateQueries({ queryKey: ['site-summary', siteId] });
    await queryClient.invalidateQueries({ queryKey: ['site-deliveries', siteId] });
    setRefreshing(false);
  };

  // Calculate totals
  const totalDeliveries = summary?.reduce((sum, row) => sum + row.delivery_count, 0) || 0;
  const totalTons = summary?.reduce((sum, row) => sum + row.total_tons, 0) || 0;

  // Format date (today)
  const today = new Date().toLocaleDateString('pl-PL', {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Count deliveries from today
  const todayDeliveries = deliveries?.filter((d) => {
    const deliveryDate = new Date(d.delivery_time).toLocaleDateString('pl-PL');
    const todayDate = new Date().toLocaleDateString('pl-PL');
    return deliveryDate === todayDate;
  }).length || 0;

  const formatDeliveryTons = (delivery: DeliveryRow) => {
    const raw = (delivery as any).tons
      ?? (delivery as any).total_tons
      ?? (delivery as any).weight
      ?? (delivery as any).tony;
    if (raw === null || raw === undefined || raw === '') return '-';
    const parsed = typeof raw === 'string'
      ? parseFloat(raw.replace(',', '.'))
      : Number(raw);
    return Number.isFinite(parsed) ? parsed.toFixed(1) : '-';
  };

  if (siteLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (siteError || !site) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Nie udało się załadować budowy</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonError}
        >
          <Text style={styles.backButtonText}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.card} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <StatusBadge
              status="fza"
              label={site.status === 'active' ? 'Aktywna' : 'Zakończona'}
              size="sm"
            />
            <Text style={styles.siteName}>{site.name}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={isDeleting}
          style={[styles.deleteButton]}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={theme.colors.card} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={theme.colors.card} />
              <Text style={styles.deleteButtonText}>Usuń</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary Table - Fixed below header */}
      {!summaryLoading && summary && (
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            {/* Header Row */}
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryCell, styles.summaryLabel]}>Klasa asfaltu</Text>
              <Text style={[styles.summaryCell, styles.summaryLabel, styles.cellCenter]}>
                Dostaw
              </Text>
              <Text style={[styles.summaryCell, styles.summaryLabel, styles.cellRight]}>
                Tony
              </Text>
            </View>

            {/* Data Rows */}
            {summary.map((row, index) => (
              <View
                key={row.asphalt_type_name}
                style={[
                  styles.summaryRow,
                  index % 2 === 1 && styles.summaryRowAlt,
                ]}
              >
                <Text style={[styles.summaryCell, styles.asphaltName]}>
                  {row.asphalt_type_name}
                </Text>
                <Text style={[styles.summaryCell, styles.cellCenter, styles.count]}>
                  {row.delivery_count}×
                </Text>
                <Text style={[styles.summaryCell, styles.cellRight, styles.tons]}>
                  {row.total_tons.toFixed(1)}t
                </Text>
              </View>
            ))}

            {/* Footer Row */}
            <View style={styles.summaryFooter}>
              <Text style={[styles.summaryCell, styles.footerLabel]}>RAZEM</Text>
              <Text style={[styles.summaryCell, styles.cellCenter, styles.footerCount]}>
                {totalDeliveries}×
              </Text>
              <Text style={[styles.summaryCell, styles.cellRight, styles.footerTons]}>
                {totalTons.toFixed(1)}t
              </Text>
            </View>
          </Card>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
          />
        }
      >

        {/* Deliveries Section */}
        <View style={styles.deliveriesContainer}>
          <SectionTitle
            text={`DOSTAWY — ${today}`}
            rightText={`${todayDeliveries} dzisiaj`}
          />

          {deliveriesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          ) : deliveries && deliveries.length > 0 ? (
            <View style={styles.deliveryList}>
              {deliveries.map((delivery) => (
                <TouchableOpacity
                  key={delivery.delivery_id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/delivery/${delivery.delivery_id}`)}
                >
                  <Card style={styles.deliveryCard}>
                  <View style={styles.deliveryContent}>
                    {/* Tons Box */}
                    <View style={styles.tonsBox}>
                      <Text style={styles.tonsValue}>{formatDeliveryTons(delivery)}</Text>
                      <Text style={styles.tonsUnit}>t</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.deliveryInfo}>
                      <Text style={styles.asphaltType}>
                        {delivery.asphalt_type_name || 'Nieznany typ'}
                      </Text>
                      <Text style={styles.deliveryMeta}>
                        {delivery.supplier || 'Brak firmy'} · 
                        {new Date(delivery.delivery_time).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {delivery.lieferschein_nr || '-'}
                      </Text>
                    </View>

                    {/* Photo Icon */}
                    {delivery.photo_url ? (
                      <Ionicons name="image" size={24} color={theme.colors.accent} />
                    ) : (
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color={theme.colors.muted}
                        style={{ opacity: 0.3 }}
                      />
                    )}
                  </View>
                </Card>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noDeliveries}>Brak dostaw dla tej budowy</Text>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <FAB
          label="Dodaj dostawę"
          onPress={handleAddDelivery}
          icon="+"
        />
      </View>
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
    paddingTop: theme.spacing.md,
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

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingTop: 40,
    marginTop: 0,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.accent,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
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
  siteName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.card,
    marginTop: theme.spacing.xs,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.dark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  exportButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.card,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#DC2626',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  deleteButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.card,
  },

  // Summary Table Styles
  summaryContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  summaryCard: {
    overflow: 'hidden',
    padding: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  summaryRowAlt: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  summaryCell: {
    flex: 1,
    fontSize: theme.fontSize.md,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  asphaltName: {
    fontWeight: '700',
    color: theme.colors.dark,
  },
  cellCenter: {
    textAlign: 'center',
  },
  cellRight: {
    textAlign: 'right',
  },
  count: {
    fontSize: theme.fontSize.md,
    color: theme.colors.mid,
  },
  tons: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  summaryFooter: {
    flexDirection: 'row',
    backgroundColor: theme.colors.dark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  footerLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footerCount: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footerTons: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.accent,
  },

  // Deliveries Section Styles
  deliveriesContainer: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryList: {
    gap: theme.spacing.md,
  },
  deliveryCard: {
    padding: theme.spacing.md,
  },
  deliveryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  tonsBox: {
    width: 56,
    height: 56,
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
  deliveryInfo: {
    flex: 1,
  },
  asphaltType: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  deliveryMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  noDeliveries: {
    fontSize: theme.fontSize.md,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },

  // FAB Container
  fabContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
});
