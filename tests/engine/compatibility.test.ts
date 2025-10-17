import { CompatibilityValidator, CompatibilityResult, GameInstanceConfig } from '../../src/engine/compatibility';
import { Ruleset, GameLoopResult, ValidationError, WinResult } from '../../src/core/interfaces/ruleset';
import { DeckType } from '../../src/core/interfaces/deck-type';
import { GameState } from '../../src/core/interfaces/game-state';
import { CardDefinition } from '../../src/core/interfaces/card';
import { CompatibilityError } from '../../src/core/errors/compatibility-error';
import { DeckMixingError } from '../../src/core/errors/deck-mixing-error';

// Test implementations for compatibility testing
class TestRuleset implements Ruleset {
  constructor(
    public readonly name: string,
    public readonly compatibleDeckTypes: string[],
    public readonly minPlayers: number = 2,
    public readonly maxPlayers: number = 4
  ) {}

  setup(gameState: GameState, deckType: DeckType): GameState {
    return gameState;
  }

  gameloop(gameState: GameState): GameLoopResult {
    return {
      canContinue: false,
      updatedGameState: gameState,
      requiresParticipantInteraction: false
    };
  }

  validate(gameState: GameState): ValidationError[] {
    return [];
  }

  wincondition(gameState: GameState): WinResult {
    return {
      gameEnded: false,
      winners: [],
      reason: ''
    };
  }
}

class TestDeckType implements DeckType {
  public readonly faces = new Map<string, string>();
  public readonly tails = new Map<string, string>();
  public readonly cards: CardDefinition[] = [];

  constructor(public readonly name: string) {}

  createDeck() {
    return [];
  }

  validateCard() {
    return true;
  }
}

