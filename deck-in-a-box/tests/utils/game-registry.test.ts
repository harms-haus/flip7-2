import { GameRegistry } from '../../src/utils/game-registry';
import { GameConfiguration } from '../../src/types';
import * as gameDiscovery from '../../src/utils/game-discovery';

// Mock the game discovery module
jest.mock('../../src/utils/game-discovery');

describe('GameRegistry', () => {
  let registry: GameRegistry;
  let mockGame1: GameConfiguration;
  let mockGame2: GameConfiguration;

  beforeEach(() => {
    registry = new GameRegistry();
    
    // Create mock games
    mockGame1 = {
      gameId: 'war',
      displayName: 'War',
      description: 'Classic War card game',
      deckType: 'standard',
      rulesetType: 'war',
      setupGame: jest.fn(),
      validatePlayerCount: jest.fn().mockReturnValue(true),
      getDefaultPlayerCount: jest.fn().mockReturnValue(2),
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

    mockGame2 = {
      gameId: 'go-fish',
      displayName: 'Go Fish',
      description: 'Classic Go Fish card game',
      deckType: 'standard',
      rulesetType: 'go-fish',
      setupGame: jest.fn(),
      validatePlayerCount: jest.fn().mockReturnValue(true),
      getDefaultPlayerCount: jest.fn().mockReturnValue(4),
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

    // Mock the discovery functions
    (gameDiscovery.discoverGames as jest.Mock).mockResolvedValue([mockGame1, mockGame2]);
    (gameDiscovery.validateGameConfiguration as jest.Mock).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    jest.clearAllMocks();
  });

  describe('loadGames', () => {
    it('should load games from discovery system', async () => {
      await registry.loadGames();

      expect(gameDiscovery.discoverGames).toHaveBeenCalledTimes(1);
      expect(gameDiscovery.validateGameConfiguration).toHaveBeenCalledTimes(2);
    });

    it('should not load games multiple times', async () => {
      await registry.loadGames();
      await registry.loadGames();

      expect(gameDiscovery.discoverGames).toHaveBeenCalledTimes(1);
    });

    it('should handle discovery errors gracefully', async () => {
      (gameDiscovery.discoverGames as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

      await registry.loadGames();

      // Should not throw, just log the error
      expect(gameDiscovery.discoverGames).toHaveBeenCalledTimes(1);
    });

    it('should skip invalid games', async () => {
      (gameDiscovery.validateGameConfiguration as jest.Mock)
        .mockReturnValueOnce({ valid: false, errors: ['Invalid game'], warnings: [] })
        .mockReturnValueOnce({ valid: true, errors: [], warnings: [] });

      await registry.loadGames();
      const games = await registry.getGames();

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('go-fish');
    });

    it('should skip duplicate game IDs', async () => {
      const duplicateGame = { ...mockGame2, gameId: 'war' };
      (gameDiscovery.discoverGames as jest.Mock).mockResolvedValue([mockGame1, duplicateGame]);

      await registry.loadGames();
      const games = await registry.getGames();

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('war');
    });
  });

  describe('getGames', () => {
    it('should return all loaded games', async () => {
      const games = await registry.getGames();

      expect(games).toHaveLength(2);
      expect(games.map(g => g.gameId)).toContain('war');
      expect(games.map(g => g.gameId)).toContain('go-fish');
    });

    it('should automatically load games if not loaded', async () => {
      const games = await registry.getGames();

      expect(gameDiscovery.discoverGames).toHaveBeenCalledTimes(1);
      expect(games).toHaveLength(2);
    });
  });

  describe('getGame', () => {
    it('should return specific game by ID', async () => {
      const game = await registry.getGame('war');

      expect(game).toBe(mockGame1);
    });

    it('should return null for non-existent game', async () => {
      const game = await registry.getGame('non-existent');

      expect(game).toBeNull();
    });
  });

  describe('hasGame', () => {
    it('should return true for existing game', async () => {
      const exists = await registry.hasGame('war');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent game', async () => {
      const exists = await registry.hasGame('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('getGameCount', () => {
    it('should return correct number of games', async () => {
      const count = await registry.getGameCount();

      expect(count).toBe(2);
    });
  });

  describe('reloadGames', () => {
    it('should reload games from discovery system', async () => {
      await registry.getGames(); // Initial load
      await registry.reloadGames();

      expect(gameDiscovery.discoverGames).toHaveBeenCalledTimes(2);
    });

    it('should clear existing games before reloading', async () => {
      await registry.getGames(); // Initial load
      
      // Change mock to return different games
      (gameDiscovery.discoverGames as jest.Mock).mockResolvedValue([mockGame1]);
      
      await registry.reloadGames();
      const games = await registry.getGames();

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('war');
    });
  });

  describe('registerGame', () => {
    it('should register a valid game', async () => {
      const newGame = {
        ...mockGame1,
        gameId: 'new-game',
        displayName: 'New Game',
      } as any;

      const success = registry.registerGame(newGame);

      expect(success).toBe(true);
      expect(await registry.hasGame('new-game')).toBe(true);
    });

    it('should reject invalid game', async () => {
      (gameDiscovery.validateGameConfiguration as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Invalid game'],
        warnings: [],
      });

      const invalidGame = { ...mockGame1, gameId: '' } as any;
      const success = registry.registerGame(invalidGame);

      expect(success).toBe(false);
      expect(await registry.hasGame('')).toBe(false);
    });

    it('should reject duplicate game ID', async () => {
      await registry.getGames(); // Load initial games
      
      const duplicateGame = { ...mockGame1, displayName: 'Duplicate War' } as any;
      const success = registry.registerGame(duplicateGame);

      expect(success).toBe(false);
    });
  });

  describe('unregisterGame', () => {
    it('should remove existing game', async () => {
      await registry.getGames(); // Load initial games
      
      const success = registry.unregisterGame('war');

      expect(success).toBe(true);
      expect(await registry.hasGame('war')).toBe(false);
    });

    it('should return false for non-existent game', async () => {
      const success = registry.unregisterGame('non-existent');

      expect(success).toBe(false);
    });
  });

  describe('getGamesBy', () => {
    beforeEach(async () => {
      await registry.getGames(); // Load initial games
    });

    it('should filter by deck type', async () => {
      const games = await registry.getGamesBy({ deckType: 'standard' });

      expect(games).toHaveLength(2);
      expect(games.every(g => g.deckType === 'standard')).toBe(true);
    });

    it('should filter by ruleset type', async () => {
      const games = await registry.getGamesBy({ rulesetType: 'war' });

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('war');
    });

    it('should filter by minimum players', async () => {
      const games = await registry.getGamesBy({ minPlayers: 3 });

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('go-fish');
    });

    it('should filter by maximum players', async () => {
      const games = await registry.getGamesBy({ maxPlayers: 3 });

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('war');
    });

    it('should apply multiple filters', async () => {
      const games = await registry.getGamesBy({
        deckType: 'standard',
        rulesetType: 'war',
        maxPlayers: 3,
      });

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe('war');
    });

    it('should return empty array when no games match', async () => {
      const games = await registry.getGamesBy({ deckType: 'custom' });

      expect(games).toHaveLength(0);
    });
  });
});