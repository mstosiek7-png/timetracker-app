// ============================================================
// TimeTracker — Screen: BaustellenScreen (Lista Budów)
// Plik: src/screens/BaustellenScreen.tsx
// ============================================================
import React, { useState } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader, BottomNav } from '../components/ui';
import NewConstructionModal from '../components/NewConstructionModal';
import WeeklyView from '../components/baustellen/WeeklyView';
import { Colors } from '../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function BaustellenScreen({ navigation }: Props) {
  const [showNewSite, setShowNewSite] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />
      <AppHeader title="Lista Budów" />

      <WeeklyView
        onOpenSite={(siteId, dayKey) => navigation.navigate('SiteDetail', { siteId, day: dayKey })}
        onSelectDay={setSelectedDayKey}
      />

      <BottomNav
        active="Baustellen"
        onNavigate={(s) => navigation.navigate(s)}
        onFabPress={() => setShowNewSite(true)}
      />

      <NewConstructionModal
        visible={showNewSite}
        onClose={() => setShowNewSite(false)}
        siteDate={selectedDayKey}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
});
