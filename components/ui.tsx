// ============================================================
// TimeTracker — Shared UI Components
// ============================================================
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, FontFamily, FontSize, Shadows } from '../theme';

// ─── AppHeader ───────────────────────────────────────────────
interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}
export function AppHeader({ title, subtitle, rightElement, showBack, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.headerLeft}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <View>
          {subtitle ? (
            <Text style={styles.headerSub}>{subtitle}</Text>
          ) : null}
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>
      {rightElement && <View style={styles.headerRight}>{rightElement}</View>}
    </View>
  );
}

// ─── Card ────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
  rightElement?: React.ReactNode;
}
export function Card({ children, style, title, rightElement }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {rightElement}
        </View>
      )}
      {children}
    </View>
  );
}

// ─── PrimaryButton ───────────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
export function PrimaryButton({ label, onPress, icon, loading, disabled, style, fullWidth, size = 'md' }: ButtonProps) {
  const sizeStyle = size === 'lg' ? styles.btnLg : size === 'sm' ? styles.btnSm : styles.btnMd;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.btnPrimary, sizeStyle, fullWidth && { width: '100%', justifyContent: 'center' }, disabled && { opacity: 0.5 }, style]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon ? <Text style={styles.btnIcon}>{icon}</Text> : null}
          <Text style={styles.btnPrimaryLabel}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── SecondaryButton ─────────────────────────────────────────
export function SecondaryButton({ label, onPress, icon, style, fullWidth }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.btnSecondary, fullWidth && { width: '100%', justifyContent: 'center' }, style]}
    >
      {icon ? <Text style={styles.btnIcon}>{icon}</Text> : null}
      <Text style={styles.btnSecondaryLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── OutlineButton ───────────────────────────────────────────
export function OutlineButton({ label, onPress, icon, style, fullWidth }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.btnOutline, fullWidth && { width: '100%', justifyContent: 'center' }, style]}
    >
      {icon ? <Text style={styles.btnOutlineIcon}>{icon}</Text> : null}
      <Text style={styles.btnOutlineLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── GhostButton ─────────────────────────────────────────────
export function GhostButton({ label, onPress, style }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={style}>
      <Text style={styles.btnGhost}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Badge ───────────────────────────────────────────────────
type BadgeVariant = 'praca' | 'chorobowe' | 'urlop' | 'fza' | 'active';
interface BadgeProps { label: string; variant: BadgeVariant; }
export function Badge({ label, variant }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
    praca:      { bg: Colors.greenBg,  text: Colors.green },
    chorobowe:  { bg: Colors.redBg,    text: Colors.red },
    urlop:      { bg: Colors.blueBg,   text: Colors.blue },
    fza:        { bg: Colors.fzaBg,    text: Colors.fzaText },
    active:     { bg: Colors.orangePale, text: Colors.orange },
  };
  const vs = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: vs.bg }]}>
      <Text style={[styles.badgeText, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

// ─── Checkbox ────────────────────────────────────────────────
interface CheckboxProps { checked: boolean; onToggle: () => void; }
export function Checkbox({ checked, onToggle }: CheckboxProps) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
      style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── RadioOption ─────────────────────────────────────────────
interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}
export function RadioOption({ label, selected, onPress }: RadioOptionProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.radioOption, selected && styles.radioOptionSelected]}>
      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── StatusChip ──────────────────────────────────────────────
interface StatusChipProps { label: string; selected: boolean; onPress: () => void; }
export function StatusChip({ label, selected, onPress }: StatusChipProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.statusChip, selected && styles.statusChipSelected]}>
      <Text style={[styles.statusChipText, selected && styles.statusChipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── WorkerChip ──────────────────────────────────────────────
interface WorkerChipProps { name: string; onPress: () => void; }
export function WorkerChip({ name, onPress }: WorkerChipProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.workerChip}>
      <View style={styles.chipAvatar}>
        <Text style={styles.chipAvatarText}>{name[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.chipName}>{name}</Text>
    </TouchableOpacity>
  );
}

// ─── Avatar ──────────────────────────────────────────────────
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.37 }]}>{name[0]?.toUpperCase()}</Text>
    </View>
  );
}

// ─── SectionLabel ────────────────────────────────────────────
export function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

// ─── Divider ─────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── BottomNav ───────────────────────────────────────────────
interface NavItem { icon: string; label: string; screen: string; }
interface BottomNavProps { 
  active: string; 
  onNavigate: (screen: string) => void; 
  onFabPress?: () => void;
  fabOpen?: boolean;
}
const NAV_ITEMS_LEFT: NavItem[] = [
  { icon: '⊞', label: 'Dashboard',  screen: 'Dashboard' },
  { icon: '🔧', label: 'Baustellen', screen: 'Baustellen' },
];
const NAV_ITEMS_RIGHT: NavItem[] = [
  { icon: '🔢', label: 'Kalkulator', screen: 'Calculator' },
  { icon: '📊', label: 'Raporty',    screen: 'Reports' },
];

