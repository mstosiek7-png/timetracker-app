import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, StatusType } from '../../constants/theme';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
}

const STATUS_LABELS: Record<StatusType, string> = {
  work: 'Praca',
  sick: 'Choroba',
  vacation: 'Urlop',
  fza: 'FZA',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const statusColor = theme.colors.statusColors[status];
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusColor.bg,
          paddingVertical: isSm ? 4 : 6,
          paddingHorizontal: isSm ? 10 : 14,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: statusColor.text,
            fontSize: isSm ? theme.fontSize.xs : theme.fontSize.sm,
          },
        ]}
      >
        {label ?? STATUS_LABELS[status]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default StatusBadge;
