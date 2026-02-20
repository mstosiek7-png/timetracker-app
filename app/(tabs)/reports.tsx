// =====================================================
// Reports Tab  wraps screens/ReportsScreen
// =====================================================
import React from 'react';
import { router } from 'expo-router';
import ReportsScreen from '../../screens/ReportsScreen';

const nav: any = {
  navigate: (screen: string, _params?: any) => {
    const routes: Record<string, string> = {
      Dashboard:  '/(tabs)',
      Baustellen: '/(tabs)/baustellen',
      Calculator: '/(tabs)/calculator',
      Reports:    '/(tabs)/reports',
    };
    router.push((routes[screen] ?? '/(tabs)/reports') as any);
  },
  goBack: () => router.back(),
};

export default function ReportsTab() {
  return <ReportsScreen navigation={nav} />;
}
