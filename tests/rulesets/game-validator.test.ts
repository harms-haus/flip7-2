import { GameValidator, ValidationCategory } from '../../src/rulesets/base/game-validator';
import { BaseRuleset } from '../../src/rulesets/base/base-ruleset';
import { GameState } from '../../src/models/game-state';
import { Participant } from '../../src/models/participant';
import { Hand } from '../../src/models/hand';
import { Gameboard, CardPile, CardPlacement } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { GamePhase } from '../../src/core/types';
import { DeckType, GameLoopResult, WinResult } from '../../src/core/interfaces';
import { createCardInPile, createCardInPlacement } from '../../src/utils/card-helpers';

// Test ruleset for validation testing
class TestValidationRuleset extends BaseRuleset {
  public readonly name = 'test-validation';
  public readonly minPlayers = 2;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['test-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return gameState;
  }

  public gameloop(gameState: GameState): GameLoopResult {
    return this.createGameLoopResult(false, gameState);
  }

  public wincondition(gameState: GameState): WinResult {
    const activeParticipants = this.getActiveParticipants(gameState);
    if (activeParticipants.length === 1) {
      return this.createWinResult(true, activeParticipants, 'Last player standing');
    }
    return this.createWinResult(false);
  }

  public validate(gameState: GameState) {
    const errors = super.validate(gameState);
    
    // Add custom validation
    if (gameState.metadata.customRule && gameState.metadata.customRule !== 'valid') {
      errors.push({
        code: 'CUSTOM_RULE_VIOLATION',
        message: 'Custom rule validation failed',
        severity: 'error'
      });
    }
    
    return errors;
  }
}

class ErrorWinConditionRuleset extends BaseRuleset {
  public readonly name = 'error-win';
  public readonly minPlayers = 1;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['test-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return gameState;
  }

  public gameloop(gameState: GameState): GameLoopResult {
    return this.createGameLoopResult(false, gameState);
  }

  public wincondition(gameState: GameState): WinResult {
    throw new Error('Win condition error');
  }
}

