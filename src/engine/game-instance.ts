import { GameState } from '../core/interfaces/game-state';
import { Ruleset, GameLoopResult, ValidationError, WinResult, ParticipantAction } from '../core/interfaces/ruleset';
import { DeckType } from '../core/interfaces/deck-type';
import { GamePhase } from '../core/types';
import { GameStateAPIImpl } from '../api/game-state-api';
import { GameState as GameStateModel } from '../models/game-state';
import { Gameboard } from '../models/gameboard';
import { Participant } from '../models/participant';
import { Hand } from '../models/hand';
import { CompatibilityValidator, CompatibilityResult } from './compatibility';
import { CompatibilityError, DeckMixingError, InvalidActionError } from '../core/errors';
import { HistoryManager } from './history-manager';
import { GameHistory, GameStateSnapshot, ActionDescriptor } from '../core/interfaces/history';

/**
 * Configuration for creating a new game instance
 */
export interface GameInstanceConfig {
  /** Unique identifier for the game */
  gameId: string;
  
  /** Ruleset to use for this game */
  ruleset: Ruleset;
  
  /** Deck type to use for this game */
  deckType: DeckType;
  
  /** Initial metadata for the game */
  metadata?: Record<string, any>;
}

/**
 * Result of game instance creation
 */
export interface GameCreationResult {
  /** Whether the game was created successfully */
  success: boolean;
  
  /** The created game instance (if successful) */
  gameInstance?: GameInstance;
  
  /** Error details (if unsuccessful) */
  error?: CompatibilityError | DeckMixingError | Error;
  
  /** Additional messages about the creation process */
  messages: string[];
}

/**
 * Main game instance that orchestrates game creation, state management, and lifecycle
 */
export class GameInstance {
  private gameState: GameState;
  private readonly ruleset: Ruleset;
  private readonly deckType: DeckType;
  private readonly gameStateAPI: GameStateAPIImpl;
  private readonly historyManager: HistoryManager;
  private isInitialized: boolean = false;

  /**
   * Private constructor - use GameInstance.create() to create instances
   */
  private constructor(
    gameState: GameState,
    ruleset: Ruleset,
    deckType: DeckType
  ) {
    this.gameState = gameState;
    this.ruleset = ruleset;
    this.deckType = deckType;
    this.historyManager = new HistoryManager(gameState.gameId, gameState);
    this.gameStateAPI = new GameStateAPIImpl(gameState, this.historyManager);
    this.gameStateAPI.setAutoCreateSnapshots(false); // GameInstance manages snapshots
  }

