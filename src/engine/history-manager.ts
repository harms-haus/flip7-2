import { GameState } from '../core/interfaces/game-state';
import { 
  GameHistory, 
  GameStateSnapshot, 
  ActionDescriptor,
  SerializedGameHistory,
  SerializedSnapshot
} from '../core/interfaces/history';
import { SnapshotSystem, SnapshotError } from './snapshot-system';
import { SerializationEngine } from './serialization';

/**
 * Manages game history as a linked list of immutable snapshots
 */
export class HistoryManager {
  private snapshots: Map<string, GameStateSnapshot>;
  private currentSnapshotId: string;
  private initialSnapshotId: string;
  private gameId: string;
  private metadata: Record<string, any>;
  
  /**
   * Create a new history manager for a game
   */
  constructor(gameId: string, initialGameState: GameState, metadata: Record<string, any> = {}) {
    this.gameId = gameId;
    this.snapshots = new Map();
    this.metadata = { ...metadata };
    
    // Create initial snapshot
    const initialSnapshot = SnapshotSystem.createInitialSnapshot(initialGameState);
    this.snapshots.set(initialSnapshot.id, initialSnapshot);
    this.initialSnapshotId = initialSnapshot.id;
    this.currentSnapshotId = initialSnapshot.id;
  }
  
  /**
   * Create a new snapshot and add it to the history
   */
  public createSnapshot(gameState: GameState, action: ActionDescriptor): GameStateSnapshot {
    const snapshot = SnapshotSystem.createSnapshot(gameState, action, this.currentSnapshotId);
    
    // Validate the snapshot is properly immutable
    if (!SnapshotSystem.validateSnapshot(snapshot)) {
      throw new HistoryError('Created snapshot is not properly immutable');
    }
    
    // Add to history
    this.snapshots.set(snapshot.id, snapshot);
    this.currentSnapshotId = snapshot.id;
    
    return snapshot;
  }
  
  /**
   * Get the current (most recent) snapshot
   */
  public getCurrentSnapshot(): GameStateSnapshot {
    const snapshot = this.snapshots.get(this.currentSnapshotId);
    if (!snapshot) {
      throw new HistoryError(`Current snapshot not found: ${this.currentSnapshotId}`);
    }
    return snapshot;
  }
  
  /**
   * Get a specific snapshot by ID
   */
  public getSnapshotById(snapshotId: string): GameStateSnapshot | null {
    return this.snapshots.get(snapshotId) || null;
  }
  
  /**
   * Get the complete game history
   */
  public getGameHistory(): GameHistory {
    return {
      gameId: this.gameId,
      snapshots: new Map(this.snapshots), // Return a copy to maintain immutability
      currentSnapshotId: this.currentSnapshotId,
      initialSnapshotId: this.initialSnapshotId,
      metadata: { ...this.metadata }
    };
  }
  
  /**
   * Navigate to a specific snapshot (replay functionality)
   */
  public replayToSnapshot(snapshotId: string): GameState {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new HistoryError(`Snapshot not found: ${snapshotId}`);
    }
    
    // Update current snapshot pointer for navigation
    this.currentSnapshotId = snapshotId;
    
