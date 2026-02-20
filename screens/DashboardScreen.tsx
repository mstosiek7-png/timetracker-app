// ============================================================
// TimeTracker — Screen: Dashboard
// Plik: src/screens/DashboardScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppHeader, Card, PrimaryButton, SecondaryButton,
  Badge, Avatar, WorkerChip, GhostButton, Divider, BottomNav,
} from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Shadows, Radius } from '../theme';
import { useTimeEntries, useDeleteTimeEntry } from '../hooks/useTimeEntries';
import { useWorkers } from '../hooks/useWorkers';
import { AddEntryModal } from '../components/AddEntryModal';
import { BulkEntryModal } from '../components/BulkEntryModal';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function DashboardScreen({ navigation }: Props) {
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { data: allEntries = [], isLoading: loadingEntries } = useTimeEntries();
  const { workers } = useWorkers();
  const deleteEntry = useDeleteTimeEntry();

  const recentEntries = allEntries.slice(0, 10).map(e => ({
    id: e.id,
    workerId: e.employee_id,
    workerName: workers.find(w => w.id === e.employee_id)?.firstName ?? 'Pracownik',
    date: new Date(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hours: e.hours,
    status: e.status === 'work' ? 'Praca' : e.status === 'sick' ? 'Chorobowe' : e.status === 'vacation' ? 'Urlop' : 'FZA',
  }));

  const todayStr = new Date().toISOString().split('T')[0];
  const totalHoursToday = allEntries
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.hours, 0);

  const entries = allEntries;

  const today = new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });

  // ─── Header right: date + logout ───────────────────────────
  const HeaderRight = (
    <View style={styles.headerRight}>
      <Text style={styles.headerDate}>{today}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={() => {/* logout logic */}}>
        <Text style={styles.logoutText}>↪ Wyloguj</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />

      <AppHeader title="TimeTracker" subtitle="Dashboard" rightElement={HeaderRight} />

      {/* ─── Stats strip ─────────────────────────────────── */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{workers.length}</Text>
          <Text style={styles.statLabel}>Pracownicy</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{totalHoursToday}h</Text>
          <Text style={styles.statLabel}>Dzisiaj</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{recentEntries.length}</Text>
          <Text style={styles.statLabel}>Wpisy</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: Spacing.lg }} />

        {/* ─── Quick Actions ─────────────────────────────── */}
        <Card>
          <Text style={styles.cardTitle}>Szybkie akcje</Text>
          <View style={styles.actionsRow}>
            <PrimaryButton label="+ Dodaj wpis" icon="✏️" onPress={() => setShowAddModal(true)} />
            <SecondaryButton label="Zbiorczo" icon="📋" onPress={() => setShowBulkModal(true)} />
          </View>
        </Card>

        {/* ─── Recent entries ────────────────────────────── */}
        <Card
          title="Ostatnie wpisy"
          rightElement={<GhostButton label="Zobacz wszystkie" onPress={() => navigation.navigate('AllEntries')} />}
        >
          {recentEntries.length === 0 ? (
            <Text style={styles.emptyText}>Brak wpisów — dodaj pierwszy!</Text>
          ) : (
            recentEntries.map((entry, i) => (
              <View key={entry.id}>
                {i > 0 && <Divider style={{ marginVertical: 0 }} />}
                <View style={styles.entryRow}>
                  <View style={styles.entryLeft}>
                    <Avatar name={entry.workerName} size={36} />
                    <View>
                      <Text style={styles.entryName}>{entry.workerName}</Text>
                      <Text style={styles.entryMeta}>{entry.date} · {entry.hours}h</Text>
                    </View>
                  </View>
                  <View style={styles.entryRight}>
                    <Badge label={entry.status} variant={entry.status.toLowerCase() as any} />
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('EditEntry', { entryId: entry.id })}>
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => {/* delete */}}>
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* ─── Workers ───────────────────────────────────── */}
        <Card title="Pracownicy">
          <View style={styles.workerChips}>
            {workers.map(w => (
              <WorkerChip key={w.id} name={w.firstName} onPress={() => navigation.navigate('WorkerDetail', { workerId: w.id })} />
            ))}
          </View>
        </Card>

        {/* ─── Manage workers ────────────────────────────── */}
        <Card
          title="Zarządzanie pracownikami"
          rightElement={<GhostButton label="Zobacz wszystkich" onPress={() => navigation.navigate('Workers')} />}
        >
          {workers.map((w, i) => (
            <View key={w.id}>
              {i > 0 && <Divider style={{ marginVertical: 0 }} />}
              <View style={styles.manageRow}>
                <View>
                  <Text style={styles.manageName}>{w.firstName}</Text>
                  <Text style={styles.manageRole}>{w.lastName}</Text>
                </View>
                <Badge label={w.currentStatus ?? 'Praca'} variant={(w.currentStatus?.toLowerCase() ?? 'praca') as any} />
              </View>
            </View>
          ))}
          <View style={{ marginTop: Spacing.md }}>
            <TouchableOpacity style={styles.addWorkerBtn} onPress={() => navigation.navigate('AddWorker')}>
              <Text style={styles.addWorkerText}>+ Dodaj pracownika</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="Dashboard" onNavigate={(screen) => navigation.navigate(screen)} />

      {/* Modals */}
      <AddEntryModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
      <BulkEntryModal visible={showBulkModal} onClose={() => setShowBulkModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1, backgroundColor: Colors.cream },

  headerRight: { alignItems: 'flex-end', gap: 6 },
  headerDate: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.75)' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 14,
  },
  logoutText: { color: '#fff', fontSize: FontSize.base, fontFamily: FontFamily.medium },

  statsStrip: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.creamDark,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statBorder: { borderLeftWidth: 1, borderLeftColor: Colors.creamDark },
  statValue: { fontSize: FontSize.xxl, fontFamily: 'DMMono_700Bold', color: Colors.orange },
  statLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },

  cardTitle: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  actionsRow: { flexDirection: 'row', gap: 10 },

  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.black },
  entryMeta: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.grayMid, marginTop: 1 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.creamDark,
    alignItems: 'center', justifyContent: 'center',
  },

  workerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  manageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  manageName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, color: Colors.black },
  manageRole: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.grayMid, marginTop: 2 },

  addWorkerBtn: {
    borderWidth: 1.5, borderColor: Colors.orange, borderRadius: Radius.pill,
    paddingVertical: 12, alignItems: 'center',
  },
  addWorkerText: { color: Colors.orange, fontFamily: FontFamily.semiBold, fontSize: FontSize.md },

  emptyText: { fontSize: FontSize.base, color: Colors.grayMid, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.lg },
});
