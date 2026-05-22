import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useStore, selectActiveMode } from '@/store';
import { ModeCard } from '@/components/ModeCard';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/theme';
import type { MainTabsParamList, Mode, RootStackParamList } from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const modes = useStore((s) => s.modes);
  const lock = useStore((s) => s.lock);
  const active = useStore(selectActiveMode);
  const deleteMode = useStore((s) => s.deleteMode);

  const isLocked = !!active;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isLocked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isLocked]);

  const onModePress = (mode: Mode) => {
    navigation.navigate('ModeDetail', { modeId: mode.id });
  };

  const onModeLongPress = (mode: Mode) => {
    if (isLocked) return;
    Alert.alert(mode.name, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('ModeEditor', { modeId: mode.id }) },
      { text: 'Preview block screen', onPress: () => navigation.navigate('BlockPreview', { modeId: mode.id }) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMode(mode.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onPrimary = () => {
    if (isLocked && active) {
      navigation.navigate('Scan', { intent: 'unlock' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>Bricks</Text>
        <Text style={[styles.statusLabel, isLocked && styles.statusLabelLocked]}>
          {isLocked ? '● LOCKED' : 'UNLOCKED'}
        </Text>
        <Text style={styles.statusValue}>
          {isLocked ? `${active!.emoji ?? '🧱'}  ${active!.name}` : 'Pick a Mode to lock'}
        </Text>
        {isLocked && lock.lockedAt && (
          <Text style={styles.timer}>{formatBigDuration(now - lock.lockedAt)}</Text>
        )}
        {isLocked && active && (() => {
          const c = active.iosSelectionCount ?? active.blockedAppIds.length;
          return (
            <Text style={styles.statusSub}>
              {c} {c === 1 ? 'app' : 'apps'} blocked
            </Text>
          );
        })()}
      </View>

      <FlatList
        data={modes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <ModeCard
            mode={item}
            active={lock.activeModeId === item.id}
            onPress={() => onModePress(item)}
            onLongPress={() => onModeLongPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Modes yet</Text>
            <Text style={styles.emptySub}>Create your first Mode to start blocking apps.</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        {isLocked ? (
          <Button title="Scan cube to unlock" onPress={onPrimary} />
        ) : (
          <Button
            title="+ New Mode"
            onPress={() => navigation.navigate('ModeEditor', {})}
            variant="secondary"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function formatBigDuration(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  appTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  statusLabelLocked: { color: colors.accent },
  statusValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  timer: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  statusSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptySub: { color: colors.textMuted, fontSize: 14, marginTop: 6, textAlign: 'center' },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
