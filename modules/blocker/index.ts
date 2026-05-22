import { requireNativeModule, NativeModule } from 'expo-modules-core';

declare class BlockerModuleType extends NativeModule {
  applyShield(opts: { appIds: string[]; modeName: string; modeEmoji: string; lockedAt: number }): Promise<void>;
  clearShield(): Promise<void>;
  isAuthorized(): Promise<boolean>;
  /** Opens Android Accessibility settings so the user can toggle the service on. */
  requestAuthorization(): Promise<void>;
  /** Opens this app's App Info page — shortcut to the page where users tap
   *  the ⋮ menu to unlock "Allow restricted settings". */
  openAppInfo(): Promise<void>;
  /** Fallback when the deep-linked App Info page caches a stale ⋮ menu —
   *  opens the system Apps list so the user navigates in manually. */
  openAppsList(): Promise<void>;
  getCurrentBlocklist(): Promise<string[]>;
}

export const Blocker = requireNativeModule<BlockerModuleType>('Blocker');
