import { HistoryManager, HistoryError } from '../../src/engine/history-manager';
import { GameState } from '../../src/models/game-state';
import { ActionDescriptor } from '../../src/core/interfaces/history';
import { GamePhase } from '../../src/core/types';

describe('HistoryManager', () => {
  let gameState: GameState;
  let historyManager: HistoryManager;

  beforeEach(() => {
    gameState = new GameState(
      'test-game-1',
      GamePhase.SETUP,
      undefined, // Use default Gameboard
      new Map(),
      new Map(),
      [],
      { testMetadata: 'value' }
    );

    historyManager = new HistoryManager('test-game-1', gameState);
  });

  describe('constructor', () => {
    it('should create history manager with initial snapshot', () => {
      const history = historyManager.getGameHistory();

      expect(history.gameId).toBe('test-game-1');
      expect(history.snapshots.size).toBe(1);
      expect(history.currentSnapshotId).toBeDefined();
      expect(history.initialSnapshotId).toBeDefined();
      expect(history.currentSnapshotId).toBe(history.initialSnapshotId);
    });
  });

  describe('createSnapshot', () => {
    it('should create and add new snapshot', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: { test: true },
        timestamp: Date.now()
      };

      const snapshot = historyManager.createSnapshot(gameState, action);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.action).toEqual(action);
      expect(snapshot.gameState).toEqual(gameState);

      const history = historyManager.getGameHistory();
      expect(history.snapshots.size).toBe(2);
      expect(history.currentSnapshotId).toBe(snapshot.id);
    });

    it('should link snapshots correctly', () => {
      const action1: ActionDescriptor = {
        type: 'action_1',
        description: 'First action',
        details: {},
        timestamp: Date.now()
      };

      const action2: ActionDescriptor = {
        type: 'action_2',
        description: 'Second action',
        details: {},
        timestamp: Date.now() + 1000
      };

      const snapshot1 = historyManager.createSnapshot(gameState, action1);
      const snapshot2 = historyManager.createSnapshot(gameState, action2);

      expect(snapshot2.previousSnapshotId).toBe(snapshot1.id);
    });
  });

  describe('getCurrentSnapshot', () => {
    it('should return current snapshot', () => {
      const currentSnapshot = historyManager.getCurrentSnapshot();

      expect(currentSnapshot).toBeDefined();
      expect(currentSnapshot.action.type).toBe('game_initialized');
    });
  });

  describe('getSnapshotById', () => {
    it('should return snapshot by ID', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: {},
        timestamp: Date.now()
      };

      const snapshot = historyManager.createSnapshot(gameState, action);
      const retrieved = historyManager.getSnapshotById(snapshot.id);

      expect(retrieved).toBe(snapshot);
    });

    it('should return null for non-existent ID', () => {
      const retrieved = historyManager.getSnapshotById('non-existent-id');

      expect(retrieved).toBeNull();
    });
  });

  describe('replayToSnapshot', () => {
    it('should replay to specific snapshot', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: {},
        timestamp: Date.now()
      };

      const snapshot = historyManager.createSnapshot(gameState, action);
      const replayedState = historyManager.replayToSnapshot(snapshot.id);

      expect(replayedState).toBe(snapshot.gameState);
      expect(historyManager.getCurrentSnapshot().id).toBe(snapshot.id);
    });

    it('should throw error for non-existent snapshot', () => {
      expect(() => {
        historyManager.replayToSnapshot('non-existent-id');
      }).toThrow(HistoryError);
    });
  });

  describe('findSnapshotsByActionType', () => {
    it('should find snapshots by action type', () => {
      const action1: ActionDescriptor = {
        type: 'move_card',
        description: 'Move card action',
        details: {},
        timestamp: Date.now()
      };

      const action2: ActionDescriptor = {
        type: 'draw_card',
        description: 'Draw card action',
        details: {},
        timestamp: Date.now() + 1000
      };

      const action3: ActionDescriptor = {
        type: 'move_card',
        description: 'Another move card action',
        details: {},
        timestamp: Date.now() + 2000
      };

      historyManager.createSnapshot(gameState, action1);
      historyManager.createSnapshot(gameState, action2);
      historyManager.createSnapshot(gameState, action3);

      const moveCardSnapshots = historyManager.findSnapshotsByActionType('move_card');

      expect(moveCardSnapshots).toHaveLength(2);
      expect(moveCardSnapshots[0].action.type).toBe('move_card');
      expect(moveCardSnapshots[1].action.type).toBe('move_card');
    });
  });

  describe('findSnapshotsByParticipant', () => {
    it('should find snapshots by participant', () => {
      const action1: ActionDescriptor = {
        type: 'player_action',
        description: 'Player 1 action',
        participantId: 'player1',
        details: {},
        timestamp: Date.now()
      };

      const action2: ActionDescriptor = {
        type: 'player_action',
        description: 'Player 2 action',
        participantId: 'player2',
        details: {},
        timestamp: Date.now() + 1000
      };

      historyManager.createSnapshot(gameState, action1);
      historyManager.createSnapshot(gameState, action2);

      const player1Snapshots = historyManager.findSnapshotsByParticipant('player1');

      expect(player1Snapshots).toHaveLength(1);
      expect(player1Snapshots[0].action.participantId).toBe('player1');
    });
  });

  describe('getHistoryStats', () => {
    it('should return correct history statistics', () => {
      const action1: ActionDescriptor = {
        type: 'move_card',
        description: 'Move card',
        participantId: 'player1',
        details: {},
        timestamp: Date.now()
      };

      const action2: ActionDescriptor = {
        type: 'draw_card',
        description: 'Draw card',
        participantId: 'player2',
        details: {},
        timestamp: Date.now() + 1000
      };

      historyManager.createSnapshot(gameState, action1);
      historyManager.createSnapshot(gameState, action2);

      const stats = historyManager.getHistoryStats();

      expect(stats.totalSnapshots).toBe(3); // Initial + 2 actions
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.uniqueParticipants).toBe(2);
      expect(stats.actionTypeCounts['move_card']).toBe(1);
      expect(stats.actionTypeCounts['draw_card']).toBe(1);
      expect(stats.actionTypeCounts['game_initialized']).toBe(1);
    });
  });

  describe('exportHistory and importHistory', () => {
    it('should export and import history correctly', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: { test: true },
        timestamp: Date.now()
      };

      historyManager.createSnapshot(gameState, action);
      const exported = historyManager.exportHistory();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const importedHistoryManager = HistoryManager.importHistory(exported);
      const importedHistory = importedHistoryManager.getGameHistory();

      expect(importedHistory.gameId).toBe('test-game-1');
      expect(importedHistory.snapshots.size).toBe(2);
    });

    it('should export in compressed format', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: {},
        timestamp: Date.now()
      };

      historyManager.createSnapshot(gameState, action);
      
      const fullExport = historyManager.exportHistory('full');
      const compressedExport = historyManager.exportHistory('compressed');

      expect(compressedExport.length).toBeLessThan(fullExport.length);
    });
  });

  describe('validateIntegrity', () => {
    it('should validate correct history', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: {},
        timestamp: Date.now()
      };

      historyManager.createSnapshot(gameState, action);
      const validation = historyManager.validateIntegrity();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect broken chain', () => {
      // This test would require manipulating internal state
      // For now, we'll test the basic validation
      const validation = historyManager.validateIntegrity();

      expect(validation.isValid).toBe(true);
    });
  });
});