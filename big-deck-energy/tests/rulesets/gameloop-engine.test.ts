import { GameLoopEngine, GameLoopConfig } from '../../src/rulesets/base/gameloop-engine';
import { BaseRuleset } from '../../src/rulesets/base/base-ruleset';
import { GameState } from '../../src/models/game-state';
import { Participant } from '../../src/models/participant';
import { Hand } from '../../src/models/hand';
import { Gameboard } from '../../src/models/gameboard';
import { GamePhase } from '../../src/core/types';
import { DeckType, GameLoopResult, WinResult, ParticipantAction } from '../../src/core/interfaces';

// Test ruleset implementations
class AutoProgressRuleset extends BaseRuleset {
  public readonly name = 'auto-progress';
  public readonly minPlayers = 1;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['test-deck'];
  
  private iterationCount = 0;

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return this.transitionToPhase(gameState, GamePhase.DEALING);
  }

  public gameloop(gameState: GameState): GameLoopResult {
    this.iterationCount++;
    
    if (gameState.phase === GamePhase.DEALING) {
      return this.createGameLoopResult(true, this.transitionToPhase(gameState, GamePhase.PLAYING));
    }
    
    if (gameState.phase === GamePhase.PLAYING && this.iterationCount < 3) {
      return this.createGameLoopResult(true, gameState);
    }
    
    return this.createGameLoopResult(true, this.transitionToPhase(gameState, GamePhase.FINISHED));
  }

  public wincondition(gameState: GameState): WinResult {
    if (gameState.phase === GamePhase.FINISHED) {
      return this.createWinResult(true, ['player1'], 'Game completed');
    }
    return this.createWinResult(false);
  }
}

class InteractionRequiredRuleset extends BaseRuleset {
  public readonly name = 'interaction-required';
  public readonly minPlayers = 1;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['test-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return this.transitionToPhase(gameState, GamePhase.PLAYING);
  }

  public gameloop(gameState: GameState): GameLoopResult {
    return this.createGameLoopResult(true, gameState, true); // Always requires interaction
  }

  public wincondition(gameState: GameState): WinResult {
    return this.createWinResult(false);
  }
}

class ErrorRuleset extends BaseRuleset {
  public readonly name = 'error-ruleset';
  public readonly minPlayers = 1;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['test-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return gameState;
  }

  public gameloop(gameState: GameState): GameLoopResult {
    throw new Error('Gameloop error');
  }

  public wincondition(gameState: GameState): WinResult {
    return this.createWinResult(false);
  }
}

class InfiniteLoopRuleset extends BaseRuleset {
  public readonly name = 'infinite-loop';
  public readonly minPlayers = 1;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['test-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return this.transitionToPhase(gameState, GamePhase.PLAYING);
  }

  public gameloop(gameState: GameState): GameLoopResult {
    return this.createGameLoopResult(true, gameState); // Always continues without progress
  }

  public wincondition(gameState: GameState): WinResult {
    return this.createWinResult(false);
  }
}

