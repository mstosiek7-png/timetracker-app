// =====================================================
// Baustellen Tab  wraps screens/BaustellenScreen
// =====================================================
import React from 'react';
import { router } from 'expo-router';
import BaustellenScreen from '../../screens/BaustellenScreen';

const nav: any = {
  navigate: (screen: string, params?: any) => {
    if (screen === 'SiteDetail' && params?.siteId) {
      router.push({ pathname: '/site/[id]', params: { id: params.siteId } } as any);
    } else if (screen === 'NewSite') {
      // simple alert for now  NewSite screen not yet route-mapped
      router.push('/(tabs)/baustellen' as any);
    } else {
      const routes: Record<string, string> = {
        Dashboard:  '/(tabs)',
        Calculator: '/(tabs)/calculator',
        Reports:    '/(tabs)/reports',
        Baustellen: '/(tabs)/baustellen',
      };
      router.push((routes[screen] ?? '/(tabs)/baustellen') as any);
    }
  },
  goBack: () => router.back(),
};

export default function BaustellenTab() {
  return <BaustellenScreen navigation={nav} />;
}
