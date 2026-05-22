import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockPreview'>;

/**
 * What a user sees when they open a blocked app. In production this view is
 * shown by the native blocker (iOS ShieldConfiguration / Android overlay) —
 * this screen is the in-app preview / fallback.
 */
export function BlockPreviewScreen({ route, navigation }: Props) {
  const { modeId } = route.params;
  const mode = useStore((s) => s.modes.find((m) => m.id === modeId));
  const lock = useStore((s) => s.lock);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!mode) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Mode not found.</Text>
      </SafeAreaView>
    );
  }

  const elapsed = lock.lockedAt ? formatDuration(now - lock.lockedAt) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.brick}>🧱</Text>
        <Text style={styles.title}>This app is blocked</Text>
        <Text style={styles.modeName}>{mode.emoji} {mode.name}</Text>
        {elapsed && <Text style={styles.elapsed}>Locked for {elapsed}</Text>}
        <Text style={styles.body}>Scan your Bricks cube to unlock.</Text>
      </View>
      <View style={styles.footer}>
        <Button
          title="Scan to unlock"
          onPress={() => {
            navigation.replace('Scan', { intent: 'unlock' });
          }}
        />
        <Button
          title="Close preview"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  );
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  brick: { fontSize: 120, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginBottom: spacing.sm },
  modeName: { color: colors.accent, fontSize: 18, fontWeight: '600', marginBottom: spacing.xs },
  elapsed: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
  body: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  footer: { padding: spacing.md },
});
