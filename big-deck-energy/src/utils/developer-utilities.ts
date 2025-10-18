/**
 * Developer utilities for BigDeckEnergy library
 * 
 * Provides validation utilities, debugging helpers, and development tools
 * for creating custom deck types and rulesets with full type safety.
 */

import { DeckType } from '../core/interfaces/deck-type';
import { CardDefinition } from '../core/interfaces/card';
import { Ruleset, ValidationError } from '../core/interfaces/ruleset';
import { GameState } from '../core/interfaces/game-state';
import { Card } from '../core/interfaces/card';
import { GamePhase } from '../core/types/game-phase';

/**
 * Validation result for custom implementations
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  
  /** Array of validation errors */
  errors: ValidationError[];
  
  /** Array of validation warnings */
  warnings: ValidationError[];
  
  /** Summary of validation results */
  summary: string;
}

/**
 * Deck type validation configuration
 */
export interface DeckTypeValidationConfig {
  /** Check for duplicate card IDs */
  checkDuplicateIds?: boolean;
  
  /** Check for missing face/tail images */
  checkMissingImages?: boolean;
  
  /** Check for valid property types */
  checkPropertyTypes?: boolean;
  
  /** Minimum number of cards required */
  minCards?: number;
  
  /** Maximum number of cards allowed */
  maxCards?: number;
}

/**
 * Ruleset validation configuration
 */
export interface RulesetValidationConfig {
  /** Check player count constraints */
  checkPlayerConstraints?: boolean;
  
  /** Check compatible deck types exist */
  checkCompatibleDeckTypes?: boolean;
  
  /** Check method implementations */
  checkMethodImplementations?: boolean;
  
  /** Test with sample game states */
  testWithSampleStates?: boolean;
}

/**
 * Developer utilities for validating and debugging custom implementations
 */
