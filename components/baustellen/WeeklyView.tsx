// ============================================================
// WeeklyView — Baustellen weekly calendar
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../../theme';
import { useI18n } from '../../i18n/I18nProvider';

const WEEKDAY_LABELS_PL = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'Sb', 'Nd'];
const WEEKDAY_FULL_PL = ['Poniedzialek', 'Wtorek', 'Sroda', 'Czwartek', 'Piatek', 'Sobota', 'Niedziela'];
const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paz', 'Lis', 'Gru'];
const WEEKDAY_LABELS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_FULL_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS_DE = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
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
  const monthLabel = months[end.getMonth()];
  const year = end.getFullYear();
  return `${startDay} – ${endDay} ${monthLabel} ${year}`;
}

type DeliveryRow = {
  tons: number | null;
  delivery_time: string | null;
  asphalt_types?: { name: string | null }[] | null;
};

type SiteRow = {
  id: string;
  name: string;
  status: string | null;
  site_date?: string | null;
  deliveries?: DeliveryRow[] | null;
};

function useWeeklyData(weekStart: Date) {
  const startISO = weekStart.toISOString();
  const endISO = addDays(weekStart, 7).toISOString();

  return useQuery({
    queryKey: ['baustellen-week', startISO],
    queryFn: async () => {
      const { data: sitesRaw, error: sitesError } = await supabase
        .from('construction_sites')
        .select('id, name, status, site_date')
        .order('created_at', { ascending: false });

      if (sitesError) throw sitesError;

      const { data: deliveriesRaw, error: delError } = await supabase
        .from('deliveries')
        .select('site_id, tons, delivery_time, asphalt_types(name)')
        .gte('delivery_time', startISO)
        .lt('delivery_time', endISO);

      if (delError) throw delError;

      const deliveriesBySite: Record<string, DeliveryRow[]> = {};
      (deliveriesRaw ?? []).forEach((delivery: any) => {
        const siteId = delivery.site_id as string;
        if (!deliveriesBySite[siteId]) deliveriesBySite[siteId] = [];
        deliveriesBySite[siteId].push({
          tons: delivery.tons ?? null,
          delivery_time: delivery.delivery_time ?? null,
          asphalt_types: delivery.asphalt_types ?? null,
        });
      });

      return (sitesRaw ?? []).map(site => ({
        id: site.id,
        name: site.name,
        status: site.status,
        site_date: site.site_date,
        deliveries: deliveriesBySite[site.id] ?? [],
      })) as SiteRow[];
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
  const weekdayLabels = language === 'de' ? WEEKDAY_LABELS_DE : WEEKDAY_LABELS_PL;
  const weekdayFull = language === 'de' ? WEEKDAY_FULL_DE : WEEKDAY_FULL_PL;
  const monthsShort = language === 'de' ? MONTHS_DE : MONTHS_PL;
  const formatTons = (value: number) => {
    const formatted = value.toFixed(1).replace('.', ',');
    return `${formatted} t`;
  };

  const { data: sites = [] } = useWeeklyData(weekStart);

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
      return {
        label,
        date: dayDate,
        key: dateKey(dayDate),
        dayNumber: dayDate.getDate(),
      };
    })
  ), [weekStart, weekdayLabels]);

  const dayBuckets = useMemo(() => {
    const buckets: Record<string, { deliveries: { siteId: string; siteName: string; status: string | null; tons: number; asphalt: string | null }[] }> = {};
    weekDays.forEach(day => {
      buckets[day.key] = { deliveries: [] };
    });

    sites.forEach(site => {
      (site.deliveries ?? []).forEach(delivery => {
        if (!delivery.delivery_time) return;
        const dt = new Date(delivery.delivery_time);
        const key = dateKey(dt);
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

  const todayKey = dateKey(new Date());

  const daySites = useMemo(() => {
    const buckets: Record<string, { siteIds: string[] }> = {};
    weekDays.forEach(day => {
      buckets[day.key] = { siteIds: [] };
    });

    sites.forEach(site => {
      if (!site.site_date) return;
      const key = site.site_date;
      if (!buckets[key]) return;
      buckets[key].siteIds.push(site.id);
    });

    return buckets;
  }, [sites, weekDays]);

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

    return {
      totalTons,
      deliveryCount,
      siteCount: siteSet.size,
    };
  }, [dayBuckets, daySites]);

  const selectedBucket = dayBuckets[selectedKey] ?? { deliveries: [] };

  const selectedSites = useMemo(() => {
    const map: Record<string, { id: string; name: string; status: string | null; tons: number; asphaltTypes: string[] }> = {};

    selectedBucket.deliveries.forEach(d => {
      if (!map[d.siteId]) {
        map[d.siteId] = { id: d.siteId, name: d.siteName, status: d.status, tons: 0, asphaltTypes: [] };
      }
      map[d.siteId].tons += d.tons;
      if (d.asphalt && !map[d.siteId].asphaltTypes.includes(d.asphalt)) {
        map[d.siteId].asphaltTypes.push(d.asphalt);
      }
    });

    sites.forEach(site => {
      if (site.site_date !== selectedKey) return;
      if (!map[site.id]) {
        map[site.id] = { id: site.id, name: site.name, status: site.status, tons: 0, asphaltTypes: [] };
      }
    });

    return Object.values(map);
  }, [selectedBucket, sites, selectedKey]);

  const dayTonsBySite = useMemo(() => {
    const map: Record<string, number> = {};
    selectedBucket.deliveries.forEach(d => {
      map[d.siteId] = (map[d.siteId] ?? 0) + d.tons;
    });
    return map;
  }, [selectedBucket]);

  const selectedDate = weekDays.find(d => d.key === selectedKey)?.date ?? weekStart;
  const selectedLabel = `${weekdayFull[(selectedDate.getDay() + 6) % 7]}, ${String(selectedDate.getDate()).padStart(2, '0')} ${monthsShort[selectedDate.getMonth()]}`;

  return (
    <View style={styles.container}>
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
        <View style={styles.daysGrid}>
          {weekDays.map(day => {
            const bucket = dayBuckets[day.key];
            const sitesForDay = daySites[day.key];
            const totalTons = bucket ? bucket.deliveries.reduce((sum, d) => sum + d.tons, 0) : 0;
            const siteIdSet = new Set<string>();
            (bucket?.deliveries ?? []).forEach(d => siteIdSet.add(d.siteId));
            (sitesForDay?.siteIds ?? []).forEach(id => siteIdSet.add(id));
            const siteCount = siteIdSet.size;
            const hasData = (bucket?.deliveries?.length ?? 0) > 0 || (sitesForDay?.siteIds?.length ?? 0) > 0;
            const isActive = day.key === selectedKey;
            const isToday = day.key === todayKey;

            return (
              <TouchableOpacity
                key={day.key}
                style={[styles.dayChip, isToday && styles.dayChipToday, isActive && styles.dayChipActive]}
                onPress={() => {
                  setSelectedKey(day.key);
                  onSelectDay?.(day.key);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayName, isToday && styles.dayNameToday, isActive && styles.dayNameActive]}>{day.label}</Text>
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

        <View style={styles.dayDetailHeader}>
          <Text style={styles.dayDetailTitle}>{selectedLabel}</Text>
          <Text style={styles.dayDetailMeta}>🚛 {selectedBucket.deliveries.length} {t('dostawy')}</Text>
        </View>

        <View style={styles.siteList}>
          {selectedSites.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('Brak budow w tym dniu')}</Text>
              <Text style={styles.emptySubtext}>{t('Dodaj budowe z poziomu FAB')}</Text>
            </View>
          ) : (
            selectedSites.map(site => (
              <TouchableOpacity
                key={site.id}
                style={[styles.siteCard, site.status !== 'active' && styles.siteCardInactive]}
                onPress={() => onOpenSite(site.id, selectedKey)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.statusPill, site.status !== 'active' && styles.statusPillInactive]}>
                    <Text style={[styles.statusPillText, site.status !== 'active' && styles.statusPillTextInactive]}>
                      {site.status === 'active' ? t('AKTYWNA') : t('ZAMKNIETA')}
                    </Text>
                  </View>
                  <Text style={styles.cardArrow}>›</Text>
                </View>
                <Text style={styles.siteName}>{site.name}</Text>
                <View style={styles.siteTags}>
                  {(dayTonsBySite[site.id] ?? 0) > 0 && (
                    <View style={[styles.tag, styles.tagOrange]}>
                      <Text style={[styles.tagText, styles.tagTextOrange]}>
                        🚛 {formatTons(dayTonsBySite[site.id])}
                      </Text>
                    </View>
                  )}
                  {site.asphaltTypes.map(type => (
                    <View key={type} style={styles.tag}>
                      <Text style={styles.tagText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, justifyContent: 'space-between' },
  dayChip: {
    width: '13%',
    minWidth: 42,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayChipToday: { borderColor: Colors.orangeLight },
  dayChipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
    ...Shadows.sm,
  },
  dayName: { fontSize: 9, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.3 },
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
  siteCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orange,
    ...Shadows.sm,
  },
  siteCardInactive: { borderLeftColor: Colors.creamDark, opacity: 0.75 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statusPill: { backgroundColor: Colors.greenBg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  statusPillInactive: { backgroundColor: Colors.creamDark },
  statusPillText: { fontSize: 9, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8, color: Colors.green },
  statusPillTextInactive: { color: Colors.grayMid },
  cardArrow: { color: Colors.grayMid, fontSize: 14 },
  siteName: { fontSize: 18, fontFamily: FontFamily.bold, color: Colors.black, marginBottom: 10, letterSpacing: -0.2 },
  siteTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: Colors.cream, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  tagOrange: { backgroundColor: Colors.orangePale },
  tagText: { fontSize: 11, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  tagTextOrange: { color: Colors.orange, fontFamily: FontFamily.bold },

  emptyState: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  emptySubtext: { fontSize: 12, fontFamily: FontFamily.medium, color: Colors.grayMid, marginTop: 6 },
});
