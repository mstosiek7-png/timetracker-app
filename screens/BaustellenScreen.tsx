// ============================================================
// TimeTracker — Screen: BaustellenScreen (Lista Budów)
// Plik: src/screens/BaustellenScreen.tsx
// ============================================================
import React, { useState } from 'react';
import { StyleSheet, StatusBar, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader, BottomNav } from '../components/ui';
import NewConstructionModal from '../components/NewConstructionModal';
import WeeklyView from '../components/baustellen/WeeklyView';
import EinsatzplanImportModal from '../components/EinsatzplanImportModal';
import { Colors, FontFamily } from '../theme';
import { useI18n } from '../i18n/I18nProvider';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function BaustellenScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [showNewSite, setShowNewSite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importedDate, setImportedDate] = useState<string | null>(null);
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
      <AppHeader
        title={t('Lista budow')}
        rightElement={
          <TouchableOpacity style={styles.importBtn} onPress={() => setShowImport(true)}>
            <Text style={styles.importBtnText}>📋  {t('Importuj plan')}</Text>
          </TouchableOpacity>
        }
      />

      <WeeklyView
        onOpenSite={(siteId, dayKey, mischgut) => navigation.navigate('SiteDetail', { siteId, day: dayKey, mischgut })}
        onSelectDay={setSelectedDayKey}
        targetDate={importedDate}
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

      <EinsatzplanImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onImported={(date) => { setImportedDate(date); setShowImport(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  importBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  importBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#fff',
  },
});
