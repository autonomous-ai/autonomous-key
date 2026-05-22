import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useStore,
  selectDailySeries,
  selectTopAppsInWindow,
  selectTotalMs,
  RETENTION_DAYS,
} from '@/store';
import { colors, radius, spacing } from '@/theme';
import type { MainTabsParamList } from '@/types';

type Props = BottomTabScreenProps<MainTabsParamList, 'Stats'>;

export function StatsScreen({}: Props) {
  const stats = useStore((s) => s.stats);
  const appNames = useStore((s) => s.appNames);
  const appIcons = useStore((s) => s.appIcons);
  const lock = useStore((s) => s.lock);
  const activeMode = useStore((s) =>
    s.lock.activeModeId ? s.modes.find((m) => m.id === s.lock.activeModeId) : null,
  );

  // Include the in-progress lock so the chart and totals reflect "now".
  const liveStats = useMemo(() => {
    if (!activeMode || !lock.lockedAt) return stats;
    const out = { byDay: { ...stats.byDay } };
    let cursor = lock.lockedAt;
    const now = Date.now();
    while (cursor < now) {
      const d = new Date(cursor);
      d.setHours(0, 0, 0, 0);
      const dayEnd = d.getTime() + 24 * 60 * 60 * 1000;
      const segmentEnd = Math.min(dayEnd, now);
      const ms = segmentEnd - cursor;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const prev = out.byDay[key] ?? { totalMs: 0, perApp: {} };
      const perApp = { ...prev.perApp };
      for (const id of activeMode.blockedAppIds) perApp[id] = (perApp[id] ?? 0) + ms;
      out.byDay[key] = { totalMs: prev.totalMs + ms, perApp };
      cursor = segmentEnd;
    }
    return out;
  }, [stats, lock.lockedAt, activeMode]);

  const series = useMemo(() => selectDailySeries(liveStats, RETENTION_DAYS), [liveStats]);
  const top = useMemo(() => selectTopAppsInWindow(liveStats, RETENTION_DAYS), [liveStats]);
  const total = useMemo(() => selectTotalMs(liveStats, RETENTION_DAYS), [liveStats]);
  const todayMs = series[series.length - 1]?.totalMs ?? 0;
  const max = Math.max(...series.map((d) => d.totalMs), 1);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedBreakdown = useMemo(() => {
    if (!selectedDate) return null;
    const day = liveStats.byDay[selectedDate];
    if (!day) return { date: selectedDate, totalMs: 0, apps: [] as { id: string; ms: number }[] };
    const apps = Object.entries(day.perApp)
      .map(([id, ms]) => ({ id, ms }))
      .sort((a, b) => b.ms - a.ms);
    return { date: selectedDate, totalMs: day.totalMs, apps };
  }, [selectedDate, liveStats]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>TOTAL · 30D</Text>
            <Text style={styles.cardValue}>{formatHuman(total)}</Text>
          </View>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>TODAY</Text>
            <Text style={styles.cardValue}>{formatHuman(todayMs)}</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>BLOCKED TIME · LAST 30 DAYS</Text>
            {max > 0 && (
              <Text style={styles.peakLabel}>peak {formatHuman(max)}</Text>
            )}
          </View>
          <View style={styles.chart}>
            <View style={styles.yAxis}>
              <Text style={styles.yLabel}>{formatHuman(max)}</Text>
              <Text style={styles.yLabel}>{formatHuman(max / 2)}</Text>
              <Text style={styles.yLabel}>0</Text>
            </View>
            <View style={styles.chartArea}>
              {series.map((d) => {
                const heightPct = (d.totalMs / max) * 100;
                const isToday = d === series[series.length - 1];
                const isSelected = selectedDate === d.date;
                return (
                  <Pressable
                    key={d.date}
                    onPress={() =>
                      setSelectedDate((prev) => (prev === d.date ? null : d.date))
                    }
                    style={styles.barCol}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${heightPct}%` },
                          isToday && styles.barToday,
                          isSelected && styles.barSelected,
                          d.totalMs === 0 && styles.barEmpty,
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.axisRow}>
            <Text style={styles.axisLabel}>{series[0]?.date.slice(5)}</Text>
            <Text style={styles.axisLabel}>{series[Math.floor(series.length / 2)]?.date.slice(5)}</Text>
            <Text style={styles.axisLabel}>today</Text>
          </View>

          {selectedBreakdown ? (
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHead}>
                <View>
                  <Text style={styles.breakdownDate}>{selectedBreakdown.date}</Text>
                  <Text style={styles.breakdownTotal}>
                    Total {formatHuman(selectedBreakdown.totalMs)}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDate(null)} hitSlop={8}>
                  <Text style={styles.breakdownClose}>✕</Text>
                </Pressable>
              </View>
              {selectedBreakdown.apps.length === 0 ? (
                <Text style={styles.breakdownEmpty}>Not locked on this day.</Text>
              ) : (
                selectedBreakdown.apps.map((row) => {
                  const icon = appIcons[row.id];
                  return (
                    <View key={row.id} style={styles.breakdownRow}>
                      {icon ? (
                        <Image
                          source={{ uri: `data:image/png;base64,${icon}` }}
                          style={styles.breakdownIcon}
                        />
                      ) : (
                        <View style={styles.breakdownIconPh}>
                          <Text style={styles.breakdownIconPhText}>
                            {(appNames[row.id] || row.id).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.breakdownName} numberOfLines={1}>
                        {appNames[row.id] ?? row.id}
                      </Text>
                      <Text style={styles.breakdownMs}>{formatHuman(row.ms)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <Text style={styles.chartHint}>Tap a bar to see per-app breakdown for that day.</Text>
          )}
        </View>

        {/* Top apps */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MOST BLOCKED · 30 DAYS</Text>
          {top.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>Lock a Mode to start tracking.</Text>
            </View>
          ) : (
            top.slice(0, 10).map((row) => {
              const icon = appIcons[row.appId];
              return (
                <View key={row.appId} style={styles.appRow}>
                  {icon ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${icon}` }}
                      style={styles.appIconImg}
                    />
                  ) : (
                    <View style={styles.appIcon}>
                      <Text style={styles.appIconText}>
                        {(appNames[row.appId] || row.appId).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName} numberOfLines={1}>
                      {appNames[row.appId] ?? row.appId}
                    </Text>
                    <View style={styles.appBarTrack}>
                      <View
                        style={[
                          styles.appBar,
                          { width: `${(row.totalMs / top[0].totalMs) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.appMs}>{formatHuman(row.totalMs)}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatHuman(ms: number) {
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  cardHalf: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  cardValue: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  section: { marginTop: spacing.lg },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  peakLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  chart: {
    flexDirection: 'row',
    height: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 6,
    width: 44,
  },
  yLabel: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  chartArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 1, height: '100%' },
  barTrack: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: colors.accent, borderRadius: 2, minHeight: 2, opacity: 0.6 },
  barToday: { opacity: 1 },
  barSelected: { backgroundColor: colors.text, opacity: 1 },
  barEmpty: { backgroundColor: colors.border, minHeight: 2, opacity: 1 },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingLeft: 50,
    paddingRight: 4,
  },
  axisLabel: { color: colors.textMuted, fontSize: 10 },
  chartHint: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },

  breakdownCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  breakdownDate: { color: colors.text, fontSize: 15, fontWeight: '700' },
  breakdownTotal: { color: colors.accent, fontSize: 13, marginTop: 2, fontWeight: '600' },
  breakdownClose: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 8 },
  breakdownEmpty: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.sm },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  breakdownIcon: { width: 24, height: 24, borderRadius: 6 },
  breakdownIconPh: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownIconPhText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  breakdownName: { flex: 1, color: colors.text, fontSize: 13 },
  breakdownMs: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconImg: { width: 36, height: 36, borderRadius: 8 },
  appIconText: { color: colors.text, fontWeight: '700' },
  appName: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  appBarTrack: { height: 4, backgroundColor: colors.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  appBar: { height: '100%', backgroundColor: colors.accent },
  appMs: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
