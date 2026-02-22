import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, StatusType } from '../../constants/theme';
import { useI18n } from '../../i18n/I18nProvider';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const { t } = useI18n();
  const statusColor = theme.colors.statusColors[status];
  const isSm = size === 'sm';

  const defaultLabelMap: Record<StatusType, string> = {
    work: t('Praca'),
    sick: t('Chorobowe'),
    vacation: t('Urlop'),
    fza: t('FZA'),
  };

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
        {label ?? defaultLabelMap[status]}
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
