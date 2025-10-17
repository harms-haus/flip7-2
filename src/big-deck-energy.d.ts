/**
 * BigDeckEnergy TypeScript Declaration File
 * 
 * This file provides enhanced TypeScript support and IntelliSense for the
 * BigDeckEnergy library, including detailed JSDoc comments and type definitions.
 */

declare module 'big-deck-energy' {
  // Re-export all types and interfaces for enhanced IntelliSense
  export * from './index';

  /**
   * Main BigDeckEnergy library class with enhanced type information
   * 
   * @example Creating a game with built-in components
   * ```typescript
   * import { BigDeckEnergy } from 'big-deck-energy';
   * 
   * const bde = BigDeckEnergy.getInstance();
   * const result = await bde.createQuickGame('my-game', 'war', 'standard');
   * ```
   * 
   * @example Registering custom components
   * ```typescript
   * import { BigDeckEnergy, BaseDeckType, BaseRuleset } from 'big-deck-energy';
   * 
   * class MyDeck extends BaseDeckType { /* implementation */ }
   * class MyRules extends BaseRuleset { /* implementation */ }
   * 
   * const bde = BigDeckEnergy.getInstance();
   * bde.registerDeckType('my-deck', new MyDeck());
   * bde.registerRuleset('my-rules', new MyRules());
   * ```
   */
  export class BigDeckEnergy {
    /**
     * Get the singleton instance of BigDeckEnergy
     * 
     * @param config Optional configuration for the library
     * @returns The BigDeckEnergy singleton instance
     */
    static getInstance(config?: BigDeckEnergyConfig): BigDeckEnergy;

    /**
     * Create a new BigDeckEnergy instance (non-singleton)
     * 
     * @param config Configuration for the new instance
     * @returns A new BigDeckEnergy instance
     */
    static create(config?: BigDeckEnergyConfig): BigDeckEnergy;

    /**
     * Create a new game instance with automatic compatibility validation
     * 
     * @param config Game configuration including gameId, ruleset, deckType, and metadata
     * @returns Promise resolving to game creation result
     */
    createGame(config: GameInstanceConfig): Promise<GameCreationResult>;

    /**
     * Create a quick game using built-in components
     * 
     * @param gameId Unique identifier for the game
     * @param rulesetName Name of built-in ruleset ('war' or 'go-fish')
     * @param deckTypeName Name of built-in deck type ('standard' or 'custom')
     * @param metadata Optional game metadata
     * @returns Promise resolving to game creation result
     */
    createQuickGame(
      gameId: string,
      rulesetName: 'war' | 'go-fish',
      deckTypeName?: 'standard' | 'custom',
      metadata?: Record<string, any>
    ): Promise<GameCreationResult>;

    /**
     * Register a custom deck type for use in games
     * 
     * @param name Unique name for the deck type
     * @param deckType Deck type implementation
     * @param metadata Optional metadata about the deck type
     */
    registerDeckType(
      name: string,
      deckType: DeckType,
      metadata?: Partial<{
        description: string;
        version: string;
        author: string;
      }>
    ): void;

    /**
     * Register a custom ruleset for use in games
     * 
     * @param name Unique name for the ruleset
     * @param ruleset Ruleset implementation
     * @param metadata Optional metadata about the ruleset
     */
    registerRuleset(
      name: string,
      ruleset: Ruleset,
      metadata?: Partial<{
        description: string;
        version: string;
        author: string;
      }>
    ): void;

    /**
     * Get a registered deck type by name
     * 
     * @param name Name of the deck type
     * @returns The deck type or null if not found
     */
    getDeckType(name: string): DeckType | null;

    /**
     * Get a registered ruleset by name
     * 
     * @param name Name of the ruleset
     * @returns The ruleset or null if not found
     */
    getRuleset(name: string): Ruleset | null;

    /**
     * Get all available deck type names
     * 
     * @returns Array of registered deck type names
     */
    getAvailableDeckTypes(): string[];

    /**
     * Get all available ruleset names
     * 
     * @returns Array of registered ruleset names
     */
    getAvailableRulesets(): string[];

    /**
     * Validate compatibility between a ruleset and deck type
     * 
     * @param rulesetName Name of the ruleset
     * @param deckTypeName Name of the deck type
     * @returns Compatibility validation result
     */
    validateCompatibility(rulesetName: string, deckTypeName: string): CompatibilityResult;

    /**
     * Find deck types compatible with a given ruleset
     * 
     * @param rulesetName Name of the ruleset
     * @returns Array of compatible deck type names
     */
    findCompatibleDeckTypes(rulesetName: string): string[];

    /**
     * Find rulesets compatible with a given deck type
     * 
     * @param deckTypeName Name of the deck type
     * @returns Array of compatible ruleset names
     */
    findCompatibleRulesets(deckTypeName: string): string[];

    /**
     * Get an active game instance by ID
     * 
     * @param gameId ID of the game to retrieve
     * @returns The game instance or null if not found
     */
    getGame(gameId: string): GameInstance | null;

    /**
     * Remove a game from the active games registry
     * 
     * @param gameId ID of the game to remove
     * @returns Whether the game was successfully removed
     */
    removeGame(gameId: string): boolean;

    /**
     * Get all active game IDs
     * 
     * @returns Array of active game IDs
     */
    getActiveGameIds(): string[];

    /**
     * Get the count of active games
     * 
     * @returns Number of active games
     */
    getActiveGameCount(): number;

    /**
     * Serialize a game state to JSON
     * 
     * @param gameState Game state to serialize
     * @returns JSON string representation of the game state
     */
    serializeGameState(gameState: GameState): string;

    /**
     * Deserialize a game state from JSON
     * 
     * @param serializedData JSON string of serialized game state
     * @returns Deserialized game state
     */
    deserializeGameState(serializedData: string): GameState;

    /**
     * Get library information and statistics
     * 
     * @returns Object containing library version, available components, and statistics
     */
    getLibraryInfo(): {
      name: string;
      version: string;
      builtInDeckTypes: string[];
      builtInRulesets: string[];
      totalDeckTypes: number;
      totalRulesets: number;
      activeGames: number;
    };

    /**
     * Reset the library to initial state (useful for testing)
     */
    reset(): void;
  }

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
   * Utility namespace for common BigDeckEnergy operations
   */
  export namespace BigDeckEnergyUtils {
    /**
     * Create a game with automatic compatibility validation
     * 
     * @param gameId Unique game identifier
     * @param rulesetName Name of the ruleset
     * @param deckTypeName Name of the deck type
     * @param library Optional BigDeckEnergy instance
     * @returns Promise resolving to game creation result
     */
    export function createCompatibleGame(
      gameId: string,
      rulesetName: string,
      deckTypeName: string,
      library?: BigDeckEnergy
    ): Promise<GameCreationResult>;

    /**
     * Get all valid ruleset-deck combinations
     * 
     * @param library Optional BigDeckEnergy instance
     * @returns Array of valid combinations with compatibility status
     */
    export function getValidCombinations(library?: BigDeckEnergy): Array<{
      ruleset: string;
      deckType: string;
      compatible: boolean;
    }>;

    /**
     * Generate a unique game ID
     * 
     * @param prefix Optional prefix for the ID
     * @returns Unique game ID string
     */
    export function generateGameId(prefix?: string): string;

    /**
     * Validate game configuration before creation
     * 
     * @param config Game instance configuration
     * @returns Validation result with errors and warnings
     */
    export function validateGameConfig(config: GameInstanceConfig): {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  }

  /**
   * Developer utilities for validation and debugging
   */
  export class DeveloperUtilities {
    /**
     * Validate a custom deck type implementation
     * 
     * @param deckType Deck type to validate
     * @param config Validation configuration options
     * @returns Detailed validation result
     */
    static validateDeckType(
      deckType: DeckType,
      config?: DeckTypeValidationConfig
    ): ValidationResult;

    /**
     * Validate a custom ruleset implementation
     * 
     * @param ruleset Ruleset to validate
     * @param config Validation configuration options
     * @returns Detailed validation result
     */
    static validateRuleset(
      ruleset: Ruleset,
      config?: RulesetValidationConfig
    ): ValidationResult;

    /**
     * Validate a card definition
     * 
     * @param cardDef Card definition to validate
     * @returns Validation result
     */
    static validateCardDefinition(cardDef: CardDefinition): ValidationResult;

    /**
     * Generate a comprehensive validation report
     * 
     * @param components Object containing components to validate
     * @returns Comprehensive validation report
     */
    static generateValidationReport(components: {
      deckTypes?: DeckType[];
      rulesets?: Ruleset[];
      cardDefinitions?: CardDefinition[];
    }): {
      overall: ValidationResult;
      deckTypes: ValidationResult[];
      rulesets: ValidationResult[];
      cardDefinitions: ValidationResult[];
    };

    /**
     * Create a sample game state for testing
     * 
     * @param gameId Game ID for the sample state
     * @param phase Game phase to create
     * @param participantCount Number of participants to create
     * @returns Sample game state
     */
    static createSampleGameState(
      gameId?: string,
      phase?: GamePhase,
      participantCount?: number
    ): GameState;

    /**
     * Test a ruleset with sample data
     * 
     * @param ruleset Ruleset to test
     * @param deckType Deck type to use for testing
     * @returns Test results for all ruleset methods
     */
    static testRulesetWithSampleData(
      ruleset: Ruleset,
      deckType: DeckType
    ): {
      setupTest: { success: boolean; error?: string };
      gameloopTest: { success: boolean; error?: string };
      validateTest: { success: boolean; error?: string };
      winconditionTest: { success: boolean; error?: string };
    };
  }

  /**
   * Debugging utilities for development and troubleshooting
   */
  export class DebugUtilities {
    /**
     * Enable or disable debug logging
     * 
     * @param enabled Whether debug logging should be enabled
     */
    static setDebugEnabled(enabled: boolean): void;

    /**
     * Check if debug logging is enabled
     * 
     * @returns Whether debug logging is enabled
     */
    static isDebugEnabled(): boolean;

    /**
     * Log a debug message
     * 
     * @param message Debug message
     * @param data Optional additional data
     */
    static debug(message: string, data?: any): void;

    /**
     * Log an info message
     * 
     * @param message Info message
     * @param data Optional additional data
     */
    static info(message: string, data?: any): void;

    /**
     * Log a warning message
     * 
     * @param message Warning message
     * @param data Optional additional data
     */
    static warn(message: string, data?: any): void;

    /**
     * Log an error message
     * 
     * @param message Error message
     * @param data Optional additional data
     */
    static error(message: string, data?: any): void;

    /**
     * Get the debug log history
     * 
     * @param maxEntries Maximum number of entries to return
     * @returns Array of log entries
     */
    static getLogHistory(maxEntries?: number): Array<{
      timestamp: number;
      level: string;
      message: string;
      data?: any;
    }>;

    /**
     * Clear the debug log history
     */
    static clearLogHistory(): void;

    /**
     * Create a performance timer
     * 
     * @param name Name of the timer
     * @returns Timer object with stop method
     */
    static startTimer(name: string): { stop: () => number };

    /**
     * Inspect an object and log its structure
     * 
     * @param obj Object to inspect
     * @param name Optional name for the object
     * @param maxDepth Maximum depth to inspect
     */
    static inspect(obj: any, name?: string, maxDepth?: number): void;
  }

  // Enhanced type definitions for better IntelliSense
  export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    summary: string;
  }

  export interface DeckTypeValidationConfig {
    checkDuplicateIds?: boolean;
    checkMissingImages?: boolean;
    checkPropertyTypes?: boolean;
    minCards?: number;
    maxCards?: number;
  }

  export interface RulesetValidationConfig {
    checkPlayerConstraints?: boolean;
    checkCompatibleDeckTypes?: boolean;
    checkMethodImplementations?: boolean;
    testWithSampleStates?: boolean;
  }
}

// Global type augmentations for enhanced IntelliSense
declare global {
  namespace BigDeckEnergy {
    /**
     * Built-in deck type names available in the library
     */
    type BuiltInDeckTypes = 'standard' | 'custom' | 'monopoly-property';

    /**
     * Built-in ruleset names available in the library
     */
    type BuiltInRulesets = 'war' | 'go-fish';

    /**
     * Common game phases used throughout the library
     */
    type CommonGamePhases = 'setup' | 'dealing' | 'playing' | 'scoring' | 'finished';

    /**
     * Standard card orientations supported by the library
     */
    type CardOrientations = 'normal' | 'rotated_90' | 'rotated_180' | 'rotated_270';
  }
}