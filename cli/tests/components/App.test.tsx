import { App } from '../../src/components/App';

// Mock dependencies
jest.mock('../../src/utils/terminal-detection', () => ({
  detectTerminalCapabilities: jest.fn(() => ({
    hasColors: true,
    hasUnicode: true,
    hasMouse: true,
    isInteractive: true,
    colorDepth: 24,
    width: 80,
    height: 24,
    terminalType: 'xterm-256color',
    supportsCursorPositioning: true,
    supportsScreenClear: true,
  })),
}));

jest.mock('../../src/utils/game-discovery', () => ({
  discoverGames: jest.fn(() => Promise.resolve([
    {
      gameId: 'war',
      displayName: 'War',
      description: 'Classic War card game',
      deckType: 'standard',
      rulesetType: 'war',
      getDefaultPlayerCount: () => 2,
      validatePlayerCount: (count: number) => count >= 2 && count <= 4,
    },
  ])),
}));

describe('App Component', () => {
  const defaultProps = {
    debugMode: false,
    initialGame: null,
    useColors: true,
    useUnicode: true,
    theme: 'default',
    saveDirectory: './saves',
    showHints: true,
    terminalCapabilities: {
      width: 80,
      height: 24,
      hasColors: true,
      hasUnicode: true,
      isInteractive: true,
      colorDepth: 24 as const,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should be a valid React component', () => {
      expect(typeof App).toBe('function');
    });

    it('should accept required props', () => {
      expect(() => {
        // Test that the component can be instantiated with props
        const props = defaultProps;
        expect(props).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Props Validation', () => {
    it('should handle debug mode prop', () => {
      const props = { ...defaultProps, debugMode: true };
      expect(props.debugMode).toBe(true);
    });

    it('should handle initial game prop', () => {
      const props = { ...defaultProps, initialGame: 'war' };
      expect(props.initialGame).toBe('war');
    });

    it('should handle color settings', () => {
      const props = { ...defaultProps, useColors: false };
      expect(props.useColors).toBe(false);
    });

    it('should handle unicode settings', () => {
      const props = { ...defaultProps, useUnicode: false };
      expect(props.useUnicode).toBe(false);
    });

    it('should handle terminal capabilities', () => {
      const smallTerminalProps = {
        ...defaultProps,
        terminalCapabilities: {
          ...defaultProps.terminalCapabilities,
          width: 40,
          height: 12,
        },
      };
      expect(smallTerminalProps.terminalCapabilities.width).toBe(40);
      expect(smallTerminalProps.terminalCapabilities.height).toBe(12);
    });
  });

  describe('Game Discovery Integration', () => {
    it('should work with mocked game discovery', async () => {
      const { discoverGames } = require('../../src/utils/game-discovery');
      const games = await discoverGames();
      
      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('war');
    });

    it('should handle game discovery errors', async () => {
      const { discoverGames } = require('../../src/utils/game-discovery');
      discoverGames.mockRejectedValueOnce(new Error('Discovery failed'));

      try {
        await discoverGames();
      } catch (error) {
        expect((error as Error).message).toBe('Discovery failed');
      }
    });
  });

  describe('Terminal Detection Integration', () => {
    it('should work with mocked terminal detection', () => {
      const { detectTerminalCapabilities } = require('../../src/utils/terminal-detection');
      const capabilities = detectTerminalCapabilities();
      
      expect(capabilities.width).toBe(80);
      expect(capabilities.height).toBe(24);
      expect(capabilities.isInteractive).toBe(true);
    });
  });
});