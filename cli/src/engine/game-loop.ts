import { EventEmitter } from 'events';
import { GameInstance, GameState } from 'big-deck-energy';
import { GameResult } from '../types/actions';

/**
 * Game action that can be processed by the game loop.
 */
export interface GameAction {
  /** Unique identifier for the action type */
  type: string;
  
  /** ID of the player performing the action */
  playerId: string;
  
  /** Action-specific payload data */
  payload: any;
  
  /** Timestamp when the action was created */
  timestamp: number;
}

/**
 * Event-driven game loop that manages turn-based gameplay.
 * Handles action processing, state updates, and turn management.
 */
export class GameLoop extends EventEmitter {
  private gameInstance: GameInstance;
  private turnTimer?: NodeJS.Timeout;
  private turnTimeLimit?: number;
  private isProcessingAction = false;
  private actionQueue: GameAction[] = [];

  constructor(gameInstance: GameInstance, turnTimeLimit?: number) {
    super();
    this.gameInstance = gameInstance;
    this.turnTimeLimit = turnTimeLimit;
  }

  /**
   * Start the game loop.
   * Emits 'gameStart' event and begins turn management.
   */
  start(): void {
    this.emit('gameStart', this.gameInstance);
    this.emit('stateUpdate', (this.gameInstance as any).getState());
    this.startTurn();
  }

  /**
   * Process a player action atomically.
   * Returns true if the action was valid and processed.
   */
  processAction(action: GameAction): boolean {
    if (this.isProcessingAction) {
      // Queue the action if we're already processing one
      this.actionQueue.push(action);
      return true;
    }

    this.isProcessingAction = true;

    try {
      // Validate the action
      if (!this.isValidAction(action)) {
        this.emit('actionRejected', action, 'Invalid action');
        return false;
      }

      // Apply the action to the game instance
      const success = this.applyActionToGame(action);
      
      if (success) {
        this.emit('actionProcessed', action);
        this.emit('stateUpdate', (this.gameInstance as any).getState());
        
        // Check if the game has ended
        if (this.checkGameEnd()) {
          this.endGame();
        } else {
          // Move to next turn if needed
          this.nextTurn();
        }
      } else {
        this.emit('actionRejected', action, 'Action failed to apply');
      }

      return success;
    } finally {
      this.isProcessingAction = false;
      
      // Process next queued action if any
      if (this.actionQueue.length > 0) {
        const nextAction = this.actionQueue.shift()!;
        setImmediate(() => this.processAction(nextAction));
      }
    }
  }

  /**
   * Start a turn timer for the current player.
   * Emits 'turnTimeout' if the timer expires.
   */
  startTurnTimer(duration?: number): void {
    this.clearTurnTimer();
    
    const timeLimit = duration || this.turnTimeLimit;
    if (!timeLimit) return;

    this.turnTimer = setTimeout(() => {
      const currentPlayer = this.getCurrentPlayer();
      this.emit('turnTimeout', currentPlayer);
      
      // Automatically skip turn on timeout
      this.nextTurn();
    }, timeLimit);

    this.emit('turnTimerStarted', timeLimit);
  }

