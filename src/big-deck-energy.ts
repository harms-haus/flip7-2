/**
 * BigDeckEnergy - Main library class for creating and managing card games
 * 
 * This is the primary entry point for the BigDeckEnergy library, providing
 * factory methods for game creation, utility functions, and registration
 * systems for deck types and rulesets.
 * 
 * @example
 * ```typescript
 * import { BigDeckEnergy } from 'big-deck-energy';
 * 
 * // Get singleton instance
 * const bde = BigDeckEnergy.getInstance();
 * 
 * // Create a quick game with built-in components
 * const result = await bde.createQuickGame('my-game', 'war', 'standard');
 * 
 * if (result.success) {
 *   const game = result.gameInstance!;
 *   game.initialize();
 *   
 *   // Create participants
 *   game.createParticipant('player1', 'Alice');
 *   game.createParticipant('player2', 'Bob');
 *   
 *   // Execute game loop
 *   const loopResult = game.executeGameLoop();
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Register custom components
 * const customDeck = new MyCustomDeckType();
 * const customRuleset = new MyCustomRuleset();
 * 
 * bde.registerDeckType('my-deck', customDeck);
 * bde.registerRuleset('my-rules', customRuleset);
 * 
 * // Create game with custom components
 * const customGame = await bde.createGame({
 *   gameId: 'custom-game',
 *   ruleset: customRuleset,
 *   deckType: customDeck
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { GameInstance, GameInstanceConfig, GameCreationResult } from './engine/game-instance';
import { CompatibilityValidator, CompatibilityResult } from './engine/compatibility';
import { Ruleset } from './core/interfaces/ruleset';
import { DeckType } from './core/interfaces/deck-type';
import { GameState as IGameState } from './core/interfaces/game-state';
import { GameState } from './models/game-state';
import { SerializationEngine } from './engine/serialization';

// Import built-in deck types
import { StandardPlayingDeck } from './deck-types/standard/standard-playing-deck';
import { CustomDeckType } from './deck-types/custom/custom-deck-type';
import { MonopolyPropertyDeck } from './deck-types/monopoly/monopoly-property-deck';

// Import built-in rulesets
import { WarRuleset } from './rulesets/war/war-ruleset';
import { GoFishRuleset } from './rulesets/go-fish/go-fish-ruleset';

/**
 * Configuration options for BigDeckEnergy library
 */
export interface BigDeckEnergyConfig {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Custom logger function */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) => void;
  
  /** Thread safety mode for concurrent access */
  threadSafe?: boolean;
}

/**
 * Registry entry for deck types
 */
interface DeckTypeRegistryEntry {
  name: string;
  deckType: DeckType;
  metadata: {
    description?: string;
    version?: string;
    author?: string;
  };
}

/**
 * Registry entry for rulesets
 */
interface RulesetRegistryEntry {
  name: string;
  ruleset: Ruleset;
  metadata: {
    description?: string;
    version?: string;
    author?: string;
    minPlayers: number;
    maxPlayers: number;
    compatibleDeckTypes: string[];
  };
}

/**
 * Main BigDeckEnergy library class
 * 
 * Provides factory methods for game creation, utility functions for common operations,
 * and registration systems for deck types and rulesets with full type safety.
 */
export class BigDeckEnergy {
  private static instance: BigDeckEnergy | null = null;
  private readonly config: Required<BigDeckEnergyConfig>;
  private readonly deckTypeRegistry = new Map<string, DeckTypeRegistryEntry>();
  private readonly rulesetRegistry = new Map<string, RulesetRegistryEntry>();
  private readonly activeGames = new Map<string, GameInstance>();
  private readonly mutex = new Map<string, Promise<any>>(); // For thread safety

  /**
   * Private constructor - use BigDeckEnergy.getInstance() or BigDeckEnergy.create()
   */
  private constructor(config: BigDeckEnergyConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      logger: config.logger ?? this.defaultLogger,
      threadSafe: config.threadSafe ?? true
    };

