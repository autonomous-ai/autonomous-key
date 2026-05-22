import { useStore } from './store';

describe('store', () => {
  beforeEach(async () => {
    // Reset the store to initial state between tests.
    await useStore.getState().unpairCube();
    for (const m of useStore.getState().modes) {
      await useStore.getState().deleteMode(m.id);
    }
  });

  it('upserts and deletes a mode', async () => {
    const { upsertMode, deleteMode } = useStore.getState();
    await upsertMode({
      id: 'm1',
      name: 'Focus',
      emoji: '🎯',
      blockedAppIds: ['com.app.a'],
      createdAt: 1,
    });
    expect(useStore.getState().modes).toHaveLength(1);
    expect(useStore.getState().modes[0].name).toBe('Focus');

    await upsertMode({
      id: 'm1',
      name: 'Deep Work',
      emoji: '🎯',
      blockedAppIds: ['com.app.a', 'com.app.b'],
      createdAt: 1,
    });
    expect(useStore.getState().modes).toHaveLength(1);
    expect(useStore.getState().modes[0].name).toBe('Deep Work');
    expect(useStore.getState().modes[0].blockedAppIds).toHaveLength(2);

    await deleteMode('m1');
    expect(useStore.getState().modes).toHaveLength(0);
  });

  it('pair → lock → unlock flow', async () => {
    const { pairCube, upsertMode, lockWithMode, unlock } = useStore.getState();
    await pairCube({ id: 'cube-1', pairedAt: 0 });
    await upsertMode({
      id: 'm1',
      name: 'Sleep',
      emoji: '🌙',
      blockedAppIds: ['com.app.a'],
      createdAt: 1,
    });

    expect(useStore.getState().pairedCube?.id).toBe('cube-1');
    expect(useStore.getState().lock.activeModeId).toBeNull();

    await lockWithMode('m1');
    expect(useStore.getState().lock.activeModeId).toBe('m1');
    expect(useStore.getState().lock.lockedAt).toBeGreaterThan(0);

    await unlock();
    expect(useStore.getState().lock.activeModeId).toBeNull();
    expect(useStore.getState().lock.lockedAt).toBeNull();
  });

  it('unpairing also clears any active lock', async () => {
    const { pairCube, upsertMode, lockWithMode, unpairCube } = useStore.getState();
    await pairCube({ id: 'cube-1', pairedAt: 0 });
    await upsertMode({
      id: 'm1',
      name: 'Focus',
      blockedAppIds: ['x'],
      createdAt: 1,
    });
    await lockWithMode('m1');
    expect(useStore.getState().lock.activeModeId).toBe('m1');

    await unpairCube();
    expect(useStore.getState().pairedCube).toBeNull();
    expect(useStore.getState().lock.activeModeId).toBeNull();
  });
});
