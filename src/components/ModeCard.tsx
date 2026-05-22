import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import type { Mode } from '@/types';

type Props = {
  mode: Mode;
  active?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export function ModeCard({ mode, active, onPress, onLongPress }: Props) {
  // iOS stores selection count separately because Apple hides app identities.
  const count = mode.iosSelectionCount ?? mode.blockedAppIds.length;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>{mode.emoji ?? '🧱'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{mode.name}</Text>
          <Text style={styles.sub}>
            {count} {count === 1 ? 'app' : 'apps'}
          </Text>
        </View>
        {active && <View style={styles.dot} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
});
