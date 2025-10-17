import { GameState } from './game-state';
import { DeckType } from './deck-type';

/**
 * Defines game rules and logic for a specific card game
 */
export interface Ruleset {
  /** Unique name for this ruleset */
  readonly name: string;
  
  /** Minimum number of participants required */
  readonly minPlayers: number;
  
  /** Maximum number of participants allowed */
  readonly maxPlayers: number;
  
  /** List of compatible deck type names */
  readonly compatibleDeckTypes: string[];
  
  /**
   * Initialize game state for a new game
   * @param gameState Initial game state
   * @param deckType Deck type being used
   * @returns Updated game state after setup
   */
  setup(gameState: GameState, deckType: DeckType): GameState;
  
  /**
   * Execute one iteration of the game loop
   * @param gameState Current game state
   * @returns Result indicating if game can continue and updated state
   */
  gameloop(gameState: GameState): GameLoopResult;
  
  /**
   * Validate current game state
   * @param gameState Game state to validate
   * @returns Array of validation errors (empty if valid)
   */
  validate(gameState: GameState): ValidationError[];
  
  /**
   * Check win conditions
   * @param gameState Current game state
   * @returns Win result indicating if game has ended
   */
  wincondition(gameState: GameState): WinResult;
}

/**
 * Result of a game loop iteration
 */
export interface GameLoopResult {
  /** Whether the game can continue automatically */
  readonly canContinue: boolean;
  
  /** Updated game state after this iteration */
  readonly updatedGameState: GameState;
  
  /** Whether participant interaction is required before continuing */
  readonly requiresParticipantInteraction: boolean;
}

/**
 * Validation error from game state validation
 */
export interface ValidationError {
  /** Error code for categorization */
  readonly code: string;
  
  /** Human-readable error message */
  readonly message: string;
  
  /** Severity level of the error */
  readonly severity: 'error' | 'warning';
}

/**
 * Result of win condition check
 */
export interface WinResult {
  /** Whether the game has ended */
  readonly gameEnded: boolean;
  
  /** IDs of winning participants (empty if no winners yet) */
  readonly winners: string[];
  
  /** Reason for game ending */
  readonly reason: string;
}

/**
 * Action performed by a participant
 */
export interface ParticipantAction {
  /** Type of action being performed */
  readonly type: string;
  
  /** ID of participant performing the action */
  readonly participantId: string;
  
  /** Action-specific data */
  readonly data: Record<string, any>;
}