  /**
   * Clear the current turn timer.
   */
  clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = undefined;
      this.emit('turnTimerCleared');
    }
  }

  /**
   * Force end the current game.
   */
  forceEnd(reason: string = 'forced'): void {
    this.clearTurnTimer();
    
    const result: GameResult = {
      winner: '', // No winner for forced end
      endReason: 'forfeit',
      stats: {
        totalTurns: 0,
        gameDuration: Date.now() - this.getGameStartTime(),
        finalScores: {},
        customStats: { endReason: reason }
      }
    };

    this.emit('gameEnd', this.gameInstance, result);
  }

  /**
   * Get the current game state.
   */
  getGameState(): GameState {
    return (this.gameInstance as any).getState();
  }

  /**
   * Get the current active player.
   */
  getCurrentPlayer(): string {
    return (this.gameInstance as any).getCurrentPlayer();
  }

  /**
   * Check if an action is valid for the current game state.
   */
  private isValidAction(action: GameAction): boolean {
    // Basic validation
    if (!action.type || !action.playerId) {
      return false;
    }

    // Check if it's the correct player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (action.playerId !== currentPlayer) {
      return false;
    }

    // Additional game-specific validation would go here
    // This would typically delegate to the game instance or ruleset
    return true;
  }

  /**
   * Apply an action to the game instance.
   */
  private applyActionToGame(action: GameAction): boolean {
    try {
      // This would typically call methods on the game instance
      // The exact implementation depends on BigDeckEnergy's API
      // For now, we'll assume the game instance has an applyAction method
      return (this.gameInstance as any).applyAction?.(action) ?? true;
    } catch (error) {
      this.emit('actionError', action, error);
      return false;
    }
  }

  /**
   * Check if the game has ended.
   */
  private checkGameEnd(): boolean {
    // This would typically check win conditions through the game instance
    // The exact implementation depends on BigDeckEnergy's API
    return (this.gameInstance as any).isGameEnded?.() ?? false;
  }

  /**
   * Start a new turn.
   */
  private startTurn(): void {
    const currentPlayer = this.getCurrentPlayer();
    this.emit('turnStart', currentPlayer);
    
    if (this.turnTimeLimit) {
      this.startTurnTimer();
    }
  }

  /**
   * Move to the next turn.
   */
  private nextTurn(): void {
    this.clearTurnTimer();
    
    // This would typically advance the turn in the game instance
    const previousPlayer = this.getCurrentPlayer();
    
    // Advance turn (implementation depends on BigDeckEnergy's API)
    (this.gameInstance as any).nextTurn?.();
    
    const newPlayer = this.getCurrentPlayer();
    
    if (newPlayer !== previousPlayer) {
      this.emit('turnChange', newPlayer, previousPlayer);
      this.startTurn();
    }
  }

  /**
   * End the game and emit final results.
   */
  private endGame(): void {
    this.clearTurnTimer();
    
    // Get game results (implementation depends on BigDeckEnergy's API)
    const winner = (this.gameInstance as any).getWinner?.() ?? '';
    const stats = this.calculateGameStats();
    
    const result: GameResult = {
      winner,
      endReason: 'win',
      stats
    };

    this.emit('gameEnd', this.gameInstance, result);
  }

  /**
   * Calculate game statistics.
   */
  private calculateGameStats() {
    return {
      totalTurns: (this.gameInstance as any).getTurnCount?.() ?? 0,
      gameDuration: Date.now() - this.getGameStartTime(),
      finalScores: (this.gameInstance as any).getFinalScores?.() ?? {},
      customStats: {}
    };
  }

  /**
   * Get the game start time.
   */
  private getGameStartTime(): number {
    return (this.gameInstance as any).startTime ?? Date.now();
  }
}

/**
 * Type definitions for GameLoop events.
 */
export interface GameLoopEvents {
  gameStart: (gameInstance: GameInstance) => void;
  gameEnd: (gameInstance: GameInstance, result: GameResult) => void;
  stateUpdate: (state: GameState) => void;
  turnStart: (playerId: string) => void;
  turnChange: (newPlayerId: string, previousPlayerId: string) => void;
  turnTimeout: (playerId: string) => void;
  turnTimerStarted: (duration: number) => void;
  turnTimerCleared: () => void;
  actionProcessed: (action: GameAction) => void;
  actionRejected: (action: GameAction, reason: string) => void;
  actionError: (action: GameAction, error: any) => void;
}

// Extend EventEmitter with typed events
export interface GameLoopTyped {
  on<K extends keyof GameLoopEvents>(event: K, listener: GameLoopEvents[K]): this;
  emit<K extends keyof GameLoopEvents>(event: K, ...args: Parameters<GameLoopEvents[K]>): boolean;
}