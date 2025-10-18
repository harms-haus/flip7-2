import { SnapshotSystem, SnapshotError } from '../../src/engine/snapshot-system';
import { GameState } from '../../src/models/game-state';
import { ActionDescriptor } from '../../src/core/interfaces/history';
import { GamePhase } from '../../src/core/types';

describe('SnapshotSystem', () => {
  let gameState: GameState;
  let action: ActionDescriptor;

  beforeEach(() => {
    gameState = new GameState(
      'test-game-1',
      GamePhase.SETUP,
      undefined, // Use default Gameboard
      new Map(),
      new Map(),
      [],
      {}
    );

    action = {
      type: 'test_action',
      description: 'Test action for snapshot',
      details: { test: true },
      timestamp: Date.now()
    };
  });

  describe('createSnapshot', () => {
    it('should create an immutable snapshot', () => {
      const snapshot = SnapshotSystem.createSnapshot(gameState, action);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.gameState).toBeDefined();
      expect(snapshot.action).toEqual(action);
      expect(snapshot.previousSnapshotId).toBeNull();
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.version).toBeDefined();
    });

    it('should create snapshot with previous snapshot ID', () => {
      const previousSnapshotId = 'previous-snapshot-123';
      const snapshot = SnapshotSystem.createSnapshot(gameState, action, previousSnapshotId);

      expect(snapshot.previousSnapshotId).toBe(previousSnapshotId);
    });

    it('should create immutable snapshot objects', () => {
      const snapshot = SnapshotSystem.createSnapshot(gameState, action);

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.action)).toBe(true);
      expect(Object.isFrozen(snapshot.gameState)).toBe(true);
    });

    it('should generate unique snapshot IDs', () => {
      const snapshot1 = SnapshotSystem.createSnapshot(gameState, action);
      const snapshot2 = SnapshotSystem.createSnapshot(gameState, action);

      expect(snapshot1.id).not.toBe(snapshot2.id);
    });
  });

  describe('createInitialSnapshot', () => {
    it('should create initial snapshot with correct action', () => {
      const snapshot = SnapshotSystem.createInitialSnapshot(gameState);

      expect(snapshot.action.type).toBe('game_initialized');
      expect(snapshot.action.description).toBe('Game was initialized');
      expect(snapshot.previousSnapshotId).toBeNull();
      expect(snapshot.action.details.gameId).toBe(gameState.gameId);
    });
  });

  describe('validateSnapshot', () => {
    it('should validate properly frozen snapshot', () => {
      const snapshot = SnapshotSystem.createSnapshot(gameState, action);
      const isValid = SnapshotSystem.validateSnapshot(snapshot);

      expect(isValid).toBe(true);
    });

    it('should reject unfrozen snapshot', () => {
      const snapshot = SnapshotSystem.createSnapshot(gameState, action);
      // Create a mutable copy
      const mutableSnapshot = { ...snapshot };
      
      const isValid = SnapshotSystem.validateSnapshot(mutableSnapshot as any);

      expect(isValid).toBe(false);
    });
  });

  describe('getSnapshotChain', () => {
    it('should return chain of snapshots in chronological order', () => {
      const snapshot1 = SnapshotSystem.createInitialSnapshot(gameState);
      const snapshot2 = SnapshotSystem.createSnapshot(gameState, action, snapshot1.id);
      const snapshot3 = SnapshotSystem.createSnapshot(gameState, action, snapshot2.id);

      const allSnapshots = new Map([
        [snapshot1.id, snapshot1],
        [snapshot2.id, snapshot2],
        [snapshot3.id, snapshot3]
      ]);

      const chain = SnapshotSystem.getSnapshotChain(snapshot3, allSnapshots);

      expect(chain).toHaveLength(3);
      expect(chain[0]).toBe(snapshot1);
      expect(chain[1]).toBe(snapshot2);
      expect(chain[2]).toBe(snapshot3);
    });

    it('should handle single snapshot chain', () => {
      const snapshot = SnapshotSystem.createInitialSnapshot(gameState);
      const allSnapshots = new Map([[snapshot.id, snapshot]]);

      const chain = SnapshotSystem.getSnapshotChain(snapshot, allSnapshots);

      expect(chain).toHaveLength(1);
      expect(chain[0]).toBe(snapshot);
    });

    it('should throw error for circular reference', () => {
      const snapshot1 = SnapshotSystem.createSnapshot(gameState, action, 'circular-ref');
      const snapshot2 = SnapshotSystem.createSnapshot(gameState, action, snapshot1.id);
      
      // Create circular reference by modifying the first snapshot's previous ID
      const circularSnapshot1 = { ...snapshot1, previousSnapshotId: snapshot2.id };
      
      const allSnapshots = new Map([
        [snapshot1.id, circularSnapshot1 as any],
        [snapshot2.id, snapshot2]
      ]);

      expect(() => {
        SnapshotSystem.getSnapshotChain(snapshot2, allSnapshots);
      }).toThrow('Snapshot chain too long');
    });
  });

  describe('calculateSnapshotSize', () => {
    it('should calculate approximate snapshot size', () => {
      const snapshot = SnapshotSystem.createSnapshot(gameState, action);
      const size = SnapshotSystem.calculateSnapshotSize(snapshot);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should return 0 for invalid snapshot', () => {
      const circularSnapshot = {} as any;
      circularSnapshot.circular = circularSnapshot;

      const size = SnapshotSystem.calculateSnapshotSize(circularSnapshot);

      expect(size).toBe(0);
    });
  });
});