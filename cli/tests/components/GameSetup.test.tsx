import { render } from 'ink-testing-library';
import { GameSetup } from '../../src/components/GameSetup';
import { GameConfiguration } from '../../src/types';
import { ApplicationSettings } from '../../src/types/application-state';

// Mock game configuration for testing
const mockGame: GameConfiguration = {
  gameId: 'war',
  displayName: 'War',
  description: 'Classic War card game',
  deckType: 'standard',
  rulesetType: 'war',
  getDefaultPlayerCount: () => 2,
  validatePlayerCount: (count: number) => count >= 2 && count <= 4,
  setupGame: jest.fn().mockResolvedValue({
    players: [],
    gameOptions: { difficulty: 'normal' },
    deckConfiguration: { shuffled: true },
    rulesetConfiguration: { timeLimit: null },
  }),
  renderGameState: jest.fn(),
  renderPlayerHand: jest.fn(),
  renderGameBoard: jest.fn(),
  renderWinScreen: jest.fn(),
  getAvailableActions: jest.fn(),
  handlePlayerInput: jest.fn(),
  onGameStart: jest.fn(),
  onGameEnd: jest.fn(),
  onTurnChange: jest.fn(),
} as any;

const mockSettings: ApplicationSettings = {
  showHints: true,
  useColors: true,
  useUnicode: true,
  theme: 'default',
  saveDirectory: './saves',
  autoSave: false,
  autoSaveInterval: 5,
  recentGames: [],
  maxRecentGames: 10,
};

const mockTerminalSize = { width: 80, height: 24 };

