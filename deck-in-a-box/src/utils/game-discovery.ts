import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { GameConfiguration } from '../types';
import { getCurrentDirname } from './path-resolver';

const currentDir = getCurrentDirname();

/**
 * Discover available game configurations.
 * Looks for GameConfiguration classes in the games directory.
 */
export async function discoverGames(gamesPath?: string): Promise<GameConfiguration[]> {
  const games: GameConfiguration[] = [];
  
  // Allow custom games path for testing, otherwise use default
  const gamesDir = gamesPath || resolve(currentDir, '../../games');
  
  try {
    // Check if games directory exists
    await fs.access(gamesDir);
    
    // Read all subdirectories in games folder
    const entries = await fs.readdir(gamesDir, { withFileTypes: true });
    const gameDirectories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    // Load each game configuration
    for (const gameDir of gameDirectories) {
      try {
        const gamePath = join(gamesDir, gameDir);
        const game = await loadGameConfiguration(gamePath);
        if (game) {
          games.push(game);
        }
      } catch (error) {
        console.warn(`Failed to load game from ${gameDir}:`, error);
      }
    }
  } catch (error) {
    // Games directory doesn't exist or can't be read
    console.warn('Games directory not found or inaccessible:', error);
  }
  
  return games;
}

/**
 * Load a game configuration from a directory.
 * Looks for index.js/ts or a main configuration file.
 */
async function loadGameConfiguration(gamePath: string): Promise<GameConfiguration | null> {
  try {
    // Try to load index file first (both .js and .ts)
    const indexFiles = ['index.js', 'index.ts'];
    
    for (const indexFile of indexFiles) {
      try {
        const indexPath = join(gamePath, indexFile);
        await fs.access(indexPath);
        const gameModule = await import(indexPath);
        const instance = createGameInstance(gameModule);
        if (instance) {
          return instance;
        }
      } catch {
        // Continue to next file
      }
    }
    
    // Index file doesn't exist, try other common names
    const configFiles = [
      'config.js',
      'config.ts',
      'game-config.js',
      'game-config.ts',
      `${gamePath.split('/').pop()}-config.js`,
      `${gamePath.split('/').pop()}-config.ts`,
      `${gamePath.split('/').pop()}-config.tsx`,
    ];
    
    for (const configFile of configFiles) {
      try {
        const configPath = join(gamePath, configFile);
        await fs.access(configPath);
        const gameModule = await import(configPath);
        const instance = createGameInstance(gameModule);
        if (instance) {
          return instance;
        }
      } catch {
        // Continue to next file
      }
    }
  } catch (error) {
    console.warn(`Error loading game configuration from ${gamePath}:`, error);
  }
  
  return null;
}

/**
 * Create a game configuration instance from a loaded module.
 */
function createGameInstance(gameModule: any): GameConfiguration | null {
  // Look for default export
  if (gameModule.default && isGameConfiguration(gameModule.default)) {
    return new gameModule.default();
  }
  
  // Look for named exports that extend GameConfiguration
  for (const [, value] of Object.entries(gameModule)) {
    if (isGameConfiguration(value)) {
      return new (value as any)();
    }
  }
  
  return null;
}

/**
 * Check if a value is a GameConfiguration class.
 */
function isGameConfiguration(value: any): boolean {
  if (typeof value !== 'function') {
    return false;
  }
  
  // Check if it has the required static/prototype properties
  const prototype = value.prototype;
  if (!prototype) {
    return false;
  }
  
  // Check for required abstract methods
  const requiredMethods = [
    'setupGame',
    'validatePlayerCount',
    'getDefaultPlayerCount',
    'renderGameState',
    'renderPlayerHand',
    'renderGameBoard',
    'renderWinScreen',
    'getAvailableActions',
    'handlePlayerInput',
    'onGameStart',
    'onGameEnd',
    'onTurnChange',
  ];
  
  for (const method of requiredMethods) {
    if (typeof prototype[method] !== 'function') {
      return false;
    }
  }
  
  // Check for required properties (these might be getters)
  const requiredProperties = [
    'gameId',
    'displayName',
    'description',
    'deckType',
    'rulesetType',
  ];
  
  // Create a temporary instance to check properties
  try {
    const instance = new value();
    for (const prop of requiredProperties) {
      if (!(prop in instance)) {
        return false;
      }
    }
    return true;
  } catch {
    // Constructor failed, not a valid GameConfiguration
    return false;
  }
}

/**
 * Validate that a game configuration is properly implemented.
 */
export function validateGameConfiguration(game: GameConfiguration): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required properties
  if (!game.gameId || typeof game.gameId !== 'string') {
    errors.push('gameId must be a non-empty string');
  }
  
  if (!game.displayName || typeof game.displayName !== 'string') {
    errors.push('displayName must be a non-empty string');
  }
  
  if (!game.description || typeof game.description !== 'string') {
    errors.push('description must be a non-empty string');
  }
  
  if (!game.deckType || typeof game.deckType !== 'string') {
    errors.push('deckType must be a non-empty string');
  }
  
  if (!game.rulesetType || typeof game.rulesetType !== 'string') {
    errors.push('rulesetType must be a non-empty string');
  }
  
  // Check default player count
  try {
    const defaultCount = game.getDefaultPlayerCount();
    if (!Number.isInteger(defaultCount) || defaultCount < 1) {
      errors.push('getDefaultPlayerCount() must return a positive integer');
    }
    
    // Validate that default count is actually valid
    if (!game.validatePlayerCount(defaultCount)) {
      warnings.push('Default player count is not valid according to validatePlayerCount()');
    }
  } catch (error) {
    errors.push(`getDefaultPlayerCount() threw an error: ${error}`);
  }
  
  // Test player count validation
  try {
    const validCounts = [1, 2, 3, 4, 5, 6, 7, 8].filter(count => 
      game.validatePlayerCount(count)
    );
    
    if (validCounts.length === 0) {
      errors.push('validatePlayerCount() does not accept any player counts from 1-8');
    }
  } catch (error) {
    errors.push(`validatePlayerCount() threw an error: ${error}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}