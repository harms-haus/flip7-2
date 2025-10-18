import { render } from 'ink-testing-library';
import { MainMenu } from '../../src/components/MainMenu';
import { GameConfiguration } from '../../src/types';
import { ApplicationSettings } from '../../src/types/application-state';

// Mock game configurations for testing
const mockGames: GameConfiguration[] = [
  {
    gameId: 'war',
    displayName: 'War',
    description: 'Classic War card game',
    deckType: 'standard',
    rulesetType: 'war',
    getDefaultPlayerCount: () => 2,
    validatePlayerCount: (count: number) => count >= 2 && count <= 4,
    setupGame: jest.fn(),
    renderGameState: jest.fn(),
    renderPlayerHand: jest.fn(),
    renderGameBoard: jest.fn(),
    renderWinScreen: jest.fn(),
    getAvailableActions: jest.fn(),
    handlePlayerInput: jest.fn(),
    onGameStart: jest.fn(),
    onGameEnd: jest.fn(),
    onTurnChange: jest.fn(),
  } as any,
  {
    gameId: 'go-fish',
    displayName: 'Go Fish',
    description: 'Classic Go Fish card game',
    deckType: 'standard',
    rulesetType: 'go-fish',
    getDefaultPlayerCount: () => 3,
    validatePlayerCount: (count: number) => count >= 2 && count <= 6,
    setupGame: jest.fn(),
    renderGameState: jest.fn(),
    renderPlayerHand: jest.fn(),
    renderGameBoard: jest.fn(),
    renderWinScreen: jest.fn(),
    getAvailableActions: jest.fn(),
    handlePlayerInput: jest.fn(),
    onGameStart: jest.fn(),
    onGameEnd: jest.fn(),
    onTurnChange: jest.fn(),
  } as any,
];

const mockSettings: ApplicationSettings = {
  showHints: true,
  useColors: true,
  useUnicode: true,
  theme: 'default',
  saveDirectory: './saves',
  autoSave: false,
  autoSaveInterval: 5,
  recentGames: ['war'],
  maxRecentGames: 10,
};

const mockTerminalSize = { width: 80, height: 24 };

