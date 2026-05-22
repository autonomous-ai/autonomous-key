import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cube, LockState, Mode, Stats, DayStats } from '@/types';

const STORAGE_KEY = '@bricks/state/v1';
const RETENTION_DAYS = 30;

type PersistedState = {
  modes: Mode[];
  pairedCube: Cube | null;
  lock: LockState;
  stats: Stats;
  /** appId → display name, learned when user picks apps in the editor. */
  appNames: Record<string, string>;
  /** appId → base64 PNG icon, captured at pick time. */
  appIcons: Record<string, string>;
};

type Actions = {
  hydrate: () => Promise<void>;
  upsertMode: (
    mode: Mode,
    patches?: { names?: Record<string, string>; icons?: Record<string, string> },
  ) => Promise<void>;
  deleteMode: (id: string) => Promise<void>;
  pairCube: (cube: Cube) => Promise<void>;
  unpairCube: () => Promise<void>;
  lockWithMode: (modeId: string) => Promise<void>;
  unlock: () => Promise<void>;
};

const emptyStats: Stats = { byDay: {} };

const initial: PersistedState = {
  modes: [],
  pairedCube: null,
  lock: { activeModeId: null, lockedAt: null },
  stats: emptyStats,
  appNames: {},
  appIcons: {},
};

async function persist(state: PersistedState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Distribute a session across calendar days so a lock spanning midnight gets
 * counted correctly against each day.
 */
function recordSession(stats: Stats, mode: Mode, lockedAt: number, unlockedAt: number): Stats {
  const out: Stats = { byDay: { ...stats.byDay } };
  let cursor = lockedAt;
  while (cursor < unlockedAt) {
    const dayEnd = startOfDay(cursor) + 24 * 60 * 60 * 1000;
    const segmentEnd = Math.min(dayEnd, unlockedAt);
    const ms = segmentEnd - cursor;
    const key = dateKey(cursor);
    const prev: DayStats = out.byDay[key] ?? { totalMs: 0, perApp: {} };
    const perApp = { ...prev.perApp };
    for (const id of mode.blockedAppIds) {
      perApp[id] = (perApp[id] ?? 0) + ms;
    }
    out.byDay[key] = { totalMs: prev.totalMs + ms, perApp };
    cursor = segmentEnd;
  }
  return prune(out);
}

function prune(stats: Stats): Stats {
  const cutoff = startOfDay(Date.now()) - (RETENTION_DAYS - 1) * 24 * 60 * 60 * 1000;
  const next: Stats = { byDay: {} };
  for (const [k, v] of Object.entries(stats.byDay)) {
    const t = new Date(`${k}T00:00:00`).getTime();
    if (t >= cutoff) next.byDay[k] = v;
  }
  return next;
}

export const useStore = create<PersistedState & Actions & { hydrated: boolean }>((set, get) => ({
  ...initial,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        const merged: PersistedState = {
          modes: parsed.modes ?? [],
          pairedCube: parsed.pairedCube ?? null,
          lock: parsed.lock ?? { activeModeId: null, lockedAt: null },
          stats: prune(parsed.stats ?? emptyStats),
          appNames: parsed.appNames ?? {},
          appIcons: parsed.appIcons ?? {},
        };
        set({ ...merged, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  upsertMode: async (mode, patches) => {
    const { modes, appNames, appIcons } = get();
    const exists = modes.some((m) => m.id === mode.id);
    const next = exists ? modes.map((m) => (m.id === mode.id ? mode : m)) : [...modes, mode];
    const nextNames = patches?.names ? { ...appNames, ...patches.names } : appNames;
    const nextIcons = patches?.icons ? { ...appIcons, ...patches.icons } : appIcons;
    set({ modes: next, appNames: nextNames, appIcons: nextIcons });
    await persist({ ...get(), modes: next, appNames: nextNames, appIcons: nextIcons });
  },

  deleteMode: async (id) => {
    const next = get().modes.filter((m) => m.id !== id);
    set({ modes: next });
    await persist({ ...get(), modes: next });
  },

  pairCube: async (cube) => {
    set({ pairedCube: cube });
    await persist({ ...get(), pairedCube: cube });
  },

  unpairCube: async () => {
    set({ pairedCube: null, lock: { activeModeId: null, lockedAt: null } });
    await persist({ ...get(), pairedCube: null, lock: { activeModeId: null, lockedAt: null } });
  },

  lockWithMode: async (modeId) => {
    const lock: LockState = { activeModeId: modeId, lockedAt: Date.now() };
    set({ lock });
    await persist({ ...get(), lock });
  },

  unlock: async () => {
    const state = get();
    let nextStats = state.stats;
    if (state.lock.activeModeId && state.lock.lockedAt) {
      const mode = state.modes.find((m) => m.id === state.lock.activeModeId);
      if (mode && mode.blockedAppIds.length > 0) {
        nextStats = recordSession(state.stats, mode, state.lock.lockedAt, Date.now());
      }
    }
    const lock: LockState = { activeModeId: null, lockedAt: null };
    set({ lock, stats: nextStats });
    await persist({ ...get(), lock, stats: nextStats });
  },
}));

export const selectActiveMode = (s: PersistedState) =>
  s.modes.find((m) => m.id === s.lock.activeModeId) ?? null;

/** Last `days` calendar days, oldest first. Includes today. */
export function selectDailySeries(stats: Stats, days = RETENTION_DAYS) {
  const today = startOfDay(Date.now());
  const out: { date: string; totalMs: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dateKey(today - i * 24 * 60 * 60 * 1000);
    out.push({ date: key, totalMs: stats.byDay[key]?.totalMs ?? 0 });
  }
  return out;
}

export function selectTopAppsInWindow(stats: Stats, days = RETENTION_DAYS) {
  const today = startOfDay(Date.now());
  const cutoff = today - (days - 1) * 24 * 60 * 60 * 1000;
  const totals: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats.byDay)) {
    const t = new Date(`${k}T00:00:00`).getTime();
    if (t < cutoff) continue;
    for (const [appId, ms] of Object.entries(v.perApp)) {
      totals[appId] = (totals[appId] ?? 0) + ms;
    }
  }
  return Object.entries(totals)
    .map(([appId, ms]) => ({ appId, totalMs: ms }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

export function selectTotalMs(stats: Stats, days = RETENTION_DAYS) {
  return selectDailySeries(stats, days).reduce((acc, d) => acc + d.totalMs, 0);
}

export { RETENTION_DAYS };
