// =====================================================
// Tabs Layout — hidden native tab bar; screens use custom BottomNav
// =====================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: Colors.grayLight,
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Dashboard'  }} />
      <Tabs.Screen name="baustellen" options={{ title: 'Baustellen' }} />
      <Tabs.Screen name="calculator" options={{ title: 'Kalkulator' }} />
      <Tabs.Screen name="reports"    options={{ title: 'Raporty'    }} />
      <Tabs.Screen name="monthly"    options={{ href: null }} />
      <Tabs.Screen name="scanner"    options={{ href: null }} />
    </Tabs>
  );
}