describe('MainMenu Component', () => {
  const mockProps = {
    games: mockGames,
    settings: mockSettings,
    terminalSize: mockTerminalSize,
    onGameSelect: jest.fn(),
    onLoadGame: jest.fn(),
    onSettings: jest.fn(),
    onExit: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the main menu with title', () => {
      const { lastFrame } = render(<MainMenu {...mockProps} />);
      
      expect(lastFrame()).toContain('DeckInABox - Card Game Terminal');
    });

    it('should display available games count', () => {
      const { lastFrame } = render(<MainMenu {...mockProps} />);
      
      expect(lastFrame()).toContain('2 games available');
    });

    it('should show game list with names and player counts', () => {
      const { lastFrame } = render(<MainMenu {...mockProps} />);
      
      expect(lastFrame()).toContain('War');
      expect(lastFrame()).toContain('Go Fish');
      expect(lastFrame()).toContain('2 players');
      expect(lastFrame()).toContain('3 players');
    });

    it('should show recent games section when recent games exist', () => {
      const { lastFrame } = render(<MainMenu {...mockProps} />);
      
      expect(lastFrame()).toContain('Recent Games');
      expect(lastFrame()).toContain('War');
    });

    it('should show options section', () => {
      const { lastFrame } = render(<MainMenu {...mockProps} />);
      
      expect(lastFrame()).toContain('Options');
      expect(lastFrame()).toContain('Load Saved Game');
      expect(lastFrame()).toContain('Settings');
      expect(lastFrame()).toContain('Exit');
    });

    it('should show help instructions in footer', () => {
      const { lastFrame } = render(<MainMenu {...mockProps} />);
      
      expect(lastFrame()).toContain('Tab: switch sections');
      expect(lastFrame()).toContain('↑↓: navigate');
      expect(lastFrame()).toContain('Enter: select');
      expect(lastFrame()).toContain('h/?: help');
      expect(lastFrame()).toContain('q/Esc: exit');
    });
  });

  describe('Empty Games List', () => {
    it('should show no games message when games list is empty', () => {
      const emptyProps = { ...mockProps, games: [] };
      const { lastFrame } = render(<MainMenu {...emptyProps} />);
      
      expect(lastFrame()).toContain('No games found');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle game selection with Enter key', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      // Press Enter to select first game
      stdin.write('\r');
      
      expect(mockProps.onGameSelect).toHaveBeenCalledWith(mockGames[0]);
    });

    it('should handle exit with q key', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      stdin.write('q');
      
      expect(mockProps.onExit).toHaveBeenCalled();
    });

    it('should handle exit with Escape key', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      stdin.write('\u001b'); // Escape key
      
      expect(mockProps.onExit).toHaveBeenCalled();
    });

    it('should navigate between games with arrow keys', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Initially first game should be selected (indicated by ►)
      expect(lastFrame()).toContain('► War');
      
      // Press down arrow to move to second game
      stdin.write('\u001b[B'); // Down arrow
      
      // Now second game should be selected
      expect(lastFrame()).toContain('► Go Fish');
    });

    it('should switch sections with Tab key', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Initially games section should be active (indicated by ◄)
      expect(lastFrame()).toContain('Available Games ◄');
      
      // Press Tab to switch to recent games
      stdin.write('\t');
      
      // Recent games section should now be active
      expect(lastFrame()).toContain('Recent Games ◄');
    });
  });

  describe('Search Functionality', () => {
    it('should filter games when typing', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Type 'war' to filter
      stdin.write('w');
      stdin.write('a');
      stdin.write('r');
      
      // Should show filter in status and only War game
      expect(lastFrame()).toContain('Filter: "war"');
      expect(lastFrame()).toContain('War');
      expect(lastFrame()).not.toContain('Go Fish');
    });

    it('should clear search with Ctrl+C', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Type to create a filter
      stdin.write('war');
      expect(lastFrame()).toContain('Filter: "war"');
      
      // Clear with Ctrl+C
      stdin.write('\u0003'); // Ctrl+C
      
      // Filter should be cleared and both games visible
      expect(lastFrame()).not.toContain('Filter:');
      expect(lastFrame()).toContain('War');
      expect(lastFrame()).toContain('Go Fish');
    });

    it('should handle backspace in search', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Type 'war'
      stdin.write('war');
      expect(lastFrame()).toContain('Filter: "war"');
      
      // Backspace to remove 'r'
      stdin.write('\u007f'); // Backspace
      
      // Should show 'wa' filter
      expect(lastFrame()).toContain('Filter: "wa"');
    });
  });

  describe('Recent Games', () => {
    it('should select recent game when Enter pressed in recent section', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      // Switch to recent games section
      stdin.write('\t');
      
      // Select recent game
      stdin.write('\r');
      
      expect(mockProps.onGameSelect).toHaveBeenCalledWith(mockGames[0]); // War game
    });

    it('should show error for missing recent game', () => {
      const propsWithMissingGame = {
        ...mockProps,
        settings: {
          ...mockSettings,
          recentGames: ['missing-game'],
        },
      };
      
      const { stdin } = render(<MainMenu {...propsWithMissingGame} />);
      
      // Switch to recent games section
      stdin.write('\t');
      
      // Select missing recent game
      stdin.write('\r');
      
      expect(mockProps.onError).toHaveBeenCalledWith(
        'Recent game "missing-game" is no longer available'
      );
    });
  });

  describe('Options Menu', () => {
    it('should call onLoadGame when Load Saved Game is selected', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      // Switch to options section (Tab twice: games -> recent -> options)
      stdin.write('\t\t');
      
      // Select Load Saved Game (first option)
      stdin.write('\r');
      
      expect(mockProps.onLoadGame).toHaveBeenCalled();
    });

    it('should call onSettings when Settings is selected', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      // Switch to options section
      stdin.write('\t\t');
      
      // Navigate to Settings (second option)
      stdin.write('\u001b[B'); // Down arrow
      
      // Select Settings
      stdin.write('\r');
      
      expect(mockProps.onSettings).toHaveBeenCalled();
    });

    it('should call onExit when Exit is selected', () => {
      const { stdin } = render(<MainMenu {...mockProps} />);
      
      // Switch to options section
      stdin.write('\t\t');
      
      // Navigate to Exit (third option)
      stdin.write('\u001b[B\u001b[B'); // Down arrow twice
      
      // Select Exit
      stdin.write('\r');
      
      expect(mockProps.onExit).toHaveBeenCalled();
    });
  });

  describe('Help Screen', () => {
    it('should show help screen when h key is pressed', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      stdin.write('h');
      
      expect(lastFrame()).toContain('DeckInABox Help');
      expect(lastFrame()).toContain('Navigation:');
      expect(lastFrame()).toContain('Game Selection:');
    });

    it('should close help screen when h key is pressed again', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Open help
      stdin.write('h');
      expect(lastFrame()).toContain('DeckInABox Help');
      
      // Close help
      stdin.write('h');
      expect(lastFrame()).not.toContain('DeckInABox Help');
      expect(lastFrame()).toContain('Available Games');
    });

    it('should close help screen with Escape key', () => {
      const { stdin, lastFrame } = render(<MainMenu {...mockProps} />);
      
      // Open help
      stdin.write('h');
      expect(lastFrame()).toContain('DeckInABox Help');
      
      // Close help with Escape
      stdin.write('\u001b');
      expect(lastFrame()).not.toContain('DeckInABox Help');
    });
  });

  describe('Responsive Layout', () => {
    it('should handle compact layout for small terminals', () => {
      const compactProps = {
        ...mockProps,
        terminalSize: { width: 40, height: 12 },
      };
      
      const { lastFrame } = render(<MainMenu {...compactProps} />);
      
      // Should still render but with compact layout
      expect(lastFrame()).toContain('DeckInABox');
      expect(lastFrame()).toContain('War');
      expect(lastFrame()).toContain('Go Fish');
    });
  });

  describe('Color and Unicode Settings', () => {
    it('should respect color settings', () => {
      const noColorProps = {
        ...mockProps,
        settings: { ...mockSettings, useColors: false },
      };
      
      const { lastFrame } = render(<MainMenu {...noColorProps} />);
      
      // Should render without color codes
      expect(lastFrame()).toContain('DeckInABox');
    });

    it('should respect unicode settings', () => {
      const noUnicodeProps = {
        ...mockProps,
        settings: { ...mockSettings, useUnicode: false },
      };
      
      const { lastFrame } = render(<MainMenu {...noUnicodeProps} />);
      
      // Should use ASCII alternatives instead of Unicode
      expect(lastFrame()).toContain('[*]'); // Instead of 🎴
    });
  });
});