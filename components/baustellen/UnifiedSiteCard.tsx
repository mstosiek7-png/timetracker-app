// ============================================================
// UnifiedSiteCard — łączy dane z einsatzplan + dostawy
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { Colors, FontFamily, Radius, Shadows } from '../../theme';
import { calcDiff, formatTonnen, parseRealInput } from '../../utils/einsatzplanDiff';

interface Props {
  siteId: string;
  siteName: string;
  siteAddress?: string | null;
  siteStatus?: string | null;
  // einsatzplan (opcjonalne)
  einsatzplanId?: string | null;
  mischgut?: string | null;
  tonnenPlan?: number | null;
  tonnenReal?: number | null;
  // dostawy (opcjonalne)
  deliveryCount?: number;
  deliveryTons?: number;
  asphaltTypes?: string[];
  // callbacks
  onPress: () => void;
  onUpdateReal?: (einsatzplanId: string, value: number) => Promise<void>;
  formatTons: (value: number) => string;
  t: (key: string) => string;
}

export default function UnifiedSiteCard({
  siteName, siteAddress, siteStatus,
  einsatzplanId, mischgut, tonnenPlan, tonnenReal,
  deliveryCount = 0, deliveryTons = 0, asphaltTypes = [],
  onPress, onUpdateReal, formatTons, t,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Use delivery tons as "real" when no manual value is set
  const effectiveReal = tonnenReal ?? (deliveryTons > 0 ? deliveryTons : null);
  const diff = calcDiff(tonnenPlan ?? null, effectiveReal);
  const isInactive = siteStatus !== 'active';
  const hasEinsatz = einsatzplanId != null;
  const hasDeliveries = deliveryCount > 0 || asphaltTypes.length > 0;

  async function handleSave() {
    const parsed = parseRealInput(editValue);
    if (parsed === null) {
      Alert.alert(t('Blad'), t('Nieprawidlowe godziny'));
      return;
    }
    setSaving(true);
    try {
      await onUpdateReal?.(einsatzplanId!, parsed);
      setEditing(false);
      setEditValue('');
    } catch {
      Alert.alert(t('Blad'), t('Nie udalo sie zapisac wpisow'));
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setEditing(true);
    setEditValue(effectiveReal !== null && effectiveReal !== undefined
      ? String(effectiveReal).replace('.', ',')
      : '');
  }

  return (
    <TouchableOpacity
      style={[styles.card, isInactive && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Status pill + arrow */}
      <View style={styles.cardTop}>
        <View style={[styles.statusPill, isInactive && styles.statusPillInactive]}>
          <Text style={[styles.statusPillText, isInactive && styles.statusPillTextInactive]}>
            {siteStatus === 'active' ? t('AKTYWNA') : t('ZAMKNIETA')}
          </Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </View>

      {/* Nazwa + mischgut */}
      <View style={styles.nameRow}>
        <Text style={styles.siteName} numberOfLines={2}>{siteName}</Text>
        {mischgut ? (
          <View style={styles.mischgutTag}>
            <Text style={styles.mischgutText}>{mischgut}</Text>
          </View>
        ) : null}
      </View>
      {siteAddress ? <Text style={styles.siteAddr} numberOfLines={1} ellipsizeMode="tail">{siteAddress}</Text> : null}

      {/* Plan / Real / Diff — tylko jeśli jest wpis einsatzplan */}
      {hasEinsatz && (
        <>
          <View style={styles.divider} />
          <View style={styles.dataRow}>
            <View style={styles.dataCell}>
              <Text style={styles.dataLabel}>{t('Plan')}</Text>
              <Text style={styles.dataValue}>{formatTonnen(tonnenPlan ?? null)}</Text>
            </View>

            <View style={styles.dataCell}>
              <Text style={styles.dataLabel}>{t('Real')}</Text>
              {editing ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={editValue}
                    onChangeText={setEditValue}
                    keyboardType="decimal-pad"
                    autoFocus
                    placeholder="0,0"
                    placeholderTextColor={Colors.grayMid}
                    onSubmitEditing={handleSave}
                  />
                  <Text style={styles.inputUnit}>t</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={startEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.dataValue, styles.editableValue]}>
                    {formatTonnen(effectiveReal)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dataCell}>
              <Text style={styles.dataLabel}>{t('Roznica')}</Text>
              {diff ? (
                <Text style={[styles.dataValue, { color: diff.color }]}>{diff.label}</Text>
              ) : (
                <Text style={[styles.dataValue, { color: Colors.grayMid }]}>—</Text>
              )}
            </View>
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setEditing(false); setEditValue(''); }}
              >
                <Text style={styles.cancelBtnText}>{t('Anuluj')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>{t('Zapisz')}</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Dostawy */}
      {hasDeliveries && (
        <>
          <View style={styles.divider} />
          <View style={styles.tagsRow}>
            {deliveryCount > 0 && (
              <View style={[styles.tag, styles.tagOrange]}>
                <Text style={[styles.tagText, styles.tagTextOrange]}>
                  🚛 {formatTons(deliveryTons)}
                </Text>
              </View>
            )}
            {asphaltTypes.map(type => (
              <View key={type} style={styles.tag}>
                <Text style={styles.tagText}>{type}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orange,
    ...Shadows.sm,
  },
  cardInactive: { borderLeftColor: Colors.creamDark, opacity: 0.75 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statusPill: { backgroundColor: Colors.greenBg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  statusPillInactive: { backgroundColor: Colors.creamDark },
  statusPillText: { fontSize: 9, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8, color: Colors.green },
  statusPillTextInactive: { color: Colors.grayMid },
  cardArrow: { color: Colors.grayMid, fontSize: 14 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  siteName: { fontSize: 18, fontFamily: FontFamily.bold, color: Colors.black, flex: 1, letterSpacing: -0.2 },
  mischgutTag: { backgroundColor: Colors.orangePale, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  mischgutText: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.orange },
  siteAddr: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.grayMid, marginBottom: 4 },

  divider: { height: 1, backgroundColor: Colors.creamDark, marginVertical: 10 },

  dataRow: { flexDirection: 'row', gap: 8 },
  dataCell: { flex: 1, alignItems: 'center', gap: 4 },
  dataLabel: { fontSize: 9, fontFamily: FontFamily.bold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.5 },
  dataValue: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.black },
  editableValue: { color: Colors.orange, textDecorationLine: 'underline' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.orange,
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.black,
    minWidth: 50,
    textAlign: 'center',
    paddingVertical: 2,
  },
  inputUnit: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.grayMid },

  editActions: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.cream },
  cancelBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.grayMid },
  saveBtn: { paddingVertical: 7, paddingHorizontal: 20, borderRadius: 20, backgroundColor: Colors.orange },
  saveBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: '#fff' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: Colors.cream, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  tagOrange: { backgroundColor: Colors.orangePale },
  tagText: { fontSize: 11, fontFamily: FontFamily.semiBold, color: Colors.grayMid },
  tagTextOrange: { color: Colors.orange, fontFamily: FontFamily.bold },
});