describe('GameValidator', () => {
  let validator: GameValidator;
  let gameState: GameState;
  let participant1: Participant;
  let participant2: Participant;
  let hand1: Hand;
  let hand2: Hand;
  let gameboard: Gameboard;
  let testCard: Card;

  beforeEach(() => {
    validator = new GameValidator();
    
    testCard = new Card({
      id: 'test-card',
      faceId: 'test-face',
      tailId: 'test-tail',
      properties: { suit: 'hearts', rank: 'ace' }
    }, 'test-deck');
    
    participant1 = new Participant('player1', 'Alice', false, ['hand1']);
    participant2 = new Participant('player2', 'Bob', false, ['hand2']);
    
    hand1 = new Hand('hand1', 'Alice Hand', 'player1');
    hand2 = new Hand('hand2', 'Bob Hand', 'player2');
    
    gameboard = new Gameboard();
    
    const participants = new Map([
      ['player1', participant1],
      ['player2', participant2]
    ]);
    
    const hands = new Map([
      ['hand1', hand1],
      ['hand2', hand2]
    ]);
    
    gameState = new GameState('test-game', GamePhase.SETUP, gameboard, participants, hands);
  });

  describe('Validator Configuration', () => {
    it('should use default configuration', () => {
      const config = validator.getConfig();
      expect(config.validateCardOwnership).toBe(true);
      expect(config.validateHandRelationships).toBe(true);
      expect(config.validatePhaseTransitions).toBe(true);
      expect(config.validateCardState).toBe(true);
      expect(config.includeWarnings).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customValidator = new GameValidator({
        validateCardOwnership: false,
        validateHandRelationships: false,
        includeWarnings: false
      });
      
      const config = customValidator.getConfig();
      expect(config.validateCardOwnership).toBe(false);
      expect(config.validateHandRelationships).toBe(false);
      expect(config.includeWarnings).toBe(false);
    });

    it('should create new validator with updated configuration', () => {
      const newValidator = validator.withConfig({ validateCardOwnership: false });
      const newConfig = newValidator.getConfig();
      const originalConfig = validator.getConfig();
      
      expect(newConfig.validateCardOwnership).toBe(false);
      expect(originalConfig.validateCardOwnership).toBe(true);
    });
  });

  describe('Game Structure Validation', () => {
    it('should validate valid game structure', () => {
      const errors = validator.validateGameState(gameState);
      const structureErrors = errors.filter(e => e.category === ValidationCategory.GAME_STRUCTURE);
      expect(structureErrors).toHaveLength(0);
    });

    it('should detect missing game ID', () => {
      const invalidState = new GameState('', GamePhase.SETUP, gameboard, gameState.participants, gameState.hands);
      const errors = validator.validateGameState(invalidState);
      
      const gameIdErrors = errors.filter(e => e.code === 'MISSING_GAME_ID');
      expect(gameIdErrors).toHaveLength(1);
      expect(gameIdErrors[0].category).toBe(ValidationCategory.GAME_STRUCTURE);
      expect(gameIdErrors[0].severity).toBe('error');
      expect(gameIdErrors[0].suggestedFix).toBe('Provide a valid game ID');
    });

    it('should detect missing participants', () => {
      const invalidState = new GameState('test', GamePhase.SETUP, gameboard, new Map(), gameState.hands);
      const errors = validator.validateGameState(invalidState);
      
      const participantErrors = errors.filter(e => e.code === 'NO_PARTICIPANTS');
      expect(participantErrors).toHaveLength(1);
      expect(participantErrors[0].category).toBe(ValidationCategory.GAME_STRUCTURE);
    });

    it('should detect missing gameboard', () => {
      const invalidState = new GameState('test', GamePhase.SETUP, null as any, gameState.participants, gameState.hands);
      const errors = validator.validateGameState(invalidState);
      
      const gameboardErrors = errors.filter(e => e.code === 'MISSING_GAMEBOARD');
      expect(gameboardErrors).toHaveLength(1);
      expect(gameboardErrors[0].suggestedFix).toBe('Initialize the gameboard');
    });
  });

  describe('Participant State Validation', () => {
    it('should validate correct participant-hand relationships', () => {
      const errors = validator.validateGameState(gameState);
      const participantErrors = errors.filter(e => e.category === ValidationCategory.PARTICIPANT_STATE);
      expect(participantErrors).toHaveLength(0);
    });

    it('should detect participant ID mismatch', () => {
      const badParticipant = new Participant('correct-id', 'Alice', false, ['hand1']);
      const participants = new Map([['wrong-key', badParticipant]]);
      const invalidState = gameState.withParticipants(participants);
      
      const errors = validator.validateGameState(invalidState);
      const mismatchErrors = errors.filter(e => e.code === 'PARTICIPANT_ID_MISMATCH');
      expect(mismatchErrors).toHaveLength(1);
      expect(mismatchErrors[0].context?.mapKey).toBe('wrong-key');
      expect(mismatchErrors[0].context?.participantId).toBe('correct-id');
    });

    it('should detect missing hand references', () => {
      const badParticipant = new Participant('player1', 'Alice', false, ['nonexistent-hand']);
      const participants = new Map([['player1', badParticipant]]);
      const invalidState = gameState.withParticipants(participants);
      
      const errors = validator.validateGameState(invalidState);
      const handErrors = errors.filter(e => e.code === 'MISSING_HAND_REFERENCE');
      expect(handErrors).toHaveLength(1);
      expect(handErrors[0].context?.handId).toBe('nonexistent-hand');
    });

    it('should detect hand ownership mismatch', () => {
      const wrongHand = new Hand('hand1', 'Wrong Hand', 'wrong-owner');
      const hands = new Map([['hand1', wrongHand]]);
      const invalidState = gameState.withHands(hands);
      
      const errors = validator.validateGameState(invalidState);
      const ownershipErrors = errors.filter(e => e.code === 'HAND_OWNERSHIP_MISMATCH');
      expect(ownershipErrors).toHaveLength(1);
    });

    it('should detect orphaned hands', () => {
      const orphanedHand = new Hand('orphaned', 'Orphaned', 'nonexistent');
      const hands = new Map([...gameState.hands, ['orphaned', orphanedHand]]);
      const invalidState = gameState.withHands(hands);
      
      const errors = validator.validateGameState(invalidState);
      const orphanErrors = errors.filter(e => e.code === 'ORPHANED_HAND');
      expect(orphanErrors).toHaveLength(1);
      expect(orphanErrors[0].suggestedFix).toContain('Create participant');
    });

    it('should skip participant validation when configured', () => {
      const noParticipantValidator = new GameValidator({ validateHandRelationships: false });
      const badParticipant = new Participant('player1', 'Alice', false, ['nonexistent-hand']);
      const participants = new Map([['player1', badParticipant]]);
      const invalidState = gameState.withParticipants(participants);
      
      const errors = noParticipantValidator.validateGameState(invalidState);
      const handErrors = errors.filter(e => e.code === 'MISSING_HAND_REFERENCE');
      expect(handErrors).toHaveLength(0);
    });
  });

  describe('Card State Validation', () => {
    it('should validate card ownership', () => {
      const cardInPile = createCardInPile(testCard, true, 'player1');
      const pile = new CardPile('test-pile', [cardInPile]);
      const gameboardWithCards = gameboard.withPiles(new Map([['test-pile', pile]]));
      const stateWithCards = gameState.withGameboard(gameboardWithCards);
      
      const errors = validator.validateGameState(stateWithCards);
      const cardErrors = errors.filter(e => e.category === ValidationCategory.CARD_STATE);
      expect(cardErrors).toHaveLength(0);
    });

    it('should detect invalid card owners', () => {
      const cardInPile = createCardInPile(testCard, true, 'nonexistent-owner');
      const pile = new CardPile('test-pile', [cardInPile]);
      const gameboardWithCards = gameboard.withPiles(new Map([['test-pile', pile]]));
      const stateWithCards = gameState.withGameboard(gameboardWithCards);
      
      const errors = validator.validateGameState(stateWithCards);
      const ownerErrors = errors.filter(e => e.code === 'INVALID_CARD_OWNER');
      expect(ownerErrors).toHaveLength(1);
      expect(ownerErrors[0].context?.owner).toBe('nonexistent-owner');
    });

    it('should detect duplicate cards', () => {
      const cardInPile1 = createCardInPile(testCard, true, 'player1');
      const cardInPile2 = createCardInPile(testCard, true, 'player2'); // Same card ID
      
      const pile1 = new CardPile('pile1', [cardInPile1]);
      const pile2 = new CardPile('pile2', [cardInPile2]);
      
      const gameboardWithDuplicates = gameboard.withPiles(new Map([
        ['pile1', pile1],
        ['pile2', pile2]
      ]));
      
      const stateWithDuplicates = gameState.withGameboard(gameboardWithDuplicates);
      
      const errors = validator.validateGameState(stateWithDuplicates);
      const duplicateErrors = errors.filter(e => e.code === 'DUPLICATE_CARD');
      expect(duplicateErrors).toHaveLength(1);
      expect(duplicateErrors[0].context?.cardId).toBe('test-card');
      expect(duplicateErrors[0].context?.instances).toHaveLength(2);
    });

    it('should validate cards in hand piles and placements', () => {
      const cardInPile = createCardInPile(testCard, true, 'invalid-owner');
      const pile = new CardPile('hand-pile', [cardInPile]);
      const handWithCards = hand1.withPiles(new Map([['hand-pile', pile]]));
      const hands = new Map([['hand1', handWithCards], ['hand2', hand2]]);
      const stateWithHandCards = gameState.withHands(hands);
      
      const errors = validator.validateGameState(stateWithHandCards);
      const ownerErrors = errors.filter(e => e.code === 'INVALID_CARD_OWNER');
      expect(ownerErrors).toHaveLength(1);
    });

    it('should validate cards in placements', () => {
      const cardInPlacement = createCardInPlacement(testCard, true, 'invalid-owner');
      const placement = new CardPlacement('test-placement', cardInPlacement);
      const gameboardWithPlacement = gameboard.withPlacements(new Map([['test-placement', placement]]));
      const stateWithPlacement = gameState.withGameboard(gameboardWithPlacement);
      
      const errors = validator.validateGameState(stateWithPlacement);
      const ownerErrors = errors.filter(e => e.code === 'INVALID_CARD_OWNER');
      expect(ownerErrors).toHaveLength(1);
    });

    it('should skip card validation when configured', () => {
      const noCardValidator = new GameValidator({ validateCardOwnership: false, validateCardState: false });
      const cardInPile = createCardInPile(testCard, true, 'nonexistent-owner');
      const pile = new CardPile('test-pile', [cardInPile]);
      const gameboardWithCards = gameboard.withPiles(new Map([['test-pile', pile]]));
      const stateWithCards = gameState.withGameboard(gameboardWithCards);
      
      const errors = noCardValidator.validateGameState(stateWithCards);
      const cardErrors = errors.filter(e => e.category === ValidationCategory.CARD_STATE);
      expect(cardErrors).toHaveLength(0);
    });
  });

  describe('Game Phase Validation', () => {
    it('should validate valid game phases', () => {
      const errors = validator.validateGameState(gameState);
      const phaseErrors = errors.filter(e => e.code === 'INVALID_GAME_PHASE');
      expect(phaseErrors).toHaveLength(0);
    });

    it('should detect invalid game phases', () => {
      const invalidState = new GameState(
        'test',
        'invalid-phase' as GamePhase,
        gameboard,
        gameState.participants,
        gameState.hands
      );
      
      const errors = validator.validateGameState(invalidState);
      const phaseErrors = errors.filter(e => e.code === 'INVALID_GAME_PHASE');
      expect(phaseErrors).toHaveLength(1);
      expect(phaseErrors[0].category).toBe(ValidationCategory.GAME_FLOW);
      expect(phaseErrors[0].context?.validPhases).toEqual(Object.values(GamePhase));
    });

    it('should skip phase validation when configured', () => {
      const noPhaseValidator = new GameValidator({ validatePhaseTransitions: false });
      const invalidState = new GameState(
        'test',
        'invalid-phase' as GamePhase,
        gameboard,
        gameState.participants,
        gameState.hands
      );
      
      const errors = noPhaseValidator.validateGameState(invalidState);
      const phaseErrors = errors.filter(e => e.code === 'INVALID_GAME_PHASE');
      expect(phaseErrors).toHaveLength(0);
    });
  });

  describe('Ruleset-Specific Validation', () => {
    it('should include ruleset validation when provided', () => {
      const ruleset = new TestValidationRuleset();
      const stateWithCustomRule = gameState.withMetadata({ customRule: 'invalid' });
      
      const errors = validator.validateGameState(stateWithCustomRule, ruleset);
      
      const rulesetErrors = errors.filter(e => e.category === ValidationCategory.RULESET_SPECIFIC);
      expect(rulesetErrors).toHaveLength(1);
      expect(rulesetErrors[0].code).toBe('CUSTOM_RULE_VIOLATION');
    });

    it('should skip ruleset validation when not provided', () => {
      const stateWithCustomRule = gameState.withMetadata({ customRule: 'invalid' });
      
      const errors = validator.validateGameState(stateWithCustomRule);
      
      const rulesetErrors = errors.filter(e => e.category === ValidationCategory.RULESET_SPECIFIC);
      expect(rulesetErrors).toHaveLength(0);
    });
  });

  describe('Warning Filtering', () => {
    it('should include warnings by default', () => {
      // Create a validator that generates warnings
      class WarningRuleset extends TestValidationRuleset {
        public validate(gameState: GameState) {
          return [{
            code: 'TEST_WARNING',
            message: 'Test warning',
            severity: 'warning' as const
          }];
        }
      }
      
      const ruleset = new WarningRuleset();
      const errors = validator.validateGameState(gameState, ruleset);
      
      const warnings = errors.filter(e => e.severity === 'warning');
      expect(warnings).toHaveLength(1);
    });

    it('should filter out warnings when configured', () => {
      const noWarningsValidator = new GameValidator({ includeWarnings: false });
      
      class WarningRuleset extends TestValidationRuleset {
        public validate(gameState: GameState) {
          return [
            {
              code: 'TEST_WARNING',
              message: 'Test warning',
              severity: 'warning' as const
            },
            {
              code: 'TEST_ERROR',
              message: 'Test error',
              severity: 'error' as const
            }
          ];
        }
      }
      
      const ruleset = new WarningRuleset();
      const errors = noWarningsValidator.validateGameState(gameState, ruleset);
      
      const warnings = errors.filter(e => e.severity === 'warning');
      const errorMessages = errors.filter(e => e.severity === 'error');
      
      expect(warnings).toHaveLength(0);
      expect(errorMessages).toHaveLength(1);
    });
  });

  describe('Win Condition Analysis', () => {
    it('should analyze win conditions successfully', () => {
      const ruleset = new TestValidationRuleset();
      const analysis = validator.analyzeWinConditions(gameState, ruleset);
      
      expect(analysis.isValid).toBe(true);
      expect(analysis.result.gameEnded).toBe(false);
      expect(analysis.errors).toHaveLength(0);
      expect(analysis.analysis.potentialWinners).toEqual(['player1', 'player2']);
      expect(analysis.analysis.eliminatedParticipants).toEqual([]);
    });

    it('should detect win condition', () => {
      const ruleset = new TestValidationRuleset();
      const singlePlayerState = new GameState(
        'test',
        GamePhase.PLAYING,
        gameboard,
        new Map([['player1', participant1]]),
        new Map([['hand1', hand1]])
      );
      
      const analysis = validator.analyzeWinConditions(singlePlayerState, ruleset);
      
      expect(analysis.result.gameEnded).toBe(true);
      expect(analysis.result.winners).toEqual(['player1']);
      expect(analysis.result.reason).toBe('Last player standing');
    });

    it('should handle win condition errors', () => {
      const ruleset = new ErrorWinConditionRuleset();
      const analysis = validator.analyzeWinConditions(gameState, ruleset);
      
      expect(analysis.isValid).toBe(false);
      expect(analysis.errors).toHaveLength(1);
      expect(analysis.errors[0].code).toBe('WIN_CONDITION_ERROR');
    });

    it('should analyze participant progress', () => {
      const ruleset = new TestValidationRuleset();
      const analysis = validator.analyzeWinConditions(gameState, ruleset);
      
      expect(analysis.analysis.participantProgress.has('player1')).toBe(true);
      expect(analysis.analysis.participantProgress.has('player2')).toBe(true);
      
      const player1Progress = analysis.analysis.participantProgress.get('player1');
      expect(player1Progress?.isActive).toBe(true);
      expect(player1Progress?.handsCount).toBe(1);
    });

    it('should identify remaining conditions', () => {
      const ruleset = new TestValidationRuleset();
      const analysis = validator.analyzeWinConditions(gameState, ruleset);
      
      expect(analysis.analysis.remainingConditions).toContain('Multiple participants still active');
      expect(analysis.analysis.remainingConditions).toContain('Game still in setup phase');
    });
  });

  describe('Individual Participant Win Checking', () => {
    it('should check participant win condition', () => {
      const ruleset = new TestValidationRuleset();
      const singlePlayerState = new GameState(
        'test',
        GamePhase.PLAYING,
        gameboard,
        new Map([['player1', participant1]]),
        new Map([['hand1', hand1]])
      );
      
      const result = validator.checkParticipantWinCondition(singlePlayerState, 'player1', ruleset);
      
      expect(result.hasWon).toBe(true);
      expect(result.reason).toBe('Last player standing');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-existent participant', () => {
      const ruleset = new TestValidationRuleset();
      const result = validator.checkParticipantWinCondition(gameState, 'nonexistent', ruleset);
      
      expect(result.hasWon).toBe(false);
      expect(result.reason).toBe('Participant not found');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PARTICIPANT_NOT_FOUND');
    });

    it('should handle win condition errors', () => {
      const ruleset = new ErrorWinConditionRuleset();
      const result = validator.checkParticipantWinCondition(gameState, 'player1', ruleset);
      
      expect(result.hasWon).toBe(false);
      expect(result.reason).toBe('Error checking win condition');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('WIN_CHECK_ERROR');
    });
  });
});