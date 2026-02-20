import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

interface StatBoxProps {
  value: string;
  label: string;
  color?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({ value, label, color }) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color: color ?? theme.colors.accent }]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  value: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
  },
  label: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    textTransform: 'uppercase',
  },
});

export default StatBox;
