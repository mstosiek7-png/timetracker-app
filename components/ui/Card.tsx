import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  leftBorderColor?: string;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, leftBorderColor, style }) => {
  return (
    <View
      style={[
        styles.container,
        leftBorderColor ? { borderLeftWidth: 4, borderLeftColor: leftBorderColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
});

export default Card;
