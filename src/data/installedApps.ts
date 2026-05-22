import { Platform } from 'react-native';
import type { AppRef } from '@/types';

/**
 * Fallback list used when the native `installed-apps` module isn't wired up
 * yet (e.g. before `npx expo prebuild`). On a real device this is replaced
 * by the actual installed apps from PackageManager (Android) or the system
 * picker (iOS) — including their real icons.
 */
export const MOCK_INSTALLED_APPS: AppRef[] = [
  { id: 'com.instagram.android', name: 'Instagram' },
  { id: 'com.zhiliaoapp.musically', name: 'TikTok' },
  { id: 'com.twitter.android', name: 'X' },
  { id: 'com.facebook.katana', name: 'Facebook' },
  { id: 'com.reddit.frontpage', name: 'Reddit' },
  { id: 'com.google.android.youtube', name: 'YouTube' },
  { id: 'com.netflix.mediaclient', name: 'Netflix' },
  { id: 'com.snapchat.android', name: 'Snapchat' },
  { id: 'com.discord', name: 'Discord' },
  { id: 'com.linkedin.android', name: 'LinkedIn' },
  { id: 'com.spotify.music', name: 'Spotify' },
  { id: 'com.amazon.mShop.android.shopping', name: 'Amazon' },
];

export type ListAppsResult =
  | { kind: 'list'; apps: AppRef[] }
  | {
      kind: 'picker';
      present: (opts?: { existingToken?: string }) => Promise<{ selectionToken: string; selectedCount: number }>;
    };

type NativeAppEntry = { id: string; name: string; iconBase64?: string | null };
type NativeModule = {
  listInstalledApps(opts?: { includeSystem?: boolean }): Promise<NativeAppEntry[]>;
  presentPicker(opts?: { existingToken?: string }): Promise<{ selectionToken: string; selectedCount: number }>;
  isSimulator?(): boolean;
};

declare const require: (id: string) => any;

function loadNative(): NativeModule | null {
  try {
    const mod = require('installed-apps');
    return mod?.InstalledApps ?? null;
  } catch {
    return null;
  }
}

function nativeEntryToAppRef(entry: NativeAppEntry): AppRef {
  return {
    id: entry.id,
    name: entry.name,
    iconBase64: entry.iconBase64 ?? undefined,
  };
}

/**
 * Returns either a flat list of apps the user can tick (Android / mock) or a
 * `present` callback that opens the platform picker (iOS Family Controls).
 */
export async function getAppsForPicker(): Promise<ListAppsResult> {
  const native = loadNative();

  if (!native) {
    return { kind: 'list', apps: MOCK_INSTALLED_APPS };
  }

  if (Platform.OS === 'android') {
    try {
      const list = await native.listInstalledApps({ includeSystem: false });
      return { kind: 'list', apps: list.map(nativeEntryToAppRef) };
    } catch (e) {
      console.warn('[installed-apps] native list failed, using mock', e);
      return { kind: 'list', apps: MOCK_INSTALLED_APPS };
    }
  }

  if (Platform.OS === 'ios') {
    // FamilyActivityPicker doesn't work on the iOS Simulator (Apple blocks
    // FamilyControls there). Fall back to the mock list so devs can still
    // exercise the UI flow in Xcode's simulator.
    const isSim = native.isSimulator?.() === true;
    if (isSim) {
      return { kind: 'list', apps: MOCK_INSTALLED_APPS };
    }
    return {
      kind: 'picker',
      present: (opts) => native.presentPicker(opts),
    };
  }

  return { kind: 'list', apps: MOCK_INSTALLED_APPS };
}