describe('GameSetup Component', () => {
  const mockProps = {
    game: mockGame,
    settings: mockSettings,
    terminalSize: mockTerminalSize,
    onSetupComplete: jest.fn(),
    onCancel: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the game setup with title', () => {
      const { lastFrame } = render(<GameSetup {...mockProps} />);
      
      expect(lastFrame()).toContain('Game Setup: War');
    });

    it('should show step progress', () => {
      const { lastFrame } = render(<GameSetup {...mockProps} />);
      
      expect(lastFrame()).toContain('Step 1 of 4: Player Count');
    });

    it('should show default player count', () => {
      const { lastFrame } = render(<GameSetup {...mockProps} />);
      
      expect(lastFrame()).toContain('2 players');
      expect(lastFrame()).toContain('Default for War: 2 players');
    });

    it('should show instructions in footer', () => {
      const { lastFrame } = render(<GameSetup {...mockProps} />);
      
      expect(lastFrame()).toContain('↑↓: change count');
      expect(lastFrame()).toContain('Enter: continue');
      expect(lastFrame()).toContain('Esc: cancel');
    });
  });

  describe('Player Count Step', () => {
    it('should increase player count with up arrow', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      
      // Press up arrow to increase from 2 to 3
      stdin.write('\u001b[A');
      
      expect(lastFrame()).toContain('3 players');
    });

    it('should decrease player count with down arrow', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      
      // First increase to 3, then decrease back to 2
      stdin.write('\u001b[A');
      stdin.write('\u001b[B');
      
      expect(lastFrame()).toContain('2 players');
    });

    it('should set player count directly with number keys', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      
      stdin.write('4');
      
      expect(lastFrame()).toContain('4 players');
    });

    it('should not allow invalid player counts', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      
      // Try to set to 1 player (invalid for War)
      stdin.write('1');
      stdin.write('\r'); // Try to continue
      
      expect(lastFrame()).toContain('This game does not support 1 players');
    });

    it('should proceed to player names when valid count is confirmed', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      
      stdin.write('\r'); // Continue with default 2 players
      
      expect(lastFrame()).toContain('Step 2 of 4: Player Names');
      expect(lastFrame()).toContain('Enter name for Player 1 of 2');
    });
  });

  describe('Player Names Step', () => {
    beforeEach(() => {
      // Helper to get to player names step
      const setupToPlayerNames = (component: any) => {
        component.stdin.write('\r'); // Continue from player count
      };
      
      // Make this available to tests
      (global as any).setupToPlayerNames = setupToPlayerNames;
    });

    it('should show default player name', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      expect(lastFrame()).toContain('Player 1');
      expect(lastFrame()).toContain('Player 1_'); // Cursor indicator
    });

    it('should allow typing player names', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      // Clear default name and type new one
      stdin.write('\u0015'); // Ctrl+U to clear
      stdin.write('Alice');
      
      expect(lastFrame()).toContain('Alice_');
    });

    it('should handle backspace in player names', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      stdin.write('Alice');
      stdin.write('\u007f'); // Backspace
      
      expect(lastFrame()).toContain('Alic_');
    });

    it('should move to next player after entering name', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      stdin.write('Alice');
      stdin.write('\r'); // Confirm first player name
      
      expect(lastFrame()).toContain('Enter name for Player 2 of 2');
    });

    it('should navigate between players with arrow keys', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      stdin.write('Alice');
      stdin.write('\r'); // Go to player 2
      stdin.write('Bob');
      
      // Go back to player 1
      stdin.write('\u001b[A'); // Up arrow
      
      expect(lastFrame()).toContain('Enter name for Player 1 of 2');
      expect(lastFrame()).toContain('Alice_');
    });

    it('should validate empty player names', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      // Clear name and try to continue
      stdin.write('\u0015'); // Clear
      stdin.write('\r'); // Try to continue
      
      expect(lastFrame()).toContain('Player name cannot be empty');
    });

    it('should validate duplicate player names', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      stdin.write('Alice');
      stdin.write('\r'); // Go to player 2
      stdin.write('Alice'); // Same name
      stdin.write('\r'); // Try to continue
      
      expect(lastFrame()).toContain('Player names must be unique');
    });

    it('should validate player name length', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      // Type a very long name
      stdin.write('ThisIsAVeryLongPlayerNameThatExceedsTwentyCharacters');
      stdin.write('\r'); // Try to continue
      
      expect(lastFrame()).toContain('Player name must be 20 characters or less');
    });

    it('should proceed to game options after all names entered', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      stdin.write('\r'); // Go to player names
      
      stdin.write('Alice');
      stdin.write('\r'); // Player 2
      stdin.write('Bob');
      stdin.write('\r'); // Continue
      
      expect(lastFrame()).toContain('Step 3 of 4: Game Options');
    });
  });

  describe('Game Options Step', () => {
    beforeEach(() => {
      // Helper to get to game options step
      const setupToGameOptions = (component: any) => {
        component.stdin.write('\r'); // Player count
        component.stdin.write('Alice');
        component.stdin.write('\r'); // Player 1
        component.stdin.write('Bob');
        component.stdin.write('\r'); // Player 2
      };
      
      (global as any).setupToGameOptions = setupToGameOptions;
    });

    it('should show game options screen', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      (global as any).setupToGameOptions({ stdin });
      
      expect(lastFrame()).toContain('Step 3 of 4: Game Options');
      expect(lastFrame()).toContain('War uses default settings');
    });

    it('should proceed to confirmation', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      (global as any).setupToGameOptions({ stdin });
      
      stdin.write('\r'); // Continue
      
      expect(lastFrame()).toContain('Step 4 of 4: Confirm Setup');
    });
  });

  describe('Confirmation Step', () => {
    beforeEach(() => {
      const setupToConfirm = (component: any) => {
        component.stdin.write('\r'); // Player count
        component.stdin.write('Alice');
        component.stdin.write('\r'); // Player 1
        component.stdin.write('Bob');
        component.stdin.write('\r'); // Player 2
        component.stdin.write('\r'); // Game options
      };
      
      (global as any).setupToConfirm = setupToConfirm;
    });

    it('should show confirmation screen with game details', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      (global as any).setupToConfirm({ stdin });
      
      expect(lastFrame()).toContain('Ready to start the game?');
      expect(lastFrame()).toContain('Game: War');
      expect(lastFrame()).toContain('Players: 2');
      expect(lastFrame()).toContain('Deck: standard');
      expect(lastFrame()).toContain('Rules: war');
      expect(lastFrame()).toContain('1. Alice');
      expect(lastFrame()).toContain('2. Bob');
    });

    it('should start game when Enter is pressed', async () => {
      const { stdin } = render(<GameSetup {...mockProps} />);
      (global as any).setupToConfirm({ stdin });
      
      stdin.write('\r'); // Start game
      
      // Wait for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockProps.onSetupComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ name: 'Alice' }),
            expect.objectContaining({ name: 'Bob' }),
          ]),
        })
      );
    });

    it('should start game when y is pressed', async () => {
      const { stdin } = render(<GameSetup {...mockProps} />);
      (global as any).setupToConfirm({ stdin });
      
      stdin.write('y'); // Start game
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockProps.onSetupComplete).toHaveBeenCalled();
    });

    it('should cancel when n is pressed', () => {
      const { stdin } = render(<GameSetup {...mockProps} />);
      (global as any).setupToConfirm({ stdin });
      
      stdin.write('n'); // Cancel
      
      expect(mockProps.onCancel).toHaveBeenCalled();
    });

    it('should go back when b is pressed', () => {
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} />);
      (global as any).setupToConfirm({ stdin });
      
      stdin.write('b'); // Go back
      
      expect(lastFrame()).toContain('Step 3 of 4: Game Options');
    });
  });

  describe('Global Navigation', () => {
    it('should cancel setup with Escape key', () => {
      const { stdin } = render(<GameSetup {...mockProps} />);
      
      stdin.write('\u001b'); // Escape
      
      expect(mockProps.onCancel).toHaveBeenCalled();
    });

    it('should handle game setup errors', async () => {
      const errorGame = {
        ...mockGame,
        setupGame: jest.fn().mockRejectedValue(new Error('Setup failed')),
      } as unknown as GameConfiguration;
      
      const { stdin } = render(<GameSetup {...mockProps} game={errorGame} />);
      (global as any).setupToConfirm({ stdin });
      
      stdin.write('\r'); // Try to start game
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockProps.onError).toHaveBeenCalledWith('Game setup failed: Setup failed');
    });
  });

  describe('Processing State', () => {
    it('should show processing screen during game setup', async () => {
      // Mock a slow setup
      const slowGame = {
        ...mockGame,
        setupGame: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        ),
      } as unknown as GameConfiguration;
      
      const { stdin, lastFrame } = render(<GameSetup {...mockProps} game={slowGame} />);
      (global as any).setupToConfirm({ stdin });
      
      stdin.write('\r'); // Start game
      
      // Should show processing screen
      expect(lastFrame()).toContain('Setting up game...');
      expect(lastFrame()).toContain('Initializing War');
    });
  });

  describe('Responsive Layout', () => {
    it('should handle compact layout for small terminals', () => {
      const compactProps = {
        ...mockProps,
        terminalSize: { width: 40, height: 12 },
      };
      
      const { lastFrame } = render(<GameSetup {...compactProps} />);
      
      expect(lastFrame()).toContain('Game Setup: War');
      expect(lastFrame()).toContain('2 players');
    });
  });

  describe('Settings Integration', () => {
    it('should respect color settings', () => {
      const noColorProps = {
        ...mockProps,
        settings: { ...mockSettings, useColors: false },
      };
      
      const { lastFrame } = render(<GameSetup {...noColorProps} />);
      
      expect(lastFrame()).toContain('Game Setup: War');
    });

    it('should respect unicode settings', () => {
      const noUnicodeProps = {
        ...mockProps,
        settings: { ...mockSettings, useUnicode: false },
      };
      
      const { lastFrame } = render(<GameSetup {...noUnicodeProps} />);
      
      expect(lastFrame()).toContain('[G]'); // Instead of 🎮
    });
  });
});