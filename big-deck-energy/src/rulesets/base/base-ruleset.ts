import {
  Ruleset,
  GameLoopResult,
  ValidationError,
  WinResult,
  GameState,
  DeckType,
  GameStateAPI
} from '../../core/interfaces';
import { GamePhase } from '../../core/types';
import { GameStateAPIImpl } from '../../api/game-state-api';

/**
 * Abstract base class for all rulesets providing common functionality and utilities
 */
export abstract class BaseRuleset implements Ruleset {
  /** Unique name for this ruleset */
  public abstract readonly name: string;
  
  /** Minimum number of participants required */
  public abstract readonly minPlayers: number;
  
  /** Maximum number of participants allowed */
  public abstract readonly maxPlayers: number;
  
  /** List of compatible deck type names */
  public abstract readonly compatibleDeckTypes: string[];

  /**
   * Initialize game state for a new game
   * Subclasses should override this method to implement game-specific setup
   */
  public abstract setup(gameState: GameState, deckType: DeckType): GameState;

  /**
   * Execute one iteration of the game loop
   * Subclasses should override this method to implement game-specific logic
   */
  public abstract gameloop(gameState: GameState): GameLoopResult;

  /**
   * Check win conditions
   * Subclasses should override this method to implement game-specific win conditions
   */
  public abstract wincondition(gameState: GameState): WinResult;

  /**
   * Validate current game state
   * Provides default validation that can be extended by subclasses
   */
  public validate(gameState: GameState): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate participant count
    const participantCount = gameState.participants.size;
    if (participantCount < this.minPlayers) {
      errors.push({
        code: 'INSUFFICIENT_PLAYERS',
        message: `Game requires at least ${this.minPlayers} players, but only ${participantCount} are present`,
        severity: 'error'
      });
    }

    if (participantCount > this.maxPlayers) {
      errors.push({
        code: 'TOO_MANY_PLAYERS',
        message: `Game allows at most ${this.maxPlayers} players, but ${participantCount} are present`,
        severity: 'error'
      });
    }

    // Validate game phase
    if (!Object.values(GamePhase).includes(gameState.phase)) {
      errors.push({
        code: 'INVALID_GAME_PHASE',
        message: `Invalid game phase: ${gameState.phase}`,
        severity: 'error'
      });
    }

    // Validate participant-hand relationships
    for (const [participantId, participant] of gameState.participants) {
      for (const handId of participant.handIds) {
        const hand = gameState.hands.get(handId);
        if (!hand) {
          errors.push({
            code: 'MISSING_HAND',
            message: `Participant '${participantId}' references non-existent hand '${handId}'`,
            severity: 'error'
          });
        } else if (hand.participantId !== participantId) {
          errors.push({
            code: 'HAND_OWNERSHIP_MISMATCH',
            message: `Hand '${handId}' belongs to '${hand.participantId}' but is referenced by '${participantId}'`,
            severity: 'error'
          });
        }
      }
    }

    // Validate hands reference existing participants
    for (const [handId, hand] of gameState.hands) {
      if (!gameState.participants.has(hand.participantId)) {
        errors.push({
          code: 'ORPHANED_HAND',
          message: `Hand '${handId}' belongs to non-existent participant '${hand.participantId}'`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Create a Game State API instance for manipulating game state
   * Provides a convenient way for rulesets to access state manipulation methods
   */
  protected createGameStateAPI(gameState: GameState): GameStateAPI {
    return new GameStateAPIImpl(gameState);
  }

  /**
   * Utility method to check if the game has ended based on phase
   */
  protected isGameEnded(gameState: GameState): boolean {
    return gameState.phase === GamePhase.FINISHED;
  }

  /**
   * Utility method to transition game phase
   */
  protected transitionToPhase(gameState: GameState, newPhase: GamePhase): GameState {
    return {
      ...gameState,
      phase: newPhase
    };
  }

  /**
   * Utility method to get active participants (those with hands)
   */
  protected getActiveParticipants(gameState: GameState): string[] {
    return Array.from(gameState.participants.values())
      .filter(participant => participant.handIds.length > 0)
      .map(participant => participant.id);
  }

  /**
   * Utility method to check if a participant exists and is active
   */
  protected isParticipantActive(gameState: GameState, participantId: string): boolean {
    const participant = gameState.participants.get(participantId);
    return participant !== undefined && participant.handIds.length > 0;
  }

  /**
   * Utility method to create a standard game loop result
   */
  protected createGameLoopResult(
    canContinue: boolean,
    updatedGameState: GameState,
    requiresParticipantInteraction: boolean = false
  ): GameLoopResult {
    return {
      canContinue,
      updatedGameState,
      requiresParticipantInteraction
    };
  }

  /**
   * Utility method to create a standard win result
   */
  protected createWinResult(
    gameEnded: boolean,
    winners: string[] = [],
    reason: string = ''
  ): WinResult {
    return {
      gameEnded,
      winners,
      reason
    };
  }

  /**
   * Utility method to create validation errors
   */
  protected createValidationError(
    code: string,
    message: string,
    severity: 'error' | 'warning' = 'error'
  ): ValidationError {
    return {
      code,
      message,
      severity
    };
  }

  /**
   * Default error handling for common ruleset operations
   * Subclasses can override this to provide custom error handling
   */
  protected handleError(error: Error, context: string): ValidationError {
    return this.createValidationError(
      'RULESET_ERROR',
      `Error in ${context}: ${error.message}`,
      'error'
    );
  }

  /**
   * Utility method to safely execute operations and convert exceptions to validation errors
   */
  protected safeExecute<T>(
    operation: () => T,
    context: string,
    onError?: (error: Error) => ValidationError
  ): { result?: T; error?: ValidationError } {
    try {
      const result = operation();
      return { result };
    } catch (error) {
      const validationError = onError 
        ? onError(error as Error)
        : this.handleError(error as Error, context);
      return { error: validationError };
    }
  }
}