    // Return the game state from that snapshot
    return snapshot.gameState;
  }
  
  /**
   * Get the chain of snapshots from current back to initial
   */
  public getSnapshotChain(): GameStateSnapshot[] {
    const currentSnapshot = this.getCurrentSnapshot();
    return SnapshotSystem.getSnapshotChain(currentSnapshot, this.snapshots);
  }
  
  /**
   * Get snapshots in chronological order
   */
  public getSnapshotsChronological(): GameStateSnapshot[] {
    const chain = this.getSnapshotChain();
    return chain; // Chain is already in chronological order
  }
  
  /**
   * Get snapshots in reverse chronological order (newest first)
   */
  public getSnapshotsReverseChronological(): GameStateSnapshot[] {
    const chain = this.getSnapshotChain();
    return [...chain].reverse();
  }
  
  /**
   * Find snapshots by action type
   */
  public findSnapshotsByActionType(actionType: string): GameStateSnapshot[] {
    const results: GameStateSnapshot[] = [];
    
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.action.type === actionType) {
        results.push(snapshot);
      }
    }
    
    // Sort by timestamp
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Find snapshots by participant
   */
  public findSnapshotsByParticipant(participantId: string): GameStateSnapshot[] {
    const results: GameStateSnapshot[] = [];
    
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.action.participantId === participantId) {
        results.push(snapshot);
      }
    }
    
    // Sort by timestamp
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Get snapshots within a time range
   */
  public getSnapshotsInTimeRange(startTime: number, endTime: number): GameStateSnapshot[] {
    const results: GameStateSnapshot[] = [];
    
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.timestamp >= startTime && snapshot.timestamp <= endTime) {
        results.push(snapshot);
      }
    }
    
    // Sort by timestamp
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Get history statistics
   */
  public getHistoryStats(): HistoryStats {
    const snapshots = Array.from(this.snapshots.values());
    const totalSize = snapshots.reduce((sum, snapshot) => {
      return sum + SnapshotSystem.calculateSnapshotSize(snapshot);
    }, 0);
    
    const actionTypes = new Map<string, number>();
    const participants = new Set<string>();
    
    for (const snapshot of snapshots) {
      // Count action types
      const count = actionTypes.get(snapshot.action.type) || 0;
      actionTypes.set(snapshot.action.type, count + 1);
      
      // Track participants
      if (snapshot.action.participantId) {
        participants.add(snapshot.action.participantId);
      }
    }
    
    const timeSpan = snapshots.length > 1 
      ? snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp
      : 0;
    
    return {
      totalSnapshots: snapshots.length,
      totalSizeBytes: totalSize,
      timeSpanMs: timeSpan,
      actionTypeCounts: Object.fromEntries(actionTypes),
      uniqueParticipants: participants.size,
      averageSnapshotSize: snapshots.length > 0 ? totalSize / snapshots.length : 0
    };
  }
  
  /**
   * Export history to serialized format
   */
  public exportHistory(format: 'full' | 'compressed' = 'full'): string {
    const serializedHistory = this.serializeHistory(format);
    return JSON.stringify(serializedHistory, null, format === 'full' ? 2 : 0);
  }
  
  /**
   * Import history from serialized format
   */
  public static importHistory(serializedHistory: string): HistoryManager {
    const parsed = JSON.parse(serializedHistory) as SerializedGameHistory;
    return this.deserializeHistory(parsed);
  }
  
  /**
   * Validate history integrity
   */
  public validateIntegrity(): HistoryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check that initial snapshot exists
    if (!this.snapshots.has(this.initialSnapshotId)) {
      errors.push(`Initial snapshot not found: ${this.initialSnapshotId}`);
    }
    
    // Check that current snapshot exists
    if (!this.snapshots.has(this.currentSnapshotId)) {
      errors.push(`Current snapshot not found: ${this.currentSnapshotId}`);
    }
    
    // Check snapshot chain integrity
    try {
      const chain = this.getSnapshotChain();
      
      // Verify chain starts with initial snapshot
      if (chain.length > 0 && chain[0].id !== this.initialSnapshotId) {
        errors.push('Snapshot chain does not start with initial snapshot');
      }
      
      // Verify chain ends with current snapshot
      if (chain.length > 0 && chain[chain.length - 1].id !== this.currentSnapshotId) {
        errors.push('Snapshot chain does not end with current snapshot');
      }
      
      // Check for gaps in the chain
      for (let i = 1; i < chain.length; i++) {
        const current = chain[i];
        const previous = chain[i - 1];
        
        if (current.previousSnapshotId !== previous.id) {
          errors.push(`Broken chain link: ${current.id} -> ${current.previousSnapshotId} != ${previous.id}`);
        }
      }
      
    } catch (error) {
      errors.push(`Chain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Check for orphaned snapshots
    const chainSnapshots = new Set<string>();
    try {
      const chain = this.getSnapshotChain();
      chain.forEach(snapshot => chainSnapshots.add(snapshot.id));
      
      for (const snapshotId of this.snapshots.keys()) {
        if (!chainSnapshots.has(snapshotId)) {
          warnings.push(`Orphaned snapshot found: ${snapshotId}`);
        }
      }
    } catch (error) {
      // Already handled above
    }
    
    // Validate individual snapshots
    for (const snapshot of this.snapshots.values()) {
      if (!SnapshotSystem.validateSnapshot(snapshot)) {
        errors.push(`Invalid snapshot: ${snapshot.id}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Serialize history to transferable format
   */
  private serializeHistory(format: 'full' | 'compressed'): SerializedGameHistory {
    const snapshots: SerializedSnapshot[] = [];
    const snapshotIndex: Record<string, number> = {};
    
    // Get snapshots in chronological order
    const chronologicalSnapshots = this.getSnapshotsChronological();
    
    for (let i = 0; i < chronologicalSnapshots.length; i++) {
      const snapshot = chronologicalSnapshots[i];
      
      // Serialize the game state
      const serializedGameState = JSON.parse(SerializationEngine.serialize(snapshot.gameState as any));
      
      const serializedSnapshot: SerializedSnapshot = {
        id: snapshot.id,
        gameState: serializedGameState,
        action: snapshot.action,
        previousSnapshotId: snapshot.previousSnapshotId,
        timestamp: snapshot.timestamp
      };
      
      snapshots.push(serializedSnapshot);
      snapshotIndex[snapshot.id] = i;
    }
    
    return {
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        libraryVersion: '1.0.0', // TODO: Get from package.json
        format
      },
      gameId: this.gameId,
      snapshots,
      snapshotIndex
    };
  }
  
  /**
   * Deserialize history from transferable format
   */
  private static deserializeHistory(serialized: SerializedGameHistory): HistoryManager {
    // Validate format
    if (!serialized.metadata || !serialized.gameId || !serialized.snapshots) {
      throw new HistoryError('Invalid serialized history format');
    }
    
    // Find initial snapshot (the one with no previous snapshot)
    const initialSerializedSnapshot = serialized.snapshots.find(s => s.previousSnapshotId === null);
    if (!initialSerializedSnapshot) {
      throw new HistoryError('No initial snapshot found in serialized history');
    }
    
    // Deserialize initial game state
    const initialGameState = SerializationEngine.deserialize(
      JSON.stringify(initialSerializedSnapshot.gameState)
    );
    
    // Create history manager
    const historyManager = new HistoryManager(serialized.gameId, initialGameState);
    
    // Clear the auto-created initial snapshot since we'll add the real one
    historyManager.snapshots.clear();
    
    // Deserialize all snapshots
    for (const serializedSnapshot of serialized.snapshots) {
      const gameState = SerializationEngine.deserialize(
        JSON.stringify(serializedSnapshot.gameState)
      );
      
      const snapshot: GameStateSnapshot = Object.freeze({
        id: serializedSnapshot.id,
        gameState,
        action: Object.freeze({ ...serializedSnapshot.action }),
        previousSnapshotId: serializedSnapshot.previousSnapshotId,
        timestamp: serializedSnapshot.timestamp,
        version: '1.0.0' // Default version for imported snapshots
      });
      
      historyManager.snapshots.set(snapshot.id, snapshot);
      
      // Set initial and current snapshot IDs
      if (snapshot.previousSnapshotId === null) {
        historyManager.initialSnapshotId = snapshot.id;
      }
    }
    
    // Find the most recent snapshot (the one that no other snapshot references as previous)
    const referencedIds = new Set(
      serialized.snapshots
        .map(s => s.previousSnapshotId)
        .filter(id => id !== null)
    );
    
    const currentSnapshot = serialized.snapshots.find(s => !referencedIds.has(s.id));
    if (currentSnapshot) {
      historyManager.currentSnapshotId = currentSnapshot.id;
    } else {
      // Fallback: use the last snapshot in the array
      const lastSnapshot = serialized.snapshots[serialized.snapshots.length - 1];
      historyManager.currentSnapshotId = lastSnapshot.id;
    }
    
    return historyManager;
  }
}

/**
 * Statistics about game history
 */
export interface HistoryStats {
  /** Total number of snapshots */
  totalSnapshots: number;
  
  /** Total memory usage in bytes (approximate) */
  totalSizeBytes: number;
  
  /** Time span from first to last snapshot in milliseconds */
  timeSpanMs: number;
  
  /** Count of each action type */
  actionTypeCounts: Record<string, number>;
  
  /** Number of unique participants who performed actions */
  uniqueParticipants: number;
  
  /** Average snapshot size in bytes */
  averageSnapshotSize: number;
}

/**
 * Result of history validation
 */
export interface HistoryValidationResult {
  /** Whether the history is valid */
  isValid: boolean;
  
  /** Critical errors that make the history unusable */
  errors: string[];
  
  /** Non-critical warnings */
  warnings: string[];
}

/**
 * Error thrown by history management operations
 */
export class HistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoryError';
  }
}