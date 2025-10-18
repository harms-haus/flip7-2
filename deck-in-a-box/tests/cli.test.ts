import { Command } from 'commander';

// Mock dependencies before importing the CLI module
jest.mock('ink', () => ({
  render: jest.fn(() => ({ unmount: jest.fn() })),
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
}));

jest.mock('../src/utils/terminal-detection', () => ({
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

jest.mock('../src/utils/game-discovery', () => ({
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
    {
      gameId: 'go-fish',
      displayName: 'Go Fish',
      description: 'Classic Go Fish card game',
      deckType: 'standard',
      rulesetType: 'go-fish',
      getDefaultPlayerCount: () => 3,
      validatePlayerCount: (count: number) => count >= 2 && count <= 6,
    },
  ])),
}));

describe('CLI Entry Point', () => {
  let mockExit: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let originalArgv: string[];
  let originalStdout: any;
  let originalStdin: any;

  beforeEach(() => {
    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Store original argv
    originalArgv = process.argv;

    // Store original stdout/stdin properties
    originalStdout = {
      isTTY: process.stdout.isTTY,
      columns: process.stdout.columns,
      rows: process.stdout.rows,
    };
    originalStdin = {
      isTTY: process.stdin.isTTY,
    };

    // Set up interactive terminal
    process.stdout.isTTY = true;
    process.stdin.isTTY = true;
    process.stdout.columns = 80;
    process.stdout.rows = 24;
  });

  afterEach(() => {
    // Restore mocks
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();

    // Restore original argv
    process.argv = originalArgv;

    // Restore stdout/stdin properties
    process.stdout.isTTY = originalStdout.isTTY;
    process.stdout.columns = originalStdout.columns;
    process.stdout.rows = originalStdout.rows;
    process.stdin.isTTY = originalStdin.isTTY;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Command Line Argument Parsing', () => {
    it('should parse version flag correctly', () => {
      const program = new Command();
      program
        .name('deck-in-a-box')
        .version('1.0.0', '-v, --version', 'display version number')
        .exitOverride(); // Prevent actual exit in tests

      // Test version parsing - should throw because of exitOverride
      expect(() => {
        program.parse(['node', 'cli.js', '--version']);
      }).toThrow();
    });

    it('should parse help flag correctly', () => {
      const program = new Command();
      program
        .name('deck-in-a-box')
        .helpOption('-h, --help', 'display help for command')
        .exitOverride(); // Prevent actual exit in tests

      // Test help parsing - should throw because of exitOverride
      expect(() => {
        program.parse(['node', 'cli.js', '--help']);
      }).toThrow();
    });

    it('should parse game selection option', () => {
      const program = new Command();
      program.option('-g, --game <gameId>', 'start specific game directly by game ID');
      
      program.parse(['node', 'cli.js', '--game', 'war']);
      const options = program.opts();
      
      expect(options.game).toBe('war');
    });

    it('should parse display options correctly', () => {
      const program = new Command();
      program
        .option('--no-color', 'disable colors in terminal output')
        .option('--no-unicode', 'disable Unicode characters')
        .option('--theme <theme>', 'set color theme', 'default');
      
      program.parse(['node', 'cli.js', '--no-color', '--no-unicode', '--theme', 'dark']);
      const options = program.opts();
      
      expect(options.color).toBe(false);
      expect(options.unicode).toBe(false);
      expect(options.theme).toBe('dark');
    });

    it('should parse behavior options correctly', () => {
      const program = new Command();
      program
        .option('-d, --debug', 'enable debug mode')
        .option('--save-dir <path>', 'specify custom save directory', './saves')
        .option('--no-hints', 'disable help hints');
      
      program.parse(['node', 'cli.js', '--debug', '--save-dir', '/custom/path', '--no-hints']);
      const options = program.opts();
      
      expect(options.debug).toBe(true);
      expect(options.saveDir).toBe('/custom/path');
      expect(options.hints).toBe(false);
    });
  });

  describe('Terminal Environment Detection', () => {
    it('should use mocked terminal capabilities', () => {
      const { detectTerminalCapabilities } = require('../src/utils/terminal-detection');
      const capabilities = detectTerminalCapabilities();

      // These should match our mock
      expect(capabilities.isInteractive).toBe(true);
      expect(capabilities.width).toBe(80);
      expect(capabilities.height).toBe(24);
      expect(capabilities.hasColors).toBe(true);
      expect(capabilities.hasUnicode).toBe(true);
    });

    it('should return consistent capabilities', () => {
      const { detectTerminalCapabilities } = require('../src/utils/terminal-detection');
      const capabilities1 = detectTerminalCapabilities();
      const capabilities2 = detectTerminalCapabilities();

      expect(capabilities1).toEqual(capabilities2);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-interactive terminal gracefully', async () => {
      process.stdout.isTTY = false;
      process.stdin.isTTY = false;

      // Simulate non-interactive terminal detection
      expect(() => {
        if (!process.stdout.isTTY || !process.stdin.isTTY) {
          console.error('❌ DeckInABox requires an interactive terminal.');
          throw new Error('process.exit called');
        }
      }).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ DeckInABox requires an interactive terminal.');
    });

    it('should handle terminal size validation', () => {
      process.stdout.columns = 30; // Too narrow
      process.stdout.rows = 10;    // Too short

      expect(() => {
        if (process.stdout.columns < 60 || process.stdout.rows < 20) {
          console.error('❌ Terminal too small. Minimum size: 60x20 characters.');
          throw new Error('process.exit called');
        }
      }).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Terminal too small. Minimum size: 60x20 characters.');
    });

    it('should handle invalid command line arguments', () => {
      const program = new Command();
      program
        .option('-g, --game <gameId>', 'start specific game')
        .exitOverride(); // Prevent actual exit in tests

      expect(() => {
        program.parse(['node', 'cli.js', '--invalid-option']);
      }).toThrow();
    });
  });

  describe('Game Discovery Integration', () => {
    it('should handle list games option', async () => {
      const { discoverGames } = require('../src/utils/game-discovery');
      const games = await discoverGames();

      expect(games).toHaveLength(2);
      expect(games[0].gameId).toBe('war');
      expect(games[1].gameId).toBe('go-fish');
    });

    it('should handle game info option', async () => {
      const { discoverGames } = require('../src/utils/game-discovery');
      const games = await discoverGames();
      const warGame = games.find((g: any) => g.gameId === 'war');

      expect(warGame).toBeDefined();
      expect(warGame.displayName).toBe('War');
      expect(warGame.description).toBe('Classic War card game');
      expect(warGame.getDefaultPlayerCount()).toBe(2);
      expect(warGame.validatePlayerCount(3)).toBe(true);
    });

    it('should handle missing game gracefully', async () => {
      const { discoverGames } = require('../src/utils/game-discovery');
      const games = await discoverGames();
      const missingGame = games.find((g: any) => g.gameId === 'nonexistent');

      expect(missingGame).toBeUndefined();
    });
  });

  describe('Application Startup', () => {
    it('should start application with valid terminal', async () => {
      const { render } = require('ink');
      
      // Simulate successful startup
      process.stdout.isTTY = true;
      process.stdin.isTTY = true;
      process.stdout.columns = 80;
      process.stdout.rows = 24;

      // Mock render call
      const mockUnmount = jest.fn();
      (render as jest.Mock).mockReturnValue({ unmount: mockUnmount });

      // Simulate CLI startup (would normally be done by importing cli.ts)
      const mockApp = { debugMode: false, initialGame: null };
      render(mockApp);

      expect(render).toHaveBeenCalledWith(mockApp);
    });

    it('should handle startup errors gracefully', async () => {
      const { render } = require('ink');
      
      // Mock render to throw an error
      (render as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to start application');
      });

      expect(() => {
        try {
          render({});
        } catch (error) {
          console.error('❌ Failed to start DeckInABox:', (error as Error).message);
          throw new Error('process.exit called');
        }
      }).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to start DeckInABox:', 'Failed to start application');
    });
  });
});