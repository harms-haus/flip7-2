import {
  GameState,
  Ruleset,
  GameLoopResult,
  ParticipantAction,
  ValidationError
} from '../../core/interfaces';
import { GamePhase } from '../../core/types';

/**
 * Configuration for gameloop execution
 */
export interface GameLoopConfig {
  /** Maximum number of automatic iterations before requiring participant interaction */
  maxAutomaticIterations: number;
  
  /** Whether to validate game state before each iteration */
  validateBeforeIteration: boolean;
  
  /** Whether to check win conditions after each iteration */
  checkWinConditions: boolean;
}

/**
 * Result of gameloop execution
 */
export interface GameLoopExecutionResult {
  /** Final game state after execution */
  readonly finalGameState: GameState;
  
  /** Number of iterations executed */
  readonly iterationsExecuted: number;
  
  /** Whether execution stopped due to participant interaction requirement */
  readonly stoppedForParticipantInteraction: boolean;
  
  /** Whether execution stopped due to game ending */
  readonly stoppedForGameEnd: boolean;
  
  /** Whether execution stopped due to maximum iterations reached */
  readonly stoppedForMaxIterations: boolean;
  
  /** Any validation errors encountered during execution */
  readonly validationErrors: ValidationError[];
  
  /** Whether the game can continue after this execution */
  readonly canContinue: boolean;
}

/**
 * Engine for executing game loops with automatic progression and participant interaction detection
 */
export class GameLoopEngine {
  private readonly config: GameLoopConfig;

  constructor(config: Partial<GameLoopConfig> = {}) {
    this.config = {
      maxAutomaticIterations: 100,
      validateBeforeIteration: true,
      checkWinConditions: true,
      ...config
    };
  }

  /**
   * Execute the game loop until participant interaction is required or game ends
   */
  public executeGameLoop(
    ruleset: Ruleset,
    initialGameState: GameState
  ): GameLoopExecutionResult {
    let currentGameState = initialGameState;
    let iterationsExecuted = 0;
    const validationErrors: ValidationError[] = [];
    let stoppedForParticipantInteraction = false;
    let stoppedForGameEnd = false;
    let stoppedForMaxIterations = false;
    let canContinue = true;

    // Check if game is already finished
    if (currentGameState.phase === GamePhase.FINISHED) {
      return {
        finalGameState: currentGameState,
        iterationsExecuted: 0,
        stoppedForParticipantInteraction: false,
        stoppedForGameEnd: true,
        stoppedForMaxIterations: false,
        validationErrors: [],
        canContinue: false
      };
    }

    while (iterationsExecuted < this.config.maxAutomaticIterations) {
      // Validate game state before iteration if configured
      if (this.config.validateBeforeIteration) {
        const errors = ruleset.validate(currentGameState);
        validationErrors.push(...errors);
        
        // Stop if there are critical errors
        const criticalErrors = errors.filter(error => error.severity === 'error');
        if (criticalErrors.length > 0) {
          canContinue = false;
          break;
        }
      }

      // Check win conditions if configured
      if (this.config.checkWinConditions) {
        const winResult = ruleset.wincondition(currentGameState);
        if (winResult.gameEnded) {
          // Transition to finished phase if not already there
          if (currentGameState.phase !== GamePhase.FINISHED) {
            currentGameState = {
              ...currentGameState,
              phase: GamePhase.FINISHED
            };
          }
          stoppedForGameEnd = true;
          canContinue = false;
          break;
        }
      }

      // Execute one iteration of the game loop
      let gameLoopResult: GameLoopResult;
      try {
        gameLoopResult = ruleset.gameloop(currentGameState);
      } catch (error) {
        validationErrors.push({
          code: 'GAMELOOP_EXECUTION_ERROR',
          message: `Error executing game loop: ${(error as Error).message}`,
          severity: 'error'
        });
        canContinue = false;
        break;
      }

      // Update game state
      currentGameState = gameLoopResult.updatedGameState;
      iterationsExecuted++;

      // Check if participant interaction is required
      if (gameLoopResult.requiresParticipantInteraction) {
        stoppedForParticipantInteraction = true;
        canContinue = gameLoopResult.canContinue;
        break;
      }

      // Check if game cannot continue automatically
      if (!gameLoopResult.canContinue) {
        canContinue = false;
        break;
      }

      // Check if game has ended (phase changed to finished)
      if (currentGameState.phase === GamePhase.FINISHED) {
        stoppedForGameEnd = true;
        canContinue = false;
        break;
      }
    }

    // Check if stopped due to max iterations
    if (iterationsExecuted >= this.config.maxAutomaticIterations && canContinue) {
      stoppedForMaxIterations = true;
      validationErrors.push({
        code: 'MAX_ITERATIONS_REACHED',
        message: `Game loop stopped after ${this.config.maxAutomaticIterations} iterations to prevent infinite loops`,
        severity: 'warning'
      });
    }

    return {
      finalGameState: currentGameState,
      iterationsExecuted,
      stoppedForParticipantInteraction,
      stoppedForGameEnd,
      stoppedForMaxIterations,
      validationErrors,
      canContinue: canContinue && !stoppedForGameEnd
    };
  }

