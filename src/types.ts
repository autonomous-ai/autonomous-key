export type AppRef = {
  id: string;
  name: string;
  /** Base64-encoded PNG of the app's real icon (from the device). */
  iconBase64?: string;
};

export type Mode = {
  id: string;
  name: string;
  emoji?: string;
  /** Android: package names. iOS: empty (the picker stores tokens by selectionToken). */
  blockedAppIds: string[];
  /** iOS only: opaque token referencing a FamilyActivitySelection held natively. */
  iosSelectionToken?: string;
  /** Displayed count when iOS hides app identities (e.g. "5 apps selected"). */
  iosSelectionCount?: number;
  createdAt: number;
};

export type Cube = {
  id: string;
  pairedAt: number;
  label?: string;
};

export type LockState = {
  activeModeId: string | null;
  lockedAt: number | null;
};

export type DayStats = {
  totalMs: number;
  /** appId → ms blocked that day */
  perApp: Record<string, number>;
};

export type Stats = {
  /** ISO date 'YYYY-MM-DD' → stats for that day */
  byDay: Record<string, DayStats>;
};

export type MainTabsParamList = {
  Home: undefined;
  Stats: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  PairCube: undefined;
  MainTabs: undefined;
  ModeEditor: { modeId?: string };
  ModeDetail: { modeId: string };
  Scan: { intent: 'lock' | 'unlock' | 'pair' | 'unpair'; modeId?: string };
  BlockPreview: { modeId: string };
};
