import { Ruleset } from '../core/interfaces/ruleset';
import { DeckType } from '../core/interfaces/deck-type';
import { CompatibilityError } from '../core/errors/compatibility-error';
import { DeckMixingError } from '../core/errors/deck-mixing-error';

/**
 * Result of compatibility validation
 */
export interface CompatibilityResult {
  /** Whether the combination is compatible */
  readonly isCompatible: boolean;
  
  /** Error details if not compatible */
  readonly error?: CompatibilityError | DeckMixingError;
  
  /** Additional validation messages */
  readonly messages: string[];
}

/**
 * Configuration for game instance validation
 */
export interface GameValidationConfig {
  /** Ruleset to validate */
  ruleset: Ruleset;
  
  /** Deck type to validate */
  deckType: DeckType;
  
  /** Existing deck types already in use (for mixing prevention) */
  existingDeckTypes?: string[];
}

/**
 * Validates compatibility between rulesets and deck types
 */
export class CompatibilityValidator {
  /**
   * Validates that a ruleset is compatible with a deck type
   * @param ruleset Ruleset to validate
   * @param deckType Deck type to validate
   * @returns Compatibility result
   */
  public static validateRulesetDeckCompatibility(
    ruleset: Ruleset,
    deckType: DeckType
  ): CompatibilityResult {
    const messages: string[] = [];
    
    // Check if deck type is in the ruleset's compatible types list
    const isCompatible = ruleset.compatibleDeckTypes.includes(deckType.name);
    
    if (!isCompatible) {
      const error = new CompatibilityError(
        ruleset.name,
        deckType.name,
        ruleset.compatibleDeckTypes
      );
      
      messages.push(`Ruleset '${ruleset.name}' requires one of: ${ruleset.compatibleDeckTypes.join(', ')}`);
      messages.push(`Provided deck type: '${deckType.name}'`);
      
      return {
        isCompatible: false,
        error,
        messages
      };
    }
    
    messages.push(`Ruleset '${ruleset.name}' is compatible with deck type '${deckType.name}'`);
    
    return {
      isCompatible: true,
      messages
    };
  }

  /**
   * Validates that no deck type mixing occurs in a game instance
   * @param newDeckType New deck type being added
   * @param existingDeckTypes Array of existing deck type names
   * @returns Compatibility result
   */
  public static validateNoDeckMixing(
    newDeckType: DeckType,
    existingDeckTypes: string[]
  ): CompatibilityResult {
    const messages: string[] = [];
    
    // If no existing deck types, mixing is not possible
    if (existingDeckTypes.length === 0) {
      messages.push(`First deck type '${newDeckType.name}' added to game`);
      return {
        isCompatible: true,
        messages
      };
    }
    
    // Check if new deck type matches any existing deck type
    const hasMatchingType = existingDeckTypes.includes(newDeckType.name);
    
    if (!hasMatchingType) {
      // Find the first existing deck type for error reporting
      const existingType = existingDeckTypes[0];
      if (!existingType) {
        throw new Error('existingDeckTypes array cannot be empty when checking for mixing');
      }
      const error = new DeckMixingError(newDeckType.name, existingType);
      
      messages.push(`Game already uses deck type: '${existingType}'`);
      messages.push(`Cannot add different deck type: '${newDeckType.name}'`);
      messages.push('All cards in a game must use the same deck type');
      
      return {
        isCompatible: false,
        error,
        messages
      };
    }
    
    messages.push(`Deck type '${newDeckType.name}' matches existing deck types`);
    
    return {
      isCompatible: true,
      messages
    };
  }

  /**
   * Performs comprehensive compatibility validation for a game instance
   * @param config Game instance configuration to validate
   * @returns Compatibility result
   */
  public static validateGameInstance(config: GameValidationConfig): CompatibilityResult {
    const messages: string[] = [];
    
    // First validate ruleset-deck compatibility
    const rulesetCompatibility = this.validateRulesetDeckCompatibility(
      config.ruleset,
      config.deckType
    );
    
    messages.push(...rulesetCompatibility.messages);
    
    if (!rulesetCompatibility.isCompatible) {
      return rulesetCompatibility;
    }
    
    // Then validate no deck mixing if existing deck types are provided
    if (config.existingDeckTypes && config.existingDeckTypes.length > 0) {
      const mixingCompatibility = this.validateNoDeckMixing(
        config.deckType,
        config.existingDeckTypes
      );
      
      messages.push(...mixingCompatibility.messages);
      
      if (!mixingCompatibility.isCompatible) {
        return {
          isCompatible: false,
          error: mixingCompatibility.error!,
          messages
        };
      }
    }
    
    messages.push('Game instance configuration is fully compatible');
    
    return {
      isCompatible: true,
      messages
    };
  }

  /**
   * Gets detailed compatibility report for a ruleset
   * @param ruleset Ruleset to analyze
   * @returns Detailed compatibility information
   */
  public static getRulesetCompatibilityReport(ruleset: Ruleset): {
    name: string;
    compatibleDeckTypes: string[];
    playerRange: { min: number; max: number };
    summary: string;
  } {
    return {
      name: ruleset.name,
      compatibleDeckTypes: [...ruleset.compatibleDeckTypes],
      playerRange: {
        min: ruleset.minPlayers,
        max: ruleset.maxPlayers
      },
      summary: `Ruleset '${ruleset.name}' supports ${ruleset.minPlayers}-${ruleset.maxPlayers} players and is compatible with deck types: ${ruleset.compatibleDeckTypes.join(', ')}`
    };
  }

  /**
   * Validates multiple ruleset-deck combinations at once
   * @param combinations Array of ruleset-deck pairs to validate
   * @returns Array of compatibility results
   */
  public static validateMultipleCombinations(
    combinations: Array<{ ruleset: Ruleset; deckType: DeckType }>
  ): CompatibilityResult[] {
    return combinations.map(({ ruleset, deckType }) =>
      this.validateRulesetDeckCompatibility(ruleset, deckType)
    );
  }

  /**
   * Finds compatible deck types for a given ruleset from a list of available deck types
   * @param ruleset Ruleset to find compatible deck types for
   * @param availableDeckTypes Array of available deck types
   * @returns Array of compatible deck types
   */
  public static findCompatibleDeckTypes(
    ruleset: Ruleset,
    availableDeckTypes: DeckType[]
  ): DeckType[] {
    return availableDeckTypes.filter(deckType =>
      ruleset.compatibleDeckTypes.includes(deckType.name)
    );
  }

  /**
   * Finds compatible rulesets for a given deck type from a list of available rulesets
   * @param deckType Deck type to find compatible rulesets for
   * @param availableRulesets Array of available rulesets
   * @returns Array of compatible rulesets
   */
  public static findCompatibleRulesets(
    deckType: DeckType,
    availableRulesets: Ruleset[]
  ): Ruleset[] {
    return availableRulesets.filter(ruleset =>
      ruleset.compatibleDeckTypes.includes(deckType.name)
    );
  }
}