  /**
   * Process a participant action and continue game loop execution
   */
  public processParticipantAction(
    ruleset: Ruleset,
    gameState: GameState,
    action: ParticipantAction
  ): GameLoopExecutionResult {
    // Validate the action first
    const validationErrors: ValidationError[] = [];
    
    // Check if participant exists
    if (!gameState.participants.has(action.participantId)) {
      validationErrors.push({
        code: 'INVALID_PARTICIPANT',
        message: `Participant '${action.participantId}' not found`,
        severity: 'error'
      });
      
      return {
        finalGameState: gameState,
        iterationsExecuted: 0,
        stoppedForParticipantInteraction: false,
        stoppedForGameEnd: false,
        stoppedForMaxIterations: false,
        validationErrors,
        canContinue: false
      };
    }

    // Check if participant is active (has hands)
    const participant = gameState.participants.get(action.participantId)!;
    if (participant.handIds.length === 0) {
      validationErrors.push({
        code: 'INACTIVE_PARTICIPANT',
        message: `Participant '${action.participantId}' has no hands and cannot perform actions`,
        severity: 'error'
      });
      
      return {
        finalGameState: gameState,
        iterationsExecuted: 0,
        stoppedForParticipantInteraction: false,
        stoppedForGameEnd: false,
        stoppedForMaxIterations: false,
        validationErrors,
        canContinue: false
      };
    }

    // Process the action through the ruleset's gameloop
    // The ruleset should handle the action and update the game state accordingly
    try {
      const gameLoopResult = ruleset.gameloop(gameState);
      
      // Continue execution after processing the action
      return this.executeGameLoop(ruleset, gameLoopResult.updatedGameState);
    } catch (error) {
      validationErrors.push({
        code: 'ACTION_PROCESSING_ERROR',
        message: `Error processing participant action: ${(error as Error).message}`,
        severity: 'error'
      });
      
      return {
        finalGameState: gameState,
        iterationsExecuted: 0,
        stoppedForParticipantInteraction: false,
        stoppedForGameEnd: false,
        stoppedForMaxIterations: false,
        validationErrors,
        canContinue: false
      };
    }
  }

  /**
   * Detect if the current game state requires participant interaction
   */
  public requiresParticipantInteraction(
    ruleset: Ruleset,
    gameState: GameState
  ): boolean {
    // Game is finished, no interaction needed
    if (gameState.phase === GamePhase.FINISHED) {
      return false;
    }

    // Check if any active participants exist
    const activeParticipants = Array.from(gameState.participants.values())
      .filter(participant => participant.handIds.length > 0);
    
    if (activeParticipants.length === 0) {
      return false;
    }

    // Execute one iteration to see if interaction is required
    try {
      const gameLoopResult = ruleset.gameloop(gameState);
      return gameLoopResult.requiresParticipantInteraction;
    } catch (error) {
      // If there's an error, assume interaction is required for safety
      return true;
    }
  }

  /**
   * Check if the game can continue automatically without participant interaction
   */
  public canContinueAutomatically(
    ruleset: Ruleset,
    gameState: GameState
  ): boolean {
    // Game is finished, cannot continue
    if (gameState.phase === GamePhase.FINISHED) {
      return false;
    }

    // Check win conditions
    const winResult = ruleset.wincondition(gameState);
    if (winResult.gameEnded) {
      return false;
    }

    // Check if game loop can continue
    try {
      const gameLoopResult = ruleset.gameloop(gameState);
      return gameLoopResult.canContinue && !gameLoopResult.requiresParticipantInteraction;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): GameLoopConfig {
    return { ...this.config };
  }

  /**
   * Create a new engine with updated configuration
   */
  public withConfig(newConfig: Partial<GameLoopConfig>): GameLoopEngine {
    return new GameLoopEngine({ ...this.config, ...newConfig });
  }
}