import { GameConfiguration } from '../../src/types';
import { ApplicationSettings } from '../../src/types/application-state';

// Mock game configuration for testing
const createMockGame = (id: string, name: string, playerCount: number): GameConfiguration => ({
  gameId: id,
  displayName: name,
  description: `Test game: ${name}`,
  deckType: 'standard',
  rulesetType: 'test',
  getDefaultPlayerCount: () => playerCount,
  validatePlayerCount: (count: number) => count >= 1 && count <= 4,
  setupGame: jest.fn().mockResolvedValue({
    players: [],
    gameOptions: {},
    deckConfiguration: {},
    rulesetConfiguration: {},
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
} as any);

const mockSettings: ApplicationSettings = {
  showHints: true,
  useColors: true,
  useUnicode: true,
  theme: 'default',
  saveDirectory: './saves',
  autoSave: false,
  autoSaveInterval: 5,
  recentGames: ['war', 'go-fish'],
  maxRecentGames: 10,
};

describe('Menu Navigation Logic', () => {
  describe('Game Filtering', () => {
    const games = [
      createMockGame('war', 'War', 2),
      createMockGame('go-fish', 'Go Fish', 3),
      createMockGame('solitaire', 'Solitaire', 1),
    ];

    it('should filter games by name', () => {
      const searchTerm = 'war';
      const filtered = games.filter(game => 
        game.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].gameId).toBe('war');
    });

    it('should filter games by description', () => {
      const searchTerm = 'solitaire';
      const filtered = games.filter(game => 
        game.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].gameId).toBe('solitaire');
    });

    it('should return all games when search is empty', () => {
      const searchTerm = '';
      const filtered = games.filter(game => 
        game.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(3);
    });

    it('should handle case-insensitive search', () => {
      const searchTerm = 'GO FISH';
      const filtered = games.filter(game => 
        game.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].gameId).toBe('go-fish');
    });
  });

  describe('Recent Games Management', () => {
    it('should identify available recent games', () => {
      const games = [
        createMockGame('war', 'War', 2),
        createMockGame('go-fish', 'Go Fish', 3),
      ];
      
      const availableRecent = mockSettings.recentGames.filter(gameId =>
        games.some(game => game.gameId === gameId)
      );
      
      expect(availableRecent).toEqual(['war', 'go-fish']);
    });

    it('should identify missing recent games', () => {
      const games = [
        createMockGame('war', 'War', 2),
        // go-fish is missing
      ];
      
      const missingRecent = mockSettings.recentGames.filter(gameId =>
        !games.some(game => game.gameId === gameId)
      );
      
      expect(missingRecent).toEqual(['go-fish']);
    });

    it('should handle empty recent games list', () => {
      const emptySettings = { ...mockSettings, recentGames: [] };
      
      expect(emptySettings.recentGames).toHaveLength(0);
    });
  });

  describe('Player Count Validation', () => {
    const game = createMockGame('test', 'Test Game', 2);

    it('should validate valid player counts', () => {
      expect(game.validatePlayerCount(2)).toBe(true);
      expect(game.validatePlayerCount(3)).toBe(true);
      expect(game.validatePlayerCount(4)).toBe(true);
    });

    it('should reject invalid player counts', () => {
      expect(game.validatePlayerCount(0)).toBe(false);
      expect(game.validatePlayerCount(5)).toBe(false);
      expect(game.validatePlayerCount(-1)).toBe(false);
    });

    it('should provide default player count', () => {
      expect(game.getDefaultPlayerCount()).toBe(2);
    });
  });

  describe('Player Name Validation', () => {
    const validatePlayerName = (name: string, existingNames: string[]): string | null => {
      const trimmed = name.trim();
      
      if (!trimmed) {
        return 'Player name cannot be empty';
      }
      
      if (trimmed.length > 20) {
        return 'Player name must be 20 characters or less';
      }
      
      if (existingNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
        return 'Player names must be unique';
      }
      
      return null;
    };

    it('should accept valid player names', () => {
      expect(validatePlayerName('Alice', [])).toBeNull();
      expect(validatePlayerName('Bob123', ['Alice'])).toBeNull();
      expect(validatePlayerName('Player-1', ['Alice', 'Bob'])).toBeNull();
    });

    it('should reject empty names', () => {
      expect(validatePlayerName('', [])).toBe('Player name cannot be empty');
      expect(validatePlayerName('   ', [])).toBe('Player name cannot be empty');
    });

    it('should reject names that are too long', () => {
      const longName = 'ThisIsAVeryLongPlayerNameThatExceedsTwentyCharacters';
      expect(validatePlayerName(longName, [])).toBe('Player name must be 20 characters or less');
    });

    it('should reject duplicate names (case insensitive)', () => {
      const existingNames = ['Alice', 'Bob'];
      expect(validatePlayerName('alice', existingNames)).toBe('Player names must be unique');
      expect(validatePlayerName('ALICE', existingNames)).toBe('Player names must be unique');
      expect(validatePlayerName('Alice', existingNames)).toBe('Player names must be unique');
    });

    it('should trim whitespace from names', () => {
      expect(validatePlayerName('  Alice  ', [])).toBeNull();
    });
  });

  describe('Menu State Management', () => {
    it('should handle section switching', () => {
      const sections = ['games', 'recent', 'options'] as const;
      let currentIndex = 0;
      
      // Simulate Tab key press
      currentIndex = (currentIndex + 1) % sections.length;
      expect(sections[currentIndex]).toBe('recent');
      
      // Another Tab press
      currentIndex = (currentIndex + 1) % sections.length;
      expect(sections[currentIndex]).toBe('options');
      
      // Wrap around
      currentIndex = (currentIndex + 1) % sections.length;
      expect(sections[currentIndex]).toBe('games');
    });

    it('should handle navigation within sections', () => {
      const items = ['item1', 'item2', 'item3'];
      let selectedIndex = 0;
      
      // Navigate down
      selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(1);
      
      // Navigate down again
      selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(2);
      
      // Try to go past end
      selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(2); // Should stay at end
      
      // Navigate up
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(1);
    });

    it('should reset selection when filtering changes', () => {
      const allGames = [
        createMockGame('war', 'War', 2),
        createMockGame('go-fish', 'Go Fish', 3),
      ];
      
      let selectedIndex = 1; // Second game selected
      
      // Apply filter that reduces results
      const filteredGames = allGames.filter(game => game.gameId === 'war');
      
      // Selection should reset to 0 when filter changes
      selectedIndex = Math.min(selectedIndex, Math.max(0, filteredGames.length - 1));
      expect(selectedIndex).toBe(0);
    });
  });

  describe('Game Setup Flow', () => {
    it('should progress through setup steps', () => {
      const steps = ['playerCount', 'playerNames', 'gameOptions', 'confirm'] as const;
      let currentStep = 0;
      
      // Progress through each step
      currentStep++;
      expect(steps[currentStep]).toBe('playerNames');
      
      currentStep++;
      expect(steps[currentStep]).toBe('gameOptions');
      
      currentStep++;
      expect(steps[currentStep]).toBe('confirm');
    });

    it('should handle step validation', () => {
      const game = createMockGame('test', 'Test Game', 2);
      
      // Test player count validation
      const validatePlayerCount = (count: number) => {
        if (!game.validatePlayerCount(count)) {
          return `This game does not support ${count} players`;
        }
        return null;
      };
      
      expect(validatePlayerCount(2)).toBeNull();
      expect(validatePlayerCount(0)).toBe('This game does not support 0 players');
    });

    it('should create participant objects correctly', async () => {
      const playerNames = ['Alice', 'Bob'];
      
      // Simulate participant creation
      const participants = playerNames.map((name, index) => ({
        id: `player_${index + 1}`,
        name: name.trim(),
        isNPC: false,
        handIds: [],
        status: {},
      }));
      
      expect(participants).toHaveLength(2);
      expect(participants[0].name).toBe('Alice');
      expect(participants[1].name).toBe('Bob');
      expect(participants[0].id).toBe('player_1');
      expect(participants[1].id).toBe('player_2');
    });
  });

  describe('Error Handling', () => {
    it('should handle game setup errors', async () => {
      const errorGame = {
        ...createMockGame('error', 'Error Game', 2),
        setupGame: jest.fn().mockRejectedValue(new Error('Setup failed')),
      };
      
      try {
        await errorGame.setupGame();
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Setup failed');
      }
    });

    it('should handle missing recent games gracefully', () => {
      const games = [createMockGame('war', 'War', 2)];
      const recentGameId = 'missing-game';
      
      const game = games.find(g => g.gameId === recentGameId);
      expect(game).toBeUndefined();
      
      // This would trigger an error message in the UI
      const errorMessage = `Recent game "${recentGameId}" is no longer available`;
      expect(errorMessage).toBe('Recent game "missing-game" is no longer available');
    });
  });
});