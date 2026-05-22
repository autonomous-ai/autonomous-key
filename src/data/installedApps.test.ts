import { getAppsForPicker, MOCK_INSTALLED_APPS } from './installedApps';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

describe('getAppsForPicker', () => {
  it('returns a list of apps on Android', async () => {
    const result = await getAppsForPicker();
    expect(result.kind).toBe('list');
    if (result.kind === 'list') {
      expect(result.apps.length).toBeGreaterThan(0);
      expect(result.apps[0]).toHaveProperty('id');
      expect(result.apps[0]).toHaveProperty('name');
    }
  });

  it('mock fallback list is non-empty', () => {
    expect(MOCK_INSTALLED_APPS.length).toBeGreaterThan(0);
  });
});
