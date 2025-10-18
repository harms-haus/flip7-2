import { EventEmitter } from 'events';
import { GameState } from 'big-deck-energy';
import { GamePhase } from '../types/application-state';

/**
 * Game state change event data.
 */
export interface GameStateChange {
  /** Previous game state */
  previousState: GameState | null;
  
  /** New game state */
  newState: GameState;
  
  /** Timestamp of the change */
  timestamp: number;
  
  /** Type of change that occurred */
  changeType: GameStateChangeType;
  
  /** Additional metadata about the change */
  metadata?: Record<string, any>;
}

/**
 * Types of game state changes.
 */
export type GameStateChangeType = 
  | 'initialization'
  | 'turn_change'
  | 'action_applied'
  | 'phase_change'
  | 'player_joined'
  | 'player_left'
  | 'game_ended'
  | 'state_restored';

/**
 * Game phase transition information.
 */
export interface GamePhaseTransition {
  /** Previous phase */
  from: GamePhase;
  
  /** New phase */
  to: GamePhase;
  
  /** Timestamp of transition */
  timestamp: number;
  
  /** Reason for the transition */
  reason: string;
}

/**
 * Manages game state synchronization and validation.
 * Provides centralized state management with event broadcasting.
 */
export class GameStateManager extends EventEmitter {
  private currentState: GameState | null = null;
  private currentPhase: GamePhase = 'setup';
  private stateHistory: GameStateChange[] = [];
  private maxHistorySize = 100;
  private validationEnabled = true;

