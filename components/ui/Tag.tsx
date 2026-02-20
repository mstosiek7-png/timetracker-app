// =====================================================
// Tag — Komponent tagu (np. 🚛 312.5t, 14 dostaw, AC 11 D S)
// =====================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import { theme } from '../../constants/theme';

interface TagProps {
  value: string;
  variant?: 'orange' | 'gray';
  icon?: string;
}

export default function Tag({ value, variant = 'gray', icon }: TagProps) {
  return (
    <View style={[
      styles.tag,
      variant === 'orange' ? styles.tagOrange : styles.tagGray,
    ]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[
        styles.text,
        variant === 'orange' ? styles.textOrange : styles.textGray,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tagOrange: {
    backgroundColor: theme.colors.accentLight,
  },
  tagGray: {
    backgroundColor: '#F5F0E8',
  },
  icon: {
    fontSize: theme.fontSize.sm,
  },
  text: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  textOrange: {
    color: theme.colors.accent,
  },
  textGray: {
    color: theme.colors.mid,
  },
});