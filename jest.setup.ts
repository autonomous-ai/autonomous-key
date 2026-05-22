// Silence noisy logs during tests
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockResolvedValue(true),
    start: jest.fn().mockResolvedValue(undefined),
    requestTechnology: jest.fn().mockResolvedValue(undefined),
    cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
    getTag: jest.fn().mockResolvedValue({ id: 'mock-cube-id' }),
  },
  NfcEvents: {},
  NfcTech: { Ndef: 'Ndef' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