  constructor(maxHistorySize = 100) {
    super();
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Update the game state and broadcast changes.
   */
  updateState(newState: GameState, changeType: GameStateChangeType, metadata?: Record<string, any>): void {
    const previousState = this.currentState;
    
    // Validate the state change if validation is enabled
    if (this.validationEnabled && !this.validateStateChange(previousState, newState, changeType)) {
      this.emit('stateValidationError', {
        previousState,
        newState,
        changeType,
        reason: 'State validation failed'
      });
      return;
    }

    // Create state change record
    const stateChange: GameStateChange = {
      previousState,
      newState,
      timestamp: Date.now(),
      changeType,
      metadata
    };

    // Update current state
    this.currentState = newState;

    // Add to history
    this.addToHistory(stateChange);

    // Broadcast the state update
    this.emit('stateUpdate', stateChange);
    this.emit('stateChanged', newState, previousState);

    // Check for phase changes
    this.checkPhaseTransition(newState, previousState);
  }

  /**
   * Get the current game state.
   */
  getCurrentState(): GameState | null {
    return this.currentState;
  }

  /**
   * Get the current game phase.
   */
  getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  /**
   * Set the current game phase and emit transition events.
   */
  setPhase(newPhase: GamePhase, reason: string = 'manual'): void {
    if (newPhase === this.currentPhase) {
      return;
    }

    const transition: GamePhaseTransition = {
      from: this.currentPhase,
      to: newPhase,
      timestamp: Date.now(),
      reason
    };

    this.currentPhase = newPhase;
    this.emit('phaseTransition', transition);
    this.emit('phaseChanged', newPhase, transition.from);
  }

  /**
   * Get the state change history.
   */
  getStateHistory(): GameStateChange[] {
    return [...this.stateHistory];
  }

  /**
   * Clear the state history.
   */
  clearHistory(): void {
    this.stateHistory = [];
    this.emit('historyCleaned');
  }

  /**
   * Enable or disable state validation.
   */
  setValidationEnabled(enabled: boolean): void {
    this.validationEnabled = enabled;
  }

  /**
   * Validate a state change for consistency.
   */
  validateStateChange(
    previousState: GameState | null, 
    newState: GameState, 
    changeType: GameStateChangeType
  ): boolean {
    // Basic validation rules
    if (!newState) {
      return false;
    }

    // Validate based on change type
    switch (changeType) {
      case 'initialization':
        return previousState === null;
        
      case 'turn_change':
        return this.validateTurnChange(previousState, newState);
        
      case 'action_applied':
        return this.validateActionApplied(previousState, newState);
        
      case 'phase_change':
        return this.validatePhaseChange(previousState, newState);
        
      case 'game_ended':
        return this.validateGameEnd(previousState, newState);
        
      default:
        return true; // Allow other change types by default
    }
  }

  /**
   * Create a state snapshot for save/restore operations.
   */
  createSnapshot(): GameStateSnapshot {
    return {
      state: this.currentState,
      phase: this.currentPhase,
      timestamp: Date.now(),
      history: this.stateHistory.slice(-10) // Keep last 10 changes
    };
  }

  /**
   * Restore state from a snapshot.
   */
  restoreFromSnapshot(snapshot: GameStateSnapshot): void {
    if (!snapshot.state) {
      throw new Error('Invalid snapshot: missing state');
    }

    const previousState = this.currentState;
    this.currentState = snapshot.state;
    this.currentPhase = snapshot.phase;
    
    // Restore limited history
    this.stateHistory = snapshot.history || [];

    // Emit restoration events
    this.updateState(snapshot.state, 'state_restored', {
      restoredFrom: snapshot.timestamp,
      previousPhase: this.currentPhase
    });

    this.emit('stateRestored', snapshot, previousState);
  }

  /**
   * Get state consistency report.
   */
  getConsistencyReport(): StateConsistencyReport {
    const state = this.currentState;
    const issues: string[] = [];

    if (!state) {
      issues.push('No current state available');
      return { isConsistent: false, issues, timestamp: Date.now() };
    }

    // Check basic state consistency
    if (!this.validateStateStructure(state)) {
      issues.push('Invalid state structure');
    }

    // Check phase consistency
    if (!this.validatePhaseConsistency(state, this.currentPhase)) {
      issues.push('Phase inconsistent with state');
    }

    return {
      isConsistent: issues.length === 0,
      issues,
      timestamp: Date.now()
    };
  }

  /**
   * Add a state change to history with size management.
   */
  private addToHistory(stateChange: GameStateChange): void {
    this.stateHistory.push(stateChange);
    
    // Trim history if it exceeds max size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Check for phase transitions based on state changes.
   */
  private checkPhaseTransition(newState: GameState, _previousState: GameState | null): void {
    let newPhase = this.currentPhase;

    // Determine phase based on state
    if (this.isGameEnded(newState)) {
      newPhase = 'ended';
    } else if (this.isGamePlaying(newState)) {
      newPhase = 'playing';
    } else if (this.isGameSetup(newState)) {
      newPhase = 'setup';
    }

    if (newPhase !== this.currentPhase) {
      this.setPhase(newPhase, 'automatic');
    }
  }

  /**
   * Validate turn change consistency.
   */
  private validateTurnChange(previousState: GameState | null, newState: GameState): boolean {
    if (!previousState) return true;
    
    // Basic validation - ensure turn actually changed
    return this.getCurrentPlayer(newState) !== this.getCurrentPlayer(previousState);
  }

  /**
   * Validate action application consistency.
   */
  private validateActionApplied(previousState: GameState | null, newState: GameState): boolean {
    if (!previousState) return true;
    
    // Ensure state actually changed
    return !this.statesEqual(previousState, newState);
  }

  /**
   * Validate phase change consistency.
   */
  private validatePhaseChange(_previousState: GameState | null, _newState: GameState): boolean {
    // Phase changes should be valid transitions
    return true; // Simplified validation
  }

  /**
   * Validate game end consistency.
   */
  private validateGameEnd(_previousState: GameState | null, newState: GameState): boolean {
    return this.isGameEnded(newState);
  }

  /**
   * Validate basic state structure.
   */
  private validateStateStructure(state: GameState): boolean {
    // Basic structure validation
    return state && typeof state === 'object';
  }

  /**
   * Validate phase consistency with state.
   */
  private validatePhaseConsistency(state: GameState, phase: GamePhase): boolean {
    switch (phase) {
      case 'ended':
        return this.isGameEnded(state);
      case 'playing':
        return this.isGamePlaying(state);
      case 'setup':
        return this.isGameSetup(state);
      default:
        return true;
    }
  }

  /**
   * Check if game is in ended state.
   */
  private isGameEnded(state: GameState): boolean {
    // This would depend on BigDeckEnergy's API
    return (state as any).isEnded ?? false;
  }

  /**
   * Check if game is in playing state.
   */
  private isGamePlaying(state: GameState): boolean {
    // This would depend on BigDeckEnergy's API
    return (state as any).isPlaying ?? true;
  }

  /**
   * Check if game is in setup state.
   */
  private isGameSetup(state: GameState): boolean {
    // This would depend on BigDeckEnergy's API
    return (state as any).isSetup ?? false;
  }

  /**
   * Get current player from state.
   */
  private getCurrentPlayer(state: GameState): string {
    // This would depend on BigDeckEnergy's API
    return (state as any).currentPlayer ?? '';
  }

  /**
   * Compare two states for equality.
   */
  private statesEqual(state1: GameState, state2: GameState): boolean {
    // Simplified equality check
    return JSON.stringify(state1) === JSON.stringify(state2);
  }
}

/**
 * State snapshot for save/restore operations.
 */
export interface GameStateSnapshot {
  state: GameState | null;
  phase: GamePhase;
  timestamp: number;
  history?: GameStateChange[];
}

/**
 * State consistency report.
 */
export interface StateConsistencyReport {
  isConsistent: boolean;
  issues: string[];
  timestamp: number;
}

/**
 * Type definitions for GameStateManager events.
 */
export interface GameStateManagerEvents {
  stateUpdate: (change: GameStateChange) => void;
  stateChanged: (newState: GameState, previousState: GameState | null) => void;
  phaseTransition: (transition: GamePhaseTransition) => void;
  phaseChanged: (newPhase: GamePhase, previousPhase: GamePhase) => void;
  stateValidationError: (error: any) => void;
  historyCleaned: () => void;
  stateRestored: (snapshot: GameStateSnapshot, previousState: GameState | null) => void;
}

// Extend EventEmitter with typed events
export interface GameStateManagerTyped {
  on<K extends keyof GameStateManagerEvents>(event: K, listener: GameStateManagerEvents[K]): this;
  emit<K extends keyof GameStateManagerEvents>(event: K, ...args: Parameters<GameStateManagerEvents[K]>): boolean;
}