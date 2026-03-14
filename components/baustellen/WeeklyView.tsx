// ============================================================
// WeeklyView — Baustellen weekly calendar (unified view)
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Colors, Spacing, FontFamily, Radius, Shadows } from '../../theme';
import { useI18n } from '../../i18n/I18nProvider';
import UnifiedSiteCard from './UnifiedSiteCard';

const WEEKDAY_LABELS_PL = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'Sb', 'Nd'];
const WEEKDAY_FULL_PL = ['Poniedzialek', 'Wtorek', 'Sroda', 'Czwartek', 'Piatek', 'Sobota', 'Niedziela'];
const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paz', 'Lis', 'Gru'];
const WEEKDAY_LABELS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_FULL_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS_DE = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatWeekLabel(start: Date, months: string[]) {
  const end = addDays(start, 6);
  const startDay = String(start.getDate()).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  return `${startDay} – ${endDay} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

type DeliveryRow = {
  tons: number | null;
  delivery_time: string | null;
  asphalt_types?: { name: string | null }[] | null;
};

type SiteRow = {
  id: string;
  name: string;
  address?: string | null;
  status: string | null;
  site_date?: string | null;
  deliveries?: DeliveryRow[] | null;
};

type EinsatzplanRow = {
  id: string;
  date: string;
  mischgut: string | null;
  tonnen_plan: number | null;
  tonnen_real: number | null;
  construction_site_id: string;
  construction_sites?: { name: string; address: string | null } | null;
};

function useWeeklyData(weekStart: Date) {
  const startISO = weekStart.toISOString();
  const endISO = addDays(weekStart, 7).toISOString();
  const startDate = startISO.slice(0, 10);
  const endDate = endISO.slice(0, 10);

  return useQuery({
    queryKey: ['baustellen-week', startISO],
    queryFn: async () => {
      const [sitesResult, deliveriesResult, einsatzplanResult] = await Promise.all([
        supabase
          .from('construction_sites')
          .select('id, name, address, status, site_date')
          .order('created_at', { ascending: false }),
        supabase
          .from('deliveries')
          .select('site_id, tons, delivery_time, asphalt_types(name)')
          .gte('delivery_time', startISO)
          .lt('delivery_time', endISO),
        supabase
          .from('einsatzplan')
          .select('id, date, mischgut, tonnen_plan, tonnen_real, construction_site_id, construction_sites(name, address)')
          .gte('date', startDate)
          .lt('date', endDate)
          .order('date'),
      ]);

      if (sitesResult.error) throw sitesResult.error;
      if (deliveriesResult.error) throw deliveriesResult.error;

      const deliveriesBySite: Record<string, DeliveryRow[]> = {};
      (deliveriesResult.data ?? []).forEach((delivery: any) => {
        const siteId = delivery.site_id as string;
        if (!deliveriesBySite[siteId]) deliveriesBySite[siteId] = [];
        deliveriesBySite[siteId].push({
          tons: delivery.tons ?? null,
          delivery_time: delivery.delivery_time ?? null,
          asphalt_types: delivery.asphalt_types ?? null,
        });
      });

      const sites = (sitesResult.data ?? []).map(site => ({
        id: site.id,
        name: site.name,
        address: site.address ?? null,
        status: site.status,
        site_date: site.site_date,
        deliveries: deliveriesBySite[site.id] ?? [],
      })) as SiteRow[];

      const einsatzplanRows = (einsatzplanResult.data ?? []).map((ep: any) => ({
        id: ep.id,
        date: ep.date,
        mischgut: ep.mischgut ?? null,
        tonnen_plan: ep.tonnen_plan ?? null,
        tonnen_real: ep.tonnen_real ?? null,
        construction_site_id: ep.construction_site_id,
        construction_sites: ep.construction_sites ?? null,
      })) as EinsatzplanRow[];

      return { sites, einsatzplanRows };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export default function WeeklyView({
  onOpenSite,
  onSelectDay,
}: {
  onOpenSite: (siteId: string, dayKey: string) => void;
  onSelectDay?: (dayKey: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => dateKey(new Date()));
  const { language, t } = useI18n();
  const queryClient = useQueryClient();

  const weekdayLabels = language === 'de' ? WEEKDAY_LABELS_DE : WEEKDAY_LABELS_PL;
  const weekdayFull   = language === 'de' ? WEEKDAY_FULL_DE   : WEEKDAY_FULL_PL;
  const monthsShort   = language === 'de' ? MONTHS_DE         : MONTHS_PL;

  const formatTons = (value: number) =>
    `${value.toFixed(1).replace('.', ',')} t`;

  const { data: weekData } = useWeeklyData(weekStart);
  const sites           = weekData?.sites ?? [];
  const einsatzplanRows = weekData?.einsatzplanRows ?? [];

  useEffect(() => {
    const today = new Date();
    const weekEnd = addDays(weekStart, 6);
    const inWeek = today >= weekStart && today <= weekEnd;
    const nextKey = inWeek ? dateKey(today) : dateKey(weekStart);
    setSelectedKey(nextKey);
    onSelectDay?.(nextKey);
  }, [weekStart]);

  const weekDays = useMemo(() => (
    weekdayLabels.map((label, idx) => {
      const dayDate = addDays(weekStart, idx);
      return { label, date: dayDate, key: dateKey(dayDate), dayNumber: dayDate.getDate() };
    })
  ), [weekStart, weekdayLabels]);

  // Deliveries grouped by date
  const dayBuckets = useMemo(() => {
    const buckets: Record<string, { deliveries: { siteId: string; siteName: string; status: string | null; tons: number; asphalt: string | null }[] }> = {};
    weekDays.forEach(day => { buckets[day.key] = { deliveries: [] }; });

    sites.forEach(site => {
      (site.deliveries ?? []).forEach(delivery => {
        if (!delivery.delivery_time) return;
        const key = dateKey(new Date(delivery.delivery_time));
        if (!buckets[key]) return;
        buckets[key].deliveries.push({
          siteId: site.id,
          siteName: site.name,
          status: site.status,
          tons: Number(delivery.tons ?? 0),
          asphalt: delivery.asphalt_types?.[0]?.name ?? null,
        });
      });
    });
    return buckets;
  }, [sites, weekDays]);

  // Einsatzplan grouped by date
  const einsatzplanByDay = useMemo(() => {
    const map: Record<string, EinsatzplanRow[]> = {};
    einsatzplanRows.forEach(ep => {
      if (!map[ep.date]) map[ep.date] = [];
      map[ep.date].push(ep);
    });
    return map;
  }, [einsatzplanRows]);

  // Sites by site_date (for sites added via NewConstructionModal)
  const daySites = useMemo(() => {
    const buckets: Record<string, { siteIds: string[] }> = {};
    weekDays.forEach(day => { buckets[day.key] = { siteIds: [] }; });
    sites.forEach(site => {
      if (!site.site_date) return;
      if (!buckets[site.site_date]) return;
      buckets[site.site_date].siteIds.push(site.id);
    });
    return buckets;
  }, [sites, weekDays]);

  const todayKey = dateKey(new Date());

  // Summary bar
  const summary = useMemo(() => {
    let totalTons = 0;
    let deliveryCount = 0;
    const siteSet = new Set<string>();

    Object.values(dayBuckets).forEach(bucket => {
      bucket.deliveries.forEach(d => {
        totalTons += d.tons;
        deliveryCount += 1;
        siteSet.add(d.siteId);
      });
    });
    Object.values(daySites).forEach(bucket => {
      bucket.siteIds.forEach(id => siteSet.add(id));
    });
    einsatzplanRows.forEach(ep => siteSet.add(ep.construction_site_id));

    return { totalTons, deliveryCount, siteCount: siteSet.size };
  }, [dayBuckets, daySites, einsatzplanRows]);

  // Unified cards for selected day
  const unifiedCards = useMemo(() => {
    const epEntries   = einsatzplanByDay[selectedKey] ?? [];
    const delivBucket = dayBuckets[selectedKey]?.deliveries ?? [];
    const daySiteIds  = daySites[selectedKey]?.siteIds ?? [];

    const siteIdSet = new Set<string>([
      ...epEntries.map(ep => ep.construction_site_id),
      ...delivBucket.map(d => d.siteId),
      ...daySiteIds,
    ]);

    return [...siteIdSet].map(siteId => {
      const ep    = epEntries.find(e => e.construction_site_id === siteId) ?? null;
      const delivs = delivBucket.filter(d => d.siteId === siteId);
      const site   = sites.find(s => s.id === siteId);

      return {
        siteId,
        siteName:    ep?.construction_sites?.name ?? site?.name ?? '—',
        siteAddress: ep?.construction_sites?.address ?? site?.address ?? null,
        siteStatus:  site?.status ?? null,
        einsatzplanId: ep?.id ?? null,
        mischgut:    ep?.mischgut ?? null,
        tonnenPlan:  ep?.tonnen_plan ?? null,
        tonnenReal:  ep?.tonnen_real ?? null,
        deliveryCount: delivs.length,
        deliveryTons:  delivs.reduce((s, d) => s + d.tons, 0),
        asphaltTypes:  [...new Set(delivs.map(d => d.asphalt).filter(Boolean) as string[])],
      };
    });
  }, [einsatzplanByDay, dayBuckets, daySites, sites, selectedKey]);

  // Update tonnen_real + invalidate query
  async function handleUpdateReal(einsatzplanId: string, value: number) {
    const { error } = await supabase
      .from('einsatzplan')
      .update({ tonnen_real: value, updated_at: new Date().toISOString() })
      .eq('id', einsatzplanId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['baustellen-week'] });
  }

  const selectedDate = weekDays.find(d => d.key === selectedKey)?.date ?? weekStart;
  const selectedLabel = `${weekdayFull[(selectedDate.getDay() + 6) % 7]}, ${String(selectedDate.getDate()).padStart(2, '0')} ${monthsShort[selectedDate.getMonth()]}`;
  const selectedDeliveryCount = dayBuckets[selectedKey]?.deliveries.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <Text style={styles.weekLabel}>{formatWeekLabel(weekStart, monthsShort)}</Text>
        <View style={styles.weekArrows}>
          <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekStart(addDays(weekStart, -7))}>
            <Text style={styles.weekArrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekStart(addDays(weekStart, 7))}>
            <Text style={styles.weekArrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatTons(summary.totalTons)}</Text>
          <Text style={styles.summaryLabel}>{t('Tygodniowo (t)')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.siteCount}</Text>
          <Text style={styles.summaryLabel}>{t('Budow')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.deliveryCount}</Text>
          <Text style={styles.summaryLabel}>{t('Dostaw')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Day chips */}
        <View style={styles.daysGrid}>
          {weekDays.map(day => {
            const bucket      = dayBuckets[day.key];
            const sitesForDay = daySites[day.key];
            const epForDay    = einsatzplanByDay[day.key];
            const totalTons   = bucket ? bucket.deliveries.reduce((sum, d) => sum + d.tons, 0) : 0;

            const siteIdSet = new Set<string>();
            (bucket?.deliveries ?? []).forEach(d => siteIdSet.add(d.siteId));
            (sitesForDay?.siteIds ?? []).forEach(id => siteIdSet.add(id));
            (epForDay ?? []).forEach(ep => siteIdSet.add(ep.construction_site_id));

            const siteCount = siteIdSet.size;
            const hasData = siteCount > 0;
            const isActive = day.key === selectedKey;
            const isToday  = day.key === todayKey;

            return (
              <TouchableOpacity
                key={day.key}
                style={[styles.dayChip, isToday && styles.dayChipToday, isActive && styles.dayChipActive]}
                onPress={() => { setSelectedKey(day.key); onSelectDay?.(day.key); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayName, isToday && styles.dayNameToday, isActive && styles.dayNameActive]}>
                  {day.label}
                </Text>
                <Text style={[styles.dayNumber, isActive && styles.dayNumberActive]}>{day.dayNumber}</Text>
                <View style={[styles.dayDot, hasData && styles.dayDotActive, isActive && styles.dayDotActiveOn]} />
                <Text style={[styles.dayTons, isActive && styles.dayTonsActive]}>{formatTons(totalTons)}</Text>
                <Text style={[styles.daySites, isActive && styles.daySitesActive]}>
                  {siteCount} {t('bud.')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Day header */}
        <View style={styles.dayDetailHeader}>
          <Text style={styles.dayDetailTitle}>{selectedLabel}</Text>
          <Text style={styles.dayDetailMeta}>🚛 {selectedDeliveryCount} {t('dostawy')}</Text>
        </View>

        {/* Unified site list */}
        <View style={styles.siteList}>
          {unifiedCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('Brak budow w tym dniu')}</Text>
              <Text style={styles.emptySubtext}>{t('Dodaj budowe z poziomu FAB')}</Text>
            </View>
          ) : (
            unifiedCards.map(card => (
              <UnifiedSiteCard
                key={card.siteId}
                siteId={card.siteId}
                siteName={card.siteName}
                siteAddress={card.siteAddress}
                siteStatus={card.siteStatus}
                einsatzplanId={card.einsatzplanId}
                mischgut={card.mischgut}
                tonnenPlan={card.tonnenPlan}
                tonnenReal={card.tonnenReal}
                deliveryCount={card.deliveryCount}
                deliveryTons={card.deliveryTons}
                asphaltTypes={card.asphaltTypes}
                onPress={() => onOpenSite(card.siteId, selectedKey)}
                onUpdateReal={handleUpdateReal}
                formatTons={formatTons}
                t={t}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  weekNav: {
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weekArrows: { flexDirection: 'row', gap: 8 },
  weekArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  weekArrowText: { color: '#fff', fontSize: 16, fontFamily: FontFamily.bold },

  summaryBar: {
    marginHorizontal: Spacing.lg,
    marginTop: -12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Shadows.sm,
  },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.orange, lineHeight: 22 },
  summaryLabel: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.creamDark },

  scroll: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 16, paddingBottom: 100 },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  dayChip: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayChipToday: { borderColor: Colors.orangeLight },
  dayChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange, ...Shadows.sm },
  dayName: { fontSize: 9, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center', width: '100%' },
  dayNameToday: { color: Colors.orange },
  dayNameActive: { color: 'rgba(255,255,255,0.75)' },
  dayNumber: { fontSize: 17, fontFamily: FontFamily.bold, color: Colors.black, lineHeight: 18 },
  dayNumberActive: { color: '#fff' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginVertical: 4 },
  dayDotActive: { backgroundColor: Colors.orange },
  dayDotActiveOn: { backgroundColor: 'rgba(255,255,255,0.6)' },
  dayTons: { fontSize: 9, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  dayTonsActive: { color: 'rgba(255,255,255,0.85)' },
  daySites: { fontSize: 9, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  daySitesActive: { color: 'rgba(255,255,255,0.85)' },

  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  dayDetailTitle: { fontSize: 17, fontFamily: FontFamily.bold, color: Colors.black },
  dayDetailMeta: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.orange, backgroundColor: Colors.orangePale, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  siteList: { gap: 10, paddingBottom: 100 },
  emptyState: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  emptySubtext: { fontSize: 12, fontFamily: FontFamily.medium, color: Colors.grayMid, marginTop: 6 },
});
