// =====================================================
// New Delivery  wraps screens/NewDeliveryScreen
// =====================================================
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import NewDeliveryScreen from '../../screens/NewDeliveryScreen';

export default function NewDeliveryPage() {
  const { site_id, site_name, day } = useLocalSearchParams<{ site_id: string; site_name?: string; day?: string }>();

  const nav: any = {
    navigate: (screen: string, _params?: any) => {
      const routes: Record<string, string> = {
        Baustellen: '/(tabs)/baustellen',
        Dashboard:  '/(tabs)',
      };
      router.push((routes[screen] ?? '/(tabs)/baustellen') as any);
    },
    goBack: () => router.back(),
  };

  const route: any = { params: { siteId: site_id, siteName: site_name, day } };

  return <NewDeliveryScreen navigation={nav} route={route} />;
}
