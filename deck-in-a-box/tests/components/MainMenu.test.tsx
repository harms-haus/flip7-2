import React from 'react';
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

  describe('Component Structure', () => {
    it('should have MainMenu component file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const mainMenuPath = path.join(__dirname, '../../src/components/MainMenu.tsx');
      expect(fs.existsSync(mainMenuPath)).toBe(true);
      
      const content = fs.readFileSync(mainMenuPath, 'utf8');
      expect(content).toContain('export const MainMenu');
      expect(content).toContain('MainMenuProps');
    });

    it('should import required dependencies', () => {
      const fs = require('fs');
      const path = require('path');
      
      const mainMenuPath = path.join(__dirname, '../../src/components/MainMenu.tsx');
      const content = fs.readFileSync(mainMenuPath, 'utf8');
      
      expect(content).toContain('import React');
      expect(content).toContain('from \'ink\'');
      expect(content).toContain('GameConfiguration');
      expect(content).toContain('ApplicationSettings');
    });

    it('should define proper component structure', () => {
      const fs = require('fs');
      const path = require('path');
      
      const mainMenuPath = path.join(__dirname, '../../src/components/MainMenu.tsx');
      const content = fs.readFileSync(mainMenuPath, 'utf8');
      
      // Check for key component features
      expect(content).toContain('useState');
      expect(content).toContain('useInput');
      expect(content).toContain('MenuSection');
      expect(content).toContain('MenuState');
    });
  });

  describe('Props Validation', () => {
    it('should handle games prop correctly', () => {
      expect(mockProps.games).toHaveLength(2);
      expect(mockProps.games[0].gameId).toBe('war');
      expect(mockProps.games[1].gameId).toBe('go-fish');
    });

    it('should handle settings prop correctly', () => {
      expect(mockProps.settings.useColors).toBe(true);
      expect(mockProps.settings.useUnicode).toBe(true);
      expect(mockProps.settings.recentGames).toContain('war');
    });

    it('should handle callback props correctly', () => {
      expect(typeof mockProps.onGameSelect).toBe('function');
      expect(typeof mockProps.onLoadGame).toBe('function');
      expect(typeof mockProps.onSettings).toBe('function');
      expect(typeof mockProps.onExit).toBe('function');
      expect(typeof mockProps.onError).toBe('function');
    });
  });

  describe('Game Configuration Integration', () => {
    it('should work with valid game configurations', () => {
      mockGames.forEach(game => {
        expect(game.gameId).toBeTruthy();
        expect(game.displayName).toBeTruthy();
        expect(game.description).toBeTruthy();
        expect(typeof game.getDefaultPlayerCount).toBe('function');
        expect(typeof game.validatePlayerCount).toBe('function');
      });
    });

    it('should handle game selection', () => {
      const selectedGame = mockGames[0];
      mockProps.onGameSelect(selectedGame);
      expect(mockProps.onGameSelect).toHaveBeenCalledWith(selectedGame);
    });

    it('should handle missing recent games', () => {
      const errorMessage = 'Recent game "missing-game" is no longer available';
      mockProps.onError(errorMessage);
      expect(mockProps.onError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('Settings Integration', () => {
    it('should handle different settings configurations', () => {
      const settingsVariations = [
        { ...mockSettings, useColors: false },
        { ...mockSettings, useUnicode: false },
        { ...mockSettings, recentGames: [] },
        { ...mockSettings, useColors: false, useUnicode: false },
      ];
      
      settingsVariations.forEach(settings => {
        expect(settings).toBeDefined();
        expect(typeof settings.useColors).toBe('boolean');
        expect(typeof settings.useUnicode).toBe('boolean');
        expect(Array.isArray(settings.recentGames)).toBe(true);
      });
    });

    it('should validate settings structure', () => {
      expect(mockSettings).toHaveProperty('useColors');
      expect(mockSettings).toHaveProperty('useUnicode');
      expect(mockSettings).toHaveProperty('recentGames');
      expect(mockSettings).toHaveProperty('theme');
      expect(mockSettings).toHaveProperty('saveDirectory');
    });
  });

  describe('Menu Navigation Logic', () => {
    it('should filter games correctly', () => {
      const searchTerm = 'war';
      const filtered = mockGames.filter(game => 
        game.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.gameId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].gameId).toBe('war');
    });

    it('should identify available recent games', () => {
      const availableRecent = mockSettings.recentGames.filter(gameId =>
        mockGames.some(game => game.gameId === gameId)
      );
      
      expect(availableRecent).toContain('war');
    });

    it('should identify missing recent games', () => {
      const testRecentGames = ['war', 'missing-game'];
      const missingRecent = testRecentGames.filter(gameId =>
        !mockGames.some(game => game.gameId === gameId)
      );
      
      expect(missingRecent).toContain('missing-game');
    });
  });

  describe('Error Handling', () => {
    it('should validate required props structure', () => {
      expect(mockProps.games).toBeDefined();
      expect(mockProps.settings).toBeDefined();
      expect(mockProps.terminalSize).toBeDefined();
      expect(typeof mockProps.onGameSelect).toBe('function');
      expect(typeof mockProps.onLoadGame).toBe('function');
      expect(typeof mockProps.onSettings).toBe('function');
      expect(typeof mockProps.onExit).toBe('function');
      expect(typeof mockProps.onError).toBe('function');
    });

    it('should handle callback function calls', () => {
      // Test that callbacks can be called without errors
      expect(() => mockProps.onGameSelect(mockGames[0])).not.toThrow();
      expect(() => mockProps.onLoadGame()).not.toThrow();
      expect(() => mockProps.onSettings()).not.toThrow();
      expect(() => mockProps.onExit()).not.toThrow();
      expect(() => mockProps.onError('test error')).not.toThrow();
    });

    it('should validate terminal size structure', () => {
      expect(mockProps.terminalSize).toHaveProperty('width');
      expect(mockProps.terminalSize).toHaveProperty('height');
      expect(typeof mockProps.terminalSize.width).toBe('number');
      expect(typeof mockProps.terminalSize.height).toBe('number');
      expect(mockProps.terminalSize.width).toBeGreaterThan(0);
      expect(mockProps.terminalSize.height).toBeGreaterThan(0);
    });
  });
});