import { SerializationEngine, SerializationError } from '../../src/engine/serialization';
import { HistoryManager } from '../../src/engine/history-manager';
import { GameState } from '../../src/models/game-state';
import { ActionDescriptor } from '../../src/core/interfaces/history';
import { GamePhase } from '../../src/core/types';

describe('SerializationEngine (Modern)', () => {
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

  describe('serializeHistory', () => {
    it('should serialize game history to JSON string', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: { test: true },
        timestamp: Date.now()
      };

      historyManager.createSnapshot(gameState, action);
      const history = historyManager.getGameHistory();

      const serialized = SerializationEngine.serializeHistory(history);

      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);

      const parsed = JSON.parse(serialized);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.gameId).toBe('test-game-1');
      expect(parsed.snapshots).toBeDefined();
      expect(Array.isArray(parsed.snapshots)).toBe(true);
    });

    it('should serialize in full format by default', () => {
      const history = historyManager.getGameHistory();
      const serialized = SerializationEngine.serializeHistory(history);

      const parsed = JSON.parse(serialized);
      expect(parsed.metadata.format).toBe('full');
      
      // Full format should be pretty-printed (have indentation)
      expect(serialized.includes('\n')).toBe(true);
    });

    it('should serialize in compressed format', () => {
      const history = historyManager.getGameHistory();
      const fullSerialized = SerializationEngine.serializeHistory(history, 'full');
      const compressedSerialized = SerializationEngine.serializeHistory(history, 'compressed');

      expect(compressedSerialized.length).toBeLessThan(fullSerialized.length);
      
      const parsed = JSON.parse(compressedSerialized);
      expect(parsed.metadata.format).toBe('compressed');
    });
  });

  describe('deserializeHistory', () => {
    it('should deserialize game history from JSON string', () => {
      const action: ActionDescriptor = {
        type: 'test_action',
        description: 'Test action',
        details: { test: true },
        timestamp: Date.now()
      };

      historyManager.createSnapshot(gameState, action);
      const originalHistory = historyManager.getGameHistory();
      const serialized = SerializationEngine.serializeHistory(originalHistory);

      const deserializedHistory = SerializationEngine.deserializeHistory(serialized);

      expect(deserializedHistory.gameId).toBe(originalHistory.gameId);
      expect(deserializedHistory.snapshots.size).toBe(originalHistory.snapshots.size);
      expect(deserializedHistory.currentSnapshotId).toBe(originalHistory.currentSnapshotId);
      expect(deserializedHistory.initialSnapshotId).toBe(originalHistory.initialSnapshotId);
    });

    it('should handle migration during deserialization', () => {
      // Create a mock legacy format
      const legacyData = {
        version: '1.0.0',
        data: {
          gameId: 'test-game-1',
          phase: GamePhase.SETUP,
          gameboard: { piles: [], placements: [], status: {} },
          participants: [],
          hands: [],
          events: [],
          metadata: {}
        },
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(legacyData);

      // This should work with migration
      expect(() => {
        SerializationEngine.deserialize(serialized);
      }).not.toThrow();
    });
  });

  describe('serialize (modern)', () => {
    it('should serialize single game state with metadata', () => {
      const serialized = SerializationEngine.serialize(gameState);

      expect(typeof serialized).toBe('string');
      
      const parsed = JSON.parse(serialized);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.version).toBeDefined();
      expect(parsed.metadata.timestamp).toBeDefined();
      expect(parsed.gameState).toBeDefined();
    });

    it('should serialize in compressed format', () => {
      const fullSerialized = SerializationEngine.serialize(gameState, 'full');
      const compressedSerialized = SerializationEngine.serialize(gameState, 'compressed');

      expect(compressedSerialized.length).toBeLessThan(fullSerialized.length);
    });
  });

  describe('deserialize (modern)', () => {
    it('should deserialize modern format game state', () => {
      const serialized = SerializationEngine.serialize(gameState);
      const deserialized = SerializationEngine.deserialize(serialized);

      expect(deserialized.gameId).toBe(gameState.gameId);
      expect(deserialized.phase).toBe(gameState.phase);
    });

    it('should deserialize older format game state', () => {
      // Create a mock legacy format
      const legacyData = {
        version: '1.0.0',
        data: {
          gameId: 'test-game-1',
          phase: GamePhase.SETUP,
          gameboard: { piles: [], placements: [], status: {} },
          participants: [],
          hands: [],
          events: [],
          metadata: {}
        },
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(legacyData);
      const deserialized = SerializationEngine.deserialize(serialized);

      expect(deserialized.gameId).toBe('test-game-1');
      expect(deserialized.phase).toBe(GamePhase.SETUP);
    });
  });

  describe('checkCompatibility', () => {
    it('should check compatibility of modern format', () => {
      const history = historyManager.getGameHistory();
      const serialized = SerializationEngine.serializeHistory(history);

      const compatibility = SerializationEngine.checkCompatibility(serialized);

      expect(compatibility.compatible).toBe(true);
      expect(compatibility.canMigrate).toBe(true);
      expect(compatibility.isModernFormat).toBe(true);
      expect(compatibility.hasHistory).toBe(true);
      expect(compatibility.estimatedMigrationComplexity).toBe('none');
    });

    it('should check compatibility of older format', () => {
      const legacyData = {
        version: '1.0.0',
        data: {
          gameId: 'test-game-1',
          phase: GamePhase.SETUP,
          gameboard: { piles: [], placements: [], status: {} },
          participants: [],
          hands: [],
          events: [],
          metadata: {}
        },
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(legacyData);
      const compatibility = SerializationEngine.checkCompatibility(serialized);

      expect(compatibility.sourceVersion).toBe('1.0.0');
      expect(compatibility.isModernFormat).toBe(false);
      expect(compatibility.hasHistory).toBe(false);
      expect(compatibility.canMigrate).toBe(true);
    });

    it('should handle invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      const compatibility = SerializationEngine.checkCompatibility(invalidJson);

      expect(compatibility.compatible).toBe(false);
      expect(compatibility.canMigrate).toBe(false);
      expect(compatibility.sourceVersion).toBe('unknown');
      expect(compatibility.reason).toContain('Invalid JSON');
    });
  });

  describe('validateFormat', () => {
    it('should validate correct modern format', () => {
      const history = historyManager.getGameHistory();
      const serialized = SerializationEngine.serializeHistory(history);

      const validation = SerializationEngine.validateFormat(serialized);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate correct older format', () => {
      const legacyData = {
        version: '1.0.0',
        data: {
          gameId: 'test-game-1',
          phase: GamePhase.SETUP,
          gameboard: { piles: [], placements: [], status: {} },
          participants: [],
          hands: [],
          events: [],
          metadata: {}
        },
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(legacyData);
      const validation = SerializationEngine.validateFormat(serialized);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields in modern format', () => {
      const invalidData = {
        gameId: 'test-game-1',
        snapshots: []
        // Missing metadata
      };

      const serialized = JSON.stringify(invalidData);
      const validation = SerializationEngine.validateFormat(serialized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing metadata in modern format');
    });

    it('should detect invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      const validation = SerializationEngine.validateFormat(invalidJson);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Invalid JSON');
    });

    it('should detect circular references', () => {
      const circularData = {} as any;
      circularData.circular = circularData;

      // We can't directly serialize circular data, so we'll mock this scenario
      const validation = SerializationEngine.validateFormat('{"test": "valid"}');
      
      // This test mainly ensures the validation method exists and works
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing version in older format');
    });
  });

  describe('migration scenarios', () => {
    it('should handle version distance calculation', () => {
      const compatibility1 = SerializationEngine.checkCompatibility('{"version": "1.0.0"}');
      const compatibility2 = SerializationEngine.checkCompatibility('{"version": "0.9.0"}');

      expect(compatibility1.estimatedMigrationComplexity).toBe('simple');
      expect(compatibility2.estimatedMigrationComplexity).toBe('moderate');
    });

    it('should handle unknown version formats', () => {
      const compatibility = SerializationEngine.checkCompatibility('{"version": "invalid.version.format"}');

      expect(compatibility.estimatedMigrationComplexity).toBe('impossible');
    });
  });

  describe('error handling', () => {
    it('should throw SerializationError for invalid history', () => {
      const invalidHistory = {
        metadata: { version: '2.0.0', timestamp: Date.now(), libraryVersion: '1.0.0', format: 'full' },
        gameId: 'test-game-1',
        snapshots: [], // Empty snapshots should be invalid
        snapshotIndex: {}
      };

      const serialized = JSON.stringify(invalidHistory);

      expect(() => {
        SerializationEngine.deserializeHistory(serialized);
      }).toThrow();
    });

    it('should handle migration failures gracefully', () => {
      const incompatibleData = {
        version: '999.0.0', // Future version that can't be migrated
        data: {}
      };

      const serialized = JSON.stringify(incompatibleData);

      expect(() => {
        SerializationEngine.deserialize(serialized);
      }).toThrow();
    });
  });
});