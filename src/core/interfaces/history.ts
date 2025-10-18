import { GameState } from './game-state';

/**
 * Describes an action that caused a state change
 */
export interface ActionDescriptor {
  /** Type of action performed */
  readonly type: string;
  
  /** Human-readable description of the action */
  readonly description: string;
  
  /** ID of participant who performed the action (if applicable) */
  readonly participantId?: string;
  
  /** Additional details about the action */
  readonly details: Record<string, any>;
  
  /** When the action was performed */
  readonly timestamp: number;
}

/**
 * Immutable snapshot of game state at a specific point in time
 */
export interface GameStateSnapshot {
  /** Unique identifier for this snapshot */
  readonly id: string;
  
  /** The game state at this point in time */
  readonly gameState: GameState;
  
  /** Action that caused this state change */
  readonly action: ActionDescriptor;
  
  /** ID of the previous snapshot in the chain (null for initial snapshot) */
  readonly previousSnapshotId: string | null;
  
  /** When this snapshot was created */
  readonly timestamp: number;
  
  /** Serialization format version for this snapshot */
  readonly version: string;
}

/**
 * Complete history of a game as a linked list of snapshots
 */
export interface GameHistory {
  /** Game ID this history belongs to */
  readonly gameId: string;
  
  /** All snapshots indexed by ID */
  readonly snapshots: Map<string, GameStateSnapshot>;
  
  /** ID of the current (most recent) snapshot */
  readonly currentSnapshotId: string;
  
  /** ID of the initial snapshot */
  readonly initialSnapshotId: string;
  
  /** Additional metadata about the game history */
  readonly metadata: Record<string, any>;
}

/**
 * Metadata for serialization format versioning
 */
export interface SerializationMetadata {
  /** Serialization format version */
  readonly version: string;
  
  /** When the serialization was created */
  readonly timestamp: number;
  
  /** Version of the BigDeckEnergy library that created this */
  readonly libraryVersion: string;
  
  /** Format type (full includes all data, compressed optimizes for size) */
  readonly format: 'full' | 'compressed';
}

/**
 * Serialized format for game history
 */
export interface SerializedGameHistory {
  /** Serialization metadata */
  readonly metadata: SerializationMetadata;
  
  /** Game ID */
  readonly gameId: string;
  
  /** Array of serialized snapshots */
  readonly snapshots: SerializedSnapshot[];
  
  /** Index mapping snapshot IDs to array positions for fast lookup */
  readonly snapshotIndex: Record<string, number>;
}

/**
 * Serialized format for individual snapshots
 */
export interface SerializedSnapshot {
  /** Snapshot ID */
  readonly id: string;
  
  /** Serialized game state */
  readonly gameState: any; // Will be SerializedGameState from serialization.ts
  
  /** Action descriptor */
  readonly action: ActionDescriptor;
  
  /** Previous snapshot ID */
  readonly previousSnapshotId: string | null;
  
  /** Timestamp */
  readonly timestamp: number;
}