describe('CompatibilityValidator', () => {
  let standardRuleset: Ruleset;
  let customRuleset: Ruleset;
  let multiCompatibleRuleset: Ruleset;
  let standardDeck: DeckType;
  let customDeck: DeckType;
  let anotherCustomDeck: DeckType;

  beforeEach(() => {
    standardRuleset = new TestRuleset('test-standard', ['standard-playing-deck']);
    customRuleset = new TestRuleset('test-custom', ['custom-deck']);
    multiCompatibleRuleset = new TestRuleset('test-multi', ['standard-playing-deck', 'custom-deck']);
    
    standardDeck = new TestDeckType('standard-playing-deck');
    customDeck = new TestDeckType('custom-deck');
    anotherCustomDeck = new TestDeckType('another-custom-deck');
  });

  describe('validateRulesetDeckCompatibility', () => {
    it('should return compatible result for matching deck type', () => {
      const result = CompatibilityValidator.validateRulesetDeckCompatibility(
        standardRuleset,
        standardDeck
      );

      expect(result.isCompatible).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.messages).toContain(
        "Ruleset 'test-standard' is compatible with deck type 'standard-playing-deck'"
      );
    });

    it('should return incompatible result for non-matching deck type', () => {
      const result = CompatibilityValidator.validateRulesetDeckCompatibility(
        standardRuleset,
        customDeck
      );

      expect(result.isCompatible).toBe(false);
      expect(result.error).toBeInstanceOf(CompatibilityError);
      expect(result.error?.message).toContain(
        "Ruleset 'test-standard' is not compatible with deck type 'custom-deck'"
      );
      expect(result.messages).toContain(
        "Ruleset 'test-standard' requires one of: standard-playing-deck"
      );
      expect(result.messages).toContain("Provided deck type: 'custom-deck'");
    });

    it('should work with rulesets that support multiple deck types', () => {
      const result1 = CompatibilityValidator.validateRulesetDeckCompatibility(
        multiCompatibleRuleset,
        standardDeck
      );
      const result2 = CompatibilityValidator.validateRulesetDeckCompatibility(
        multiCompatibleRuleset,
        customDeck
      );

      expect(result1.isCompatible).toBe(true);
      expect(result2.isCompatible).toBe(true);
    });

    it('should provide detailed error information for incompatible combinations', () => {
      const result = CompatibilityValidator.validateRulesetDeckCompatibility(
        customRuleset,
        anotherCustomDeck
      );

      expect(result.isCompatible).toBe(false);
      const error = result.error as CompatibilityError;
      expect(error.ruleset).toBe('test-custom');
      expect(error.deckType).toBe('another-custom-deck');
      expect(error.compatibleTypes).toEqual(['custom-deck']);
    });
  });

  describe('validateNoDeckMixing', () => {
    it('should allow first deck type in empty game', () => {
      const result = CompatibilityValidator.validateNoDeckMixing(standardDeck, []);

      expect(result.isCompatible).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.messages).toContain(
        "First deck type 'standard-playing-deck' added to game"
      );
    });

    it('should allow same deck type as existing', () => {
      const result = CompatibilityValidator.validateNoDeckMixing(
        standardDeck,
        ['standard-playing-deck']
      );

      expect(result.isCompatible).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.messages).toContain(
        "Deck type 'standard-playing-deck' matches existing deck types"
      );
    });

    it('should prevent mixing different deck types', () => {
      const result = CompatibilityValidator.validateNoDeckMixing(
        customDeck,
        ['standard-playing-deck']
      );

      expect(result.isCompatible).toBe(false);
      expect(result.error).toBeInstanceOf(DeckMixingError);
      expect(result.error?.message).toContain(
        "Cannot mix deck types. Game already uses 'standard-playing-deck', cannot add 'custom-deck'"
      );
      expect(result.messages).toContain("Game already uses deck type: 'standard-playing-deck'");
      expect(result.messages).toContain("Cannot add different deck type: 'custom-deck'");
      expect(result.messages).toContain('All cards in a game must use the same deck type');
    });

    it('should provide detailed error information for deck mixing', () => {
      const result = CompatibilityValidator.validateNoDeckMixing(
        anotherCustomDeck,
        ['custom-deck']
      );

      expect(result.isCompatible).toBe(false);
      const error = result.error as DeckMixingError;
      expect(error.attemptedDeckType).toBe('another-custom-deck');
      expect(error.existingDeckType).toBe('custom-deck');
    });
  });

  describe('validateGameInstance', () => {
    it('should validate compatible game instance configuration', () => {
      const config: GameInstanceConfig = {
        ruleset: standardRuleset,
        deckType: standardDeck,
        existingDeckTypes: []
      };

      const result = CompatibilityValidator.validateGameInstance(config);

      expect(result.isCompatible).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.messages).toContain('Game instance configuration is fully compatible');
    });

    it('should fail validation for incompatible ruleset-deck combination', () => {
      const config: GameInstanceConfig = {
        ruleset: standardRuleset,
        deckType: customDeck,
        existingDeckTypes: []
      };

      const result = CompatibilityValidator.validateGameInstance(config);

      expect(result.isCompatible).toBe(false);
      expect(result.error).toBeInstanceOf(CompatibilityError);
    });

    it('should fail validation for deck mixing', () => {
      const config: GameInstanceConfig = {
        ruleset: multiCompatibleRuleset,
        deckType: customDeck,
        existingDeckTypes: ['standard-playing-deck']
      };

      const result = CompatibilityValidator.validateGameInstance(config);

      expect(result.isCompatible).toBe(false);
      expect(result.error).toBeInstanceOf(DeckMixingError);
    });

    it('should validate when no existing deck types are provided', () => {
      const config: GameInstanceConfig = {
        ruleset: standardRuleset,
        deckType: standardDeck
      };

      const result = CompatibilityValidator.validateGameInstance(config);

      expect(result.isCompatible).toBe(true);
    });
  });

  describe('getRulesetCompatibilityReport', () => {
    it('should provide detailed compatibility report', () => {
      const report = CompatibilityValidator.getRulesetCompatibilityReport(multiCompatibleRuleset);

      expect(report.name).toBe('test-multi');
      expect(report.compatibleDeckTypes).toEqual(['standard-playing-deck', 'custom-deck']);
      expect(report.playerRange).toEqual({ min: 2, max: 4 });
      expect(report.summary).toContain('Ruleset \'test-multi\' supports 2-4 players');
      expect(report.summary).toContain('compatible with deck types: standard-playing-deck, custom-deck');
    });
  });

  describe('validateMultipleCombinations', () => {
    it('should validate multiple combinations at once', () => {
      const combinations = [
        { ruleset: standardRuleset, deckType: standardDeck },
        { ruleset: customRuleset, deckType: customDeck },
        { ruleset: standardRuleset, deckType: customDeck }
      ];

      const results = CompatibilityValidator.validateMultipleCombinations(combinations);

      expect(results).toHaveLength(3);
      expect(results[0].isCompatible).toBe(true);
      expect(results[1].isCompatible).toBe(true);
      expect(results[2].isCompatible).toBe(false);
    });
  });

  describe('findCompatibleDeckTypes', () => {
    it('should find compatible deck types for a ruleset', () => {
      const availableDeckTypes = [standardDeck, customDeck, anotherCustomDeck];
      const compatibleTypes = CompatibilityValidator.findCompatibleDeckTypes(
        multiCompatibleRuleset,
        availableDeckTypes
      );

      expect(compatibleTypes).toHaveLength(2);
      expect(compatibleTypes).toContain(standardDeck);
      expect(compatibleTypes).toContain(customDeck);
      expect(compatibleTypes).not.toContain(anotherCustomDeck);
    });

    it('should return empty array when no compatible deck types found', () => {
      const availableDeckTypes = [anotherCustomDeck];
      const compatibleTypes = CompatibilityValidator.findCompatibleDeckTypes(
        standardRuleset,
        availableDeckTypes
      );

      expect(compatibleTypes).toHaveLength(0);
    });
  });

  describe('findCompatibleRulesets', () => {
    it('should find compatible rulesets for a deck type', () => {
      const availableRulesets = [standardRuleset, customRuleset, multiCompatibleRuleset];
      const compatibleRulesets = CompatibilityValidator.findCompatibleRulesets(
        standardDeck,
        availableRulesets
      );

      expect(compatibleRulesets).toHaveLength(2);
      expect(compatibleRulesets).toContain(standardRuleset);
      expect(compatibleRulesets).toContain(multiCompatibleRuleset);
      expect(compatibleRulesets).not.toContain(customRuleset);
    });

    it('should return empty array when no compatible rulesets found', () => {
      const availableRulesets = [standardRuleset];
      const compatibleRulesets = CompatibilityValidator.findCompatibleRulesets(
        anotherCustomDeck,
        availableRulesets
      );

      expect(compatibleRulesets).toHaveLength(0);
    });
  });
});