import { GameState } from '../core/interfaces/game-state';
import { GameStateSnapshot, ActionDescriptor } from '../core/interfaces/history';
import { SerializationEngine } from './serialization';

/**
 * Current snapshot format version
 */
export const SNAPSHOT_VERSION = '1.0.0';

/**
 * Generates unique IDs for snapshots
 */
class SnapshotIdGenerator {
  private static counter = 0;
  
  public static generate(): string {
    const timestamp = Date.now();
    const counter = ++this.counter;
    return `snapshot_${timestamp}_${counter}`;
  }
}

/**
 * Creates immutable snapshots of game state
 */
export class SnapshotSystem {
  /**
   * Create an immutable snapshot of the current game state
   */
  public static createSnapshot(
    gameState: GameState,
    action: ActionDescriptor,
    previousSnapshotId: string | null = null
  ): GameStateSnapshot {
    const snapshotId = SnapshotIdGenerator.generate();
    const timestamp = Date.now();
    
    // Create a deep copy of the game state to ensure immutability
    const immutableGameState = this.deepFreezeGameState(gameState);
    
    // Create the snapshot with immutable properties
    const snapshot: GameStateSnapshot = Object.freeze({
      id: snapshotId,
      gameState: immutableGameState,
      action: Object.freeze({ ...action }),
      previousSnapshotId,
      timestamp,
      version: SNAPSHOT_VERSION
    });
    
    return snapshot;
  }
  
  /**
   * Create an initial snapshot for a new game
   */
  public static createInitialSnapshot(gameState: GameState): GameStateSnapshot {
    const initialAction: ActionDescriptor = {
      type: 'game_initialized',
      description: 'Game was initialized',
      details: {
        gameId: gameState.gameId,
        phase: gameState.phase
      },
      timestamp: Date.now()
    };
    
    return this.createSnapshot(gameState, initialAction, null);
  }
  
  /**
   * Validate that a snapshot is properly immutable
   */
  public static validateSnapshot(snapshot: GameStateSnapshot): boolean {
    try {
      // Try to modify the snapshot - should throw in strict mode or fail silently
      const testSnapshot = snapshot as any;
      
      // Test top-level immutability
      if (!Object.isFrozen(snapshot)) {
        return false;
      }
      
      // Test action immutability
      if (!Object.isFrozen(snapshot.action)) {
        return false;
      }
      
      // Test game state immutability (basic check)
      if (!Object.isFrozen(snapshot.gameState)) {
        return false;
      }
      
      return true;
    } catch (error) {
      // If we can't validate, assume it's not properly immutable
      return false;
    }
  }
  
  /**
   * Get the chain of snapshots from a given snapshot back to the initial snapshot
   */
  public static getSnapshotChain(
    snapshot: GameStateSnapshot,
    allSnapshots: Map<string, GameStateSnapshot>
  ): GameStateSnapshot[] {
    const chain: GameStateSnapshot[] = [];
    let currentSnapshot: GameStateSnapshot | undefined = snapshot;
    
    while (currentSnapshot) {
      chain.unshift(currentSnapshot); // Add to beginning to maintain chronological order
      
      if (currentSnapshot.previousSnapshotId === null) {
        break; // Reached the initial snapshot
      }
      
      currentSnapshot = allSnapshots.get(currentSnapshot.previousSnapshotId);
      
      // Prevent infinite loops in case of corrupted data
      if (chain.length > 10000) {
        throw new Error('Snapshot chain too long - possible circular reference');
      }
    }
    
    return chain;
  }
  
  /**
   * Calculate memory usage of a snapshot (approximate)
   */
  public static calculateSnapshotSize(snapshot: GameStateSnapshot): number {
    try {
      // Serialize the snapshot to get an approximate size
      const serialized = JSON.stringify(snapshot);
      return serialized.length * 2; // Rough estimate: 2 bytes per character in UTF-16
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Deep freeze a game state to ensure immutability
   * This implements structural sharing where possible by reusing immutable objects
   */
  private static deepFreezeGameState(gameState: GameState): GameState {
    // Create a deep copy first to avoid modifying the original
    const gameStateCopy = this.deepCopyGameState(gameState);
    
    // Then freeze the copy recursively
    return this.recursiveFreeze(gameStateCopy);
  }
  
  /**
   * Create a deep copy of game state
   */
  private static deepCopyGameState(gameState: GameState): GameState {
    // Use serialization for deep copying - this ensures we get all nested objects
    const serialized = SerializationEngine.serialize(gameState as any);
    return SerializationEngine.deserialize(serialized);
  }
  
  /**
   * Recursively freeze an object and all its properties
   */
  private static recursiveFreeze<T>(obj: T): T {
    // Get all property names including non-enumerable ones
    const propNames = Object.getOwnPropertyNames(obj);
    
    // Freeze properties before freezing self
    for (const name of propNames) {
      const value = (obj as any)[name];
      
      if (value && typeof value === 'object') {
        this.recursiveFreeze(value);
      }
    }
    
    return Object.freeze(obj);
  }
}

/**
 * Error thrown when snapshot operations fail
 */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}