export function BottomNav({ active, onNavigate, onFabPress, fabOpen }: BottomNavProps) {
  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        {NAV_ITEMS_LEFT.map(item => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => onNavigate(item.screen)}
            style={styles.navItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, active === item.screen && styles.navIconActive]}>{item.icon}</Text>
            <Text style={[styles.navLabel, active === item.screen && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        
        <View style={styles.fabPlaceholder} />

        {NAV_ITEMS_RIGHT.map(item => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => onNavigate(item.screen)}
            style={styles.navItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, active === item.screen && styles.navIconActive]}>{item.icon}</Text>
            <Text style={[styles.navLabel, active === item.screen && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.fabMain, fabOpen && styles.fabMainOpen]} 
        onPress={onFabPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.fabMainIcon, fabOpen && styles.fabMainIconOpen]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    // paddingTop is set dynamically via useSafeAreaInsets
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerRight: {},
  headerTitle: { fontSize: 24, fontFamily: FontFamily.bold, color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, fontFamily: FontFamily.bold, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 24, color: '#fff', lineHeight: 28 },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Buttons
  btnPrimary: {
    backgroundColor: Colors.orange, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnSecondary: {
    backgroundColor: Colors.black, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnOutline: {
    backgroundColor: 'transparent', borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnSm:  { paddingVertical: 9,  paddingHorizontal: 14 },
  btnMd:  { paddingVertical: 13, paddingHorizontal: 20 },
  btnLg:  { paddingVertical: 16, paddingHorizontal: 24 },
  btnPrimaryLabel:   { color: '#fff',         fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  btnSecondaryLabel: { color: '#fff',         fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  btnOutlineLabel:   { color: Colors.orange,  fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  btnGhost: { color: Colors.orange, fontFamily: FontFamily.semiBold, fontSize: FontSize.base },
  btnIcon:  { fontSize: 15 },
  btnOutlineIcon: { fontSize: 15 },

  // Badge
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontSize: 9, fontFamily: FontFamily.bold, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Checkbox
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.grayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: FontFamily.bold },

  // Radio
  radioOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.md, borderRadius: Radius.sm,
    backgroundColor: Colors.cream,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  radioOptionSelected: { backgroundColor: Colors.orangePale, borderColor: Colors.orange },
  radioCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.grayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: Colors.orange, backgroundColor: Colors.orange },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  radioLabel: { fontSize: FontSize.md, fontFamily: FontFamily.medium, color: Colors.black },
  radioLabelSelected: { color: Colors.orange },

  // StatusChip
  statusChip: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: Radius.pill, borderWidth: 1.5,
    borderColor: Colors.creamDark, backgroundColor: Colors.cream,
  },
  statusChipSelected: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  statusChipText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.grayDark },
  statusChipTextSelected: { color: '#fff' },

  // WorkerChip
  workerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.creamDark, borderRadius: Radius.pill,
    paddingVertical: 5, paddingLeft: 5, paddingRight: 12,
  },
  chipAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center',
  },
  chipAvatarText: { color: '#fff', fontSize: 11, fontFamily: FontFamily.bold },
  chipName: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.black },

  // Avatar
  avatar: { backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: FontFamily.bold },

  // SectionLabel
  sectionLabel: {
    fontSize: FontSize.xs, fontFamily: FontFamily.semiBold,
    color: Colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, marginTop: Spacing.xs,
  },

  // Divider
  divider: { height: 1, backgroundColor: Colors.creamDark },

  // BottomNav
  bottomNavContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  bottomNav: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.creamDark,
    paddingTop: 8, paddingBottom: 20, height: 72,
    justifyContent: 'space-between',
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { fontSize: 22, color: Colors.grayLight },
  navIconActive: { color: Colors.orange },
  navLabel: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.grayLight },
  navLabelActive: { color: Colors.orange },
  fabPlaceholder: { width: 72 },
  fabMain: {
    position: 'absolute',
    top: -14,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    shadowColor: Colors.orange,
    elevation: 6,
  },
  fabMainOpen: {
    transform: [{ rotate: '45deg' }],
  },
  fabMainIcon: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 28,
    marginTop: -2,
  },
  fabMainIconOpen: {
    // Optional: adjust if needed when rotated
  },
});
