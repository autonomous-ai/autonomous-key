import React, { useMemo } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { useStore } from '@/store';
import { colors, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ModeDetail'>;

export function ModeDetailScreen({ route, navigation }: Props) {
  const { modeId } = route.params;
  const mode = useStore((s) => s.modes.find((m) => m.id === modeId));
  const appNames = useStore((s) => s.appNames);
  const appIcons = useStore((s) => s.appIcons);
  const lock = useStore((s) => s.lock);
  const deleteMode = useStore((s) => s.deleteMode);

  const apps = useMemo(() => {
    if (!mode) return [];
    return mode.blockedAppIds.map((id) => ({
      id,
      name: appNames[id] ?? id,
      iconBase64: appIcons[id],
    }));
  }, [mode, appNames, appIcons]);

  // iOS hides app identities; just expose how many were selected.
  const iosCount = mode?.iosSelectionCount ?? 0;
  const totalCount = apps.length + iosCount;
  const hasSelection = totalCount > 0;

  if (!mode) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.modeName}>Mode not found.</Text>
      </SafeAreaView>
    );
  }

  const isLocked = lock.activeModeId === mode.id;
  const isAnotherLocked = lock.activeModeId && lock.activeModeId !== mode.id;

  const onLock = () => {
    if (isAnotherLocked) {
      Alert.alert('Another Mode is active', 'Unlock it first before locking this one.');
      return;
    }
    if (!hasSelection) {
      Alert.alert('Empty Mode', 'Add some apps to this Mode before locking.');
      return;
    }
    navigation.navigate('Scan', { intent: 'lock', modeId: mode.id });
  };

  const onEdit = () => navigation.navigate('ModeEditor', { modeId: mode.id });

  const onDelete = () => {
    if (isLocked) {
      Alert.alert('Locked', 'Unlock this Mode before deleting.');
      return;
    }
    Alert.alert('Delete Mode?', `"${mode.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMode(mode.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.modeEmoji}>{mode.emoji ?? '🧱'}</Text>
        <Text style={styles.modeName}>{mode.name}</Text>
        <Text style={styles.count}>
          {totalCount} {totalCount === 1 ? 'app blocked' : 'apps blocked'}
        </Text>
        {isLocked && <Text style={styles.lockedBadge}>● LOCKED</Text>}
      </View>

      {iosCount > 0 && apps.length === 0 ? (
        <View style={styles.iosBox}>
          <Text style={styles.iosBoxTitle}>{iosCount} apps selected via Apple's picker</Text>
          <Text style={styles.iosBoxBody}>
            iOS hides app identities for privacy. The selection is stored
            securely and Bricks will shield those apps when you lock.
          </Text>
          <Button
            title="Change selection"
            variant="secondary"
            onPress={onEdit}
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No apps in this Mode yet.</Text>
              <Button title="Add apps" variant="secondary" onPress={onEdit} style={{ marginTop: spacing.md }} />
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.appRow}>
              {item.iconBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${item.iconBase64}` }}
                  style={styles.appIcon}
                />
              ) : (
                <View style={styles.appIconPlaceholder}>
                  <Text style={styles.appIconText}>
                    {(item.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.appName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.row}>
          <Button title="Edit" variant="ghost" onPress={onEdit} style={styles.flexBtn} />
          <Button title="Delete" variant="ghost" onPress={onDelete} style={styles.flexBtn} />
        </View>
        {!isLocked && (
          <Button title="Scan cube to lock" onPress={onLock} style={{ marginTop: spacing.sm }} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  modeEmoji: { fontSize: 64 },
  modeName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  count: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  lockedBadge: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  list: { padding: spacing.md, flexGrow: 1 },
  sep: { height: spacing.xs },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appIcon: { width: 36, height: 36, borderRadius: 8, marginRight: spacing.md },
  appIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  appIconText: { color: colors.textMuted, fontWeight: '700' },
  appName: { color: colors.text, fontSize: 16, flex: 1, fontWeight: '500' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  iosBox: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iosBoxTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  iosBoxBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  flexBtn: { flex: 1 },
});
