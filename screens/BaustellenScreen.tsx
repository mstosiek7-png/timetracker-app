// ============================================================
// TimeTracker — Screen: BaustellenScreen (Lista Budów)
// Plik: src/screens/BaustellenScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader, Badge, BottomNav } from '../components/ui';
import NewConstructionModal from '../components/NewConstructionModal';
import { Colors, Spacing, FontFamily, FontSize, Radius, Shadows } from '../theme';
import { useBaustellen } from '../hooks/useBaustellen';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function BaustellenScreen({ navigation }: Props) {
  const { sites, totalTons } = useBaustellen();
  const [showNewSite, setShowNewSite] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader title="Lista Budów" />

      {/* Total tons */}
      <View style={styles.totalBar}>
        <Text style={styles.totalTons}>{totalTons.toFixed(1)}t</Text>
        <Text style={styles.totalLabel}>Łącznie ton</Text>
      </View>

      <View style={styles.content}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: Spacing.lg }} />
        {sites.map(site => (
          <TouchableOpacity
            key={site.id}
            style={styles.siteCard}
            onPress={() => navigation.navigate('SiteDetail', { siteId: site.id })}
            activeOpacity={0.85}
          >
            <View style={styles.siteCardLeft}>
              <View style={{ marginBottom: 6 }}>
                <Badge label={site.active ? 'AKTYWNA' : 'ZAMKNIĘTA'} variant={site.active ? 'active' : 'chorobowe'} />
              </View>
              <Text style={styles.siteName}>{site.name}</Text>
              <View style={styles.siteChips}>
                <View style={[styles.siteChip, styles.siteChipTon]}>
                  <Text style={[styles.siteChipText, { color: Colors.orange }]}>🚛 {site.totalTons.toFixed(1)}t</Text>
                </View>
                <View style={styles.siteChip}>
                  <Text style={styles.siteChipText}>{site.deliveryCount} dostaw</Text>
                </View>
                {site.asphaltClasses.map(cls => (
                  <View key={cls} style={styles.siteChip}>
                    <Text style={styles.siteChipText}>{cls}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — positioned inside content area, always above BottomNav */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity style={styles.fab} onPress={() => setShowNewSite(true)} activeOpacity={0.9}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
      </View>

      <BottomNav active="Baustellen" onNavigate={(s) => navigation.navigate(s)} />

      <NewConstructionModal visible={showNewSite} onClose={() => setShowNewSite(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { flex: 1 },
  scroll: { flex: 1 },
  totalBar: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.creamDark,
  },
  totalTons: { fontFamily: 'DMMono_700Bold', fontSize: FontSize.display, color: Colors.orange },
  totalLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  siteCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.sm,
    borderLeftWidth: 4, borderLeftColor: Colors.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  siteCardLeft: { flex: 1 },
  siteName: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: Colors.black, marginBottom: 8 },
  siteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  siteChip: {
    backgroundColor: Colors.creamDark, borderRadius: Radius.pill,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  siteChipTon: { backgroundColor: Colors.orangePale },
  siteChipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.grayDark },
  chevron: { fontSize: 22, color: Colors.grayLight, marginLeft: 8 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.orange,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.orange,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