describe('GameLoopEngine', () => {
  let engine: GameLoopEngine;
  let gameState: GameState;
  let participant1: Participant;
  let hand1: Hand;
  let gameboard: Gameboard;

  beforeEach(() => {
    engine = new GameLoopEngine();
    
    participant1 = new Participant('player1', 'Alice', false, ['hand1']);
    hand1 = new Hand('hand1', 'Alice Hand', 'player1');
    gameboard = new Gameboard();
    
    const participants = new Map([['player1', participant1]]);
    const hands = new Map([['hand1', hand1]]);
    
    gameState = new GameState('test-game', GamePhase.SETUP, gameboard, participants, hands);
  });

  describe('Engine Configuration', () => {
    it('should use default configuration', () => {
      const config = engine.getConfig();
      expect(config.maxAutomaticIterations).toBe(100);
      expect(config.validateBeforeIteration).toBe(true);
      expect(config.checkWinConditions).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customEngine = new GameLoopEngine({
        maxAutomaticIterations: 50,
        validateBeforeIteration: false,
        checkWinConditions: false
      });
      
      const config = customEngine.getConfig();
      expect(config.maxAutomaticIterations).toBe(50);
      expect(config.validateBeforeIteration).toBe(false);
      expect(config.checkWinConditions).toBe(false);
    });

    it('should create new engine with updated configuration', () => {
      const newEngine = engine.withConfig({ maxAutomaticIterations: 25 });
      const newConfig = newEngine.getConfig();
      const originalConfig = engine.getConfig();
      
      expect(newConfig.maxAutomaticIterations).toBe(25);
      expect(originalConfig.maxAutomaticIterations).toBe(100);
    });
  });

  describe('Game Loop Execution', () => {
    it('should execute automatic game progression', () => {
      const ruleset = new AutoProgressRuleset();
      const result = engine.executeGameLoop(ruleset, gameState);
      
      expect(result.iterationsExecuted).toBeGreaterThan(0);
      expect(result.stoppedForGameEnd).toBe(true);
      expect(result.finalGameState.phase).toBe(GamePhase.FINISHED);
      expect(result.canContinue).toBe(false);
    });

    it('should stop for participant interaction', () => {
      const ruleset = new InteractionRequiredRuleset();
      const result = engine.executeGameLoop(ruleset, gameState);
      
      expect(result.iterationsExecuted).toBe(1);
      expect(result.stoppedForParticipantInteraction).toBe(true);
      expect(result.stoppedForGameEnd).toBe(false);
      expect(result.canContinue).toBe(true);
    });

    it('should handle already finished games', () => {
      const finishedState = gameState.withPhase(GamePhase.FINISHED);
      const ruleset = new AutoProgressRuleset();
      const result = engine.executeGameLoop(ruleset, finishedState);
      
      expect(result.iterationsExecuted).toBe(0);
      expect(result.stoppedForGameEnd).toBe(true);
      expect(result.canContinue).toBe(false);
    });

    it('should handle gameloop execution errors', () => {
      const ruleset = new ErrorRuleset();
      const result = engine.executeGameLoop(ruleset, gameState);
      
      expect(result.iterationsExecuted).toBe(0);
      expect(result.canContinue).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('GAMELOOP_EXECUTION_ERROR');
    });

    it('should prevent infinite loops', () => {
      const customEngine = new GameLoopEngine({ maxAutomaticIterations: 5 });
      const ruleset = new InfiniteLoopRuleset();
      const result = customEngine.executeGameLoop(ruleset, gameState);
      
      expect(result.iterationsExecuted).toBe(5);
      expect(result.stoppedForMaxIterations).toBe(true);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('MAX_ITERATIONS_REACHED');
    });

    it('should validate before iterations when configured', () => {
      // Create invalid game state (no participants)
      const invalidState = new GameState('invalid', GamePhase.SETUP, gameboard, new Map(), new Map());
      const ruleset = new AutoProgressRuleset();
      
      const result = engine.executeGameLoop(ruleset, invalidState);
      
      expect(result.canContinue).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });

    it('should skip validation when configured', () => {
      const noValidationEngine = new GameLoopEngine({ validateBeforeIteration: false });
      const invalidState = new GameState('invalid', GamePhase.SETUP, gameboard, new Map(), new Map());
      const ruleset = new AutoProgressRuleset();
      
      const result = noValidationEngine.executeGameLoop(ruleset, invalidState);
      
      // Should not stop due to validation errors
      expect(result.iterationsExecuted).toBeGreaterThan(0);
    });

    it('should check win conditions when configured', () => {
      const ruleset = new AutoProgressRuleset();
      const result = engine.executeGameLoop(ruleset, gameState);
      
      expect(result.stoppedForGameEnd).toBe(true);
      expect(result.finalGameState.phase).toBe(GamePhase.FINISHED);
    });

    it('should skip win condition checks when configured', () => {
      const noWinCheckEngine = new GameLoopEngine({ checkWinConditions: false });
      const ruleset = new InfiniteLoopRuleset();
      
      const result = noWinCheckEngine.executeGameLoop(ruleset, gameState);
      
      expect(result.stoppedForMaxIterations).toBe(true);
      expect(result.stoppedForGameEnd).toBe(false);
    });
  });

  describe('Participant Action Processing', () => {
    it('should process valid participant action', () => {
      const ruleset = new InteractionRequiredRuleset();
      const action: ParticipantAction = {
        type: 'test-action',
        participantId: 'player1',
        data: { value: 'test' }
      };
      
      const result = engine.processParticipantAction(ruleset, gameState, action);
      
      expect(result.iterationsExecuted).toBeGreaterThan(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should reject action from non-existent participant', () => {
      const ruleset = new InteractionRequiredRuleset();
      const action: ParticipantAction = {
        type: 'test-action',
        participantId: 'nonexistent',
        data: {}
      };
      
      const result = engine.processParticipantAction(ruleset, gameState, action);
      
      expect(result.iterationsExecuted).toBe(0);
      expect(result.canContinue).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('INVALID_PARTICIPANT');
    });

    it('should reject action from inactive participant', () => {
      const inactiveParticipant = new Participant('inactive', 'Inactive', false, []);
      const participants = new Map([
        ['player1', participant1],
        ['inactive', inactiveParticipant]
      ]);
      const stateWithInactive = gameState.withParticipants(participants);
      
      const ruleset = new InteractionRequiredRuleset();
      const action: ParticipantAction = {
        type: 'test-action',
        participantId: 'inactive',
        data: {}
      };
      
      const result = engine.processParticipantAction(ruleset, stateWithInactive, action);
      
      expect(result.iterationsExecuted).toBe(0);
      expect(result.canContinue).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('INACTIVE_PARTICIPANT');
    });

    it('should handle action processing errors', () => {
      const ruleset = new ErrorRuleset();
      const action: ParticipantAction = {
        type: 'test-action',
        participantId: 'player1',
        data: {}
      };
      
      const result = engine.processParticipantAction(ruleset, gameState, action);
      
      expect(result.iterationsExecuted).toBe(0);
      expect(result.canContinue).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('ACTION_PROCESSING_ERROR');
    });
  });

  describe('Interaction Detection', () => {
    it('should detect when participant interaction is required', () => {
      const ruleset = new InteractionRequiredRuleset();
      const requiresInteraction = engine.requiresParticipantInteraction(ruleset, gameState);
      
      expect(requiresInteraction).toBe(true);
    });

    it('should detect when no interaction is required', () => {
      const ruleset = new AutoProgressRuleset();
      const requiresInteraction = engine.requiresParticipantInteraction(ruleset, gameState);
      
      expect(requiresInteraction).toBe(false);
    });

    it('should return false for finished games', () => {
      const finishedState = gameState.withPhase(GamePhase.FINISHED);
      const ruleset = new InteractionRequiredRuleset();
      const requiresInteraction = engine.requiresParticipantInteraction(ruleset, finishedState);
      
      expect(requiresInteraction).toBe(false);
    });

    it('should return false when no active participants', () => {
      const noActiveState = new GameState('test', GamePhase.PLAYING, gameboard, new Map(), new Map());
      const ruleset = new InteractionRequiredRuleset();
      const requiresInteraction = engine.requiresParticipantInteraction(ruleset, noActiveState);
      
      expect(requiresInteraction).toBe(false);
    });

    it('should handle errors in interaction detection', () => {
      const ruleset = new ErrorRuleset();
      const requiresInteraction = engine.requiresParticipantInteraction(ruleset, gameState);
      
      expect(requiresInteraction).toBe(true); // Assumes interaction needed on error
    });
  });

  describe('Automatic Continuation Detection', () => {
    it('should detect when game can continue automatically', () => {
      const ruleset = new AutoProgressRuleset();
      const canContinue = engine.canContinueAutomatically(ruleset, gameState);
      
      expect(canContinue).toBe(true);
    });

    it('should detect when game cannot continue automatically', () => {
      const ruleset = new InteractionRequiredRuleset();
      const canContinue = engine.canContinueAutomatically(ruleset, gameState);
      
      expect(canContinue).toBe(false);
    });

    it('should return false for finished games', () => {
      const finishedState = gameState.withPhase(GamePhase.FINISHED);
      const ruleset = new AutoProgressRuleset();
      const canContinue = engine.canContinueAutomatically(ruleset, finishedState);
      
      expect(canContinue).toBe(false);
    });

    it('should return false when game has ended', () => {
      const ruleset = new AutoProgressRuleset();
      // Execute until game ends
      const result = engine.executeGameLoop(ruleset, gameState);
      const canContinue = engine.canContinueAutomatically(ruleset, result.finalGameState);
      
      expect(canContinue).toBe(false);
    });

    it('should handle errors in continuation detection', () => {
      const ruleset = new ErrorRuleset();
      const canContinue = engine.canContinueAutomatically(ruleset, gameState);
      
      expect(canContinue).toBe(false);
    });
  });

  describe('Complex Game Flow Scenarios', () => {
    it('should handle mixed automatic and interactive phases', () => {
      class MixedRuleset extends BaseRuleset {
        public readonly name = 'mixed';
        public readonly minPlayers = 1;
        public readonly maxPlayers = 4;
        public readonly compatibleDeckTypes = ['test-deck'];
        
        private phase = 0;

        public setup(gameState: GameState, deckType: DeckType): GameState {
          return this.transitionToPhase(gameState, GamePhase.DEALING);
        }

        public gameloop(gameState: GameState): GameLoopResult {
          this.phase++;
          
          if (gameState.phase === GamePhase.DEALING) {
            return this.createGameLoopResult(true, this.transitionToPhase(gameState, GamePhase.PLAYING));
          }
          
          if (this.phase === 1) {
            // First iteration - automatic
            return this.createGameLoopResult(true, gameState);
          } else if (this.phase === 2) {
            // Second iteration - requires interaction
            return this.createGameLoopResult(true, gameState, true);
          } else {
            // Third iteration - finish game
            return this.createGameLoopResult(true, this.transitionToPhase(gameState, GamePhase.FINISHED));
          }
        }

        public wincondition(gameState: GameState): WinResult {
          if (gameState.phase === GamePhase.FINISHED) {
            return this.createWinResult(true, ['player1'], 'Mixed game completed');
          }
          return this.createWinResult(false);
        }
      }
      
      const ruleset = new MixedRuleset();
      const result = engine.executeGameLoop(ruleset, gameState);
      
      expect(result.iterationsExecuted).toBe(2); // Stops at interaction requirement
      expect(result.stoppedForParticipantInteraction).toBe(true);
      expect(result.canContinue).toBe(true);
    });

    it('should handle validation errors during execution', () => {
      class ValidationErrorRuleset extends BaseRuleset {
        public readonly name = 'validation-error';
        public readonly minPlayers = 2; // Requires 2 players
        public readonly maxPlayers = 4;
        public readonly compatibleDeckTypes = ['test-deck'];

        public setup(gameState: GameState, deckType: DeckType): GameState {
          return gameState;
        }

        public gameloop(gameState: GameState): GameLoopResult {
          return this.createGameLoopResult(true, gameState);
        }

        public wincondition(gameState: GameState): WinResult {
          return this.createWinResult(false);
        }
      }
      
      // Game state has only 1 player, but ruleset requires 2
      const ruleset = new ValidationErrorRuleset();
      const result = engine.executeGameLoop(ruleset, gameState);
      
      expect(result.canContinue).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.validationErrors.some(e => e.code === 'INSUFFICIENT_PLAYERS')).toBe(true);
    });
  });
});