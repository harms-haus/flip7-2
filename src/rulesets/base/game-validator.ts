import {
  GameState,
  ValidationError,
  Ruleset,
  WinResult
} from '../../core/interfaces';
import { GamePhase } from '../../core/types';

/**
 * Categories of validation errors
 */
export enum ValidationCategory {
  GAME_STRUCTURE = 'GAME_STRUCTURE',
  PARTICIPANT_STATE = 'PARTICIPANT_STATE',
  CARD_STATE = 'CARD_STATE',
  RULESET_SPECIFIC = 'RULESET_SPECIFIC',
  GAME_FLOW = 'GAME_FLOW'
}

/**
 * Detailed validation error with category and context
 */
export interface DetailedValidationError extends ValidationError {
  /** Category of the validation error */
  readonly category: ValidationCategory;
  
  /** Additional context information */
  readonly context?: Record<string, any>;
  
  /** Suggested fix for the error */
  readonly suggestedFix?: string;
}

/**
 * Configuration for game validation
 */
export interface ValidationConfig {
  /** Whether to validate card ownership consistency */
  validateCardOwnership: boolean;
  
  /** Whether to validate hand-participant relationships */
  validateHandRelationships: boolean;
  
  /** Whether to validate game phase transitions */
  validatePhaseTransitions: boolean;
  
  /** Whether to validate card state consistency */
  validateCardState: boolean;
  
  /** Whether to include warnings in validation results */
  includeWarnings: boolean;
}

/**
 * Result of win condition analysis
 */
export interface WinConditionAnalysis {
  /** The win result */
  readonly result: WinResult;
  
  /** Detailed analysis of win conditions */
  readonly analysis: {
    /** Participants who could potentially win */
    readonly potentialWinners: string[];
    
    /** Participants who are eliminated */
    readonly eliminatedParticipants: string[];
    
    /** Current scores or progress for each participant */
    readonly participantProgress: Map<string, any>;
    
    /** Conditions that need to be met for the game to end */
    readonly remainingConditions: string[];
  };
  
  /** Whether the win condition check was successful */
  readonly isValid: boolean;
  
  /** Any errors encountered during win condition checking */
  readonly errors: ValidationError[];
}

/**
 * Comprehensive game validation and win condition system
 */
