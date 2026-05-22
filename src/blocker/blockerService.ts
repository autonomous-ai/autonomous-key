import { Platform } from 'react-native';

export type ApplyShieldOpts = {
  /** Android only — package names of apps to block. */
  appIds: string[];
  /** iOS only — opaque selection token returned by InstalledApps.presentPicker. */
  iosSelectionToken?: string;
  modeName: string;
  modeEmoji: string;
  lockedAt: number;
};

type NativeBlocker = {
  applyShield(opts: ApplyShieldOpts): Promise<void>;
  clearShield(): Promise<void>;
  isAuthorized(): Promise<boolean>;
  requestAuthorization(): Promise<void>;
  openAppInfo(): Promise<void>;
  openAppsList(): Promise<void>;
  getCurrentBlocklist(): Promise<string[]>;
};

declare const require: (id: string) => any;

let nativeBlocker: NativeBlocker | null = null;
if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    const mod = require('blocker');
    nativeBlocker = mod?.Blocker ?? null;
  } catch {
    nativeBlocker = null;
  }
}

function log(msg: string, extra?: unknown) {
  console.log(`[blocker:stub] ${msg}`, extra ?? '');
}

export const blocker: NativeBlocker = nativeBlocker ?? {
  async applyShield(opts) {
    log('applyShield', opts);
  },
  async clearShield() {
    log('clearShield');
  },
  async isAuthorized() {
    return true;
  },
  async requestAuthorization() {
    log('requestAuthorization');
  },
  async openAppInfo() {
    log('openAppInfo');
  },
  async openAppsList() {
    log('openAppsList');
  },
  async getCurrentBlocklist() {
    return [];
  },
};

export const isNativeBlockerAvailable = !!nativeBlocker;
