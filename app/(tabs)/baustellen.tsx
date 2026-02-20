// =====================================================
// Baustellen — Lista budów (zgodnie z mockupem)
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { ConstructionSite, ActiveSiteSummary } from '../../types/models';

// Komponenty UI
import PageHeader from '../../components/ui/PageHeader';
import StatBox from '../../components/ui/StatBox';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Tag from '../../components/ui/Tag';

// Modal do dodawania nowej budowy
import NewConstructionModal from '../../components/NewConstructionModal';

export default function BaustellenScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const queryClient = useQueryClient();

  // Pobieranie listy budów z danymi o tonażu i dostawach
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['construction-sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('construction_sites')
        .select(`
          *,
          asphalt_types(id, name),
          deliveries(id, tons)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Mutation do usuwania budowy
  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('construction_sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
    },
  });

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
    setRefreshing(false);
  };

  // Obsługa kliknięcia karty budowy
  const handleSitePress = (siteId: string) => {
    router.push(`/site/${siteId}`);
  };

  // Obsługa long pressa - opcja usunięcia
  const handleSiteLongPress = (site: ConstructionSite) => {
    Alert.alert(
      'Usuń budowę',
      `Czy na pewno chcesz usunąć "${site.name}"?`,
      [
        {
          text: 'Anuluj',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Usuń',
          onPress: async () => {
            try {
              await deleteSiteMutation.mutateAsync(site.id);
              Alert.alert('Sukces', 'Budowa została usunięta');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć budowy');
              console.error('Błąd usuwania budowy:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Formatowanie liczby ton
  const formatTons = (tons: number) => {
    return `${tons.toFixed(1)}t`;
  };

  // Funkcja do obliczenia całkowitego tonażu dla budowy
  const getTotalTons = (site: any) => {
    if (!site?.deliveries || !Array.isArray(site.deliveries)) return 0;
    return site.deliveries.reduce((sum: number, d: any) => sum + (d.tons || 0), 0);
  };

  // Funkcja do pobrania klas asfaltu dla budowy
  const getAsphaltClasses = (site: any) => {
    if (!site?.asphalt_types || !Array.isArray(site.asphalt_types)) return [];
    return site.asphalt_types.map((a: any) => a.name);
  };

  // Obliczanie statystyk ze wszystkich budów
  const totalTons = (sites || []).reduce((sum, site) => sum + getTotalTons(site), 0);

  return (
    <View style={styles.container}>
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
        {/* Nagłówek */}
        <PageHeader
          subtitle=""
          title=""
        />

        {/* Statystyki */}
        <View style={styles.statsContainer}>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatBox
                value={formatTons(totalTons)}
                label="Łącznie ton"
                color={theme.colors.accent}
              />
            </View>
          </Card>
        </View>

        {/* Lista budów */}
        <View style={styles.listContainer}>
          {isLoading ? (
            <EmptyState
              icon="⏳"
              title="Ładowanie..."
              subtitle="Pobieranie listy budów"
            />
          ) : error ? (
            <EmptyState
              icon="⚠️"
              title="Błąd"
              subtitle="Nie udało się załadować budów"
            />
          ) : sites && sites.length > 0 ? (
            sites.map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => handleSitePress(site.id)}
                onLongPress={() => handleSiteLongPress(site)}
                activeOpacity={0.7}
                delayLongPress={500}
              >
                <Card
                  leftBorderColor={
                    site.status === 'active'
                      ? theme.colors.accent
                      : theme.colors.muted
                  }
                  style={styles.siteCard}
                >
                  <View style={styles.siteCardHeader}>
                    <View style={styles.siteInfo}>
                      <View style={styles.statusRow}>
                        <StatusBadge
                          status="fza"
                          label={site.status === 'active' ? 'Aktywna' : 'Zakończona'}
                          size="sm"
                        />
                      </View>
                      <Text style={styles.siteName}>{site.name}</Text>
                      {site.address && (
                        <View style={styles.addressRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={theme.colors.muted}
                          />
                          <Text style={styles.siteAddress}>{site.address}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.muted}
                    />
                  </View>

                  <View style={styles.tagContainer}>
                    <Tag value={`🚛 ${formatTons(getTotalTons(site))}`} variant="orange" />
                    <Tag value={`${(site as any).deliveries?.length || 0} dostaw`} variant="gray" />
                    {getAsphaltClasses(site).slice(0, 2).map((className: string) => (
                      <Tag key={className} value={className} variant="gray" />
                    ))}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="🏗️"
              title="Brak budów"
              subtitle="Dodaj pierwszą budowę, aby rozpocząć"
            />
          )}
        </View>

        {/* Przycisk dodawania budowy na dole */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => setShowNewModal(true)}
          >
            <Ionicons name="add" size={36} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>



      {/* Modal dodawania nowej budowy */}
      <NewConstructionModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
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
  },
  bottomButtonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  fabButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 0,
  },
  statsCard: {
    padding: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  listContainer: {
    paddingTop: 0,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  siteCard: {
    marginBottom: theme.spacing.md,
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  siteInfo: {
    flex: 1,
  },
  statusRow: {
    marginBottom: theme.spacing.xs,
  },
  siteName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  siteAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  siteMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  metricTag: {
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  metricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

});