    // Register built-in deck types
    this.registerBuiltInDeckTypes();
    
    // Register built-in rulesets
    this.registerBuiltInRulesets();

    this.log('info', 'BigDeckEnergy library initialized', {
      deckTypes: this.deckTypeRegistry.size,
      rulesets: this.rulesetRegistry.size
    });
  }

  /**
   * Get singleton instance of BigDeckEnergy
   * 
   * Returns the global singleton instance of BigDeckEnergy. If this is the first call,
   * the instance will be created with the provided configuration. Subsequent calls
   * will ignore the config parameter and return the existing instance.
   * 
   * @param config Optional configuration (only used on first call)
   * @returns BigDeckEnergy instance
   * 
   * @example
   * ```typescript
   * // First call - creates instance with config
   * const bde = BigDeckEnergy.getInstance({ debug: true });
   * 
   * // Subsequent calls - returns existing instance
   * const sameBde = BigDeckEnergy.getInstance();
   * ```
   * 
   * @since 1.0.0
   */
  public static getInstance(config?: BigDeckEnergyConfig): BigDeckEnergy {
    if (!BigDeckEnergy.instance) {
      BigDeckEnergy.instance = new BigDeckEnergy(config);
    }
    return BigDeckEnergy.instance;
  }

  /**
   * Create a new BigDeckEnergy instance (non-singleton)
   * @param config Configuration options
   * @returns New BigDeckEnergy instance
   */
  public static create(config: BigDeckEnergyConfig = {}): BigDeckEnergy {
    return new BigDeckEnergy(config);
  }

  /**
   * Create a new game instance with compatibility validation
   * 
   * Creates a new game instance by combining a ruleset with a deck type.
   * Performs compatibility validation to ensure the ruleset supports the
   * specified deck type. The game is added to the active games registry
   * if creation is successful.
   * 
   * @param config Game instance configuration containing gameId, ruleset, deckType, and optional metadata
   * @returns Promise resolving to game creation result with success status, game instance (if successful), and messages
   * 
   * @example
   * ```typescript
   * const ruleset = bde.getRuleset('war');
   * const deckType = bde.getDeckType('standard');
   * 
   * const result = await bde.createGame({
   *   gameId: 'my-war-game',
   *   ruleset: ruleset!,
   *   deckType: deckType!,
   *   metadata: { difficulty: 'easy' }
   * });
   * 
   * if (result.success) {
   *   console.log('Game created:', result.gameInstance!.getGameId());
   * } else {
   *   console.error('Failed to create game:', result.error?.message);
   * }
   * ```
   * 
   * @throws {Error} If thread safety is enabled and there's a concurrent operation with the same game ID
   * @since 1.0.0
   */
  public async createGame(config: GameInstanceConfig): Promise<GameCreationResult> {
    return this.withThreadSafety(`create_game_${config.gameId}`, async () => {
      this.log('info', 'Creating new game', { gameId: config.gameId });

      // Validate that the game ID is unique
      if (this.activeGames.has(config.gameId)) {
        return {
          success: false,
          error: new Error(`Game with ID '${config.gameId}' already exists`),
          messages: [`Game ID '${config.gameId}' is already in use`]
        };
      }

      // Create the game instance
      const result = GameInstance.create(config);

      // If successful, add to active games registry
      if (result.success && result.gameInstance) {
        this.activeGames.set(config.gameId, result.gameInstance);
        this.log('info', 'Game created successfully', { 
          gameId: config.gameId,
          ruleset: config.ruleset.name,
          deckType: config.deckType.name
        });
      } else {
        this.log('error', 'Game creation failed', { 
          gameId: config.gameId,
          error: result.error?.message
        });
      }

      return result;
    });
  }

  /**
   * Get an existing game instance
   * @param gameId ID of the game to retrieve
   * @returns Game instance or null if not found
   */
  public getGame(gameId: string): GameInstance | null {
    return this.activeGames.get(gameId) || null;
  }

  /**
   * Remove a game from the active games registry
   * @param gameId ID of the game to remove
   * @returns Whether the game was removed
   */
  public removeGame(gameId: string): boolean {
    const removed = this.activeGames.delete(gameId);
    if (removed) {
      this.log('info', 'Game removed from registry', { gameId });
    }
    return removed;
  }

  /**
   * Get all active game IDs
   * @returns Array of active game IDs
   */
  public getActiveGameIds(): string[] {
    return Array.from(this.activeGames.keys());
  }

  /**
   * Get count of active games
   * @returns Number of active games
   */
  public getActiveGameCount(): number {
    return this.activeGames.size;
  }

  /**
   * Register a custom deck type
   * 
   * Registers a custom deck type implementation that can be used to create games.
   * The deck type must implement the DeckType interface and have a unique name.
   * Once registered, the deck type can be retrieved using getDeckType() and used
   * in game creation.
   * 
   * @param name Unique name for the deck type (must match deckType.name)
   * @param deckType Deck type implementation that implements the DeckType interface
   * @param metadata Optional metadata about the deck type (description, version, author)
   * 
   * @throws {Error} If a deck type with the same name is already registered
   * @throws {Error} If the deck type name doesn't match the provided name parameter
   * 
   * @example
   * ```typescript
   * import { BaseDeckType } from 'big-deck-energy';
   * 
   * class MyCustomDeck extends BaseDeckType {
   *   constructor() {
   *     super('my-custom', new Map(), new Map(), []);
   *   }
   * }
   * 
   * const customDeck = new MyCustomDeck();
   * bde.registerDeckType('my-custom', customDeck, {
   *   description: 'My custom deck for special games',
   *   version: '1.0.0',
   *   author: 'John Doe'
   * });
   * ```
   * 
   * @since 1.0.0
   */
  public registerDeckType(
    name: string, 
    deckType: DeckType, 
    metadata: Partial<DeckTypeRegistryEntry['metadata']> = {}
  ): void {
    if (this.deckTypeRegistry.has(name)) {
      throw new Error(`Deck type '${name}' is already registered`);
    }

    if (deckType.name !== name) {
      throw new Error(`Deck type name mismatch: expected '${name}', got '${deckType.name}'`);
    }

    this.deckTypeRegistry.set(name, {
      name,
      deckType,
      metadata: {
        ...(metadata.description && { description: metadata.description }),
        ...(metadata.version && { version: metadata.version }),
        ...(metadata.author && { author: metadata.author })
      }
    });

    this.log('info', 'Deck type registered', { name, metadata });
  }

  /**
   * Register a custom ruleset
   * 
   * Registers a custom ruleset implementation that defines game rules and logic.
   * The ruleset must implement the Ruleset interface and have a unique name.
   * Once registered, the ruleset can be retrieved using getRuleset() and used
   * in game creation.
   * 
   * @param name Unique name for the ruleset (must match ruleset.name)
   * @param ruleset Ruleset implementation that implements the Ruleset interface
   * @param metadata Optional metadata about the ruleset (description, version, author)
   * 
   * @throws {Error} If a ruleset with the same name is already registered
   * @throws {Error} If the ruleset name doesn't match the provided name parameter
   * 
   * @example
   * ```typescript
   * import { BaseRuleset } from 'big-deck-energy';
   * 
   * class MyCustomRules extends BaseRuleset {
   *   constructor() {
   *     super('my-rules', 2, 4, ['standard']);
   *   }
   * 
   *   setup(gameState, deckType) {
   *     // Custom setup logic
   *     return gameState;
   *   }
   * 
   *   gameloop(gameState) {
   *     // Custom game loop logic
   *     return { canContinue: true, updatedGameState: gameState, requiresParticipantInteraction: false };
   *   }
   * }
   * 
   * const customRules = new MyCustomRules();
   * bde.registerRuleset('my-rules', customRules, {
   *   description: 'My custom card game rules',
   *   version: '1.0.0',
   *   author: 'Jane Smith'
   * });
   * ```
   * 
   * @since 1.0.0
   */
  public registerRuleset(
    name: string, 
    ruleset: Ruleset, 
    metadata: Partial<RulesetRegistryEntry['metadata']> = {}
  ): void {
    if (this.rulesetRegistry.has(name)) {
      throw new Error(`Ruleset '${name}' is already registered`);
    }

    if (ruleset.name !== name) {
      throw new Error(`Ruleset name mismatch: expected '${name}', got '${ruleset.name}'`);
    }

    this.rulesetRegistry.set(name, {
      name,
      ruleset,
      metadata: {
        ...(metadata.description && { description: metadata.description }),
        ...(metadata.version && { version: metadata.version }),
        ...(metadata.author && { author: metadata.author }),
        minPlayers: ruleset.minPlayers,
        maxPlayers: ruleset.maxPlayers,
        compatibleDeckTypes: [...ruleset.compatibleDeckTypes]
      }
    });

    this.log('info', 'Ruleset registered', { name, metadata });
  }

  /**
   * Get a registered deck type by name
   * @param name Name of the deck type
   * @returns Deck type or null if not found
   */
  public getDeckType(name: string): DeckType | null {
    return this.deckTypeRegistry.get(name)?.deckType || null;
  }

  /**
   * Get a registered ruleset by name
   * @param name Name of the ruleset
   * @returns Ruleset or null if not found
   */
  public getRuleset(name: string): Ruleset | null {
    return this.rulesetRegistry.get(name)?.ruleset || null;
  }

  /**
   * Get all registered deck type names
   * @returns Array of deck type names
   */
  public getAvailableDeckTypes(): string[] {
    return Array.from(this.deckTypeRegistry.keys());
  }

  /**
   * Get all registered ruleset names
   * @returns Array of ruleset names
   */
  public getAvailableRulesets(): string[] {
    return Array.from(this.rulesetRegistry.keys());
  }

  /**
   * Get detailed information about a deck type
   * @param name Name of the deck type
   * @returns Deck type registry entry or null if not found
   */
  public getDeckTypeInfo(name: string): DeckTypeRegistryEntry | null {
    return this.deckTypeRegistry.get(name) || null;
  }

  /**
   * Get detailed information about a ruleset
   * @param name Name of the ruleset
   * @returns Ruleset registry entry or null if not found
   */
  public getRulesetInfo(name: string): RulesetRegistryEntry | null {
    return this.rulesetRegistry.get(name) || null;
  }

  /**
   * Validate compatibility between a ruleset and deck type
   * @param rulesetName Name of the ruleset
   * @param deckTypeName Name of the deck type
   * @returns Compatibility result
   */
  public validateCompatibility(rulesetName: string, deckTypeName: string): CompatibilityResult {
    const ruleset = this.getRuleset(rulesetName);
    const deckType = this.getDeckType(deckTypeName);

    if (!ruleset) {
      return {
        isCompatible: false,
        error: new Error(`Ruleset '${rulesetName}' not found`) as any,
        messages: [`Ruleset '${rulesetName}' is not registered`]
      };
    }

    if (!deckType) {
      return {
        isCompatible: false,
        error: new Error(`Deck type '${deckTypeName}' not found`) as any,
        messages: [`Deck type '${deckTypeName}' is not registered`]
      };
    }

    return CompatibilityValidator.validateRulesetDeckCompatibility(ruleset, deckType);
  }

  /**
   * Find compatible deck types for a given ruleset
   * @param rulesetName Name of the ruleset
   * @returns Array of compatible deck type names
   */
  public findCompatibleDeckTypes(rulesetName: string): string[] {
    const ruleset = this.getRuleset(rulesetName);
    if (!ruleset) {
      return [];
    }

    const availableDeckTypes = Array.from(this.deckTypeRegistry.values()).map(entry => entry.deckType);
    const compatibleDeckTypes = CompatibilityValidator.findCompatibleDeckTypes(ruleset, availableDeckTypes);
    
    return compatibleDeckTypes.map(deckType => deckType.name);
  }

  /**
   * Find compatible rulesets for a given deck type
   * @param deckTypeName Name of the deck type
   * @returns Array of compatible ruleset names
   */
  public findCompatibleRulesets(deckTypeName: string): string[] {
    const deckType = this.getDeckType(deckTypeName);
    if (!deckType) {
      return [];
    }

    const availableRulesets = Array.from(this.rulesetRegistry.values()).map(entry => entry.ruleset);
    const compatibleRulesets = CompatibilityValidator.findCompatibleRulesets(deckType, availableRulesets);
    
    return compatibleRulesets.map(ruleset => ruleset.name);
  }

  /**
   * Serialize a game state to JSON
   * @param gameState Game state to serialize
   * @returns Serialized game state
   */
  public serializeGameState(gameState: GameState): string {
    return SerializationEngine.serialize(gameState);
  }

  /**
   * Deserialize a game state from JSON
   * @param serializedData Serialized game state JSON
   * @returns Deserialized game state
   */
  public deserializeGameState(serializedData: string): GameState {
    return SerializationEngine.deserialize(serializedData);
  }

  /**
   * Create a quick game with built-in components
   * @param gameId Unique game identifier
   * @param rulesetName Name of built-in ruleset ('war' or 'go-fish')
   * @param deckTypeName Name of built-in deck type ('standard' or 'custom')
   * @param metadata Optional game metadata
   * @returns Promise resolving to game creation result
   */
  public async createQuickGame(
    gameId: string,
    rulesetName: 'war' | 'go-fish',
    deckTypeName: 'standard' | 'custom' = 'standard',
    metadata?: Record<string, any>
  ): Promise<GameCreationResult> {
    const ruleset = this.getRuleset(rulesetName);
    const deckType = this.getDeckType(deckTypeName);

    if (!ruleset) {
      return {
        success: false,
        error: new Error(`Built-in ruleset '${rulesetName}' not available`),
        messages: [`Ruleset '${rulesetName}' not found in built-in rulesets`]
      };
    }

    if (!deckType) {
      return {
        success: false,
        error: new Error(`Built-in deck type '${deckTypeName}' not available`),
        messages: [`Deck type '${deckTypeName}' not found in built-in deck types`]
      };
    }

    return this.createGame({
      gameId,
      ruleset,
      deckType,
      ...(metadata && { metadata })
    });
  }

  /**
   * Get library version and build information
   * @returns Library information
   */
  public getLibraryInfo(): {
    name: string;
    version: string;
    builtInDeckTypes: string[];
    builtInRulesets: string[];
    totalDeckTypes: number;
    totalRulesets: number;
    activeGames: number;
  } {
    return {
      name: 'BigDeckEnergy',
      version: '1.0.0', // This should match package.json
      builtInDeckTypes: ['standard', 'custom', 'monopoly-property'],
      builtInRulesets: ['war', 'go-fish'],
      totalDeckTypes: this.deckTypeRegistry.size,
      totalRulesets: this.rulesetRegistry.size,
      activeGames: this.activeGames.size
    };
  }

  /**
   * Clear all registries and active games (useful for testing)
   */
  public reset(): void {
    this.deckTypeRegistry.clear();
    this.rulesetRegistry.clear();
    this.activeGames.clear();
    this.mutex.clear();

    // Re-register built-in components
    this.registerBuiltInDeckTypes();
    this.registerBuiltInRulesets();

    this.log('info', 'BigDeckEnergy library reset');
  }

  /**
   * Register built-in deck types
   */
  private registerBuiltInDeckTypes(): void {
    try {
      // Standard 52-card deck
      const standardDeck = new StandardPlayingDeck();
      this.deckTypeRegistry.set('standard', {
        name: 'standard',
        deckType: standardDeck,
        metadata: {
          description: 'Standard 52-card playing deck with suits and ranks',
          version: '1.0.0',
          author: 'BigDeckEnergy'
        }
      });

      // Also register with the actual deck type name for compatibility
      this.deckTypeRegistry.set(standardDeck.name, {
        name: standardDeck.name,
        deckType: standardDeck,
        metadata: {
          description: 'Standard 52-card playing deck with suits and ranks',
          version: '1.0.0',
          author: 'BigDeckEnergy'
        }
      });

      // Custom deck template
      const customDeck = new CustomDeckType({
        name: 'custom',
        faces: new Map([['default-face', '/images/default-face.png']]),
        tails: new Map([['default-tail', '/images/default-tail.png']]),
        cards: [
          { id: 'template-card', faceId: 'default-face', tailId: 'default-tail', properties: { template: true } }
        ]
      });
      this.deckTypeRegistry.set('custom', {
        name: 'custom',
        deckType: customDeck,
        metadata: {
          description: 'Customizable deck type for developer-defined cards',
          version: '1.0.0',
          author: 'BigDeckEnergy'
        }
      });

      // Monopoly property deck
      const monopolyDeck = new MonopolyPropertyDeck();
      this.deckTypeRegistry.set('monopoly-property', {
        name: 'monopoly-property',
        deckType: monopolyDeck,
        metadata: {
          description: 'Monopoly-style property cards with special abilities',
          version: '1.0.0',
          author: 'BigDeckEnergy'
        }
      });

      this.log('debug', 'Built-in deck types registered', { 
        count: this.deckTypeRegistry.size 
      });
    } catch (error) {
      this.log('error', 'Failed to register built-in deck types', { error });
    }
  }

  /**
   * Register built-in rulesets
   */
  private registerBuiltInRulesets(): void {
    try {
      // War card game
      const warRuleset = new WarRuleset();
      this.rulesetRegistry.set('war', {
        name: 'war',
        ruleset: warRuleset,
        metadata: {
          description: 'Simple War card game for 2 players',
          version: '1.0.0',
          author: 'BigDeckEnergy',
          minPlayers: warRuleset.minPlayers,
          maxPlayers: warRuleset.maxPlayers,
          compatibleDeckTypes: [...warRuleset.compatibleDeckTypes]
        }
      });

      // Go Fish card game
      const goFishRuleset = new GoFishRuleset();
      this.rulesetRegistry.set('go-fish', {
        name: 'go-fish',
        ruleset: goFishRuleset,
        metadata: {
          description: 'Classic Go Fish card game for 2-6 players',
          version: '1.0.0',
          author: 'BigDeckEnergy',
          minPlayers: goFishRuleset.minPlayers,
          maxPlayers: goFishRuleset.maxPlayers,
          compatibleDeckTypes: [...goFishRuleset.compatibleDeckTypes]
        }
      });

      this.log('debug', 'Built-in rulesets registered', { 
        count: this.rulesetRegistry.size 
      });
    } catch (error) {
      this.log('error', 'Failed to register built-in rulesets', { error });
    }
  }

  /**
   * Execute a function with thread safety if enabled
   * @param key Unique key for the operation
   * @param fn Function to execute
   * @returns Promise resolving to function result
   */
  private async withThreadSafety<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.config.threadSafe) {
      return fn();
    }

    // Wait for any existing operation with the same key
    const existingOperation = this.mutex.get(key);
    if (existingOperation) {
      await existingOperation;
    }

    // Execute the function and store the promise
    const operation = fn();
    this.mutex.set(key, operation);

    try {
      const result = await operation;
      return result;
    } finally {
      // Clean up the mutex entry
      this.mutex.delete(key);
    }
  }

  /**
   * Default logger implementation
   * @param level Log level
   * @param message Log message
   * @param data Optional additional data
   */
  private defaultLogger = (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void => {
    if (level === 'debug' && !this.config.debug) {
      return; // Skip debug logs unless debug mode is enabled
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] BigDeckEnergy: ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Internal logging method
   * @param level Log level
   * @param message Log message
   * @param data Optional additional data
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.config.logger(level, message, data);
  }
}

