import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

interface SectionTitleProps {
  text: string;
  rightText?: string;
  onRightPress?: () => void;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ text, rightText, onRightPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
      {rightText ? (
        <TouchableOpacity onPress={onRightPress} disabled={!onRightPress}>
          <Text style={styles.rightText}>{rightText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  text: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
  },
});

export default SectionTitle;