  /**
   * Create a new game instance with compatibility validation
   * @param config Game instance configuration
   * @returns Game creation result
   */
  public static create(config: GameInstanceConfig): GameCreationResult {
    const messages: string[] = [];
    
    try {
      // Validate compatibility between ruleset and deck type
      const compatibilityResult = CompatibilityValidator.validateRulesetDeckCompatibility(
        config.ruleset,
        config.deckType
      );
      
      messages.push(...compatibilityResult.messages);
      
      if (!compatibilityResult.isCompatible) {
        return {
          success: false,
          error: compatibilityResult.error!,
          messages
        };
      }

      // Create initial game state
      const initialGameState = new GameStateModel(
        config.gameId,
        GamePhase.SETUP,
        new Gameboard(), // Use default gameboard
        new Map<string, Participant>(), // Use default participants map
        new Map<string, Hand>(), // Use default hands map
        undefined, // Use default events array
        config.metadata || {}
      );

      // Create game instance
      const gameInstance = new GameInstance(
        initialGameState,
        config.ruleset,
        config.deckType
      );

      messages.push(`Game instance '${config.gameId}' created successfully`);
      messages.push(`Using ruleset: ${config.ruleset.name}`);
      messages.push(`Using deck type: ${config.deckType.name}`);

      return {
        success: true,
        gameInstance,
        messages
      };

    } catch (error) {
      messages.push(`Failed to create game instance: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        messages
      };
    }
  }

  /**
   * Get the current game state (read-only)
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get the ruleset being used by this game
   */
  public getRuleset(): Ruleset {
    return this.ruleset;
  }

  /**
   * Get the deck type being used by this game
   */
  public getDeckType(): DeckType {
    return this.deckType;
  }

  /**
   * Get the Game State API for state manipulation
   */
  public getGameStateAPI(): GameStateAPIImpl {
    return this.gameStateAPI;
  }

  /**
   * Get the history manager for this game
   */
  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  /**
   * Get the complete game history
   */
  public getGameHistory(): GameHistory {
    return this.historyManager.getGameHistory();
  }

  /**
   * Get the current state snapshot
   */
  public getCurrentSnapshot(): GameStateSnapshot {
    return this.historyManager.getCurrentSnapshot();
  }

  /**
   * Get a specific snapshot by ID
   */
  public getSnapshotById(snapshotId: string): GameStateSnapshot | null {
    return this.historyManager.getSnapshotById(snapshotId);
  }

  /**
   * Replay the game to a specific snapshot
   */
  public replayToSnapshot(snapshotId: string): GameState {
    const replayedState = this.historyManager.replayToSnapshot(snapshotId);
    this.gameState = replayedState;
    this.gameStateAPI.updateGameState(replayedState);
    return replayedState;
  }

  /**
   * Export complete game history
   */
  public exportHistory(format: 'full' | 'compressed' = 'full'): string {
    return this.historyManager.exportHistory(format);
  }

  /**
   * Get the current game phase
   */
  public getCurrentPhase(): GamePhase {
    return this.gameState.phase;
  }

  /**
   * Get the game ID
   */
  public getGameId(): string {
    return this.gameState.gameId;
  }

  /**
   * Check if the game has been initialized
   */
  public isGameInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize the game by running the ruleset's setup method
   * @returns Updated game state after initialization
   */
  public initialize(): GameState {
    if (this.isInitialized) {
      throw new Error('Game has already been initialized');
    }

    try {
      // Run ruleset setup
      const setupGameState = this.ruleset.setup(this.gameState, this.deckType);
      
      // Create action descriptor for initialization
      const initAction: ActionDescriptor = {
        type: 'game_setup',
        description: `Game initialized with ruleset '${this.ruleset.name}' and deck type '${this.deckType.name}'`,
        details: {
          rulesetName: this.ruleset.name,
          deckTypeName: this.deckType.name,
          participantCount: setupGameState.participants.size,
          handCount: setupGameState.hands.size
        },
        timestamp: Date.now()
      };

      // Update internal state and create snapshot
      this.updateGameStateWithSnapshot(setupGameState, initAction);
      this.isInitialized = true;

      // Transition to dealing phase if still in setup
      if (this.gameState.phase === GamePhase.SETUP) {
        this.transitionToPhase(GamePhase.DEALING);
      }

      return this.gameState;

    } catch (error) {
      throw new Error(`Failed to initialize game: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transition the game to a new phase
   * @param newPhase The phase to transition to
   */
  public transitionToPhase(newPhase: GamePhase): void {
    if (this.gameState.phase === newPhase) {
      return; // Already in the target phase
    }

    const fromPhase = this.gameState.phase;

    // Validate phase transition
    this.validatePhaseTransition(fromPhase, newPhase);

    // Update game state with new phase
    let updatedGameState: GameState;
    if ('withPhase' in this.gameState && typeof this.gameState.withPhase === 'function') {
      updatedGameState = this.gameState.withPhase(newPhase);
    } else {
      // Fallback: create new GameState with updated phase
      updatedGameState = new GameStateModel(
        this.gameState.gameId,
        newPhase,
        this.gameState.gameboard as Gameboard,
        this.gameState.participants as Map<string, Participant>,
        this.gameState.hands as Map<string, Hand>,
        this.gameState.events,
        this.gameState.metadata
      );
    }

    // Create action descriptor for phase transition
    const phaseAction: ActionDescriptor = {
      type: 'phase_transition',
      description: `Game phase changed from ${fromPhase} to ${newPhase}`,
      details: {
        fromPhase,
        toPhase: newPhase,
        transitionTime: Date.now()
      },
      timestamp: Date.now()
    };

    // Update state with snapshot
    this.updateGameStateWithSnapshot(updatedGameState, phaseAction);

    // Add event for phase transition
    this.gameStateAPI.addEvent({
      id: `phase_transition_${Date.now()}`,
      type: 'phase_transition',
      timestamp: Date.now(),
      data: {
        fromPhase,
        toPhase: newPhase
      }
    });
  }

  /**
   * Execute one iteration of the game loop
   * @returns Game loop result
   */
  public executeGameLoop(): GameLoopResult {
    if (!this.isInitialized) {
      throw new Error('Game must be initialized before executing game loop');
    }

    try {
      // Execute ruleset game loop
      const result = this.ruleset.gameloop(this.gameState);
      
      // Create action descriptor for game loop execution
      const gameLoopAction: ActionDescriptor = {
        type: 'game_loop_execution',
        description: `Game loop executed - can continue: ${result.canContinue}, requires interaction: ${result.requiresParticipantInteraction}`,
        details: {
          canContinue: result.canContinue,
          requiresParticipantInteraction: result.requiresParticipantInteraction,
          currentPhase: result.updatedGameState.phase,
          participantCount: result.updatedGameState.participants.size
        },
        timestamp: Date.now()
      };

      // Update internal state with the result and create snapshot
      this.updateGameStateWithSnapshot(result.updatedGameState, gameLoopAction);

      return result;

    } catch (error) {
      throw new Error(`Game loop execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate the current game state
   * @returns Array of validation errors
   */
  public validateGameState(): ValidationError[] {
    try {
      return this.ruleset.validate(this.gameState);
    } catch (error) {
      return [{
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error'
      }];
    }
  }

  /**
   * Check win conditions
   * @returns Win result
   */
  public checkWinConditions(): WinResult {
    try {
      return this.ruleset.wincondition(this.gameState);
    } catch (error) {
      return {
        gameEnded: false,
        winners: [],
        reason: `Win condition check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Process a participant action with validation and execution
   * @param action The action to process
   * @returns Updated game state after processing the action
   */
  public processAction(action: ParticipantAction): GameState {
    if (!this.isInitialized) {
      throw new Error('Game must be initialized before processing actions');
    }

    // Validate the participant exists
    if (!this.gameState.participants.has(action.participantId)) {
      throw new InvalidActionError(action, `Participant '${action.participantId}' does not exist`);
    }

    // Validate the current game state before processing action
    const preActionValidation = this.validateGameState();
    const criticalErrors = preActionValidation.filter(error => error.severity === 'error');
    
    if (criticalErrors.length > 0) {
      throw new InvalidActionError(action, `Game state has critical errors: ${criticalErrors[0]?.message}`);
    }

    try {
      // Record the action attempt
      this.addActionEvent(action, 'action_attempted');

      // Validate action through ruleset (if ruleset provides action validation)
      const actionValidationResult = this.validateActionThroughRuleset(action);
      if (!actionValidationResult.isValid) {
        this.addActionEvent(action, 'action_rejected', { reason: actionValidationResult.reason });
        throw new InvalidActionError(action, actionValidationResult.reason);
      }

      // Execute the action through Game State API
      const executionResult = this.executeActionThroughAPI(action);
      
      // Record successful action execution
      this.addActionEvent(action, 'action_executed', { 
        executionResult,
        stateChanges: this.getStateChangesSinceLastEvent()
      });

      // Get updated game state
      const updatedGameState = this.gameStateAPI.getGameState();

      // Create action descriptor for the processed action
      const actionDescriptor: ActionDescriptor = {
        type: 'participant_action',
        description: `Participant '${action.participantId}' performed action '${action.type}'`,
        participantId: action.participantId,
        details: {
          actionType: action.type,
          actionData: action.data,
          executionResult,
          success: executionResult.success
        },
        timestamp: Date.now()
      };

      // Update internal game state with snapshot
      this.updateGameStateWithSnapshot(updatedGameState, actionDescriptor);

      // Validate state after action execution
      const postActionValidation = this.validateGameState();
      const postActionErrors = postActionValidation.filter(error => error.severity === 'error');
      
      if (postActionErrors.length > 0) {
        // Log the validation errors but don't fail the action
        this.addActionEvent(action, 'action_validation_warning', { 
          warnings: postActionErrors.map(e => e.message)
        });
      }

      return this.gameState;

    } catch (error) {
      // Record failed action
      this.addActionEvent(action, 'action_failed', { 
        error: error instanceof Error ? error.message : String(error)
      });

      throw new InvalidActionError(
        action, 
        `Action processing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate an action through the ruleset's validation system
   * @param action The action to validate
   * @returns Validation result
   */
  public validateAction(action: ParticipantAction): { isValid: boolean; reason: string } {
    if (!this.isInitialized) {
      return { isValid: false, reason: 'Game must be initialized before validating actions' };
    }

    if (!this.gameState.participants.has(action.participantId)) {
      return { isValid: false, reason: `Participant '${action.participantId}' does not exist` };
    }

    return this.validateActionThroughRuleset(action);
  }

  /**
   * Get action history for a specific participant
   * @param participantId ID of the participant
   * @param actionType Optional filter by action type
   * @returns Array of action events
   */
  public getParticipantActionHistory(participantId: string, actionType?: string): import('../core/interfaces').GameEvent[] {
    const filter: import('../core/interfaces').EventFilter = {
      participantId
    };

    let events = this.gameStateAPI.getEvents(filter);
    
    // Filter by action-related events
    events = events.filter(event => 
      event.type.includes('action') || 
      event.type === 'participant_action'
    );

    // Filter by specific action type if provided
    if (actionType) {
      events = events.filter(event => 
        event.data.actionType === actionType
      );
    }

    return events;
  }

  /**
   * Get all action events in chronological order
   * @param since Optional timestamp to filter events since
   * @returns Array of action events
   */
  public getActionHistory(since?: number): import('../core/interfaces').GameEvent[] {
    const filter: import('../core/interfaces').EventFilter = since ? { since } : {};
    
    return this.gameStateAPI.getEvents(filter).filter(event => 
      event.type.includes('action') || 
      event.type === 'participant_action'
    );
  }

  /**
   * Check if a participant can perform a specific action type
   * @param participantId ID of the participant
   * @param actionType Type of action to check
   * @returns Whether the action is allowed
   */
  public canParticipantPerformAction(participantId: string, actionType: string): boolean {
    if (!this.gameState.participants.has(participantId)) {
      return false;
    }

    // Create a test action to validate
    const testAction: ParticipantAction = {
      type: actionType,
      participantId,
      data: {}
    };

    const validation = this.validateAction(testAction);
    return validation.isValid;
  }

  /**
   * Get available actions for a participant based on current game state
   * @param participantId ID of the participant
   * @returns Array of available action types
   */
  public getAvailableActions(participantId: string): string[] {
    if (!this.gameState.participants.has(participantId)) {
      return [];
    }

    // This is a basic implementation - in a real game, this would be determined
    // by the ruleset based on current game state, participant status, etc.
    const commonActions = [
      'draw_card',
      'play_card', 
      'pass_turn',
      'view_hand',
      'shuffle_pile'
    ];

    return commonActions.filter(actionType => 
      this.canParticipantPerformAction(participantId, actionType)
    );
  }

  /**
   * Add an action-related event to the game state
   * @param action The action being processed
   * @param eventType Type of event (attempted, executed, failed, etc.)
   * @param additionalData Additional event data
   */
  private addActionEvent(action: ParticipantAction, eventType: string, additionalData?: Record<string, any>): void {
    this.gameStateAPI.addEvent({
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: Date.now(),
      participantId: action.participantId,
      data: {
        actionType: action.type,
        actionData: action.data,
        ...additionalData
      }
    });
  }

  /**
   * Validate an action through the ruleset's validation system
   * @param action The action to validate
   * @returns Validation result
   */
  private validateActionThroughRuleset(action: ParticipantAction): { isValid: boolean; reason: string } {
    try {
      // Use the ruleset's validation to check if the action is valid in current state
      const validationErrors = this.ruleset.validate(this.gameState);
      
      // Check for any action-specific validation errors
      const actionErrors = validationErrors.filter(error => 
        error.code.includes('ACTION') || 
        error.message.toLowerCase().includes('action')
      );

      if (actionErrors.length > 0) {
        return { 
          isValid: false, 
          reason: actionErrors[0]?.message || 'Action validation failed'
        };
      }

      // Basic validation passed
      return { isValid: true, reason: 'Action is valid' };

    } catch (error) {
      return { 
        isValid: false, 
        reason: `Validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute an action through the Game State API
   * @param action The action to execute
   * @returns Execution result
   */
  private executeActionThroughAPI(action: ParticipantAction): { success: boolean; message: string } {
    try {
      // This is where specific action types would be handled
      // For now, we just record the action - specific implementations
      // would handle different action types (draw_card, play_card, etc.)
      
      switch (action.type) {
        case 'update_status':
          if (action.data.key && action.data.value !== undefined) {
            this.gameStateAPI.updateParticipantStatus(
              action.participantId, 
              action.data.key, 
              action.data.value
            );
          }
          break;
          
        case 'shuffle_pile':
          if (action.data.location && action.data.pileName) {
            this.gameStateAPI.shufflePile(action.data.location, action.data.pileName);
          }
          break;
          
        default:
          // For unknown action types, just record them as events
          // Specific rulesets would handle their own action types
          break;
      }

      return { success: true, message: `Action '${action.type}' executed successfully` };

    } catch (error) {
      return { 
        success: false, 
        message: `Action execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get state changes since the last event (for tracking action effects)
   * @returns Summary of recent state changes
   */
  private getStateChangesSinceLastEvent(): Record<string, any> {
    // This is a simplified implementation - in a real system, this would
    // compare the current state with a previous snapshot to detect changes
    return {
      participantCount: this.gameState.participants.size,
      handCount: this.gameState.hands.size,
      eventCount: this.gameState.events.length,
      currentPhase: this.gameState.phase
    };
  }

  /**
   * Get a summary of the current game status
   */
  public getGameSummary(): {
    gameId: string;
    phase: GamePhase;
    ruleset: string;
    deckType: string;
    participantCount: number;
    handCount: number;
    eventCount: number;
    isInitialized: boolean;
    validationErrors: ValidationError[];
    winResult: WinResult;
  } {
    const validationErrors = this.validateGameState();
    const winResult = this.checkWinConditions();

    return {
      gameId: this.gameState.gameId,
      phase: this.gameState.phase,
      ruleset: this.ruleset.name,
      deckType: this.deckType.name,
      participantCount: this.gameState.participants.size,
      handCount: this.gameState.hands.size,
      eventCount: this.gameState.events.length,
      isInitialized: this.isInitialized,
      validationErrors,
      winResult
    };
  }

  /**
   * Create a participant in the game
   * @param participantId Unique identifier for the participant
   * @param name Display name for the participant
   * @param isNPC Whether this participant is an NPC
   */
  public createParticipant(participantId: string, name: string, isNPC: boolean = false): void {
    if (this.gameState.participants.has(participantId)) {
      throw new Error(`Participant '${participantId}' already exists`);
    }

    this.gameStateAPI.createParticipant(participantId, name, isNPC);
    const updatedGameState = this.gameStateAPI.getGameState();

    // Create action descriptor
    const action: ActionDescriptor = {
      type: 'participant_created',
      description: `Created ${isNPC ? 'NPC' : 'player'} participant '${name}' with ID '${participantId}'`,
      details: {
        participantId,
        name,
        isNPC,
        totalParticipants: updatedGameState.participants.size
      },
      timestamp: Date.now()
    };

    this.updateGameStateWithSnapshot(updatedGameState, action);
  }

  /**
   * Create a hand for a participant
   * @param handId Unique identifier for the hand
   * @param name Display name for the hand
   * @param participantId ID of the participant who owns this hand
   */
  public createHand(handId: string, name: string, participantId: string): void {
    if (!this.gameState.participants.has(participantId)) {
      throw new Error(`Participant '${participantId}' does not exist`);
    }

    if (this.gameState.hands.has(handId)) {
      throw new Error(`Hand '${handId}' already exists`);
    }

    this.gameStateAPI.createHand(handId, name, participantId);
    this.gameStateAPI.addHandToParticipant(participantId, handId);
    const updatedGameState = this.gameStateAPI.getGameState();

    // Create action descriptor
    const action: ActionDescriptor = {
      type: 'hand_created',
      description: `Created hand '${name}' with ID '${handId}' for participant '${participantId}'`,
      details: {
        handId,
        handName: name,
        participantId,
        totalHands: updatedGameState.hands.size
      },
      timestamp: Date.now()
    };

    this.updateGameStateWithSnapshot(updatedGameState, action);
  }

  /**
   * Assign an existing hand to a participant
   * @param participantId ID of the participant
   * @param handId ID of the hand to assign
   */
  public assignHandToParticipant(participantId: string, handId: string): void {
    if (!this.gameState.participants.has(participantId)) {
      throw new Error(`Participant '${participantId}' does not exist`);
    }

    if (!this.gameState.hands.has(handId)) {
      throw new Error(`Hand '${handId}' does not exist`);
    }

    this.gameStateAPI.addHandToParticipant(participantId, handId);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Remove a hand from a participant
   * @param participantId ID of the participant
   * @param handId ID of the hand to remove
   */
  public removeHandFromParticipant(participantId: string, handId: string): void {
    if (!this.gameState.participants.has(participantId)) {
      throw new Error(`Participant '${participantId}' does not exist`);
    }

    this.gameStateAPI.removeHandFromParticipant(participantId, handId);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Update participant status
   * @param participantId ID of the participant
   * @param key Status key to update
   * @param value New status value
   */
  public updateParticipantStatus(participantId: string, key: string, value: any): void {
    if (!this.gameState.participants.has(participantId)) {
      throw new Error(`Participant '${participantId}' does not exist`);
    }

    this.gameStateAPI.updateParticipantStatus(participantId, key, value);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Update hand status
   * @param handId ID of the hand
   * @param key Status key to update
   * @param value New status value
   */
  public updateHandStatus(handId: string, key: string, value: any): void {
    if (!this.gameState.hands.has(handId)) {
      throw new Error(`Hand '${handId}' does not exist`);
    }

    this.gameStateAPI.updateHandStatus(handId, key, value);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Update gameboard status
   * @param key Status key to update
   * @param value New status value
   */
  public updateGameboardStatus(key: string, value: any): void {
    this.gameStateAPI.updateGameboardStatus(key, value);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Create a pile on the gameboard
   * @param pileName Name of the pile
   * @param isOrdered Whether the pile maintains card order
   * @param orientation Default orientation for cards in this pile
   */
  public createGameboardPile(pileName: string, isOrdered: boolean = true, orientation?: import('../core/types').CardOrientation): void {
    this.gameStateAPI.createGameboardPile(pileName, isOrdered, orientation);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Create a pile in a hand
   * @param handId ID of the hand
   * @param pileName Name of the pile
   * @param isOrdered Whether the pile maintains card order
   * @param orientation Default orientation for cards in this pile
   */
  public createHandPile(handId: string, pileName: string, isOrdered: boolean = true, orientation?: import('../core/types').CardOrientation): void {
    if (!this.gameState.hands.has(handId)) {
      throw new Error(`Hand '${handId}' does not exist`);
    }

    this.gameStateAPI.createHandPile(handId, pileName, isOrdered, orientation);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Transfer card ownership between participants
   * @param location Location of the card ('gameboard' or hand ID)
   * @param pileName Name of the pile containing the card
   * @param cardIndex Index of the card in the pile
   * @param newOwner ID of the new owner (null for no owner)
   */
  public transferCardOwnership(location: 'gameboard' | string, pileName: string, cardIndex: number, newOwner: string | null): void {
    // Validate new owner exists if specified
    if (newOwner && !this.gameState.participants.has(newOwner)) {
      throw new Error(`New owner '${newOwner}' does not exist`);
    }

    this.gameStateAPI.updateCardOwnership(location, pileName, cardIndex, newOwner);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Move a card between piles
   * @param fromLocation Source location ('gameboard' or hand ID)
   * @param fromPile Source pile name
   * @param fromIndex Index of card in source pile
   * @param toLocation Destination location ('gameboard' or hand ID)
   * @param toPile Destination pile name
   */
  public moveCard(fromLocation: 'gameboard' | string, fromPile: string, fromIndex: number, toLocation: 'gameboard' | string, toPile: string): void {
    this.gameStateAPI.moveCard(fromLocation, fromPile, fromIndex, toLocation, toPile);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Shuffle a pile
   * @param location Location of the pile ('gameboard' or hand ID)
   * @param pileName Name of the pile to shuffle
   */
  public shufflePile(location: 'gameboard' | string, pileName: string): void {
    this.gameStateAPI.shufflePile(location, pileName);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Flip a card (change face-up/face-down status)
   * @param location Location of the card ('gameboard' or hand ID)
   * @param pileName Name of the pile containing the card
   * @param cardIndex Index of the card in the pile
   * @param faceUp Whether the card should be face-up
   */
  public flipCard(location: 'gameboard' | string, pileName: string, cardIndex: number, faceUp: boolean): void {
    this.gameStateAPI.flipCard(location, pileName, cardIndex, faceUp);
    this.gameState = this.gameStateAPI.getGameState();
  }

  /**
   * Complete the game and perform cleanup
   * @param reason Reason for game completion
   * @param winners Array of winning participant IDs
   */
  public completeGame(reason: string, winners: string[] = []): void {
    // Validate winners exist
    for (const winnerId of winners) {
      if (!this.gameState.participants.has(winnerId)) {
        throw new Error(`Winner '${winnerId}' does not exist`);
      }
    }

    // Transition to finished phase
    this.transitionToPhase(GamePhase.FINISHED);

    // Add game completion event
    this.gameStateAPI.addEvent({
      id: `game_completed_${Date.now()}`,
      type: 'game_completed',
      timestamp: Date.now(),
      data: {
        reason,
        winners,
        finalPhase: GamePhase.FINISHED
      }
    });

    const updatedGameState = this.gameStateAPI.getGameState();

    // Create action descriptor for game completion
    const action: ActionDescriptor = {
      type: 'game_completed',
      description: `Game completed: ${reason}${winners.length > 0 ? ` - Winners: ${winners.join(', ')}` : ''}`,
      details: {
        reason,
        winners,
        finalPhase: GamePhase.FINISHED,
        completionTime: Date.now(),
        totalSnapshots: this.historyManager.getGameHistory().snapshots.size
      },
      timestamp: Date.now()
    };

    this.updateGameStateWithSnapshot(updatedGameState, action);
  }

  /**
   * Reset the game to initial state (keeping participants and basic structure)
   */
  public resetGame(): void {
    // Create new game state with same ID but reset phase and clear events
    const resetGameState = new GameStateModel(
      this.gameState.gameId,
      GamePhase.SETUP,
      new Gameboard(), // Reset to default gameboard
      this.gameState.participants as Map<string, Participant>, // Keep participants
      new Map<string, Hand>(), // Clear hands
      [], // Clear events
      this.gameState.metadata // Keep metadata
    );

    this.isInitialized = false;

    // Add reset event
    this.gameStateAPI.addEvent({
      id: `game_reset_${Date.now()}`,
      type: 'game_reset',
      timestamp: Date.now(),
      data: {
        resetTimestamp: Date.now()
      }
    });

    const updatedGameState = this.gameStateAPI.getGameState();

    // Create action descriptor for game reset
    const action: ActionDescriptor = {
      type: 'game_reset',
      description: 'Game was reset to initial state',
      details: {
        resetTimestamp: Date.now(),
        participantsKept: resetGameState.participants.size,
        handsCleared: this.gameState.hands.size,
        eventsCleared: this.gameState.events.length
      },
      timestamp: Date.now()
    };

    this.updateGameStateWithSnapshot(updatedGameState, action);
  }

  /**
   * Check if the game is in a finished state
   */
  public isGameFinished(): boolean {
    return this.gameState.phase === GamePhase.FINISHED;
  }

  /**
   * Get all participants in the game
   */
  public getParticipants(): Map<string, import('../core/interfaces').Participant> {
    return new Map(this.gameState.participants);
  }

  /**
   * Get all hands in the game
   */
  public getHands(): Map<string, import('../core/interfaces').Hand> {
    return new Map(this.gameState.hands);
  }

  /**
   * Get hands belonging to a specific participant
   * @param participantId ID of the participant
   */
  public getParticipantHands(participantId: string): import('../core/interfaces').Hand[] {
    const participant = this.gameState.participants.get(participantId);
    if (!participant) {
      return [];
    }

    return participant.handIds
      .map(handId => this.gameState.hands.get(handId))
      .filter((hand): hand is import('../core/interfaces').Hand => hand !== undefined);
  }

  /**
   * Update game state and create a snapshot in history
   * @param newGameState The new game state
   * @param action The action that caused this state change
   */
  private updateGameStateWithSnapshot(newGameState: GameState, action: ActionDescriptor): void {
    // Update internal state
    this.gameState = newGameState;
    this.gameStateAPI.updateGameState(newGameState);
    
    // Create snapshot in history
    this.historyManager.createSnapshot(newGameState, action);
  }

  /**
   * Validate that a phase transition is allowed
   * @param fromPhase Current phase
   * @param toPhase Target phase
   */
  private validatePhaseTransition(fromPhase: GamePhase, toPhase: GamePhase): void {
    // Define allowed transitions
    const allowedTransitions: Record<GamePhase, GamePhase[]> = {
      [GamePhase.SETUP]: [GamePhase.DEALING, GamePhase.PLAYING],
      [GamePhase.DEALING]: [GamePhase.PLAYING, GamePhase.SETUP],
      [GamePhase.PLAYING]: [GamePhase.SCORING, GamePhase.FINISHED],
      [GamePhase.SCORING]: [GamePhase.PLAYING, GamePhase.FINISHED],
      [GamePhase.FINISHED]: [] // No transitions from finished
    };

    const allowed = allowedTransitions[fromPhase] || [];
    if (!allowed.includes(toPhase)) {
      throw new Error(`Invalid phase transition from ${fromPhase} to ${toPhase}`);
    }
  }
}