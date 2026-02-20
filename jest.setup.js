// =====================================================
// TimeTracker - Jest Setup
// =====================================================

// Mock dla Expo
jest.mock('expo-camera', () => ({}));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-image-picker', () => ({}));

// Mock dla React Native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  },
  Dimensions: {
    get: () => ({ width: 375, height: 667, scale: 2, fontScale: 1 })
  }
}));

// Mock dla AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock dla NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn()
}));

// Global test helpers
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock dla Date.now()
const mockDate = new Date('2024-03-15T10:00:00Z');
global.Date.now = jest.fn(() => mockDate.getTime());