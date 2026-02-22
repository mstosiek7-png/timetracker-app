// ============================================================
// TimeTracker — Screen: Dashboard
// Plik: src/screens/DashboardScreen.tsx
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, Modal, TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppHeader, Card, PrimaryButton, SecondaryButton,
  Badge, Avatar, WorkerChip, GhostButton, Divider, BottomNav,
} from '../components/ui';
import { Colors, Spacing, FontFamily, FontSize, Shadows, Radius } from '../theme';
import { useTimeEntries, useDeleteTimeEntry, useUpdateTimeEntry } from '../hooks/useTimeEntries';
import { useWorkers } from '../hooks/useWorkers';
import { useDeleteEmployee } from '../hooks/useEmployees';
import { AddEntryModal } from '../components/AddEntryModal';
import { BulkEntryModal } from '../components/BulkEntryModal';
import { EmployeeForm } from '../components/employee/EmployeeForm';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function DashboardScreen({ navigation }: Props) {
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEntry, setEditingEntry]   = useState<{ id: string; hours: number } | null>(null);
  const [editHours, setEditHours]         = useState('');
  const [fabOpen, setFabOpen]             = useState(false);
  const [toastMessage, setToastMessage]   = useState('');
  const [toastVisible, setToastVisible]   = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useI18n();

  const { data: allEntries = [], isLoading: loadingEntries } = useTimeEntries();
  const { workers } = useWorkers();
  const deleteEntry = useDeleteTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEmployee = useDeleteEmployee();

  const recentEntries = allEntries.slice(0, 5).map(e => ({
    id: e.id,
    workerId: e.employee_id,
    workerName: workers.find(w => w.id === e.employee_id)?.firstName ?? t('Pracownik'),
    date: new Date(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hours: e.hours,
    status: e.status === 'work' ? t('Praca') : e.status === 'sick' ? t('Chorobowe') : e.status === 'vacation' ? t('Urlop') : t('FZA'),
  }));

  const today = new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const handleLogout = () => {
    Alert.alert(
      t('Potwierdz wylogowanie'),
      t('Czy na pewno chcesz sie wylogowac?'),
      [
        { text: t('Anuluj'), style: 'cancel' },
        {
          text: t('Wyloguj'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('timetracker:biometric-enabled');
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert(t('Blad'), t('Nie udalo sie wylogowac. Sprobuj ponownie.'));
            }
          },
        },
      ]
    );
  };

  // ─── Header right: date above logout + language ───────────
  const HeaderRightTop = <Text style={styles.headerDate}>{today}</Text>;
  const HeaderRight = (
    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
      <Text style={styles.logoutText}>⇥ {t('Wyloguj')}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.orange} />

      <AppHeader
        title={t('TimeTracker')}
        subtitle={t('Dashboard')}
        rightElementTop={HeaderRightTop}
        rightElement={HeaderRight}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── Recent entries ────────────────────────────── */}
        <Card
          title={t('Ostatnie wpisy')}
          rightElement={<GhostButton label={t('Zobacz wszystkie')} onPress={() => navigation.navigate('AllEntries')} />}
        >
          {recentEntries.length === 0 ? (
            <Text style={styles.emptyText}>{t('Brak wpisow — dodaj pierwszy!')}</Text>
          ) : (
            recentEntries.map((entry, i) => (
              <View key={entry.id}>
                {i > 0 && <Divider style={{ marginVertical: 0 }} />}
                <TouchableOpacity style={styles.entryRow} onPress={() => navigation.navigate('WorkerDetail', { workerId: entry.workerId })} activeOpacity={0.7}>
                  <View style={styles.entryLeft}>
                    <Avatar name={entry.workerName} size={38} />
                    <View>
                      <Text style={styles.entryName}>{entry.workerName}</Text>
                      <Text style={styles.entryMeta}>{entry.date} · {entry.hours}h</Text>
                    </View>
                  </View>
                  <View style={styles.entryRight}>
                    <Badge label={entry.status} variant={entry.status.toLowerCase() as any} />
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingEntry({ id: entry.id, hours: entry.hours }); setEditHours(entry.hours.toString()); }}>
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => {
                      Alert.alert(t('Usun wpis'), t('Czy na pewno usunac ten wpis?'), [
                        { text: t('Anuluj'), style: 'cancel' },
                        { text: t('Usun'), style: 'destructive', onPress: () => { deleteEntry.mutate(entry.id); } },
                      ]);
                    }}>
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {/* ─── Workers ───────────────────────────────────── */}
        <Card title={t('Pracownicy')}>
          <View style={styles.workerChips}>
            {workers.map(w => (
              <WorkerChip key={w.id} name={w.firstName} onPress={() => navigation.navigate('WorkerDetail', { workerId: w.id })} />
            ))}
          </View>
        </Card>

        {/* ─── Manage workers ────────────────────────────── */}
        <Card
          title={t('Zarzadzanie pracownikami')}
          rightElement={<GhostButton label={t('Zobacz wszystkich')} onPress={() => navigation.navigate('Workers')} />}
        >
          {workers.map((w, i) => (
            <View key={w.id}>
              {i > 0 && <Divider style={{ marginVertical: 0 }} />}
              <TouchableOpacity
                style={styles.manageRow}
                onPress={() => navigation.navigate('WorkerDetail', { workerId: w.id })}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.manageName}>{w.firstName}</Text>
                  <Text style={styles.manageRole}>{w.lastName}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Badge label={w.currentStatus ? t(w.currentStatus) : t('Praca')} variant={(w.currentStatus?.toLowerCase() ?? 'praca') as any} />
                  <TouchableOpacity style={styles.iconBtn} onPress={(event) => {
                    event.stopPropagation();
                    Alert.alert(t('Usun pracownika'), t('Czy na pewno usunac pracownika') + ` ${w.firstName}?`, [
                      { text: t('Anuluj'), style: 'cancel' },
                      { text: t('Usun'), style: 'destructive', onPress: () => { deleteEmployee.mutate(w.id); } },
                    ]);
                  }}>
                    <Text>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </Card>

      </ScrollView>

      {/* FAB Menu Overlay */}
      {fabOpen && (
        <TouchableOpacity 
          style={styles.fabOverlay} 
          activeOpacity={1} 
          onPress={() => setFabOpen(false)}
        />
      )}
      
      {/* FAB Menu */}
      {fabOpen && (
        <View style={styles.fabMenu}>
          <TouchableOpacity style={styles.fabOption} onPress={() => { setFabOpen(false); setShowAddModal(true); }}>
            <View style={styles.fabOptionIcon}><Text>✏️</Text></View>
            <Text style={styles.fabOptionText}>{t('Dodaj wpis')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabOption} onPress={() => { setFabOpen(false); setShowBulkModal(true); }}>
            <View style={styles.fabOptionIcon}><Text>👥</Text></View>
            <Text style={styles.fabOptionText}>{t('Wszyscy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabOption} onPress={() => { setFabOpen(false); setShowEmployeeForm(true); }}>
            <View style={styles.fabOptionIcon}><Text>👤</Text></View>
            <Text style={styles.fabOptionText}>{t('Dodaj pracownika')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomNav 
        active="Dashboard" 
        onNavigate={(screen) => navigation.navigate(screen)} 
        onFabPress={() => setFabOpen(!fabOpen)}
        fabOpen={fabOpen}
      />

      {toastVisible && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Modals */}
      <AddEntryModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
      <BulkEntryModal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSaved={(count) => showToast(`${t('Zapisano wpisy')}: ${count}`)}
      />
      <EmployeeForm visible={showEmployeeForm} onClose={() => setShowEmployeeForm(false)} mode="create" />

      {/* Edit Hours Modal */}
      <Modal visible={!!editingEntry} transparent animationType="fade" onRequestClose={() => setEditingEntry(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditingEntry(null)} />
        <View style={styles.editModal}>
          <Text style={styles.editModalTitle}>{t('Edytuj godziny')}</Text>
          <TextInput
            style={styles.editModalInput}
            value={editHours}
            onChangeText={setEditHours}
            keyboardType="decimal-pad"
            placeholder={t('np. 8.5')}
            placeholderTextColor={Colors.grayLight}
          />
          <View style={styles.editModalBtns}>
            <TouchableOpacity style={[styles.editModalBtn, styles.editModalBtnCancel]} onPress={() => setEditingEntry(null)}>
              <Text style={styles.editModalBtnCancelText}>{t('Anuluj')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editModalBtn, styles.editModalBtnSave]}
              disabled={!editHours.trim()}
              onPress={() => {
                if (editingEntry && editHours.trim()) {
                  updateEntry.mutate({ id: editingEntry.id, hours: parseFloat(editHours) });
                  setEditingEntry(null);
                }
              }}
            >
              <Text style={styles.editModalBtnSaveText}>{t('Zapisz')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1, backgroundColor: Colors.cream },
  scrollContent: { paddingBottom: 120, paddingTop: Spacing.lg },

  headerDate: { fontSize: 12, fontFamily: FontFamily.bold, color: 'rgba(255,255,255,0.8)' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
  },
  logoutText: { color: '#fff', fontSize: 12, fontFamily: FontFamily.bold },

  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryName: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.black },
  entryMeta: { fontSize: 11, fontFamily: FontFamily.semiBold, color: Colors.grayMid, marginTop: 1 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.cream,
    alignItems: 'center', justifyContent: 'center',
  },

  workerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  manageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  manageName: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.black },
  manageRole: { fontSize: 11, fontFamily: FontFamily.semiBold, color: Colors.grayMid, marginTop: 2 },

  emptyText: { fontSize: FontSize.base, color: Colors.grayMid, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.lg },

  // FAB Menu
  fabOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 45,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 88,
    left: '50%',
    transform: [{ translateX: -100 }], // approximate centering
    alignItems: 'center',
    gap: 10,
    zIndex: 46,
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 20,
    borderRadius: 50,
    ...Shadows.md,
  },
  fabOptionIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.orangePale,
    alignItems: 'center', justifyContent: 'center',
  },
  fabOptionText: {
    fontSize: 14, fontFamily: FontFamily.bold, color: Colors.black,
  },

  // Edit Hours Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  editModal: {
    position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -150 }, { translateY: -100 }],
    width: 300, backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: Spacing.lg, ...Shadows.md,
  },
  editModalTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.semiBold, color: Colors.black, marginBottom: Spacing.md },
  editModalInput: {
    backgroundColor: Colors.cream, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.creamDark,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.black,
    marginBottom: Spacing.md,
  },
  editModalBtns: { flexDirection: 'row', gap: 10 },
  editModalBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center' },
  editModalBtnCancel: { backgroundColor: Colors.creamDark },
  editModalBtnCancelText: { color: Colors.black, fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  editModalBtnSave: { backgroundColor: Colors.orange },
  editModalBtnSaveText: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: FontSize.md },

  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 92,
    alignItems: 'center',
    zIndex: 60,
  },
  toast: {
    backgroundColor: Colors.black,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    maxWidth: '90%',
    ...Shadows.md,
  },
  toastText: { color: '#fff', fontSize: 13, fontFamily: FontFamily.semiBold },
});
