import { GameInstance } from '../../src/engine/game-instance';
import { SerializationEngine } from '../../src/engine/serialization';
import { HistoryManager } from '../../src/engine/history-manager';
import { StandardPlayingDeck } from '../../src/deck-types/standard/standard-playing-deck';
import { WarRuleset } from '../../src/rulesets/war/war-ruleset';
import { GoFishRuleset } from '../../src/rulesets/go-fish/go-fish-ruleset';
import { GamePhase } from '../../src/core/types';
import { ActionDescriptor } from '../../src/core/interfaces/history';

describe('Enhanced Serialization Integration Tests', () => {
  let gameInstance: GameInstance;
  let deckType: StandardPlayingDeck;
  let ruleset: WarRuleset;

  beforeEach(() => {
    deckType = new StandardPlayingDeck();
    ruleset = new WarRuleset();
    
    const result = GameInstance.create({
      gameId: 'integration-test-game',
      ruleset,
      deckType,
      metadata: { testType: 'integration', version: '1.0.0' }
    });

    if (!result.success || !result.gameInstance) {
      throw new Error('Failed to create game instance for testing');
    }

    gameInstance = result.gameInstance;
  });

  describe('Complete Game Serialization with History', () => {
    it('should serialize and deserialize a complete game with full history', async () => {
      // Initialize the game
      gameInstance.initialize();
      
      // Create participants
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      
      // Create hands for participants
      gameInstance.createHand('hand1', 'Alice Hand', 'player1');
      gameInstance.createHand('hand2', 'Bob Hand', 'player2');
      
      // Transition through game phases
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      
      // Perform some game actions
      gameInstance.processAction({
        type: 'update_status',
        participantId: 'player1',
        data: { key: 'score', value: 10 }
      });
      
      gameInstance.processAction({
        type: 'update_status',
        participantId: 'player2',
        data: { key: 'score', value: 5 }
      });
      
      // Execute game loop
      gameInstance.executeGameLoop();
      
      // Export complete history
      const historyJson = gameInstance.exportHistory('full');
      expect(historyJson).toBeDefined();
      expect(historyJson.length).toBeGreaterThan(0);
      
      // Validate the serialized history
      const validation = SerializationEngine.validateFormat(historyJson);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Check compatibility
      const compatibility = SerializationEngine.checkCompatibility(historyJson);
      expect(compatibility.compatible).toBe(true);
      expect(compatibility.canMigrate).toBe(true);
      expect(compatibility.isModernFormat).toBe(true);
      expect(compatibility.hasHistory).toBe(true);
      
      // Deserialize the history
      const deserializedHistory = SerializationEngine.deserializeHistory(historyJson);
      expect(deserializedHistory.gameId).toBe('integration-test-game');
      expect(deserializedHistory.snapshots.size).toBeGreaterThan(1);
      
      // Verify history integrity
      const historyManager = HistoryManager.importHistory(historyJson);
      const validation2 = historyManager.validateIntegrity();
      expect(validation2.isValid).toBe(true);
      expect(validation2.errors).toHaveLength(0);
    });

    it('should handle large game histories efficiently', async () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createHand('hand1', 'Alice Hand', 'player1');
      
      // Create many state changes to build up history
      for (let i = 0; i < 50; i++) {
        gameInstance.processAction({
          type: 'update_status',
          participantId: 'player1',
          data: { key: `action_${i}`, value: i }
        });
      }
      
      const startTime = Date.now();
      const historyJson = gameInstance.exportHistory('compressed');
      const serializationTime = Date.now() - startTime;
      
      // Serialization should be reasonably fast (under 1 second for 50 actions)
      expect(serializationTime).toBeLessThan(1000);
      
      const deserializeStartTime = Date.now();
      const deserializedHistory = SerializationEngine.deserializeHistory(historyJson);
      const deserializationTime = Date.now() - deserializeStartTime;
      
      // Deserialization should also be fast
      expect(deserializationTime).toBeLessThan(1000);
      
      // Verify all snapshots are present
      expect(deserializedHistory.snapshots.size).toBeGreaterThan(50);
      
      // Check history statistics
      const historyManager = HistoryManager.importHistory(historyJson);
      const stats = historyManager.getHistoryStats();
      expect(stats.totalSnapshots).toBeGreaterThan(50);
      expect(stats.uniqueParticipants).toBe(1);
      expect(stats.actionTypeCounts['participant_action']).toBeGreaterThan(40);
    });

    it('should preserve game state integrity through replay', async () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createHand('hand1', 'Alice Hand', 'player1');
      gameInstance.createHand('hand2', 'Bob Hand', 'player2');
      
      // Perform several actions
      const actions = [
        { type: 'update_status', participantId: 'player1', data: { key: 'score', value: 10 } },
        { type: 'update_status', participantId: 'player2', data: { key: 'score', value: 15 } },
        { type: 'update_status', participantId: 'player1', data: { key: 'lives', value: 3 } }
      ];
      
      const snapshotIds: string[] = [];
      
      for (const action of actions) {
        gameInstance.processAction(action);
        const currentSnapshot = gameInstance.getCurrentSnapshot();
        snapshotIds.push(currentSnapshot.id);
      }
      
      // Export and reimport history
      const historyJson = gameInstance.exportHistory('full');
      const historyManager = HistoryManager.importHistory(historyJson);
      
      // Replay to each snapshot and verify state
      for (let i = 0; i < snapshotIds.length; i++) {
        const replayedState = historyManager.replayToSnapshot(snapshotIds[i]);
        
        // Verify the state matches what we expect at that point
        expect(replayedState.gameId).toBe('integration-test-game');
        expect(replayedState.participants.size).toBe(2);
        
        const player1 = replayedState.participants.get('player1');
        expect(player1).toBeDefined();
        
        if (i >= 0) expect(player1?.status.score).toBe(10);
        if (i >= 2) expect(player1?.status.lives).toBe(3);
      }
    });
  });

  describe('Backwards Compatibility with Existing Saved Games', () => {
    it('should migrate from version 1.0.0 to current version', async () => {
      // Create a mock 1.0.0 format saved game
      const legacyGameData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          gameId: 'legacy-game',
          phase: GamePhase.SETUP,
          gameboard: {
            piles: [],
            placements: [],
            status: { turn: 1 }
          },
          participants: [
            {
              id: 'player1',
              name: 'Legacy Player',
              isNPC: false,
              handIds: ['hand1'],
              status: { score: 100 }
            }
          ],
          hands: [
            {
              id: 'hand1',
              name: 'Legacy Hand',
              participantId: 'player1',
              piles: [],
              placements: [],
              status: { ready: true }
            }
          ],
          events: [
            {
              id: 'legacy-event',
              type: 'game_started',
              timestamp: Date.now() - 1000,
              data: { legacy: true }
            }
          ],
          metadata: { legacyVersion: '1.0.0' }
        }
      };
      
      const legacyJson = JSON.stringify(legacyGameData);
      
      // Check compatibility
      const compatibility = SerializationEngine.checkCompatibility(legacyJson);
      expect(compatibility.canMigrate).toBe(true);
      expect(compatibility.sourceVersion).toBe('1.0.0');
      
      // Deserialize with migration
      const migratedGameState = SerializationEngine.deserialize(legacyJson);
      
      // Verify migration worked
      expect(migratedGameState.gameId).toBe('legacy-game');
      expect(migratedGameState.phase).toBe(GamePhase.SETUP);
      expect(migratedGameState.participants.size).toBe(1);
      expect(migratedGameState.hands.size).toBe(1);
      expect(migratedGameState.events.length).toBe(1);
      
      const player1 = migratedGameState.participants.get('player1');
      expect(player1?.name).toBe('Legacy Player');
      expect(player1?.status.score).toBe(100);
      
      const hand1 = migratedGameState.hands.get('hand1');
      expect(hand1?.name).toBe('Legacy Hand');
      expect(hand1?.participantId).toBe('player1');
    });

    it('should handle pre-1.0.0 legacy formats', async () => {
      // Create a mock pre-1.0.0 format (no version field)
      const veryLegacyData = {
        gameId: 'very-legacy-game',
        phase: 'setup',
        participants: [],
        hands: [],
        events: [],
        metadata: { veryOld: true }
      };
      
      const veryLegacyJson = JSON.stringify(veryLegacyData);
      
      // Check compatibility
      const compatibility = SerializationEngine.checkCompatibility(veryLegacyJson);
      expect(compatibility.sourceVersion).toBe('0.9.0'); // Should detect as oldest version
      expect(compatibility.canMigrate).toBe(true);
      
      // Deserialize with migration
      const migratedGameState = SerializationEngine.deserialize(veryLegacyJson);
      
      // Verify migration worked
      expect(migratedGameState.gameId).toBe('very-legacy-game');
      expect(migratedGameState.participants.size).toBe(0);
      expect(migratedGameState.hands.size).toBe(0);
    });

    it('should reject incompatible future versions', async () => {
      const futureVersionData = {
        version: '999.0.0',
        data: {
          gameId: 'future-game',
          futureFeature: 'not supported'
        }
      };
      
      const futureJson = JSON.stringify(futureVersionData);
      
      // Check compatibility
      const compatibility = SerializationEngine.checkCompatibility(futureJson);
      expect(compatibility.compatible).toBe(false);
      expect(compatibility.canMigrate).toBe(false);
      expect(compatibility.sourceVersion).toBe('999.0.0');
      
      // Should throw error when trying to deserialize
      expect(() => {
        SerializationEngine.deserialize(futureJson);
      }).toThrow();
    });
  });

  describe('Migration from Old to New Serialization Formats', () => {
    it('should migrate simple game state format', async () => {
      const oldFormat = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          gameId: 'migration-test',
          phase: GamePhase.PLAYING,
          gameboard: { piles: [], placements: [], status: {} },
          participants: [],
          hands: [],
          events: [],
          metadata: { oldFormat: true }
        }
      };
      
      const oldJson = JSON.stringify(oldFormat);
      
      // Migrate to current format
      const migratedState = SerializationEngine.deserialize(oldJson);
      
      // Re-serialize in new format
      const newJson = SerializationEngine.serialize(migratedState);
      const parsed = JSON.parse(newJson);
      
      // Should now be in modern format
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.version).toBeDefined();
      expect(parsed.gameState).toBeDefined();
      expect(parsed.gameState.data.gameId).toBe('migration-test');
    });

    it('should preserve all data during format migration', async () => {
      // Create a complex old format with all possible data
      const complexOldFormat = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          gameId: 'complex-migration-test',
          phase: GamePhase.PLAYING,
          gameboard: {
            piles: [
              {
                name: 'deck',
                cards: [],
                isOrdered: true,
                orientation: 'normal',
                status: { shuffled: true }
              }
            ],
            placements: [
              {
                name: 'discard',
                card: null,
                orientation: 'normal',
                status: { count: 0 }
              }
            ],
            status: { turn: 5 }
          },
          participants: [
            {
              id: 'p1',
              name: 'Player One',
              isNPC: false,
              handIds: ['h1'],
              status: { score: 42, level: 3 }
            }
          ],
          hands: [
            {
              id: 'h1',
              name: 'Player One Hand',
              participantId: 'p1',
              piles: [],
              placements: [],
              status: { cardCount: 7 }
            }
          ],
          events: [
            {
              id: 'e1',
              type: 'game_started',
              timestamp: Date.now() - 5000,
              data: { startedBy: 'system' }
            },
            {
              id: 'e2',
              type: 'player_joined',
              timestamp: Date.now() - 4000,
              participantId: 'p1',
              data: { playerName: 'Player One' }
            }
          ],
          metadata: {
            gameType: 'war',
            maxPlayers: 2,
            customRules: { fastMode: true },
            created: Date.now() - 10000
          }
        }
      };
      
      const oldJson = JSON.stringify(complexOldFormat);
      
      // Migrate
      const migratedState = SerializationEngine.deserialize(oldJson);
      
      // Verify all data is preserved
      expect(migratedState.gameId).toBe('complex-migration-test');
      expect(migratedState.phase).toBe(GamePhase.PLAYING);
      
      // Check gameboard
      expect(migratedState.gameboard.piles.size).toBe(1);
      expect(migratedState.gameboard.placements.size).toBe(1);
      expect(migratedState.gameboard.status.turn).toBe(5);
      
      const deckPile = migratedState.gameboard.piles.get('deck');
      expect(deckPile?.status.shuffled).toBe(true);
      
      // Check participants
      expect(migratedState.participants.size).toBe(1);
      const p1 = migratedState.participants.get('p1');
      expect(p1?.name).toBe('Player One');
      expect(p1?.status.score).toBe(42);
      expect(p1?.status.level).toBe(3);
      
      // Check hands
      expect(migratedState.hands.size).toBe(1);
      const h1 = migratedState.hands.get('h1');
      expect(h1?.name).toBe('Player One Hand');
      expect(h1?.status.cardCount).toBe(7);
      
      // Check events
      expect(migratedState.events.length).toBe(2);
      expect(migratedState.events[0].type).toBe('game_started');
      expect(migratedState.events[1].participantId).toBe('p1');
      
      // Check metadata
      expect(migratedState.metadata.gameType).toBe('war');
      expect(migratedState.metadata.customRules.fastMode).toBe(true);
    });
  });

  describe('Performance with Large Game Histories', () => {
    it('should handle serialization of games with 100+ snapshots', async () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Performance Test Player', false);
      gameInstance.createParticipant('player2', 'Performance Test Player 2', false);
      gameInstance.createHand('hand1', 'Test Hand', 'player1');
      
      // Create 100 state changes
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        gameInstance.processAction({
          type: 'update_status',
          participantId: 'player1',
          data: { key: `perf_test_${i}`, value: i * 2 }
        });
      }
      const actionTime = Date.now() - startTime;
      
      // Actions should complete in reasonable time
      expect(actionTime).toBeLessThan(5000); // 5 seconds max
      
      // Export history
      const exportStartTime = Date.now();
      const historyJson = gameInstance.exportHistory('compressed');
      const exportTime = Date.now() - exportStartTime;
      
      // Export should be fast
      expect(exportTime).toBeLessThan(2000); // 2 seconds max
      
      // Import history
      const importStartTime = Date.now();
      const importedHistory = SerializationEngine.deserializeHistory(historyJson);
      const importTime = Date.now() - importStartTime;
      
      // Import should be fast
      expect(importTime).toBeLessThan(2000); // 2 seconds max
      
      // Verify data integrity
      expect(importedHistory.snapshots.size).toBeGreaterThan(100);
      
      // Test random access to snapshots
      const snapshotIds = Array.from(importedHistory.snapshots.keys());
      const randomId = snapshotIds[Math.floor(Math.random() * snapshotIds.length)];
      const randomSnapshot = importedHistory.snapshots.get(randomId);
      
      expect(randomSnapshot).toBeDefined();
      expect(randomSnapshot?.gameState.gameId).toBe('integration-test-game');
    });

    it('should compress large histories effectively', async () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Compression Test Player', false);
      gameInstance.createParticipant('player2', 'Compression Test Player 2', false);
      gameInstance.createHand('hand1', 'Test Hand', 'player1');
      
      // Create many similar actions (should compress well)
      for (let i = 0; i < 50; i++) {
        gameInstance.processAction({
          type: 'update_status',
          participantId: 'player1',
          data: { key: 'counter', value: i }
        });
      }
      
      // Export in both formats
      const fullHistory = gameInstance.exportHistory('full');
      const compressedHistory = gameInstance.exportHistory('compressed');
      
      // Compressed should be significantly smaller
      expect(compressedHistory.length).toBeLessThan(fullHistory.length * 0.8);
      
      // Both should deserialize to the same data
      const fullDeserialized = SerializationEngine.deserializeHistory(fullHistory);
      const compressedDeserialized = SerializationEngine.deserializeHistory(compressedHistory);
      
      expect(fullDeserialized.gameId).toBe(compressedDeserialized.gameId);
      expect(fullDeserialized.snapshots.size).toBe(compressedDeserialized.snapshots.size);
    });
  });

  describe('Multi-Game Serialization Scenarios', () => {
    it('should handle serialization of different game types', async () => {
      // Create a Go Fish game
      const goFishRuleset = new GoFishRuleset();
      const goFishResult = GameInstance.create({
        gameId: 'go-fish-test',
        ruleset: goFishRuleset,
        deckType: new StandardPlayingDeck(),
        metadata: { gameType: 'go-fish' }
      });
      
      if (!goFishResult.success || !goFishResult.gameInstance) {
        throw new Error('Failed to create Go Fish game');
      }
      
      const goFishGame = goFishResult.gameInstance;
      goFishGame.initialize();
      goFishGame.createParticipant('gf_player1', 'Go Fish Player', false);
      goFishGame.createHand('gf_hand1', 'Go Fish Hand', 'gf_player1');
      
      // Export both games
      const warHistory = gameInstance.exportHistory('full');
      const goFishHistory = goFishGame.exportHistory('full');
      
      // Both should be valid
      const warValidation = SerializationEngine.validateFormat(warHistory);
      const goFishValidation = SerializationEngine.validateFormat(goFishHistory);
      
      expect(warValidation.isValid).toBe(true);
      expect(goFishValidation.isValid).toBe(true);
      
      // Deserialize both
      const warDeserialized = SerializationEngine.deserializeHistory(warHistory);
      const goFishDeserialized = SerializationEngine.deserializeHistory(goFishHistory);
      
      expect(warDeserialized.gameId).toBe('integration-test-game');
      expect(goFishDeserialized.gameId).toBe('go-fish-test');
      
      // Metadata should be preserved
      const warSnapshot = Array.from(warDeserialized.snapshots.values())[0];
      const goFishSnapshot = Array.from(goFishDeserialized.snapshots.values())[0];
      
      expect(warSnapshot.gameState.metadata.testType).toBe('integration');
      expect(goFishSnapshot.gameState.metadata.gameType).toBe('go-fish');
    });
  });

  describe('Error Recovery and Validation', () => {
    it('should detect and report corrupted history data', async () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Test Player', false);
      
      const validHistory = gameInstance.exportHistory('full');
      
      // Corrupt the history by removing required fields
      const parsed = JSON.parse(validHistory);
      delete parsed.metadata;
      const corruptedHistory = JSON.stringify(parsed);
      
      // Validation should detect the corruption
      const validation = SerializationEngine.validateFormat(corruptedHistory);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // Deserialization should fail
      expect(() => {
        SerializationEngine.deserializeHistory(corruptedHistory);
      }).toThrow();
    });

    it('should handle partial migration failures gracefully', async () => {
      // Create data that will fail migration
      const problematicData = {
        version: '1.0.0',
        data: {
          gameId: 'problematic-game',
          // Missing required fields that migration expects
          phase: null,
          participants: 'invalid_format'
        }
      };
      
      const problematicJson = JSON.stringify(problematicData);
      
      // Should throw a descriptive error
      expect(() => {
        SerializationEngine.deserialize(problematicJson);
      }).toThrow();
    });

    it('should validate history chain integrity', async () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Chain Test Player', false);
      gameInstance.createParticipant('player2', 'Chain Test Player 2', false);
      
      // Create a few snapshots
      for (let i = 0; i < 3; i++) {
        gameInstance.processAction({
          type: 'update_status',
          participantId: 'player1',
          data: { key: 'step', value: i }
        });
      }
      
      const historyJson = gameInstance.exportHistory('full');
      const historyManager = HistoryManager.importHistory(historyJson);
      
      // Validate integrity
      const validation = historyManager.validateIntegrity();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Get statistics
      const stats = historyManager.getHistoryStats();
      expect(stats.totalSnapshots).toBeGreaterThan(3);
      expect(stats.uniqueParticipants).toBe(1);
    });
  });
});