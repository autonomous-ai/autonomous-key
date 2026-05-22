import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { useStore } from '@/store';
import { scanCube, simulateScan, isNfcAvailable } from '@/nfc/nfcService';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PairCube'>;

export function PairCubeScreen({ navigation }: Props) {
  const pairCube = useStore((s) => s.pairCube);
  const [scanning, setScanning] = useState(false);
  const [nfcOk, setNfcOk] = useState<boolean | null>(null);

  useEffect(() => {
    isNfcAvailable().then(setNfcOk);
  }, []);

  const finishPair = async (cubeId: string) => {
    await pairCube({ id: cubeId, pairedAt: Date.now() });
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const onPair = async () => {
    setScanning(true);
    try {
      const { cubeId } = await scanCube();
      await finishPair(cubeId);
    } catch (e: any) {
      if (e?.message && !/cancelled|user canceled/i.test(e.message)) {
        Alert.alert('Scan failed', e.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const onSimulate = async () => {
    setScanning(true);
    try {
      const { cubeId } = await simulateScan();
      await finishPair(cubeId);
    } finally {
      setScanning(false);
    }
  };

  const showSimulate = __DEV__ && (nfcOk === false || __DEV__);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.brick}>🧱</Text>
        <Text style={styles.title}>Pair your cube</Text>
        <Text style={styles.body}>
          Bricks uses a small physical cube as your key. You'll need it to lock — and to unlock —
          any Mode.{'\n\n'}
          Tap your phone to the cube to pair.
        </Text>
        {nfcOk === false && (
          <Text style={styles.warn}>
            NFC isn't available on this device. Use "Simulate cube tap" to try the flow.
          </Text>
        )}
      </View>
      <View style={styles.footer}>
        {nfcOk !== false && (
          <Button
            title={scanning ? 'Hold near cube…' : 'Scan to pair'}
            onPress={onPair}
            loading={scanning}
          />
        )}
        {showSimulate && (
          <Button
            title="DEV: Simulate cube tap"
            variant="secondary"
            onPress={onSimulate}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  brick: { fontSize: 96, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: spacing.md },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  warn: {
    color: colors.accent,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
