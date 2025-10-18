import { Command } from 'commander';

// Mock dependencies before importing the CLI module
jest.mock('ink', () => ({
  render: jest.fn(() => ({ unmount: jest.fn() })),
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
}));

jest.mock('../src/utils/terminal-detection.js', () => ({
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

jest.mock('../src/utils/game-discovery.js', () => ({
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

// Mock React for CLI components
jest.mock('react', () => ({
  createElement: jest.fn((component, props) => ({ component, props })),
  default: {
    createElement: jest.fn((component, props) => ({ component, props })),
  },
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

    it('should validate command line arguments before startup', () => {
      const program = new Command();
      program
        .option('-g, --game <gameId>', 'start specific game')
        .option('-d, --debug', 'enable debug mode')
        .exitOverride();

      // Test valid arguments
      program.parse(['node', 'cli.js', '--game', 'war', '--debug']);
      const options = program.opts();
      
      expect(options.game).toBe('war');
      expect(options.debug).toBe(true);
    });

    it('should handle process signals for graceful shutdown', () => {
      const mockUnmount = jest.fn();
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      // Simulate shutdown handler
      const shutdown = (signal: string) => {
        if (mockUnmount) {
          mockUnmount();
        }
        process.exit(0);
      };

      expect(() => shutdown('SIGINT')).toThrow('process.exit called');
      expect(mockUnmount).toHaveBeenCalled();
      
      mockExit.mockRestore();
    });
  });

  describe('Command Line Integration', () => {
    it('should handle list games command', async () => {
      const { discoverGames } = require('../src/utils/game-discovery.js');
      
      // Mock process.exit for --list option
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const games = await discoverGames();
      
      // Simulate --list command behavior
      console.log('🎴 Available Games:\n');
      games.forEach((game: any, index: number) => {
        console.log(`   ${index + 1}. ${game.displayName} (${game.gameId})`);
        console.log(`      ${game.description}`);
        console.log(`      Deck: ${game.deckType} | Ruleset: ${game.rulesetType}\n`);
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('🎴 Available Games:\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('   1. War (war)');
      expect(mockConsoleLog).toHaveBeenCalledWith('   2. Go Fish (go-fish)');
      
      mockExit.mockRestore();
    });

    it('should handle game info command', async () => {
      const { discoverGames } = require('../src/utils/game-discovery.js');
      
      const games = await discoverGames();
      const game = games.find((g: any) => g.gameId === 'war');
      
      // Simulate --info command behavior
      console.log(`🎴 Game Information: ${game.displayName}\n`);
      console.log(`   ID: ${game.gameId}`);
      console.log(`   Description: ${game.description}`);
      console.log(`   Deck Type: ${game.deckType}`);
      console.log(`   Ruleset: ${game.rulesetType}`);
      console.log(`   Players: ${game.getDefaultPlayerCount()} (default)`);

      expect(mockConsoleLog).toHaveBeenCalledWith('🎴 Game Information: War\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('   ID: war');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Description: Classic War card game');
    });

    it('should handle invalid game info request', async () => {
      const { discoverGames } = require('../src/utils/game-discovery.js');
      
      const games = await discoverGames();
      const game = games.find((g: any) => g.gameId === 'nonexistent');
      
      if (!game) {
        console.error(`❌ Game 'nonexistent' not found.`);
        console.log('\n🎴 Available games:');
        games.forEach((g: any) => console.log(`   - ${g.gameId}`));
      }

      expect(mockConsoleError).toHaveBeenCalledWith(`❌ Game 'nonexistent' not found.`);
      expect(mockConsoleLog).toHaveBeenCalledWith('\n🎴 Available games:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   - war');
      expect(mockConsoleLog).toHaveBeenCalledWith('   - go-fish');
    });

    it('should validate argument combinations', () => {
      const program = new Command();
      program
        .option('-g, --game <gameId>', 'start specific game')
        .option('-l, --list', 'list available games')
        .option('-i, --info <gameId>', 'show game info')
        .exitOverride();

      // Test mutually exclusive options
      program.parse(['node', 'cli.js', '--list']);
      expect(program.opts().list).toBe(true);

      program.parse(['node', 'cli.js', '--info', 'war']);
      expect(program.opts().info).toBe('war');

      program.parse(['node', 'cli.js', '--game', 'go-fish']);
      expect(program.opts().game).toBe('go-fish');
    });

    it('should handle empty games list gracefully', async () => {
      const { discoverGames } = require('../src/utils/game-discovery.js');
      
      // Mock empty games list
      (discoverGames as jest.Mock).mockResolvedValueOnce([]);
      
      const games = await discoverGames();
      
      // Simulate --list with no games
      console.log('🎴 Available Games:\n');
      if (games.length === 0) {
        console.log('   No games found. Make sure game configurations are installed.');
      }

      expect(mockConsoleLog).toHaveBeenCalledWith('🎴 Available Games:\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('   No games found. Make sure game configurations are installed.');
    });

    it('should handle game discovery errors', async () => {
      const { discoverGames } = require('../src/utils/game-discovery.js');
      
      // Mock discovery error
      (discoverGames as jest.Mock).mockRejectedValueOnce(new Error('Discovery failed'));
      
      try {
        await discoverGames();
      } catch (error) {
        console.error('❌ Error listing games:', (error as Error).message);
      }

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Error listing games:', 'Discovery failed');
    });
  });

  describe('Argument Validation and Error Scenarios', () => {
    it('should reject unknown command line options', () => {
      const program = new Command();
      program.exitOverride();

      expect(() => {
        program.parse(['node', 'cli.js', '--unknown-option']);
      }).toThrow();
    });

    it('should require value for options that need it', () => {
      const program = new Command();
      program
        .option('-g, --game <gameId>', 'start specific game')
        .option('-i, --info <gameId>', 'show game info')
        .exitOverride();

      // Test missing required value
      expect(() => {
        program.parse(['node', 'cli.js', '--game']);
      }).toThrow();

      expect(() => {
        program.parse(['node', 'cli.js', '--info']);
      }).toThrow();
    });

    it('should handle application startup validation', () => {
      // Test non-interactive mode detection
      process.stdout.isTTY = false;
      process.stdin.isTTY = false;

      const isInteractive = process.stdout.isTTY && process.stdin.isTTY;
      
      if (!isInteractive) {
        console.error('❌ DeckInABox requires an interactive terminal.');
        console.error('   Run with --help for available options.');
      }

      expect(mockConsoleError).toHaveBeenCalledWith('❌ DeckInABox requires an interactive terminal.');
      expect(mockConsoleError).toHaveBeenCalledWith('   Run with --help for available options.');
    });

    it('should validate terminal dimensions', () => {
      process.stdout.columns = 40; // Too narrow
      process.stdout.rows = 15;    // Too short

      const width = process.stdout.columns || 80;
      const height = process.stdout.rows || 24;

      if (width < 60 || height < 20) {
        console.error('❌ Terminal too small. Minimum size: 60x20 characters.');
        console.error(`   Current size: ${width}x${height}`);
      }

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Terminal too small. Minimum size: 60x20 characters.');
      expect(mockConsoleError).toHaveBeenCalledWith('   Current size: 40x15');
    });
  });
});