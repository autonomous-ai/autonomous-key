import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStore } from '@/store';
import { Button } from '@/components/Button';
import { getAppsForPicker } from '@/data/installedApps';
import { colors, radius, spacing } from '@/theme';
import type { AppRef, Mode, RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ModeEditor'>;

type PickerSource =
  | { kind: 'list'; apps: AppRef[] }
  | {
      kind: 'picker';
      present: (opts?: { existingToken?: string }) => Promise<{ selectionToken: string; selectedCount: number }>;
    };

export function ModeEditorScreen({ route, navigation }: Props) {
  const editingId = route.params?.modeId;
  const modes = useStore((s) => s.modes);
  const existing = useMemo(
    () => (editingId ? modes.find((m) => m.id === editingId) : undefined),
    [modes, editingId],
  );
  const upsertMode = useStore((s) => s.upsertMode);
  const deleteMode = useStore((s) => s.deleteMode);

  const [name, setName] = useState(existing?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(existing?.blockedAppIds ?? []),
  );
  const [iosToken, setIosToken] = useState<string | undefined>(existing?.iosSelectionToken);
  const [iosCount, setIosCount] = useState<number | undefined>(existing?.iosSelectionCount);

  const [source, setSource] = useState<PickerSource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAppsForPicker()
      .then((s) => {
        if (mounted) setSource(s);
      })
      .catch((e) => console.warn('getAppsForPicker failed', e))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openIosPicker = async () => {
    if (source?.kind !== 'picker') return;
    try {
      const result = await source.present(
        iosToken ? { existingToken: iosToken } : undefined,
      );
      setIosToken(result.selectionToken);
      setIosCount(result.selectedCount);
    } catch (e: any) {
      if (e?.message && !/cancel/i.test(e.message)) {
        Alert.alert('Picker failed', e.message);
      }
    }
  };

  const save = async () => {
    try {
      if (!source) return;
      if (!name.trim()) {
        Alert.alert('Name required', 'Give your Mode a name.');
        return;
      }
      const hasSelection = source.kind === 'picker' ? !!iosToken : selected.size > 0;
      if (!hasSelection) {
        Alert.alert('Pick apps', 'Choose at least one app to block.');
        return;
      }
      const mode: Mode = {
        id: existing?.id ?? `mode_${Date.now()}`,
        name: name.trim(),
        emoji: existing?.emoji ?? '🧱',
        blockedAppIds: source.kind === 'list' ? Array.from(selected) : [],
        iosSelectionToken: source.kind === 'picker' ? iosToken : undefined,
        iosSelectionCount: source.kind === 'picker' ? iosCount : undefined,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      // Remember display names + icons so Stats screen shows them later.
      const namesPatch: Record<string, string> = {};
      const iconsPatch: Record<string, string> = {};
      if (source.kind === 'list') {
        for (const a of source.apps) {
          if (selected.has(a.id)) {
            namesPatch[a.id] = a.name;
            if (a.iconBase64) iconsPatch[a.id] = a.iconBase64;
          }
        }
      }
      await upsertMode(mode, { names: namesPatch, icons: iconsPatch });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs');
      }
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? String(e));
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('Delete Mode?', `"${existing.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMode(existing.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const apps = source?.kind === 'list' ? source.apps : [];
  const isPicker = source?.kind === 'picker';
  const canSave =
    !loading &&
    source !== null &&
    name.trim().length > 0 &&
    (isPicker ? !!iosToken : selected.size > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={apps}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Deep Work"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelTop]}>
              {isPicker ? 'Apps to block' : `Apps to block (${selected.size})`}
            </Text>

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={styles.loadingText}>Scanning your apps…</Text>
              </View>
            )}

            {isPicker && (
              <View style={styles.pickerBox}>
                <View style={styles.appRow}>
                  <View style={styles.appIconSpacer} />
                  <Text style={styles.appName}>
                    {iosCount ? `${iosCount} apps selected` : 'No apps selected'}
                  </Text>
                </View>
                <Button
                  title={iosToken ? 'Change selection' : 'Pick apps'}
                  variant="secondary"
                  onPress={openIosPicker}
                  style={styles.pickerBtn}
                />
                <Text style={styles.hint}>
                  iOS hides app identities for privacy. Tap to choose apps via
                  the system picker.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const on = selected.has(item.id);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [
                styles.appRow,
                on && styles.appRowOn,
                pressed && styles.appRowPressed,
              ]}
            >
              {item.iconBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${item.iconBase64}` }}
                  style={[styles.appIcon, on && styles.appIconDim]}
                />
              ) : (
                <View style={styles.appIconSpacer} />
              )}
              <Text
                style={[styles.appName, on && styles.appNameOn]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={[styles.check, on && styles.checkOn]}>
                {on ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        {!canSave && (
          <Text style={styles.footerHint}>
            {!name.trim() ? 'Give your Mode a name first.' : 'Pick at least one app to block.'}
          </Text>
        )}
        {existing ? (
          <Button title="Delete" onPress={onDelete} variant="ghost" style={styles.deleteBtn} />
        ) : null}
        <Button
          title={existing ? 'Save changes' : 'Create Mode'}
          onPress={save}
          disabled={!canSave}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, letterSpacing: 1.5, fontWeight: '700' },
  labelTop: { marginTop: spacing.lg },
  input: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  spinner: { marginTop: spacing.md },
  pickerBox: { marginTop: spacing.sm },
  pickerBtn: { marginTop: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, lineHeight: 18 },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  sep: { height: spacing.xs },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  appRowOn: { backgroundColor: colors.accentSoft },
  appRowPressed: { opacity: 0.85 },
  appIcon: { width: 32, height: 32, borderRadius: 7, marginRight: spacing.md },
  appIconDim: { opacity: 0.55 },
  appIconSpacer: { width: 32, height: 32, marginRight: spacing.md },
  appNameOn: { color: colors.text, fontWeight: '600' },
  appName: { color: colors.text, fontSize: 16, flex: 1 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.text, fontSize: 14, fontWeight: '700' },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  footerHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  deleteBtn: { marginBottom: spacing.sm },
});