/**
 * Default export for convenience
 */
export default BigDeckEnergy;

/**
 * Utility functions for common operations
 */
export namespace BigDeckEnergyUtils {
  /**
   * Create a game with automatic compatibility validation
   * @param gameId Unique game identifier
   * @param rulesetName Name of the ruleset
   * @param deckTypeName Name of the deck type
   * @param library Optional BigDeckEnergy instance (uses singleton if not provided)
   * @returns Promise resolving to game creation result
   */
  export async function createCompatibleGame(
    gameId: string,
    rulesetName: string,
    deckTypeName: string,
    library?: BigDeckEnergy
  ): Promise<GameCreationResult> {
    const bde = library || BigDeckEnergy.getInstance();
    
    // Validate compatibility first
    const compatibility = bde.validateCompatibility(rulesetName, deckTypeName);
    if (!compatibility.isCompatible) {
      return {
        success: false,
        error: compatibility.error!,
        messages: compatibility.messages
      };
    }

    // Get the components
    const ruleset = bde.getRuleset(rulesetName);
    const deckType = bde.getDeckType(deckTypeName);

    if (!ruleset || !deckType) {
      return {
        success: false,
        error: new Error('Ruleset or deck type not found'),
        messages: ['Failed to retrieve ruleset or deck type from registry']
      };
    }

    // Create the game
    return bde.createGame({
      gameId,
      ruleset,
      deckType
    });
  }

