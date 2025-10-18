import { GameConfiguration } from '../types';
import { discoverGames, validateGameConfiguration } from './game-discovery';

/**
 * Registry that maintains the list of available games.
 * Handles loading, validation, and access to game configurations.
 */
export class GameRegistry {
  private games: Map<string, GameConfiguration> = new Map();
  private loadingPromise: Promise<void> | null = null;
  private loaded = false;

  /**
   * Load all available games from the games directory.
   * This is called automatically when accessing games for the first time.
   */
  async loadGames(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.doLoadGames();
    await this.loadingPromise;
    this.loaded = true;
  }

  private async doLoadGames(): Promise<void> {
    try {
      const discoveredGames = await discoverGames();
      
      for (const game of discoveredGames) {
        try {
          // Validate the game configuration
          const validation = validateGameConfiguration(game);
          
          if (!validation.valid) {
            console.warn(
              `Invalid game configuration "${game.gameId}":`,
              validation.errors.join(', ')
            );
            continue;
          }
          
          // Log warnings but still register the game
          if (validation.warnings.length > 0) {
            console.warn(
              `Game configuration "${game.gameId}" has warnings:`,
              validation.warnings.join(', ')
            );
          }
          
          // Check for duplicate game IDs
          if (this.games.has(game.gameId)) {
            console.warn(
              `Duplicate game ID "${game.gameId}" found. Skipping duplicate.`
            );
            continue;
          }
          
          this.games.set(game.gameId, game);
        } catch (error) {
          console.warn(
            `Error processing game configuration "${game.gameId}":`,
            error
          );
        }
      }
      
      console.log(`Loaded ${this.games.size} game configurations`);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }

  /**
   * Get all available games.
   * Automatically loads games if not already loaded.
   */
  async getGames(): Promise<GameConfiguration[]> {
    if (!this.loaded) {
      await this.loadGames();
    }
    
    return Array.from(this.games.values());
  }

  /**
   * Get a specific game by ID.
   * Returns null if the game is not found.
   */
  async getGame(gameId: string): Promise<GameConfiguration | null> {
    if (!this.loaded) {
      await this.loadGames();
    }
    
    return this.games.get(gameId) || null;
  }

  /**
   * Check if a game with the given ID exists.
   */
  async hasGame(gameId: string): Promise<boolean> {
    if (!this.loaded) {
      await this.loadGames();
    }
    
    return this.games.has(gameId);
  }

  /**
   * Get the number of available games.
   */
  async getGameCount(): Promise<number> {
    if (!this.loaded) {
      await this.loadGames();
    }
    
    return this.games.size;
  }

  /**
   * Reload all games from disk.
   * Useful for development or when games are added/removed at runtime.
   */
  async reloadGames(): Promise<void> {
    this.games.clear();
    this.loaded = false;
    this.loadingPromise = null;
    await this.loadGames();
  }

  /**
   * Register a game configuration manually.
   * Useful for testing or programmatic game registration.
   */
  registerGame(game: GameConfiguration): boolean {
    const validation = validateGameConfiguration(game);
    
    if (!validation.valid) {
      console.warn(
        `Cannot register invalid game configuration "${game.gameId}":`,
        validation.errors.join(', ')
      );
      return false;
    }
    
    if (this.games.has(game.gameId)) {
      console.warn(
        `Game with ID "${game.gameId}" is already registered. Use unregisterGame() first.`
      );
      return false;
    }
    
    this.games.set(game.gameId, game);
    return true;
  }

  /**
   * Unregister a game configuration.
   * Returns true if the game was found and removed.
   */
  unregisterGame(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  /**
   * Get games filtered by criteria.
   */
  async getGamesBy(filter: {
    deckType?: string;
    rulesetType?: string;
    minPlayers?: number;
    maxPlayers?: number;
  }): Promise<GameConfiguration[]> {
    const allGames = await this.getGames();
    
    return allGames.filter(game => {
      // Filter by deck type
      if (filter.deckType && game.deckType !== filter.deckType) {
        return false;
      }
      
      // Filter by ruleset type
      if (filter.rulesetType && game.rulesetType !== filter.rulesetType) {
        return false;
      }
      
      // Filter by player count
      if (filter.minPlayers !== undefined || filter.maxPlayers !== undefined) {
        const defaultCount = game.getDefaultPlayerCount();
        
        if (filter.minPlayers !== undefined && defaultCount < filter.minPlayers) {
          return false;
        }
        
        if (filter.maxPlayers !== undefined && defaultCount > filter.maxPlayers) {
          return false;
        }
      }
      
      return true;
    });
  }
}

// Export a singleton instance for convenience
export const gameRegistry = new GameRegistry();