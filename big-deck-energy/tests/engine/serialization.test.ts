import { 
  SerializationEngine, 
  SerializationError, 
  SerializationCompatibilityResult,
  SERIALIZATION_VERSION 
} from '../../src/engine/serialization';
import { 
  SerializationVersionManager, 
  MigrationError,
  VersionInfo,
  Migration 
} from '../../src/engine/serialization-migration';
import { GameState } from '../../src/models/game-state';
import { Participant } from '../../src/models/participant';
import { Gameboard, CardPile, CardPlacement } from '../../src/models/gameboard';
import { Hand } from '../../src/models/hand';
import { Card } from '../../src/models/card';
import { GameEvent } from '../../src/core/interfaces/events';
import { CardInPile, CardInPlacement } from '../../src/core/interfaces/gameboard';
import { GamePhase, CardOrientation } from '../../src/core/types';

describe('SerializationEngine', () => {
  let testGameState: GameState;
  let testCard: Card;
  let testCardInPile: CardInPile;
  let testCardInPlacement: CardInPlacement;

  beforeEach(() => {
    // Create test card
    testCard = new Card({
      id: 'test-card-1',
      faceId: 'ace-spades',
      tailId: 'blue-back',
      properties: { suit: 'spades', rank: 'ace', value: 1 }
    }, 'standard-deck');

    // Create test card in pile
    testCardInPile = {
      card: testCard,
      faceUp: true,
      orientation: CardOrientation.NORMAL,
      owner: 'player1',
      status: { locked: false }
    };

    // Create test card in placement
    testCardInPlacement = {
      card: testCard,
      faceUp: false,
      orientation: CardOrientation.ROTATED_90,
      owner: 'player2',
      status: { special: true }
    };

    // Create test game state
    const participants = new Map<string, Participant>();
    participants.set('player1', new Participant('player1', 'Alice', false, ['hand1'], { score: 100 }));
    participants.set('player2', new Participant('player2', 'Bob', true, ['hand2'], { score: 50 }));

    const hands = new Map<string, Hand>();
    const hand1Piles = new Map<string, CardPile>();
    hand1Piles.set('cards', new CardPile('cards', [testCardInPile], true, CardOrientation.NORMAL, { visible: true }));
    
    const hand1Placements = new Map<string, CardPlacement>();
    hand1Placements.set('active', new CardPlacement('active', testCardInPlacement, CardOrientation.NORMAL, { locked: false }));
    
    hands.set('hand1', new Hand('hand1', 'Player 1 Hand', 'player1', hand1Piles, hand1Placements, { ready: true }));
    hands.set('hand2', new Hand('hand2', 'Player 2 Hand', 'player2', new Map(), new Map(), { ready: false }));

    const gameboardPiles = new Map<string, CardPile>();
    gameboardPiles.set('deck', new CardPile('deck', [], true, CardOrientation.NORMAL, { shuffled: true }));
    
    const gameboardPlacements = new Map<string, CardPlacement>();
    gameboardPlacements.set('discard', new CardPlacement('discard', null, CardOrientation.NORMAL, { count: 0 }));

    const gameboard = new Gameboard(gameboardPiles, gameboardPlacements, { turn: 1 });

    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'game_started',
        timestamp: 1000,
        participantId: undefined,
        data: { gameId: 'test-game' }
      },
      {
        id: 'event2',
        type: 'card_played',
        timestamp: 2000,
        participantId: 'player1',
        data: { cardId: 'test-card-1', from: 'hand', to: 'board' }
      }
    ];

    testGameState = new GameState(
      'test-game-123',
      GamePhase.PLAYING,
      gameboard,
      participants,
      hands,
      events,
      { gameType: 'test', maxTurns: 10 }
    );
  });

  afterEach(() => {
    // Reset version manager for clean tests
    SerializationVersionManager.reset();
    SerializationVersionManager.registerVersion({
      version: '1.0.0',
      description: 'Initial serialization format',
      backwardCompatible: true
    });
  });

  describe('serialize', () => {
    it('should serialize game state to JSON string', () => {
      const json = SerializationEngine.serialize(testGameState);
      
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
      
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(SERIALIZATION_VERSION);
      expect(parsed.data.gameId).toBe('test-game-123');
      expect(parsed.data.phase).toBe(GamePhase.PLAYING);
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it('should serialize all game state components', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      const data = parsed.data;

      // Check participants
      expect(data.participants).toHaveLength(2);
      expect(data.participants[0].id).toBe('player1');
      expect(data.participants[0].name).toBe('Alice');
      expect(data.participants[0].isNPC).toBe(false);
      expect(data.participants[0].handIds).toEqual(['hand1']);
      expect(data.participants[0].status.score).toBe(100);

      // Check hands
      expect(data.hands).toHaveLength(2);
      const hand1 = data.hands.find((h: any) => h.id === 'hand1');
      expect(hand1.name).toBe('Player 1 Hand');
      expect(hand1.participantId).toBe('player1');
      expect(hand1.piles).toHaveLength(1);
      expect(hand1.placements).toHaveLength(1);

      // Check gameboard
      expect(data.gameboard.piles).toHaveLength(1);
      expect(data.gameboard.placements).toHaveLength(1);
      expect(data.gameboard.status.turn).toBe(1);

      // Check events
      expect(data.events).toHaveLength(2);
      expect(data.events[0].type).toBe('game_started');
      expect(data.events[1].participantId).toBe('player1');

      // Check metadata
      expect(data.metadata.gameType).toBe('test');
      expect(data.metadata.maxTurns).toBe(10);
    });

    it('should serialize card properties correctly', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      
      const hand1 = parsed.data.hands.find((h: any) => h.id === 'hand1');
      const cardPile = hand1.piles[0];
      const cardInPile = cardPile.cards[0];
      
      expect(cardInPile.card.id).toBe('test-card-1');
      expect(cardInPile.card.faceId).toBe('ace-spades');
      expect(cardInPile.card.tailId).toBe('blue-back');
      expect(cardInPile.card.deckType).toBe('standard-deck');
      expect(cardInPile.card.properties.suit).toBe('spades');
      expect(cardInPile.faceUp).toBe(true);
      expect(cardInPile.orientation).toBe(CardOrientation.NORMAL);
      expect(cardInPile.owner).toBe('player1');
    });

    it('should handle empty collections', () => {
      const emptyGameState = new GameState('empty-game');
      const json = SerializationEngine.serialize(emptyGameState);
      const parsed = JSON.parse(json);
      
      expect(parsed.data.participants).toHaveLength(0);
      expect(parsed.data.hands).toHaveLength(0);
      expect(parsed.data.events).toHaveLength(0);
      expect(parsed.data.gameboard.piles).toHaveLength(0);
      expect(parsed.data.gameboard.placements).toHaveLength(0);
    });
  });

  describe('deserialize', () => {
    it('should deserialize JSON string to game state', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      expect(deserialized.gameId).toBe(testGameState.gameId);
      expect(deserialized.phase).toBe(testGameState.phase);
      expect(deserialized.participants.size).toBe(testGameState.participants.size);
      expect(deserialized.hands.size).toBe(testGameState.hands.size);
      expect(deserialized.events.length).toBe(testGameState.events.length);
    });

    it('should preserve participant data correctly', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      const player1 = deserialized.participants.get('player1');
      expect(player1?.name).toBe('Alice');
      expect(player1?.isNPC).toBe(false);
      expect(player1?.handIds).toEqual(['hand1']);
      expect(player1?.status.score).toBe(100);
      
      const player2 = deserialized.participants.get('player2');
      expect(player2?.name).toBe('Bob');
      expect(player2?.isNPC).toBe(true);
      expect(player2?.handIds).toEqual(['hand2']);
      expect(player2?.status.score).toBe(50);
    });

    it('should preserve hand data correctly', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      const hand1 = deserialized.hands.get('hand1');
      expect(hand1?.name).toBe('Player 1 Hand');
      expect(hand1?.participantId).toBe('player1');
      expect(hand1?.piles.size).toBe(1);
      expect(hand1?.placements.size).toBe(1);
      expect(hand1?.status.ready).toBe(true);
      
      const cardsPile = hand1?.piles.get('cards');
      expect(cardsPile?.cards.length).toBe(1);
      expect(cardsPile?.isOrdered).toBe(true);
      
      const activePlacement = hand1?.placements.get('active');
      expect(activePlacement?.card).not.toBeNull();
      expect(activePlacement?.card?.faceUp).toBe(false);
    });

    it('should preserve card data correctly', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      const hand1 = deserialized.hands.get('hand1');
      const cardsPile = hand1?.piles.get('cards');
      const cardInPile = cardsPile?.cards[0];
      
      expect(cardInPile?.card.id).toBe('test-card-1');
      expect(cardInPile?.card.faceId).toBe('ace-spades');
      expect(cardInPile?.card.tailId).toBe('blue-back');
      expect(cardInPile?.card.deckType).toBe('standard-deck');
      expect(cardInPile?.card.properties.suit).toBe('spades');
      expect(cardInPile?.faceUp).toBe(true);
      expect(cardInPile?.orientation).toBe(CardOrientation.NORMAL);
      expect(cardInPile?.owner).toBe('player1');
    });

    it('should preserve gameboard data correctly', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      expect(deserialized.gameboard.piles.size).toBe(1);
      expect(deserialized.gameboard.placements.size).toBe(1);
      expect(deserialized.gameboard.status.turn).toBe(1);
      
      const deckPile = deserialized.gameboard.piles.get('deck');
      expect(deckPile?.name).toBe('deck');
      expect(deckPile?.cards.length).toBe(0);
      expect(deckPile?.status.shuffled).toBe(true);
      
      const discardPlacement = deserialized.gameboard.placements.get('discard');
      expect(discardPlacement?.name).toBe('discard');
      expect(discardPlacement?.card).toBeNull();
      expect(discardPlacement?.status.count).toBe(0);
    });

    it('should preserve events correctly', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      expect(deserialized.events.length).toBe(2);
      
      const event1 = deserialized.events[0];
      expect(event1.id).toBe('event1');
      expect(event1.type).toBe('game_started');
      expect(event1.timestamp).toBe(1000);
      expect(event1.participantId).toBeUndefined();
      expect(event1.data.gameId).toBe('test-game');
      
      const event2 = deserialized.events[1];
      expect(event2.id).toBe('event2');
      expect(event2.type).toBe('card_played');
      expect(event2.timestamp).toBe(2000);
      expect(event2.participantId).toBe('player1');
      expect(event2.data.cardId).toBe('test-card-1');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => SerializationEngine.deserialize('invalid json'))
        .toThrow();
    });

    it('should throw error for unsupported version', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      parsed.version = '999.0.0';
      const invalidJson = JSON.stringify(parsed);
      
      expect(() => SerializationEngine.deserialize(invalidJson))
        .toThrow(SerializationError);
    });
  });

  describe('round-trip serialization', () => {
    it('should maintain data integrity through serialize-deserialize cycle', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserialize(json);
      const reserializedJson = SerializationEngine.serialize(deserialized);
      const reDeserialized = SerializationEngine.deserialize(reserializedJson);
      
      // Compare key properties
      expect(reDeserialized.gameId).toBe(testGameState.gameId);
      expect(reDeserialized.phase).toBe(testGameState.phase);
      expect(reDeserialized.participants.size).toBe(testGameState.participants.size);
      expect(reDeserialized.hands.size).toBe(testGameState.hands.size);
      expect(reDeserialized.events.length).toBe(testGameState.events.length);
      
      // Compare participant data
      const originalPlayer1 = testGameState.participants.get('player1');
      const roundTripPlayer1 = reDeserialized.participants.get('player1');
      expect(roundTripPlayer1?.name).toBe(originalPlayer1?.name);
      expect(roundTripPlayer1?.isNPC).toBe(originalPlayer1?.isNPC);
      expect(roundTripPlayer1?.status.score).toBe(originalPlayer1?.status.score);
    });

    it('should handle multiple round trips without data loss', () => {
      let currentState = testGameState;
      
      for (let i = 0; i < 5; i++) {
        const json = SerializationEngine.serialize(currentState);
        currentState = SerializationEngine.deserialize(json);
      }
      
      expect(currentState.gameId).toBe(testGameState.gameId);
      expect(currentState.participants.size).toBe(testGameState.participants.size);
      expect(currentState.hands.size).toBe(testGameState.hands.size);
    });
  });

  describe('participant-hand relationship validation', () => {
    it('should validate participant-hand relationships during deserialization', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      
      // Break the relationship by changing hand's participant ID
      parsed.data.hands[0].participantId = 'nonexistent';
      const brokenJson = JSON.stringify(parsed);
      
      expect(() => SerializationEngine.deserialize(brokenJson))
        .toThrow(SerializationError);
    });

    it('should validate that participants own their referenced hands', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      
      // Break the relationship by removing hand ID from participant
      parsed.data.participants[0].handIds = [];
      const brokenJson = JSON.stringify(parsed);
      
      expect(() => SerializationEngine.deserialize(brokenJson))
        .toThrow(SerializationError);
    });

    it('should validate that hands reference existing participants', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      
      // Remove participant but keep hand
      parsed.data.participants = parsed.data.participants.slice(1);
      const brokenJson = JSON.stringify(parsed);
      
      expect(() => SerializationEngine.deserialize(brokenJson))
        .toThrow(SerializationError);
    });
  });

  describe('thread safety', () => {
    it('should report thread safety status', () => {
      expect(SerializationEngine.isThreadSafe()).toBe(true);
    });
  });
});
describe('SerializationVersionManager', () => {
  beforeEach(() => {
    SerializationVersionManager.reset();
  });

  describe('version registration', () => {
    it('should register versions correctly', () => {
      const version: VersionInfo = {
        version: '1.0.0',
        description: 'Initial version',
        backwardCompatible: true
      };

      SerializationVersionManager.registerVersion(version);
      const retrieved = SerializationVersionManager.getVersion('1.0.0');
      
      expect(retrieved).toEqual(version);
    });

    it('should return undefined for non-existent version', () => {
      const version = SerializationVersionManager.getVersion('999.0.0');
      expect(version).toBeUndefined();
    });

    it('should list all registered versions', () => {
      SerializationVersionManager.registerVersion({
        version: '1.0.0',
        description: 'Version 1',
        backwardCompatible: true
      });
      
      SerializationVersionManager.registerVersion({
        version: '2.0.0',
        description: 'Version 2',
        backwardCompatible: false
      });

      const versions = SerializationVersionManager.getAllVersions();
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('1.0.0');
      expect(versions[1].version).toBe('2.0.0');
    });

    it('should check if version is supported', () => {
      SerializationVersionManager.registerVersion({
        version: '1.0.0',
        description: 'Test version',
        backwardCompatible: true
      });

      expect(SerializationVersionManager.isVersionSupported('1.0.0')).toBe(true);
      expect(SerializationVersionManager.isVersionSupported('999.0.0')).toBe(false);
    });
  });

  describe('migration registration', () => {
    it('should register migrations correctly', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Add new field',
        migrate: (data: any) => ({ ...data, newField: 'value' })
      };

      SerializationVersionManager.registerMigration(migration);
      
      expect(SerializationVersionManager.canMigrate('1.0.0', '1.1.0')).toBe(true);
      expect(SerializationVersionManager.canMigrate('1.1.0', '1.0.0')).toBe(false);
    });

    it('should detect same version as migratable', () => {
      expect(SerializationVersionManager.canMigrate('1.0.0', '1.0.0')).toBe(true);
    });
  });

  describe('migration execution', () => {
    beforeEach(() => {
      SerializationVersionManager.registerVersion({
        version: '1.0.0',
        description: 'Initial version',
        backwardCompatible: true
      });
      
      SerializationVersionManager.registerVersion({
        version: '1.1.0',
        description: 'Updated version',
        backwardCompatible: true
      });
    });

    it('should migrate data successfully', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Add metadata field',
        migrate: (data: any) => ({
          ...data,
          data: {
            ...data.data,
            metadata: { ...data.data.metadata, migrated: true }
          }
        })
      };

      SerializationVersionManager.registerMigration(migration);

      const originalData = {
        version: '1.0.0',
        data: { gameId: 'test', metadata: { original: true } },
        timestamp: Date.now()
      };

      const migrated = SerializationVersionManager.migrate(originalData, '1.1.0');
      
      expect(migrated.version).toBe('1.1.0');
      expect(migrated.data.metadata.original).toBe(true);
      expect(migrated.data.metadata.migrated).toBe(true);
    });

    it('should return same data for same version migration', () => {
      const data = {
        version: '1.0.0',
        data: { gameId: 'test' },
        timestamp: Date.now()
      };

      const result = SerializationVersionManager.migrate(data, '1.0.0');
      expect(result).toBe(data);
    });

    it('should throw error for impossible migration', () => {
      const data = {
        version: '1.0.0',
        data: { gameId: 'test' },
        timestamp: Date.now()
      };

      expect(() => SerializationVersionManager.migrate(data, '2.0.0'))
        .toThrow(MigrationError);
    });

    it('should throw error when migration function fails', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Failing migration',
        migrate: () => {
          throw new Error('Migration failed');
        }
      };

      SerializationVersionManager.registerMigration(migration);

      const data = {
        version: '1.0.0',
        data: { gameId: 'test' },
        timestamp: Date.now()
      };

      expect(() => SerializationVersionManager.migrate(data, '1.1.0'))
        .toThrow(MigrationError);
    });
  });

  describe('compatibility checking', () => {
    beforeEach(() => {
      SerializationVersionManager.registerVersion({
        version: '1.0.0',
        description: 'Initial version',
        backwardCompatible: true
      });
      
      SerializationVersionManager.registerVersion({
        version: '1.1.0',
        description: 'Compatible update',
        backwardCompatible: true
      });
      
      SerializationVersionManager.registerVersion({
        version: '2.0.0',
        description: 'Breaking change',
        backwardCompatible: false
      });
    });

    it('should report compatibility for same version', () => {
      const info = SerializationVersionManager.getCompatibilityInfo('1.0.0', '1.0.0');
      
      expect(info.compatible).toBe(true);
      expect(info.canMigrate).toBe(true);
      expect(info.reason).toBe('Same version');
    });

    it('should report compatibility for unknown versions', () => {
      const info = SerializationVersionManager.getCompatibilityInfo('999.0.0', '1.0.0');
      
      expect(info.compatible).toBe(false);
      expect(info.canMigrate).toBe(false);
      expect(info.reason).toContain('Unknown version');
    });

    it('should report migration availability', () => {
      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Test migration',
        migrate: (data: any) => data
      };

      SerializationVersionManager.registerMigration(migration);
      
      const info = SerializationVersionManager.getCompatibilityInfo('1.0.0', '1.1.0');
      
      expect(info.compatible).toBe(true); // Backward compatible versions
      expect(info.canMigrate).toBe(true);
      expect(info.reason).toBe('Migration available');
    });
  });
});

