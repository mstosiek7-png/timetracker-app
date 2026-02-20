// =====================================================
// Pill — Pigułka do wyboru (np. AC 11 D S, SMA 11 S)
// =====================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { theme } from '../../constants/theme';

interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function Pill({ label, selected, onPress }: PillProps) {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        selected ? styles.pillSelected : styles.pillUnselected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.text,
        selected ? styles.textSelected : styles.textUnselected,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  pillUnselected: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  text: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  textSelected: {
    color: theme.colors.card,
  },
  textUnselected: {
    color: theme.colors.dark,
  },
});