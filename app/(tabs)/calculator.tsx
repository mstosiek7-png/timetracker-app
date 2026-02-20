// =====================================================
// Calculator Tab  wraps screens/CalculatorScreen
// =====================================================
import React from 'react';
import { router } from 'expo-router';
import CalculatorScreen from '../../screens/CalculatorScreen';

const nav: any = {
  navigate: (screen: string, _params?: any) => {
    const routes: Record<string, string> = {
      Dashboard:  '/(tabs)',
      Baustellen: '/(tabs)/baustellen',
      Calculator: '/(tabs)/calculator',
      Reports:    '/(tabs)/reports',
    };
    router.push((routes[screen] ?? '/(tabs)/calculator') as any);
  },
  goBack: () => router.back(),
};

export default function CalculatorTab() {
  return <CalculatorScreen navigation={nav} />;
}