describe('SerializationEngine with Migration', () => {
  let testGameState: GameState;

  beforeEach(() => {
    // Reset and setup version manager
    SerializationVersionManager.reset();
    SerializationVersionManager.registerVersion({
      version: '1.0.0',
      description: 'Initial version',
      backwardCompatible: true
    });

    // Create minimal test game state
    testGameState = new GameState('test-game');
  });

  describe('deserializeWithMigration', () => {
    it('should deserialize current version without migration', () => {
      const json = SerializationEngine.serialize(testGameState);
      const deserialized = SerializationEngine.deserializeWithMigration(json);
      
      expect(deserialized.gameId).toBe(testGameState.gameId);
    });

    it('should migrate and deserialize older version', () => {
      // Register new version and migration
      SerializationVersionManager.registerVersion({
        version: '1.1.0',
        description: 'Updated version',
        backwardCompatible: true
      });

      const migration: Migration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Add version field to metadata',
        migrate: (data: any) => ({
          ...data,
          version: '1.1.0',
          data: {
            ...data.data,
            metadata: { ...data.data.metadata, version: '1.1.0' }
          }
        })
      };

      SerializationVersionManager.registerMigration(migration);

      // Create old version data
      const oldVersionJson = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(oldVersionJson);
      parsed.version = '1.0.0';
      const oldJson = JSON.stringify(parsed);

      // Mock current version to be 1.1.0
      const originalVersion = (SerializationEngine as any).CURRENT_VERSION;
      (SerializationEngine as any).CURRENT_VERSION = '1.1.0';

      try {
        const deserialized = SerializationEngine.deserializeWithMigration(oldJson);
        expect(deserialized.gameId).toBe(testGameState.gameId);
        expect(deserialized.metadata.version).toBe('1.1.0');
      } finally {
        // Restore original version
        (SerializationEngine as any).CURRENT_VERSION = originalVersion;
      }
    });
  });

  describe('checkCompatibility', () => {
    it('should check compatibility of serialized data', () => {
      const json = SerializationEngine.serialize(testGameState);
      const result: SerializationCompatibilityResult = SerializationEngine.checkCompatibility(json);
      
      expect(result.compatible).toBe(true);
      expect(result.canMigrate).toBe(true);
      expect(result.sourceVersion).toBe(SERIALIZATION_VERSION);
      expect(result.targetVersion).toBe(SERIALIZATION_VERSION);
    });

    it('should handle invalid JSON gracefully', () => {
      const result = SerializationEngine.checkCompatibility('invalid json');
      
      expect(result.compatible).toBe(false);
      expect(result.canMigrate).toBe(false);
      expect(result.sourceVersion).toBe('unknown');
      expect(result.reason).toContain('Invalid JSON');
    });

    it('should report incompatible versions', () => {
      const json = SerializationEngine.serialize(testGameState);
      const parsed = JSON.parse(json);
      parsed.version = '999.0.0';
      const incompatibleJson = JSON.stringify(parsed);
      
      const result = SerializationEngine.checkCompatibility(incompatibleJson);
      
      expect(result.compatible).toBe(false);
      expect(result.canMigrate).toBe(false);
      expect(result.sourceVersion).toBe('999.0.0');
    });
  });

  describe('custom property serialization', () => {
    it('should handle complex custom properties', () => {
      const complexGameState = new GameState(
        'complex-game',
        GamePhase.SETUP,
        new Gameboard(),
        new Map(),
        new Map(),
        [],
        {
          customObject: { nested: { value: 42 } },
          customArray: [1, 2, { key: 'value' }],
          customFunction: null, // Functions should be excluded
          customDate: new Date().toISOString(),
          customBoolean: true,
          customNull: null,
          customUndefined: undefined
        }
      );

      const json = SerializationEngine.serialize(complexGameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      expect(deserialized.metadata.customObject.nested.value).toBe(42);
      expect(deserialized.metadata.customArray).toEqual([1, 2, { key: 'value' }]);
      expect(deserialized.metadata.customBoolean).toBe(true);
      expect(deserialized.metadata.customNull).toBeNull();
      expect(deserialized.metadata.customUndefined).toBeUndefined();
    });

    it('should preserve card custom properties', () => {
      const cardWithComplexProperties = new Card({
        id: 'complex-card',
        faceId: 'face',
        tailId: 'tail',
        properties: {
          abilities: ['flying', 'trample'],
          cost: { mana: 3, colorless: 2 },
          stats: { power: 4, toughness: 4 },
          rarity: 'rare',
          set: 'test-set'
        }
      }, 'custom-deck');

      const cardInPile: CardInPile = {
        card: cardWithComplexProperties,
        faceUp: true,
        orientation: CardOrientation.NORMAL,
        owner: null,
        status: { enchanted: true, counters: { '+1': 2 } }
      };

      const pile = new CardPile('test-pile', [cardInPile]);
      const gameboard = new Gameboard(new Map([['test-pile', pile]]));
      const gameState = new GameState('test', GamePhase.SETUP, gameboard);

      const json = SerializationEngine.serialize(gameState);
      const deserialized = SerializationEngine.deserialize(json);
      
      // Debug: Check what piles exist
      const pileNames = Array.from(deserialized.gameboard.piles.keys());
      expect(pileNames).toContain('test-pile');
      
      const deserializedPile = deserialized.gameboard.piles.get('test-pile');
      expect(deserializedPile).toBeDefined();
      expect(deserializedPile?.cards.length).toBe(1);
      
      const deserializedCard = deserializedPile?.cards[0];
      expect(deserializedCard).toBeDefined();
      expect(deserializedCard?.card.properties.abilities).toEqual(['flying', 'trample']);
      expect(deserializedCard?.card.properties.cost.mana).toBe(3);
      expect(deserializedCard?.card.properties.stats.power).toBe(4);
      expect(deserializedCard?.status.enchanted).toBe(true);
      expect(deserializedCard?.status.counters['+1']).toBe(2);
    });
  });
});