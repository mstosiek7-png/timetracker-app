// =====================================================
// Dashboard Tab  wraps screens/DashboardScreen with expo-router navigation
// =====================================================
import React from 'react';
import { router } from 'expo-router';
import DashboardScreen from '../../screens/DashboardScreen';

const nav: any = {
  navigate: (screen: string, params?: any) => {
    const routes: Record<string, string> = {
      AllEntries:   '/(tabs)',
      Workers:      '/(tabs)',
      AddWorker:    '/(tabs)',
      WorkerDetail: params?.workerId ? `/(tabs)/monthly?workerId=${params.workerId}` : '/(tabs)',
      EditEntry:    '/(tabs)',
      Baustellen:   '/(tabs)/baustellen',
      Calculator:   '/(tabs)/calculator',
      Reports:      '/(tabs)/reports',
      Dashboard:    '/(tabs)',
    };
    const route = routes[screen] ?? '/(tabs)';
    router.push(route as any);
  },
  goBack: () => router.back(),
  replace: (screen: string) => {
    const routes: Record<string, string> = {
      Dashboard:  '/(tabs)',
      Baustellen: '/(tabs)/baustellen',
      Calculator: '/(tabs)/calculator',
      Reports:    '/(tabs)/reports',
    };
    router.replace((routes[screen] ?? '/(tabs)') as any);
  },
};

export default function DashboardTab() {
  return <DashboardScreen navigation={nav} />;
}