export class GameValidator {
  private readonly config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      validateCardOwnership: true,
      validateHandRelationships: true,
      validatePhaseTransitions: true,
      validateCardState: true,
      includeWarnings: true,
      ...config
    };
  }

  /**
   * Perform comprehensive game state validation with detailed error reporting
   */
  public validateGameState(
    gameState: GameState,
    ruleset?: Ruleset
  ): DetailedValidationError[] {
    const errors: DetailedValidationError[] = [];

    // Basic game structure validation
    errors.push(...this.validateGameStructure(gameState));

    // Participant state validation
    if (this.config.validateHandRelationships) {
      errors.push(...this.validateParticipantState(gameState));
    }

    // Card state validation
    if (this.config.validateCardState || this.config.validateCardOwnership) {
      errors.push(...this.validateCardState(gameState));
    }

    // Game phase validation
    if (this.config.validatePhaseTransitions) {
      errors.push(...this.validateGamePhase(gameState));
    }

    // Ruleset-specific validation if provided
    if (ruleset) {
      const rulesetErrors = ruleset.validate(gameState);
      errors.push(...rulesetErrors.map(error => this.enhanceValidationError(
        error,
        ValidationCategory.RULESET_SPECIFIC
      )));
    }

    // Filter out warnings if not configured to include them
    if (!this.config.includeWarnings) {
      return errors.filter(error => error.severity === 'error');
    }

    return errors;
  }

  /**
   * Analyze win conditions with detailed reporting
   */
  public analyzeWinConditions(
    gameState: GameState,
    ruleset: Ruleset
  ): WinConditionAnalysis {
    const errors: ValidationError[] = [];
    let result: WinResult;
    let isValid = true;

    try {
      result = ruleset.wincondition(gameState);
    } catch (error) {
      errors.push({
        code: 'WIN_CONDITION_ERROR',
        message: `Error checking win conditions: ${(error as Error).message}`,
        severity: 'error'
      });
      
      result = {
        gameEnded: false,
        winners: [],
        reason: 'Error checking win conditions'
      };
      isValid = false;
    }

    // Analyze participant states
    const activeParticipants = Array.from(gameState.participants.values())
      .filter(participant => participant.handIds.length > 0);
    
    const potentialWinners = activeParticipants.map(p => p.id);
    const eliminatedParticipants = Array.from(gameState.participants.values())
      .filter(participant => participant.handIds.length === 0)
      .map(p => p.id);

    // Create participant progress map (basic implementation)
    const participantProgress = new Map<string, any>();
    for (const participant of activeParticipants) {
      const hands = participant.handIds.map(handId => gameState.hands.get(handId)).filter(Boolean);
      const totalCards = hands.reduce((sum, hand) => {
        if (!hand) return sum;
        return sum + Array.from(hand.piles.values()).reduce((pileSum, pile) => pileSum + pile.cards.length, 0);
      }, 0);
      
      participantProgress.set(participant.id, {
        handsCount: hands.length,
        totalCards,
        isActive: true
      });
    }

    // Determine remaining conditions (basic implementation)
    const remainingConditions: string[] = [];
    if (!result.gameEnded) {
      if (activeParticipants.length > 1) {
        remainingConditions.push('Multiple participants still active');
      }
      if (gameState.phase !== GamePhase.FINISHED) {
        remainingConditions.push(`Game still in ${gameState.phase} phase`);
      }
    }

    return {
      result,
      analysis: {
        potentialWinners,
        eliminatedParticipants,
        participantProgress,
        remainingConditions
      },
      isValid,
      errors
    };
  }

  /**
   * Check if a specific participant has won
   */
  public checkParticipantWinCondition(
    gameState: GameState,
    participantId: string,
    ruleset: Ruleset
  ): { hasWon: boolean; reason: string; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Check if participant exists
    if (!gameState.participants.has(participantId)) {
      errors.push({
        code: 'PARTICIPANT_NOT_FOUND',
        message: `Participant '${participantId}' not found`,
        severity: 'error'
      });
      return { hasWon: false, reason: 'Participant not found', errors };
    }

    try {
      const winResult = ruleset.wincondition(gameState);
      const hasWon = winResult.winners.includes(participantId);
      return {
        hasWon,
        reason: hasWon ? winResult.reason : 'Participant has not won',
        errors
      };
    } catch (error) {
      errors.push({
        code: 'WIN_CHECK_ERROR',
        message: `Error checking win condition for participant: ${(error as Error).message}`,
        severity: 'error'
      });
      return { hasWon: false, reason: 'Error checking win condition', errors };
    }
  }

  /**
   * Validate game structure (basic integrity checks)
   */
  private validateGameStructure(gameState: GameState): DetailedValidationError[] {
    const errors: DetailedValidationError[] = [];

    // Validate game ID
    if (!gameState.gameId || gameState.gameId.trim() === '') {
      errors.push(this.createDetailedError(
        'MISSING_GAME_ID',
        'Game ID is missing or empty',
        ValidationCategory.GAME_STRUCTURE,
        'error',
        { gameId: gameState.gameId },
        'Provide a valid game ID'
      ));
    }

    // Validate participants map
    if (!gameState.participants || gameState.participants.size === 0) {
      errors.push(this.createDetailedError(
        'NO_PARTICIPANTS',
        'Game has no participants',
        ValidationCategory.GAME_STRUCTURE,
        'error',
        { participantCount: gameState.participants?.size || 0 },
        'Add at least one participant to the game'
      ));
    }

    // Validate hands map
    if (!gameState.hands) {
      errors.push(this.createDetailedError(
        'MISSING_HANDS_MAP',
        'Game hands map is missing',
        ValidationCategory.GAME_STRUCTURE,
        'error',
        {},
        'Initialize the hands map'
      ));
    }

    // Validate gameboard
    if (!gameState.gameboard) {
      errors.push(this.createDetailedError(
        'MISSING_GAMEBOARD',
        'Game gameboard is missing',
        ValidationCategory.GAME_STRUCTURE,
        'error',
        {},
        'Initialize the gameboard'
      ));
    }

    return errors;
  }

  /**
   * Validate participant state and relationships
   */
  private validateParticipantState(gameState: GameState): DetailedValidationError[] {
    const errors: DetailedValidationError[] = [];

    for (const [participantId, participant] of gameState.participants) {
      // Validate participant ID consistency
      if (participant.id !== participantId) {
        errors.push(this.createDetailedError(
          'PARTICIPANT_ID_MISMATCH',
          `Participant map key '${participantId}' does not match participant ID '${participant.id}'`,
          ValidationCategory.PARTICIPANT_STATE,
          'error',
          { mapKey: participantId, participantId: participant.id },
          'Ensure participant map keys match participant IDs'
        ));
      }

      // Validate hand references
      for (const handId of participant.handIds) {
        const hand = gameState.hands.get(handId);
        if (!hand) {
          errors.push(this.createDetailedError(
            'MISSING_HAND_REFERENCE',
            `Participant '${participantId}' references non-existent hand '${handId}'`,
            ValidationCategory.PARTICIPANT_STATE,
            'error',
            { participantId, handId },
            `Create hand '${handId}' or remove reference from participant`
          ));
        } else if (hand.participantId !== participantId) {
          errors.push(this.createDetailedError(
            'HAND_OWNERSHIP_MISMATCH',
            `Hand '${handId}' belongs to '${hand.participantId}' but is referenced by '${participantId}'`,
            ValidationCategory.PARTICIPANT_STATE,
            'error',
            { handId, handOwner: hand.participantId, referencingParticipant: participantId },
            'Update hand ownership or participant hand references'
          ));
        }
      }
    }

    // Validate orphaned hands
    for (const [handId, hand] of gameState.hands) {
      if (!gameState.participants.has(hand.participantId)) {
        errors.push(this.createDetailedError(
          'ORPHANED_HAND',
          `Hand '${handId}' belongs to non-existent participant '${hand.participantId}'`,
          ValidationCategory.PARTICIPANT_STATE,
          'error',
          { handId, participantId: hand.participantId },
          `Create participant '${hand.participantId}' or reassign hand ownership`
        ));
      }
    }

    return errors;
  }

  /**
   * Validate card state and ownership
   */
  private validateCardState(gameState: GameState): DetailedValidationError[] {
    const errors: DetailedValidationError[] = [];

    // Track all card instances to detect duplicates
    const cardInstances = new Map<string, { location: string; container: string; index?: number }[]>();

    // Check gameboard cards (if gameboard exists)
    if (gameState.gameboard && gameState.gameboard.piles) {
      for (const [pileName, pile] of gameState.gameboard.piles) {
      pile.cards.forEach((cardInPile, index) => {
        const cardId = cardInPile.card.id;
        if (!cardInstances.has(cardId)) {
          cardInstances.set(cardId, []);
        }
        cardInstances.get(cardId)!.push({
          location: 'gameboard',
          container: pileName,
          index
        });

        // Validate card ownership if specified
        if (this.config.validateCardOwnership && cardInPile.owner) {
          if (!gameState.participants.has(cardInPile.owner)) {
            errors.push(this.createDetailedError(
              'INVALID_CARD_OWNER',
              `Card '${cardId}' in gameboard pile '${pileName}' has invalid owner '${cardInPile.owner}'`,
              ValidationCategory.CARD_STATE,
              'error',
              { cardId, pileName, owner: cardInPile.owner },
              `Remove owner reference or create participant '${cardInPile.owner}'`
            ));
          }
        }
      });
      }
    }

    // Check gameboard placements (if gameboard exists)
    if (gameState.gameboard && gameState.gameboard.placements) {
      for (const [placementName, placement] of gameState.gameboard.placements) {
      if (placement.card) {
        const cardId = placement.card.card.id;
        if (!cardInstances.has(cardId)) {
          cardInstances.set(cardId, []);
        }
        cardInstances.get(cardId)!.push({
          location: 'gameboard',
          container: placementName
        });

        // Validate card ownership if specified
        if (this.config.validateCardOwnership && placement.card.owner) {
          if (!gameState.participants.has(placement.card.owner)) {
            errors.push(this.createDetailedError(
              'INVALID_CARD_OWNER',
              `Card '${cardId}' in gameboard placement '${placementName}' has invalid owner '${placement.card.owner}'`,
              ValidationCategory.CARD_STATE,
              'error',
              { cardId, placementName, owner: placement.card.owner },
              `Remove owner reference or create participant '${placement.card.owner}'`
            ));
          }
        }
      }
      }
    }

    // Check hand cards
    for (const [handId, hand] of gameState.hands) {
      // Check hand piles
      for (const [pileName, pile] of hand.piles) {
        pile.cards.forEach((cardInPile, index) => {
          const cardId = cardInPile.card.id;
          if (!cardInstances.has(cardId)) {
            cardInstances.set(cardId, []);
          }
          cardInstances.get(cardId)!.push({
            location: handId,
            container: pileName,
            index
          });

          // Validate card ownership
          if (this.config.validateCardOwnership && cardInPile.owner) {
            if (!gameState.participants.has(cardInPile.owner)) {
              errors.push(this.createDetailedError(
                'INVALID_CARD_OWNER',
                `Card '${cardId}' in hand '${handId}' pile '${pileName}' has invalid owner '${cardInPile.owner}'`,
                ValidationCategory.CARD_STATE,
                'error',
                { cardId, handId, pileName, owner: cardInPile.owner },
                `Remove owner reference or create participant '${cardInPile.owner}'`
              ));
            }
          }
        });
      }

      // Check hand placements
      for (const [placementName, placement] of hand.placements) {
        if (placement.card) {
          const cardId = placement.card.card.id;
          if (!cardInstances.has(cardId)) {
            cardInstances.set(cardId, []);
          }
          cardInstances.get(cardId)!.push({
            location: handId,
            container: placementName
          });

          // Validate card ownership
          if (this.config.validateCardOwnership && placement.card.owner) {
            if (!gameState.participants.has(placement.card.owner)) {
              errors.push(this.createDetailedError(
                'INVALID_CARD_OWNER',
                `Card '${cardId}' in hand '${handId}' placement '${placementName}' has invalid owner '${placement.card.owner}'`,
                ValidationCategory.CARD_STATE,
                'error',
                { cardId, handId, placementName, owner: placement.card.owner },
                `Remove owner reference or create participant '${placement.card.owner}'`
              ));
            }
          }
        }
      }
    }

    // Check for duplicate cards
    for (const [cardId, instances] of cardInstances) {
      if (instances.length > 1) {
        errors.push(this.createDetailedError(
          'DUPLICATE_CARD',
          `Card '${cardId}' appears in multiple locations`,
          ValidationCategory.CARD_STATE,
          'error',
          { cardId, instances },
          'Ensure each card appears in only one location'
        ));
      }
    }

    return errors;
  }

  /**
   * Validate game phase
   */
  private validateGamePhase(gameState: GameState): DetailedValidationError[] {
    const errors: DetailedValidationError[] = [];

    // Validate phase is a valid enum value
    if (!Object.values(GamePhase).includes(gameState.phase)) {
      errors.push(this.createDetailedError(
        'INVALID_GAME_PHASE',
        `Invalid game phase: ${gameState.phase}`,
        ValidationCategory.GAME_FLOW,
        'error',
        { phase: gameState.phase, validPhases: Object.values(GamePhase) },
        'Set game phase to a valid value'
      ));
    }

    return errors;
  }

  /**
   * Create a detailed validation error
   */
  private createDetailedError(
    code: string,
    message: string,
    category: ValidationCategory,
    severity: 'error' | 'warning',
    context?: Record<string, any>,
    suggestedFix?: string
  ): DetailedValidationError {
    return {
      code,
      message,
      severity,
      category,
      ...(context && { context }),
      ...(suggestedFix && { suggestedFix })
    };
  }

  /**
   * Enhance a basic validation error with additional details
   */
  private enhanceValidationError(
    error: ValidationError,
    category: ValidationCategory,
    context?: Record<string, any>,
    suggestedFix?: string
  ): DetailedValidationError {
    return {
      ...error,
      category,
      ...(context && { context }),
      ...(suggestedFix && { suggestedFix })
    };
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Create a new validator with updated configuration
   */
  public withConfig(newConfig: Partial<ValidationConfig>): GameValidator {
    return new GameValidator({ ...this.config, ...newConfig });
  }
}