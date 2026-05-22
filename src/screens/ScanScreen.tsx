import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { useStore } from '@/store';
import { scanCube, simulateScan, cancelScan, isNfcAvailable } from '@/nfc/nfcService';
import { blocker } from '@/blocker/blockerService';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export function ScanScreen({ route, navigation }: Props) {
  const { intent, modeId } = route.params;
  const pairedCube = useStore((s) => s.pairedCube);
  const modes = useStore((s) => s.modes);
  const lockWithMode = useStore((s) => s.lockWithMode);
  const unlock = useStore((s) => s.unlock);
  const unpairCube = useStore((s) => s.unpairCube);

  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nfcOk, setNfcOk] = useState<boolean | null>(null);
  const started = useRef(false);

  useEffect(() => {
    isNfcAvailable().then((ok) => {
      setNfcOk(ok);
      if (!started.current) {
        started.current = true;
        if (ok) {
          run(false);
        } else {
          setStatus('idle');
        }
      }
    });
    return () => {
      cancelScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = async (cubeId: string) => {
    if (!pairedCube || cubeId !== pairedCube.id) {
      throw new Error('That cube is not paired with this device.');
    }
    if (intent === 'lock') {
      const mode = modes.find((m) => m.id === modeId);
      if (!mode) throw new Error('Mode not found.');

      const authorized = await blocker.isAuthorized();
      if (!authorized) {
        Alert.alert(
          'Set up blocking first',
          'Bricks needs the Accessibility permission to actually block apps. Open Settings to finish the 2-step setup, then scan again.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            {
              text: 'Open Settings',
              onPress: () => {
                navigation.goBack();
                navigation.navigate('MainTabs', { screen: 'Settings' } as never);
              },
            },
          ],
        );
        return;
      }

      const lockedAt = Date.now();
      await blocker.applyShield({
        appIds: mode.blockedAppIds,
        iosSelectionToken: mode.iosSelectionToken,
        modeName: mode.name,
        modeEmoji: mode.emoji ?? '🧱',
        lockedAt,
      });
      await lockWithMode(mode.id);
    } else if (intent === 'unlock') {
      await blocker.clearShield();
      await unlock();
    } else if (intent === 'unpair') {
      await blocker.clearShield();
      await unpairCube();
    }
  };

  const run = async (simulate: boolean) => {
    setStatus('scanning');
    setErrorMsg(null);
    try {
      const { cubeId } = simulate ? await simulateScan() : await scanCube();
      await apply(cubeId);
      setStatus('success');
      setTimeout(() => {
        if (intent === 'unpair') {
          navigation.reset({ index: 0, routes: [{ name: 'PairCube' }] });
        } else {
          navigation.goBack();
        }
      }, 600);
    } catch (e: any) {
      const msg = e?.message ?? 'Scan failed.';
      if (/cancelled|user canceled/i.test(msg)) {
        navigation.goBack();
        return;
      }
      setStatus('error');
      setErrorMsg(msg);
    }
  };

  const title =
    intent === 'lock' ? 'Scan to lock'
    : intent === 'unlock' ? 'Scan to unlock'
    : intent === 'unpair' ? 'Scan to unpair'
    : 'Scan cube';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.icon}>
          {status === 'success' ? '✓' : status === 'error' ? '!' : '🧱'}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>
          {status === 'scanning' && (nfcOk === false
            ? 'Tap the simulate button below.'
            : 'Hold your phone near the cube.')}
          {status === 'success' && (
            intent === 'lock' ? 'Locked.' :
            intent === 'unpair' ? 'Unpaired.' : 'Unlocked.'
          )}
          {status === 'error' && errorMsg}
          {status === 'idle' && (nfcOk === false
            ? 'NFC unavailable — use Simulate below.'
            : 'Preparing scan…')}
        </Text>
      </View>
      <View style={styles.footer}>
        {nfcOk !== false && status === 'error' && (
          <Button title="Try again" onPress={() => run(false)} />
        )}
        {__DEV__ && (nfcOk === false || status === 'error' || status === 'idle') && (
          <Button
            title="DEV: Simulate cube tap"
            variant="secondary"
            onPress={() => run(true)}
            style={{ marginTop: spacing.sm }}
          />
        )}
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  icon: { fontSize: 96, marginBottom: spacing.md, color: colors.accent },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.sm },
  body: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  footer: { padding: spacing.md },
});
