import { Platform } from 'react-native';

export type ScanResult = {
  cubeId: string;
};

/** Fixed UID used by simulated scans in dev mode (simulator / emulator / web). */
export const SIMULATED_CUBE_ID = 'sim-cube-0000';

declare const require: (id: string) => any;

type NfcManagerLike = {
  isSupported(): Promise<boolean>;
  start(): Promise<void>;
  requestTechnology(tech: any, opts?: any): Promise<void>;
  getTag(): Promise<{ id?: string | null } | null>;
  cancelTechnologyRequest(): Promise<void>;
};

let NfcManager: NfcManagerLike | null = null;
let NfcTechNdef: any = null;
let NfcEventsRef: any = {};

if (Platform.OS !== 'web') {
  try {
    const m = require('react-native-nfc-manager');
    NfcManager = m.default ?? null;
    NfcTechNdef = m.NfcTech?.Ndef;
    NfcEventsRef = m.NfcEvents ?? {};
  } catch {
    // Module not available — handled by isNfcAvailable().
  }
}

let initialized = false;

async function ensureInit() {
  if (!NfcManager) throw new Error('NFC is not supported on this device.');
  if (initialized) return;
  const supported = await NfcManager.isSupported();
  if (!supported) throw new Error('NFC is not supported on this device.');
  await NfcManager.start();
  initialized = true;
}

function tagToCubeId(tag: { id?: string | null } | null | undefined): string {
  if (!tag?.id) throw new Error('Could not read cube ID from tag.');
  return tag.id.toLowerCase();
}

export async function scanCube(): Promise<ScanResult> {
  await ensureInit();
  try {
    if (Platform.OS === 'ios') {
      await NfcManager!.requestTechnology(NfcTechNdef, {
        alertMessage: 'Hold your phone near the Bricks cube',
      });
    } else {
      await NfcManager!.requestTechnology(NfcTechNdef);
    }
    const tag = await NfcManager!.getTag();
    return { cubeId: tagToCubeId(tag) };
  } finally {
    NfcManager?.cancelTechnologyRequest().catch(() => {});
  }
}

export async function cancelScan() {
  try {
    await NfcManager?.cancelTechnologyRequest();
  } catch {
    // no-op
  }
}

export async function isNfcAvailable(): Promise<boolean> {
  if (!NfcManager) return false;
  try {
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}

export async function simulateScan(): Promise<ScanResult> {
  await new Promise((r) => setTimeout(r, 400));
  return { cubeId: SIMULATED_CUBE_ID };
}

export const NfcEvents = NfcEventsRef;
