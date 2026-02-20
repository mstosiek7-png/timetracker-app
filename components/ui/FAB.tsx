import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

interface FABProps {
  label?: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const FAB: React.FC<FABProps> = ({ label, onPress, icon, disabled, fullWidth }) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  disabled: {
    backgroundColor: theme.colors.muted,
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  icon: {
    fontSize: theme.fontSize.md,
    color: theme.colors.card,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
});

export default FAB;