export class DeveloperUtilities {
  /**
   * Validate a custom deck type implementation
   * @param deckType Deck type to validate
   * @param config Validation configuration
   * @returns Validation result
   */
  public static validateDeckType(
    deckType: DeckType,
    config: DeckTypeValidationConfig = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Set default configuration
    const validationConfig = {
      checkDuplicateIds: true,
      checkMissingImages: true,
      checkPropertyTypes: true,
      minCards: 1,
      maxCards: 1000,
      ...config
    };

    // Validate basic properties
    if (!deckType.name || deckType.name.trim().length === 0) {
      errors.push({
        code: 'DECK_INVALID_NAME',
        message: 'Deck type must have a valid name',
        severity: 'error'
      });
    }

    // Validate cards array
    if (!deckType.cards || !Array.isArray(deckType.cards)) {
      errors.push({
        code: 'DECK_INVALID_CARDS',
        message: 'Deck type must have a valid cards array',
        severity: 'error'
      });
    } else {
      // Check card count constraints
      if (deckType.cards.length < validationConfig.minCards) {
        errors.push({
          code: 'DECK_TOO_FEW_CARDS',
          message: `Deck must have at least ${validationConfig.minCards} cards, found ${deckType.cards.length}`,
          severity: 'error'
        });
      }

      if (deckType.cards.length > validationConfig.maxCards) {
        warnings.push({
          code: 'DECK_TOO_MANY_CARDS',
          message: `Deck has ${deckType.cards.length} cards, which may impact performance (max recommended: ${validationConfig.maxCards})`,
          severity: 'warning'
        });
      }

      // Check for duplicate card IDs
      if (validationConfig.checkDuplicateIds) {
        const cardIds = new Set<string>();
        const duplicates = new Set<string>();

        for (const card of deckType.cards) {
          if (cardIds.has(card.id)) {
            duplicates.add(card.id);
          }
          cardIds.add(card.id);
        }

        if (duplicates.size > 0) {
          errors.push({
            code: 'DECK_DUPLICATE_CARD_IDS',
            message: `Duplicate card IDs found: ${Array.from(duplicates).join(', ')}`,
            severity: 'error'
          });
        }
      }

      // Check for missing face/tail images
      if (validationConfig.checkMissingImages) {
        const missingFaces = new Set<string>();
        const missingTails = new Set<string>();

        for (const card of deckType.cards) {
          if (!deckType.faces.has(card.faceId)) {
            missingFaces.add(card.faceId);
          }
          if (!deckType.tails.has(card.tailId)) {
            missingTails.add(card.tailId);
          }
        }

        if (missingFaces.size > 0) {
          errors.push({
            code: 'DECK_MISSING_FACE_IMAGES',
            message: `Missing face images for IDs: ${Array.from(missingFaces).join(', ')}`,
            severity: 'error'
          });
        }

        if (missingTails.size > 0) {
          errors.push({
            code: 'DECK_MISSING_TAIL_IMAGES',
            message: `Missing tail images for IDs: ${Array.from(missingTails).join(', ')}`,
            severity: 'error'
          });
        }
      }

      // Check property types
      if (validationConfig.checkPropertyTypes) {
        for (const card of deckType.cards) {
          if (card.properties && typeof card.properties !== 'object') {
            errors.push({
              code: 'DECK_INVALID_CARD_PROPERTIES',
              message: `Card '${card.id}' has invalid properties (must be an object)`,
              severity: 'error'
            });
          }
        }
      }
    }

    // Validate faces map
    if (!deckType.faces || !(deckType.faces instanceof Map)) {
      errors.push({
        code: 'DECK_INVALID_FACES',
        message: 'Deck type must have a valid faces Map',
        severity: 'error'
      });
    }

    // Validate tails map
    if (!deckType.tails || !(deckType.tails instanceof Map)) {
      errors.push({
        code: 'DECK_INVALID_TAILS',
        message: 'Deck type must have a valid tails Map',
        severity: 'error'
      });
    }

    // Test deck creation
    try {
      const createdDeck = deckType.createDeck();
      if (!Array.isArray(createdDeck)) {
        errors.push({
          code: 'DECK_INVALID_CREATE_DECK',
          message: 'createDeck() must return an array of cards',
          severity: 'error'
        });
      } else if (createdDeck.length !== deckType.cards.length) {
        warnings.push({
          code: 'DECK_CREATE_DECK_COUNT_MISMATCH',
          message: `createDeck() returned ${createdDeck.length} cards, but cards array has ${deckType.cards.length} definitions`,
          severity: 'warning'
        });
      }
    } catch (error) {
      errors.push({
        code: 'DECK_CREATE_DECK_ERROR',
        message: `createDeck() threw an error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error'
      });
    }

    // Generate summary
    const totalIssues = errors.length + warnings.length;
    let summary: string;
    
    if (errors.length > 0) {
      summary = `Deck type validation failed with ${errors.length} error(s) and ${warnings.length} warning(s)`;
    } else if (warnings.length > 0) {
      summary = `Deck type validation passed with ${warnings.length} warning(s)`;
    } else {
      summary = 'Deck type validation passed successfully';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Validate a custom ruleset implementation
   * @param ruleset Ruleset to validate
   * @param config Validation configuration
   * @returns Validation result
   */
  public static validateRuleset(
    ruleset: Ruleset,
    config: RulesetValidationConfig = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Set default configuration
    const validationConfig = {
      checkPlayerConstraints: true,
      checkCompatibleDeckTypes: true,
      checkMethodImplementations: true,
      testWithSampleStates: false,
      ...config
    };

    // Validate basic properties
    if (!ruleset.name || ruleset.name.trim().length === 0) {
      errors.push({
        code: 'RULESET_INVALID_NAME',
        message: 'Ruleset must have a valid name',
        severity: 'error'
      });
    }

    // Validate player constraints
    if (validationConfig.checkPlayerConstraints) {
      if (typeof ruleset.minPlayers !== 'number' || ruleset.minPlayers < 1) {
        errors.push({
          code: 'RULESET_INVALID_MIN_PLAYERS',
          message: 'Ruleset minPlayers must be a number >= 1',
          severity: 'error'
        });
      }

      if (typeof ruleset.maxPlayers !== 'number' || ruleset.maxPlayers < ruleset.minPlayers) {
        errors.push({
          code: 'RULESET_INVALID_MAX_PLAYERS',
          message: 'Ruleset maxPlayers must be a number >= minPlayers',
          severity: 'error'
        });
      }

      if (ruleset.maxPlayers > 10) {
        warnings.push({
          code: 'RULESET_HIGH_MAX_PLAYERS',
          message: `Ruleset supports up to ${ruleset.maxPlayers} players, which may impact performance`,
          severity: 'warning'
        });
      }
    }

    // Validate compatible deck types
    if (validationConfig.checkCompatibleDeckTypes) {
      if (!Array.isArray(ruleset.compatibleDeckTypes) || ruleset.compatibleDeckTypes.length === 0) {
        errors.push({
          code: 'RULESET_NO_COMPATIBLE_DECK_TYPES',
          message: 'Ruleset must specify at least one compatible deck type',
          severity: 'error'
        });
      } else {
        // Check for duplicate deck types
        const uniqueDeckTypes = new Set(ruleset.compatibleDeckTypes);
        if (uniqueDeckTypes.size !== ruleset.compatibleDeckTypes.length) {
          warnings.push({
            code: 'RULESET_DUPLICATE_DECK_TYPES',
            message: 'Ruleset has duplicate compatible deck types',
            severity: 'warning'
          });
        }
      }
    }

    // Validate method implementations
    if (validationConfig.checkMethodImplementations) {
      const requiredMethods = ['setup', 'gameloop', 'validate', 'wincondition'];
      
      for (const methodName of requiredMethods) {
        if (typeof (ruleset as any)[methodName] !== 'function') {
          errors.push({
            code: 'RULESET_MISSING_METHOD',
            message: `Ruleset must implement ${methodName} method`,
            severity: 'error'
          });
        }
      }
    }

    // Generate summary
    const totalIssues = errors.length + warnings.length;
    let summary: string;
    
    if (errors.length > 0) {
      summary = `Ruleset validation failed with ${errors.length} error(s) and ${warnings.length} warning(s)`;
    } else if (warnings.length > 0) {
      summary = `Ruleset validation passed with ${warnings.length} warning(s)`;
    } else {
      summary = 'Ruleset validation passed successfully';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Validate a card definition
   * @param cardDef Card definition to validate
   * @returns Validation result
   */
  public static validateCardDefinition(cardDef: CardDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate required properties
    if (!cardDef.id || cardDef.id.trim().length === 0) {
      errors.push({
        code: 'CARD_INVALID_ID',
        message: 'Card must have a valid ID',
        severity: 'error'
      });
    }

    if (!cardDef.faceId || cardDef.faceId.trim().length === 0) {
      errors.push({
        code: 'CARD_INVALID_FACE_ID',
        message: 'Card must have a valid face ID',
        severity: 'error'
      });
    }

    if (!cardDef.tailId || cardDef.tailId.trim().length === 0) {
      errors.push({
        code: 'CARD_INVALID_TAIL_ID',
        message: 'Card must have a valid tail ID',
        severity: 'error'
      });
    }

    // Validate properties
    if (cardDef.properties) {
      if (typeof cardDef.properties !== 'object' || Array.isArray(cardDef.properties)) {
        errors.push({
          code: 'CARD_INVALID_PROPERTIES',
          message: 'Card properties must be an object',
          severity: 'error'
        });
      } else {
        // Check for reserved property names
        const reservedNames = ['id', 'faceId', 'tailId', 'deckType'];
        for (const reservedName of reservedNames) {
          if (reservedName in cardDef.properties) {
            warnings.push({
              code: 'CARD_RESERVED_PROPERTY_NAME',
              message: `Card property '${reservedName}' conflicts with reserved card property`,
              severity: 'warning'
            });
          }
        }

        // Check for large property objects
        const propertyCount = Object.keys(cardDef.properties).length;
        if (propertyCount > 20) {
          warnings.push({
            code: 'CARD_TOO_MANY_PROPERTIES',
            message: `Card has ${propertyCount} properties, which may impact performance`,
            severity: 'warning'
          });
        }
      }
    }

    // Generate summary
    let summary: string;
    
    if (errors.length > 0) {
      summary = `Card definition validation failed with ${errors.length} error(s) and ${warnings.length} warning(s)`;
    } else if (warnings.length > 0) {
      summary = `Card definition validation passed with ${warnings.length} warning(s)`;
    } else {
      summary = 'Card definition validation passed successfully';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Generate a comprehensive validation report for multiple components
   * @param components Object containing components to validate
   * @returns Comprehensive validation report
   */
  public static generateValidationReport(components: {
    deckTypes?: DeckType[];
    rulesets?: Ruleset[];
    cardDefinitions?: CardDefinition[];
  }): {
    overall: ValidationResult;
    deckTypes: ValidationResult[];
    rulesets: ValidationResult[];
    cardDefinitions: ValidationResult[];
  } {
    const deckTypeResults: ValidationResult[] = [];
    const rulesetResults: ValidationResult[] = [];
    const cardDefinitionResults: ValidationResult[] = [];

    // Validate deck types
    if (components.deckTypes) {
      for (const deckType of components.deckTypes) {
        deckTypeResults.push(this.validateDeckType(deckType));
      }
    }

    // Validate rulesets
    if (components.rulesets) {
      for (const ruleset of components.rulesets) {
        rulesetResults.push(this.validateRuleset(ruleset));
      }
    }

    // Validate card definitions
    if (components.cardDefinitions) {
      for (const cardDef of components.cardDefinitions) {
        cardDefinitionResults.push(this.validateCardDefinition(cardDef));
      }
    }

    // Generate overall result
    const allResults = [...deckTypeResults, ...rulesetResults, ...cardDefinitionResults];
    const totalErrors = allResults.reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = allResults.reduce((sum, result) => sum + result.warnings.length, 0);
    const allValid = allResults.every(result => result.isValid);

    const overallSummary = allValid
      ? `All components validated successfully (${totalWarnings} warning(s))`
      : `Validation failed with ${totalErrors} error(s) and ${totalWarnings} warning(s)`;

    return {
      overall: {
        isValid: allValid,
        errors: allResults.flatMap(result => result.errors),
        warnings: allResults.flatMap(result => result.warnings),
        summary: overallSummary
      },
      deckTypes: deckTypeResults,
      rulesets: rulesetResults,
      cardDefinitions: cardDefinitionResults
    };
  }

  /**
   * Create a sample game state for testing rulesets
   * @param gameId Game ID for the sample state
   * @param phase Game phase to create
   * @param participantCount Number of participants to create
   * @returns Sample game state
   */
  public static createSampleGameState(
    gameId: string = 'sample-game',
    phase: GamePhase = GamePhase.SETUP,
    participantCount: number = 2
  ): GameState {
    // This is a simplified implementation - in a real scenario,
    // you would use the actual GameState model and API
    return {
      gameId,
      phase,
      gameboard: {
        piles: new Map(),
        placements: new Map(),
        status: {}
      },
      participants: new Map(
        Array.from({ length: participantCount }, (_, i) => [
          `player_${i + 1}`,
          {
            id: `player_${i + 1}`,
            name: `Player ${i + 1}`,
            isNPC: false,
            handIds: [`hand_${i + 1}`],
            status: {}
          }
        ])
      ),
      hands: new Map(
        Array.from({ length: participantCount }, (_, i) => [
          `hand_${i + 1}`,
          {
            id: `hand_${i + 1}`,
            name: `Hand ${i + 1}`,
            participantId: `player_${i + 1}`,
            piles: new Map(),
            placements: new Map(),
            status: {}
          }
        ])
      ),
      events: [],
      metadata: {
        createdAt: Date.now(),
        sampleData: true
      }
    };
  }

  /**
   * Test a ruleset with sample data
   * @param ruleset Ruleset to test
   * @param deckType Deck type to use for testing
   * @returns Test results
   */
  public static testRulesetWithSampleData(
    ruleset: Ruleset,
    deckType: DeckType
  ): {
    setupTest: { success: boolean; error?: string };
    gameloopTest: { success: boolean; error?: string };
    validateTest: { success: boolean; error?: string };
    winconditionTest: { success: boolean; error?: string };
  } {
    const results: {
      setupTest: { success: boolean; error?: string };
      gameloopTest: { success: boolean; error?: string };
      validateTest: { success: boolean; error?: string };
      winconditionTest: { success: boolean; error?: string };
    } = {
      setupTest: { success: false },
      gameloopTest: { success: false },
      validateTest: { success: false },
      winconditionTest: { success: false }
    };

    try {
      // Test setup method
      const sampleState = this.createSampleGameState();
      const setupResult = ruleset.setup(sampleState, deckType);
      results.setupTest.success = true;

      // Test gameloop method
      try {
        const gameloopResult = ruleset.gameloop(setupResult);
        results.gameloopTest.success = true;
      } catch (error) {
        results.gameloopTest = { success: false, error: error instanceof Error ? error.message : String(error) };
      }

      // Test validate method
      try {
        const validationResult = ruleset.validate(setupResult);
        results.validateTest.success = Array.isArray(validationResult);
      } catch (error) {
        results.validateTest = { success: false, error: error instanceof Error ? error.message : String(error) };
      }

      // Test wincondition method
      try {
        const winResult = ruleset.wincondition(setupResult);
        results.winconditionTest.success = typeof winResult.gameEnded === 'boolean';
      } catch (error) {
        results.winconditionTest = { success: false, error: error instanceof Error ? error.message : String(error) };
      }

    } catch (error) {
      results.setupTest = { success: false, error: error instanceof Error ? error.message : String(error) };
    }

    return results;
  }
}

/**
 * Debugging utilities for development and troubleshooting
 */
export class DebugUtilities {
  private static debugEnabled = false;
  private static logHistory: Array<{ timestamp: number; level: string; message: string; data?: any }> = [];

  /**
   * Enable or disable debug logging
   * @param enabled Whether debug logging should be enabled
   */
  public static setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  /**
   * Check if debug logging is enabled
   * @returns Whether debug logging is enabled
   */
  public static isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Log a debug message
   * @param message Debug message
   * @param data Optional additional data
   */
  public static debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /**
   * Log an info message
   * @param message Info message
   * @param data Optional additional data
   */
  public static info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * Log a warning message
   * @param message Warning message
   * @param data Optional additional data
   */
  public static warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * Log an error message
   * @param message Error message
   * @param data Optional additional data
   */
  public static error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  /**
   * Get the debug log history
   * @param maxEntries Maximum number of entries to return
   * @returns Array of log entries
   */
  public static getLogHistory(maxEntries: number = 100): Array<{ timestamp: number; level: string; message: string; data?: any }> {
    return this.logHistory.slice(-maxEntries);
  }

  /**
   * Clear the debug log history
   */
  public static clearLogHistory(): void {
    this.logHistory = [];
  }

  /**
   * Create a performance timer
   * @param name Name of the timer
   * @returns Timer object with stop method
   */
  public static startTimer(name: string): { stop: () => number } {
    const startTime = performance.now();
    this.debug(`Timer started: ${name}`);

    return {
      stop: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.debug(`Timer stopped: ${name} (${duration.toFixed(2)}ms)`);
        return duration;
      }
    };
  }

  /**
   * Inspect an object and log its structure
   * @param obj Object to inspect
   * @param name Optional name for the object
   * @param maxDepth Maximum depth to inspect
   */
  public static inspect(obj: any, name: string = 'Object', maxDepth: number = 3): void {
    const inspection = this.inspectObject(obj, maxDepth);
    this.debug(`Inspecting ${name}:`, inspection);
  }

  /**
   * Internal logging method
   * @param level Log level
   * @param message Log message
   * @param data Optional additional data
   */
  private static log(level: string, message: string, data?: any): void {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };

    // Add to history
    this.logHistory.push(entry);

    // Keep history size manageable
    if (this.logHistory.length > 1000) {
      this.logHistory = this.logHistory.slice(-500);
    }

    // Only output to console if debug is enabled or it's an error/warning
    if (this.debugEnabled || level === 'ERROR' || level === 'WARN') {
      const timestamp = new Date(entry.timestamp).toISOString();
      const logMessage = `[${timestamp}] [${level}] BigDeckEnergy: ${message}`;
      
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }

  /**
   * Recursively inspect an object structure
   * @param obj Object to inspect
   * @param maxDepth Maximum depth to inspect
   * @param currentDepth Current inspection depth
   * @returns Object inspection result
   */
  private static inspectObject(obj: any, maxDepth: number, currentDepth: number = 0): any {
    if (currentDepth >= maxDepth) {
      return '[Max depth reached]';
    }

    if (obj === null) return null;
    if (obj === undefined) return undefined;

    const type = typeof obj;
    
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return obj;
    }

    if (type === 'function') {
      return `[Function: ${obj.name || 'anonymous'}]`;
    }

    if (obj instanceof Date) {
      return `[Date: ${obj.toISOString()}]`;
    }

    if (obj instanceof Map) {
      const entries: any = {};
      for (const [key, value] of obj.entries()) {
        entries[String(key)] = this.inspectObject(value, maxDepth, currentDepth + 1);
      }
      return `[Map: ${JSON.stringify(entries)}]`;
    }

    if (obj instanceof Set) {
      const values = Array.from(obj).map(value => 
        this.inspectObject(value, maxDepth, currentDepth + 1)
      );
      return `[Set: ${JSON.stringify(values)}]`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.inspectObject(item, maxDepth, currentDepth + 1));
    }

    if (type === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.inspectObject(value, maxDepth, currentDepth + 1);
      }
      return result;
    }

    return `[${type}]`;
  }
}