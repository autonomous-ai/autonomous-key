import React, { useEffect, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Button } from '@/components/Button';
import { useStore } from '@/store';
import { blocker, isNativeBlockerAvailable } from '@/blocker/blockerService';
import { colors, radius, spacing } from '@/theme';
import type { MainTabsParamList, RootStackParamList } from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({ navigation }: Props) {
  const pairedCube = useStore((s) => s.pairedCube);
  const lock = useStore((s) => s.lock);

  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const refreshAuth = async () => {
    try {
      const ok = await blocker.isAuthorized();
      setAuthorized(ok);
    } catch {
      setAuthorized(false);
    }
  };

  useEffect(() => {
    refreshAuth();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshAuth();
    });
    return () => sub.remove();
  }, []);

  const onOpenAppsList = async () => {
    try {
      await blocker.openAppsList();
    } catch (e: any) {
      Alert.alert('Could not open apps list', e?.message ?? 'unknown');
    }
  };

  const onOpenAccessibility = async () => {
    try {
      await blocker.requestAuthorization();
    } catch (e: any) {
      Alert.alert('Could not open settings', e?.message ?? 'unknown');
    }
  };

  const onUnpair = () => {
    if (lock.activeModeId) {
      Alert.alert('Unlock first', 'You need to unlock the active Mode before unpairing.');
      return;
    }
    Alert.alert(
      'Unpair cube?',
      'You will need to scan the paired cube to confirm. After unpairing you will need to pair a cube again to use Bricks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Scan to confirm',
          style: 'destructive',
          onPress: () => navigation.navigate('Scan', { intent: 'unpair' }),
        },
      ],
    );
  };

  const needsSetup = isNativeBlockerAvailable && authorized === false;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {needsSetup && Platform.OS === 'android' && (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Set up blocking</Text>
          <Text style={styles.setupBody}>
            Android 13+ requires a specific order — the "Allow restricted settings" option
            only appears AFTER you trigger the warning. Follow the 3 steps below.
          </Text>

          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Trigger the warning</Text>
              <Text style={styles.stepDesc}>
                Open Accessibility → tap "Bricks app blocker" → Android shows a "Restricted
                setting" pop-up. Dismiss it and come back to this screen.
              </Text>
              <Button title="Open Accessibility" onPress={onOpenAccessibility} style={styles.stepBtn} />
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Unlock the restriction</Text>
              <Text style={styles.stepDesc}>
                Tap → in the Apps list, tap "Bricks" → on the App info page,
                tap ⋮ (top right) → "Allow restricted settings" → confirm.{'\n\n'}
                Going through the Apps list (instead of jumping straight to App
                info) avoids a Settings cache bug that hides the menu item.
              </Text>
              <Button
                title="Open Apps list"
                variant="secondary"
                onPress={onOpenAppsList}
                style={styles.stepBtn}
              />
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Turn it on</Text>
              <Text style={styles.stepDesc}>
                Tap → in Accessibility, find "Bricks app blocker" → toggle ON
                → confirm "Allow full control".{'\n\n'}
                If the page still shows the "Restricted setting" warning,
                swipe Settings away in your Recent Apps once, then tap again.
              </Text>
              <Button title="Open Accessibility" onPress={onOpenAccessibility} style={styles.stepBtn} />
            </View>
          </View>
        </View>
      )}

      {needsSetup && Platform.OS === 'ios' && (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Set up Screen Time</Text>
          <Text style={styles.setupBody}>
            Bricks uses Apple Family Controls to block apps. Tap below and choose
            "Continue" → "Allow" to grant access. You can revoke it any time in
            Settings → Screen Time.
          </Text>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Authorize Family Controls</Text>
              <Text style={styles.stepDesc}>
                Apple will show a system prompt asking to manage Screen Time for this device.
              </Text>
              <Button title="Request authorization" onPress={onOpenAccessibility} style={styles.stepBtn} />
            </View>
          </View>
          <Text style={[styles.stepDesc, { marginTop: 16 }]}>
            If you previously denied the prompt, open iOS Settings to flip it back on:
          </Text>
          <Button
            title="Open iOS Settings"
            variant="secondary"
            onPress={onOpenAppsList}
            style={styles.stepBtn}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>BLOCKER</Text>
        <View style={styles.card}>
          <Text style={styles.value}>
            {!isNativeBlockerAvailable
              ? 'Not installed (stub)'
              : authorized === null
              ? 'Checking…'
              : authorized
              ? '✓ Enabled — apps will be blocked when locked'
              : 'Disabled — see setup above'}
          </Text>
          <Text style={styles.sub}>
            {!isNativeBlockerAvailable
              ? 'This build does not include the native blocker module.'
              : authorized
              ? 'Bricks app blocker is active in Accessibility settings.'
              : 'Without this permission, blocked apps will open normally.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>CUBE</Text>
        <View style={styles.card}>
          <Text style={styles.value}>{pairedCube?.id ?? 'No cube paired'}</Text>
          {pairedCube && (
            <Text style={styles.sub}>
              Paired {new Date(pairedCube.pairedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
        <Button title="Unpair cube" variant="danger" onPress={onUnpair} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  section: { marginTop: spacing.lg },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  btn: { marginTop: spacing.md },

  setupCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  setupTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  setupBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: colors.text, fontWeight: '800' },
  stepBody: { flex: 1 },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepDesc: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    opacity: 0.85,
  },
  stepBtn: { marginTop: spacing.sm, height: 44 },
});
