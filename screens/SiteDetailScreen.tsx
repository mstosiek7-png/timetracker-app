// ============================================================
// TimeTracker — Screen: SiteDetailScreen
// Plik: src/screens/SiteDetailScreen.tsx
// ============================================================
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppHeader, Badge, BottomNav } from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useBaustellen } from '../hooks/useBaustellen';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../services/supabase';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function SiteDetailScreen({ navigation, route }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const siteId = route.params?.siteId;
  const mischgut = route.params?.mischgut as string | undefined;
  const { getSite, deleteSite } = useBaustellen();
  const site = getSite(siteId);
  const { t, language } = useI18n();

  if (!site) return null;

  const handleDelete = async () => {
    // Count linked einsatzplan entries
    const { count } = await supabase
      .from('einsatzplan')
      .select('id', { count: 'exact', head: true })
      .eq('construction_site_id', siteId);

    const planWarning = count && count > 0
      ? (language === 'de'
          ? `\n\nAchtung: ${count} Einsatzplan-Einträge werden ebenfalls gelöscht.`
          : `\n\nUwaga: zostanie też usuniętych ${count} wpisów z planu tygodniowego.`)
      : '';

    Alert.alert(
      t('Usun budowe'),
      `${t('Czy na pewno chcesz usunac')} "${site.name}"?${planWarning}`,
      [
        { text: t('Anuluj'), style: 'cancel' },
        { text: t('Usun'), style: 'destructive', onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteSite(siteId);
            setIsDeleting(false);
            navigation.goBack();
          } catch (err) {
            setIsDeleting(false);
            const message = err instanceof Error ? err.message : t('Nieznany blad');
            Alert.alert(t('Blad usuwania'), message);
          }
        }},
      ],
    );
  };

  const HeaderRight = (
    <TouchableOpacity 
      style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]} 
      onPress={handleDelete}
      disabled={isDeleting}
    >
      <Text style={styles.deleteBtnText}>{isDeleting ? '⏳' : '🗑'} {t('Usun')}</Text>
    </TouchableOpacity>
  );

  const todayLabel = new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'pl-PL', { weekday: 'short', day:'2-digit', month:'2-digit', year:'numeric' });
  const todayDeliveries = site.deliveries.filter(d => d.date === new Date().toISOString().split('T')[0]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader
        title={site.name}
        subtitle=""
        showBack
        onBack={() => navigation.goBack()}
        rightElement={HeaderRight}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: Spacing.lg }} />

        {/* ─── Summary table ─────────────────────────── */}
        <View style={styles.summaryTable}>
          {/* Header */}
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 1 }]}>{t('Klasa asfaltu')}</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>{t('Dostaw')}</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>{t('Tony')}</Text>
          </View>
          {site.asphaltSummary.map(row => (
            <View key={row.class} style={styles.summaryRow}>
              <Text style={[styles.summaryClass, { flex: 1 }]}>{row.class}</Text>
              <Text style={[styles.summaryCount, { width: 80, textAlign: 'center' }]}>{row.count}×</Text>
              <Text style={[styles.summaryTons, { width: 80, textAlign: 'right' }]}>{row.tons.toFixed(1)}t</Text>
            </View>
          ))}
          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { flex: 1 }]}>{t('RAZEM')}</Text>
            <Text style={[styles.totalCount, { width: 80, textAlign: 'center' }]}>{site.deliveryCount}×</Text>
            <Text style={[styles.totalTons, { width: 80, textAlign: 'right' }]}>{site.totalTons.toFixed(1)}t</Text>
          </View>
        </View>

        {/* ─── Deliveries today ──────────────────────── */}
        <View style={styles.deliveryHeader}>
          <Text style={styles.deliveryDateText}>{t('Dostawy')} — {todayLabel}</Text>
          <Text style={styles.deliveryCount}>{todayDeliveries.length} {t('dzisiaj')}</Text>
        </View>

        {site.deliveries.map(d => (
          <TouchableOpacity key={d.id} style={styles.deliveryCard} activeOpacity={0.85}
            onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: d.id, siteId })}>
            <View style={styles.deliveryThumb}>
              <Text style={{ fontSize: 24 }}>🏗️</Text>
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryType}>{d.asphaltClass}</Text>
              <Text style={styles.deliveryMeta}>
                {d.supplier || t('Brak firmy')} · {d.time || '—'} · {d.waybill || '—'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add delivery button */}
      <View style={styles.addDeliveryBar}>
        <TouchableOpacity
          style={styles.addDeliveryBtn}
          onPress={() => navigation.navigate('NewDelivery', { siteId, mischgut })}
          activeOpacity={0.9}
        >
          <Text style={styles.addDeliveryText}>+ {t('Dodaj dostawe')}</Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Baustellen" onNavigate={(s) => navigation.navigate(s)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  deleteBtn: {
    backgroundColor: Colors.red, borderRadius: Radius.pill,
    paddingVertical: 7, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  deleteBtnDisabled: {
    backgroundColor: Colors.grayMid,
    opacity: 0.6,
  },
  deleteBtnText: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: FontSize.base },
  summaryTable: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    overflow: 'hidden', ...Shadows.sm,
  },
  tableHead: {
    flexDirection: 'row', backgroundColor: Colors.creamDark,
    paddingVertical: 10, paddingHorizontal: Spacing.md,
  },
  th: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.7 },
  summaryRow: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.cream,
  },
  summaryClass: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.black },
  summaryCount: { fontSize: FontSize.md, color: Colors.grayMid },
  summaryTons: { fontSize: FontSize.md, fontFamily: 'DMMono_500Medium', color: Colors.orange, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.black,
  },
  totalLabel: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalCount: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.7)' },
  totalTons: { fontSize: FontSize.md, fontFamily: 'DMMono_700Bold', color: Colors.orange },
  deliveryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginBottom: 4,
  },
  deliveryDateText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.7 },
  deliveryCount: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.orange },
  deliveryCard: {
    backgroundColor: Colors.white, borderRadius: Radius.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    padding: Spacing.md, ...Shadows.sm,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  deliveryThumb: {
    width: 56, height: 56, borderRadius: 8,
    backgroundColor: Colors.orangePale,
    alignItems: 'center', justifyContent: 'center',
  },
  deliveryInfo: { flex: 1 },
  deliveryType: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.black },
  deliveryMeta: { fontSize: FontSize.sm, color: Colors.grayMid, marginTop: 3 },
  chevron: { fontSize: 22, color: Colors.grayLight },
  addDeliveryBar: {
    position: 'absolute', bottom: 68, left: 0, right: 0,
    alignItems: 'flex-end', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  addDeliveryBtn: {
    backgroundColor: Colors.orange, borderRadius: Radius.pill,
    paddingVertical: 13, paddingHorizontal: 22,
    ...Shadows.orange,
  },
  addDeliveryText: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
});
