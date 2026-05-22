import { requireNativeModule, NativeModule } from 'expo-modules-core';

export type InstalledApp = {
  id: string;
  name: string;
  /** Base64-encoded PNG for the app icon (Android only). iOS returns undefined. */
  iconBase64?: string;
};

export type ActivitySelection = {
  /** Opaque selection token (iOS only). Pass back to native when applying shield. */
  selectionToken: string;
  /** Best-effort count of selected apps. iOS does not expose names. */
  selectedCount: number;
};

declare class InstalledAppsModuleType extends NativeModule {
  /**
   * Android: returns full list of installed apps (non-system unless includeSystem=true).
   * iOS: throws — use `presentPicker()` instead, since FamilyControls returns opaque tokens.
   */
  listInstalledApps(options?: { includeSystem?: boolean }): Promise<InstalledApp[]>;

  /**
   * iOS: presents FamilyActivityPicker and returns an opaque selection.
   * Pass existingToken to pre-tick a previous selection (for Edit flow).
   * Android: throws — use `listInstalledApps()` instead.
   */
  presentPicker(opts?: { existingToken?: string }): Promise<ActivitySelection>;

  /** iOS only: true if running on Simulator (FamilyControls unavailable there). */
  isSimulator(): boolean;
}

export const InstalledApps = requireNativeModule<InstalledAppsModuleType>('InstalledApps');