  /**
   * Get all valid ruleset-deck combinations
   * @param library Optional BigDeckEnergy instance (uses singleton if not provided)
   * @returns Array of valid combinations
   */
  export function getValidCombinations(library?: BigDeckEnergy): Array<{
    ruleset: string;
    deckType: string;
    compatible: boolean;
  }> {
    const bde = library || BigDeckEnergy.getInstance();
    const rulesets = bde.getAvailableRulesets();
    const deckTypes = bde.getAvailableDeckTypes();
    const combinations: Array<{ ruleset: string; deckType: string; compatible: boolean }> = [];

    for (const rulesetName of rulesets) {
      for (const deckTypeName of deckTypes) {
        const compatibility = bde.validateCompatibility(rulesetName, deckTypeName);
        combinations.push({
          ruleset: rulesetName,
          deckType: deckTypeName,
          compatible: compatibility.isCompatible
        });
      }
    }

    return combinations;
  }

  /**
   * Generate a unique game ID
   * @param prefix Optional prefix for the ID
   * @returns Unique game ID
   */
  export function generateGameId(prefix: string = 'game'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate game configuration before creation
   * @param config Game instance configuration
   * @returns Validation result
   */
  export function validateGameConfig(config: GameInstanceConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate game ID
    if (!config.gameId || config.gameId.trim().length === 0) {
      errors.push('Game ID is required and cannot be empty');
    }

    // Validate ruleset
    if (!config.ruleset) {
      errors.push('Ruleset is required');
    } else {
      if (!config.ruleset.name || config.ruleset.name.trim().length === 0) {
        errors.push('Ruleset must have a valid name');
      }
      if (config.ruleset.minPlayers < 1) {
        errors.push('Ruleset minimum players must be at least 1');
      }
      if (config.ruleset.maxPlayers < config.ruleset.minPlayers) {
        errors.push('Ruleset maximum players must be greater than or equal to minimum players');
      }
    }

    // Validate deck type
    if (!config.deckType) {
      errors.push('Deck type is required');
    } else {
      if (!config.deckType.name || config.deckType.name.trim().length === 0) {
        errors.push('Deck type must have a valid name');
      }
    }

    // Validate compatibility if both ruleset and deck type are present
    if (config.ruleset && config.deckType) {
      const compatibility = CompatibilityValidator.validateRulesetDeckCompatibility(
        config.ruleset,
        config.deckType
      );
      if (!compatibility.isCompatible) {
        errors.push(`Ruleset '${config.ruleset.name}' is not compatible with deck type '${config.deckType.name}'`);
      }
    }

    // Check for potential issues
    if (config.metadata && Object.keys(config.metadata).length > 100) {
      warnings.push('Large metadata object may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}