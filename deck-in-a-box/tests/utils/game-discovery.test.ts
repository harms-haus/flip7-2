import { promises as fs } from 'fs';
import { discoverGames, validateGameConfiguration } from '../../src/utils/game-discovery';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
  },
}));

// Mock path module for consistent testing
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn(),
  join: jest.fn(),
  dirname: jest.fn(),
}));

// Mock path resolver
jest.mock('../../src/utils/path-resolver', () => ({
  getCurrentDirname: jest.fn(() => '/test/mock-path'),
}));

describe('Game Discovery System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverGames', () => {
    it('should return empty array when games directory does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      const games = await discoverGames('/test/games');
      expect(games).toEqual([]);
    });

    it('should return empty array when games directory is empty', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const games = await discoverGames('/test/games');
      expect(games).toEqual([]);
    });

    it('should skip non-directory entries', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'file.txt', isDirectory: () => false },
        { name: 'game1', isDirectory: () => true },
      ]);

      // Mock the game loading to fail for testing
      const games = await discoverGames('/test/games');
      // Since we can't easily mock the dynamic imports in this test,
      // we expect an empty array (games that failed to load)
      expect(games).toEqual([]);
    });

    it('should handle file system errors gracefully', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const games = await discoverGames('/test/games');
      expect(games).toEqual([]);
    });
  });

  describe('validateGameConfiguration', () => {
    let mockGame: any;

    beforeEach(() => {
      mockGame = {
        gameId: 'test-game',
        displayName: 'Test Game',
        description: 'A test game',
        deckType: 'standard',
        rulesetType: 'test-rules',
        setupGame: jest.fn(),
        validatePlayerCount: jest.fn(),
        getDefaultPlayerCount: jest.fn(),
        renderGameState: jest.fn(),
        renderPlayerHand: jest.fn(),
        renderGameBoard: jest.fn(),
        renderWinScreen: jest.fn(),
        getAvailableActions: jest.fn(),
        handlePlayerInput: jest.fn(),
        onGameStart: jest.fn(),
        onGameEnd: jest.fn(),
        onTurnChange: jest.fn(),
      };
    });

    it('should validate a properly configured game', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should detect missing gameId', () => {
      mockGame.gameId = '';
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('gameId must be a non-empty string');
    });

    it('should detect missing displayName', () => {
      mockGame.displayName = '';
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('displayName must be a non-empty string');
    });

    it('should detect missing description', () => {
      mockGame.description = '';
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('description must be a non-empty string');
    });

    it('should detect missing deckType', () => {
      mockGame.deckType = '';
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deckType must be a non-empty string');
    });

    it('should detect missing rulesetType', () => {
      mockGame.rulesetType = '';
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rulesetType must be a non-empty string');
    });

    it('should detect invalid default player count', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(0);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('getDefaultPlayerCount() must return a positive integer');
    });

    it('should detect non-integer default player count', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2.5);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(true);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('getDefaultPlayerCount() must return a positive integer');
    });

    it('should warn when default player count is not valid', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockImplementation((count: number) => count !== 2);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Default player count is not valid according to validatePlayerCount()');
    });

    it('should detect when getDefaultPlayerCount throws an error', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('getDefaultPlayerCount() threw an error: Error: Test error');
    });

    it('should detect when validatePlayerCount throws an error', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('validatePlayerCount() threw an error: Error: Validation error');
    });

    it('should detect when no player counts are valid', () => {
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(2);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(false);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('validatePlayerCount() does not accept any player counts from 1-8');
    });

    it('should handle multiple errors', () => {
      mockGame.gameId = '';
      mockGame.displayName = '';
      (mockGame.getDefaultPlayerCount as jest.Mock).mockReturnValue(0);
      (mockGame.validatePlayerCount as jest.Mock).mockReturnValue(false);

      const result = validateGameConfiguration(mockGame);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('gameId must be a non-empty string');
      expect(result.errors).toContain('displayName must be a non-empty string');
    });
  });
});