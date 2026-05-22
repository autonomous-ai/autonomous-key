export const InstalledApps = {
  listInstalledApps: jest.fn().mockResolvedValue([
    { id: 'com.example.one', name: 'One' },
    { id: 'com.example.two', name: 'Two' },
  ]),
  presentPicker: jest.fn().mockResolvedValue({
    selectionToken: 'token-test',
    selectedCount: 3,
  }),
};
