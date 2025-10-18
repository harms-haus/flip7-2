// Jest setup file for DeckInABox CLI tests

// Mock terminal environment for consistent testing
process.stdout.isTTY = true;
process.stdin.isTTY = true;
process.stdout.columns = 80;
process.stdout.rows = 24;

// Set up environment variables for testing
process.env.TERM = 'xterm-256color';
process.env.COLORTERM = 'truecolor';
process.env.LANG = 'en_US.UTF-8';

// Mock console methods to avoid noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset console mocks before each test
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods after each test
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
global.mockTerminalCapabilities = {
  hasColors: true,
  hasUnicode: true,
  hasMouse: true,
  isInteractive: true,
  colorDepth: 24 as const,
  width: 80,
  height: 24,
  terminalType: 'xterm-256color',
  supportsCursorPositioning: true,
  supportsScreenClear: true,
};

// Mock import.meta for ES module compatibility
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      url: 'file:///test/mock-url'
    }
  }
});

// Mock React components for testing
jest.mock('ink', () => ({
  render: jest.fn(() => ({ unmount: jest.fn() })),
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: jest.fn(),
  useApp: jest.fn(() => ({ exit: jest.fn() })),
}));

// Mock ink-testing-library
jest.mock('ink-testing-library', () => ({
  render: jest.fn(() => ({
    container: { innerHTML: '' },
    getByText: jest.fn((text: string) => ({ textContent: text })),
    queryByText: jest.fn(() => null),
    unmount: jest.fn(),
    rerender: jest.fn(),
  })),
}));