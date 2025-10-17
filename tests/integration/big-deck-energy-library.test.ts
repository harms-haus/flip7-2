/**
 * Integration tests for BigDeckEnergy main library functionality
 * 
 * Tests the main library class, factory methods, registration system,
 * and overall library functionality with real components.
 */

import { BigDeckEnergy, BigDeckEnergyUtils } from '../../src/big-deck-energy';
import { DeveloperUtilities, DebugUtilities } from '../../src/utils/developer-utilities';
import { StandardPlayingDeck } from '../../src/deck-types/standard/standard-playing-deck';
import { CustomDeckType } from '../../src/deck-types/custom/custom-deck-type';
import { WarRuleset } from '../../src/rulesets/war/war-ruleset';
import { GoFishRuleset } from '../../src/rulesets/go-fish/go-fish-ruleset';
import { BaseDeckType } from '../../src/deck-types/base/base-deck-type';
import { BaseRuleset } from '../../src/rulesets/base/base-ruleset';
import { GamePhase } from '../../src/core/types/game-phase';
import { CardDefinition } from '../../src/core/interfaces/card';

describe('BigDeckEnergy Library Integration Tests', () => {
  let bde: BigDeckEnergy;

  beforeEach(() => {
    // Create a fresh instance for each test
    bde = BigDeckEnergy.create({ debug: false });
  });

  afterEach(() => {
    // Clean up after each test
    bde.reset();
  });

  describe('Library Initialization', () => {
    test('should create singleton instance', () => {
      const instance1 = BigDeckEnergy.getInstance();
      const instance2 = BigDeckEnergy.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(BigDeckEnergy);
    });

    test('should create separate instances with create()', () => {
      const instance1 = BigDeckEnergy.create();
      const instance2 = BigDeckEnergy.create();
      
      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(BigDeckEnergy);
      expect(instance2).toBeInstanceOf(BigDeckEnergy);
    });

    test('should initialize with built-in components', () => {
      const deckTypes = bde.getAvailableDeckTypes();
      const rulesets = bde.getAvailableRulesets();

      expect(deckTypes).toContain('standard');
      expect(deckTypes).toContain('custom');
      expect(deckTypes).toContain('monopoly-property');
      
      expect(rulesets).toContain('war');
      expect(rulesets).toContain('go-fish');
    });

    test('should provide library information', () => {
      const info = bde.getLibraryInfo();

      expect(info.name).toBe('BigDeckEnergy');
      expect(info.version).toBe('1.0.0');
      expect(info.builtInDeckTypes).toEqual(['standard', 'custom', 'monopoly-property']);
      expect(info.builtInRulesets).toEqual(['war', 'go-fish']);
      expect(info.totalDeckTypes).toBeGreaterThanOrEqual(3);
      expect(info.totalRulesets).toBeGreaterThanOrEqual(2);
      expect(info.activeGames).toBe(0);
    });
  });

  describe('Component Registration', () => {
    test('should register custom deck type', () => {
      const customDeck = new CustomDeckType({
        name: 'test-deck',
        faces: new Map([['face1', 'face1.png']]),
        tails: new Map([['tail1', 'tail1.png']]),
        cards: [
          { id: 'card1', faceId: 'face1', tailId: 'tail1', properties: {} }
        ]
      });

      bde.registerDeckType('test-deck', customDeck, {
        description: 'Test deck for integration tests',
        version: '1.0.0',
        author: 'Test Suite'
      });

      const retrievedDeck = bde.getDeckType('test-deck');
      expect(retrievedDeck).toBe(customDeck);
      expect(bde.getAvailableDeckTypes()).toContain('test-deck');

      const deckInfo = bde.getDeckTypeInfo('test-deck');
      expect(deckInfo).toBeDefined();
      expect(deckInfo!.metadata.description).toBe('Test deck for integration tests');
    });

    test('should register custom ruleset', () => {
      class TestRuleset extends BaseRuleset {
        public readonly name = 'test-rules';
        public readonly minPlayers = 2;
        public readonly maxPlayers = 4;
        public readonly compatibleDeckTypes = ['standard'];

        setup(gameState: any) {
          return gameState;
        }

        gameloop(gameState: any) {
          return {
            canContinue: false,
            updatedGameState: gameState,
            requiresParticipantInteraction: false
          };
        }

        validate() {
          return [];
        }

        wincondition() {
          return { gameEnded: true, winners: [], reason: 'Test complete' };
        }
      }

      const customRuleset = new TestRuleset();

      bde.registerRuleset('test-rules', customRuleset, {
        description: 'Test ruleset for integration tests',
        version: '1.0.0',
        author: 'Test Suite'
      });

      const retrievedRuleset = bde.getRuleset('test-rules');
      expect(retrievedRuleset).toBe(customRuleset);
      expect(bde.getAvailableRulesets()).toContain('test-rules');

      const rulesetInfo = bde.getRulesetInfo('test-rules');
      expect(rulesetInfo).toBeDefined();
      expect(rulesetInfo!.metadata.description).toBe('Test ruleset for integration tests');
    });

    test('should prevent duplicate registrations', () => {
      const deck1 = new CustomDeckType({
        name: 'duplicate-deck',
        faces: new Map(),
        tails: new Map(),
        cards: []
      });

      const deck2 = new CustomDeckType({
        name: 'duplicate-deck',
        faces: new Map(),
        tails: new Map(),
        cards: []
      });

      bde.registerDeckType('duplicate-deck', deck1);
      
      expect(() => {
        bde.registerDeckType('duplicate-deck', deck2);
      }).toThrow('Deck type \'duplicate-deck\' is already registered');
    });

    test('should validate name consistency', () => {
      const deck = new CustomDeckType({
        name: 'correct-name',
        faces: new Map(),
        tails: new Map(),
        cards: []
      });

      expect(() => {
        bde.registerDeckType('wrong-name', deck);
      }).toThrow('Deck type name mismatch: expected \'wrong-name\', got \'correct-name\'');
    });
  });

  describe('Compatibility Validation', () => {
    test('should validate compatible combinations', () => {
      const result = bde.validateCompatibility('war', 'standard');
      
      expect(result.isCompatible).toBe(true);
      expect(result.messages).toContain('Ruleset \'war\' is compatible with deck type \'standard\'');
    });

    test('should reject incompatible combinations', () => {
      // Register a custom ruleset that only works with custom decks
      class CustomOnlyRuleset extends BaseRuleset {
        public readonly name = 'custom-only';
        public readonly minPlayers = 2;
        public readonly maxPlayers = 2;
        public readonly compatibleDeckTypes = ['custom'];

        setup(gameState: any) { return gameState; }
        gameloop(gameState: any) { 
          return { canContinue: false, updatedGameState: gameState, requiresParticipantInteraction: false };
        }
        validate() { return []; }
        wincondition() { return { gameEnded: true, winners: [], reason: 'Test' }; }
      }

      bde.registerRuleset('custom-only', new CustomOnlyRuleset());

      const result = bde.validateCompatibility('custom-only', 'standard');
      
      expect(result.isCompatible).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should find compatible deck types for ruleset', () => {
      const compatibleDecks = bde.findCompatibleDeckTypes('war');
      
      expect(compatibleDecks).toContain('standard');
      expect(compatibleDecks.length).toBeGreaterThan(0);
    });

    test('should find compatible rulesets for deck type', () => {
      const compatibleRulesets = bde.findCompatibleRulesets('standard');
      
      expect(compatibleRulesets).toContain('war');
      expect(compatibleRulesets).toContain('go-fish');
      expect(compatibleRulesets.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Game Creation', () => {
    test('should create game with built-in components', async () => {
      const result = await bde.createQuickGame('test-war-game', 'war', 'standard');
      
      expect(result.success).toBe(true);
      expect(result.gameInstance).toBeDefined();
      expect(result.messages).toContain('Game created successfully');
      
      const game = result.gameInstance!;
      expect(game.getGameId()).toBe('test-war-game');
      expect(game.getRuleset().name).toBe('war');
      expect(game.getDeckType().name).toBe('standard');
    });

    test('should create game with custom components', async () => {
      const ruleset = bde.getRuleset('war')!;
      const deckType = bde.getDeckType('standard')!;

      const result = await bde.createGame({
        gameId: 'custom-game',
        ruleset,
        deckType,
        metadata: { testMode: true }
      });

      expect(result.success).toBe(true);
      expect(result.gameInstance).toBeDefined();
      
      const game = result.gameInstance!;
      expect(game.getGameState().metadata.testMode).toBe(true);
    });

    test('should prevent duplicate game IDs', async () => {
      await bde.createQuickGame('duplicate-id', 'war', 'standard');
      
      const result = await bde.createQuickGame('duplicate-id', 'go-fish', 'standard');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('already exists');
    });

    test('should manage active games', async () => {
      expect(bde.getActiveGameCount()).toBe(0);
      expect(bde.getActiveGameIds()).toEqual([]);

      await bde.createQuickGame('game1', 'war', 'standard');
      await bde.createQuickGame('game2', 'go-fish', 'standard');

      expect(bde.getActiveGameCount()).toBe(2);
      expect(bde.getActiveGameIds()).toContain('game1');
      expect(bde.getActiveGameIds()).toContain('game2');

      const game1 = bde.getGame('game1');
      expect(game1).toBeDefined();
      expect(game1!.getGameId()).toBe('game1');

      const removed = bde.removeGame('game1');
      expect(removed).toBe(true);
      expect(bde.getActiveGameCount()).toBe(1);
      expect(bde.getGame('game1')).toBeNull();
    });
  });

  describe('Game Lifecycle', () => {
    test('should initialize and run game', async () => {
      const result = await bde.createQuickGame('lifecycle-test', 'war', 'standard');
      const game = result.gameInstance!;

      // Initialize game
      expect(game.isGameInitialized()).toBe(false);
      const initializedState = game.initialize();
      expect(game.isGameInitialized()).toBe(true);
      expect(initializedState.phase).toBe(GamePhase.DEALING);

      // Create participants
      game.createParticipant('player1', 'Alice');
      game.createParticipant('player2', 'Bob');

      // Create hands
      game.createHand('hand1', 'Alice Hand', 'player1');
      game.createHand('hand2', 'Bob Hand', 'player2');

      // Verify participants and hands
      expect(game.getParticipants().size).toBe(2);
      expect(game.getHands().size).toBe(2);

      const participantHands = game.getParticipantHands('player1');
      expect(participantHands.length).toBe(1);
      expect(participantHands[0].name).toBe('Alice Hand');
    });

    test('should handle game state updates', async () => {
      const result = await bde.createQuickGame('state-test', 'war', 'standard');
      const game = result.gameInstance!;

      game.initialize();
      game.createParticipant('player1', 'Alice');

      // Update participant status
      game.updateParticipantStatus('player1', 'score', 100);
      
      const participant = game.getParticipants().get('player1');
      expect(participant?.status.score).toBe(100);

      // Update gameboard status
      game.updateGameboardStatus('round', 1);
      
      const gameState = game.getGameState();
      expect(gameState.gameboard.status.round).toBe(1);
    });

    test('should validate game state', async () => {
      const result = await bde.createQuickGame('validation-test', 'war', 'standard');
      const game = result.gameInstance!;

      game.initialize();

      const validationErrors = game.validateGameState();
      expect(Array.isArray(validationErrors)).toBe(true);
    });

    test('should check win conditions', async () => {
      const result = await bde.createQuickGame('win-test', 'war', 'standard');
      const game = result.gameInstance!;

      game.initialize();

      const winResult = game.checkWinConditions();
      expect(winResult).toBeDefined();
      expect(typeof winResult.gameEnded).toBe('boolean');
      expect(Array.isArray(winResult.winners)).toBe(true);
      expect(typeof winResult.reason).toBe('string');
    });
  });

  describe('Serialization', () => {
    test('should serialize and deserialize game state', async () => {
      const result = await bde.createQuickGame('serialization-test', 'war', 'standard');
      const game = result.gameInstance!;

      const initialState = game.initialize();
      game.createParticipant('player1', 'Alice');

      // Serialize the game state
      const serialized = bde.serializeGameState(initialState);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);

      // Deserialize the game state
      const deserialized = bde.deserializeGameState(serialized);
      expect(deserialized).toBeDefined();
      expect(deserialized.gameId).toBe(initialState.gameId);
      expect(deserialized.phase).toBe(initialState.phase);
    });
  });
});

describe('BigDeckEnergyUtils Integration Tests', () => {
  let bde: BigDeckEnergy;

  beforeEach(() => {
    bde = BigDeckEnergy.create({ debug: false });
  });

  afterEach(() => {
    bde.reset();
  });

  describe('Utility Functions', () => {
    test('should create compatible game', async () => {
      const result = await BigDeckEnergyUtils.createCompatibleGame(
        'utils-test',
        'war',
        'standard',
        bde
      );

      expect(result.success).toBe(true);
      expect(result.gameInstance).toBeDefined();
    });

    test('should reject incompatible game creation', async () => {
      // Register incompatible components
      class IncompatibleRuleset extends BaseRuleset {
        public readonly name = 'incompatible';
        public readonly minPlayers = 2;
        public readonly maxPlayers = 2;
        public readonly compatibleDeckTypes = ['nonexistent-deck'];

        setup(gameState: any) { return gameState; }
        gameloop(gameState: any) { 
          return { canContinue: false, updatedGameState: gameState, requiresParticipantInteraction: false };
        }
        validate() { return []; }
        wincondition() { return { gameEnded: true, winners: [], reason: 'Test' }; }
      }

      bde.registerRuleset('incompatible', new IncompatibleRuleset());

      const result = await BigDeckEnergyUtils.createCompatibleGame(
        'incompatible-test',
        'incompatible',
        'standard',
        bde
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should get valid combinations', () => {
      const combinations = BigDeckEnergyUtils.getValidCombinations(bde);

      expect(Array.isArray(combinations)).toBe(true);
      expect(combinations.length).toBeGreaterThan(0);

      const warStandardCombo = combinations.find(
        combo => combo.ruleset === 'war' && combo.deckType === 'standard'
      );
      expect(warStandardCombo).toBeDefined();
      expect(warStandardCombo!.compatible).toBe(true);
    });

    test('should generate unique game IDs', () => {
      const id1 = BigDeckEnergyUtils.generateGameId();
      const id2 = BigDeckEnergyUtils.generateGameId();
      const id3 = BigDeckEnergyUtils.generateGameId('custom');

      expect(id1).not.toBe(id2);
      expect(id3).toContain('custom');
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    test('should validate game config', () => {
      const ruleset = bde.getRuleset('war')!;
      const deckType = bde.getDeckType('standard')!;

      const validConfig = {
        gameId: 'valid-game',
        ruleset,
        deckType
      };

      const validResult = BigDeckEnergyUtils.validateGameConfig(validConfig);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual([]);

      const invalidConfig = {
        gameId: '',
        ruleset: null as any,
        deckType: null as any
      };

      const invalidResult = BigDeckEnergyUtils.validateGameConfig(invalidConfig);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Developer Utilities Integration Tests', () => {
  describe('Validation Utilities', () => {
    test('should validate deck type', () => {
      const standardDeck = new StandardPlayingDeck();
      const result = DeveloperUtilities.validateDeckType(standardDeck);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.summary).toContain('successfully');
    });

    test('should validate ruleset', () => {
      const warRuleset = new WarRuleset();
      const result = DeveloperUtilities.validateRuleset(warRuleset);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.summary).toContain('successfully');
    });

    test('should validate card definition', () => {
      const cardDef: CardDefinition = {
        id: 'test-card',
        faceId: 'ace-spades',
        tailId: 'standard-back',
        properties: { suit: 'spades', rank: 'ace' }
      };

      const result = DeveloperUtilities.validateCardDefinition(cardDef);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect validation errors', () => {
      const invalidCardDef: CardDefinition = {
        id: '',
        faceId: '',
        tailId: '',
        properties: null as any
      };

      const result = DeveloperUtilities.validateCardDefinition(invalidCardDef);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should generate comprehensive validation report', () => {
      const standardDeck = new StandardPlayingDeck();
      const warRuleset = new WarRuleset();
      const cardDef: CardDefinition = {
        id: 'test-card',
        faceId: 'ace-spades',
        tailId: 'standard-back',
        properties: {}
      };

      const report = DeveloperUtilities.generateValidationReport({
        deckTypes: [standardDeck],
        rulesets: [warRuleset],
        cardDefinitions: [cardDef]
      });

      expect(report.overall.isValid).toBe(true);
      expect(report.deckTypes.length).toBe(1);
      expect(report.rulesets.length).toBe(1);
      expect(report.cardDefinitions.length).toBe(1);
    });

    test('should create sample game state', () => {
      const sampleState = DeveloperUtilities.createSampleGameState(
        'sample-game',
        GamePhase.PLAYING,
        3
      );

      expect(sampleState.gameId).toBe('sample-game');
      expect(sampleState.phase).toBe(GamePhase.PLAYING);
      expect(sampleState.participants.size).toBe(3);
      expect(sampleState.hands.size).toBe(3);
    });

    test('should test ruleset with sample data', () => {
      const warRuleset = new WarRuleset();
      const standardDeck = new StandardPlayingDeck();

      const testResults = DeveloperUtilities.testRulesetWithSampleData(
        warRuleset,
        standardDeck
      );

      expect(testResults.setupTest.success).toBe(true);
      expect(testResults.gameloopTest.success).toBe(true);
      expect(testResults.validateTest.success).toBe(true);
      expect(testResults.winconditionTest.success).toBe(true);
    });
  });
});

describe('Debug Utilities Integration Tests', () => {
  beforeEach(() => {
    DebugUtilities.clearLogHistory();
    DebugUtilities.setDebugEnabled(true);
  });

  afterEach(() => {
    DebugUtilities.setDebugEnabled(false);
    DebugUtilities.clearLogHistory();
  });

  describe('Logging Functions', () => {
    test('should enable and disable debug logging', () => {
      expect(DebugUtilities.isDebugEnabled()).toBe(true);
      
      DebugUtilities.setDebugEnabled(false);
      expect(DebugUtilities.isDebugEnabled()).toBe(false);
    });

    test('should log messages at different levels', () => {
      DebugUtilities.debug('Debug message');
      DebugUtilities.info('Info message');
      DebugUtilities.warn('Warning message');
      DebugUtilities.error('Error message');

      const history = DebugUtilities.getLogHistory();
      expect(history.length).toBe(4);
      expect(history[0].level).toBe('DEBUG');
      expect(history[1].level).toBe('INFO');
      expect(history[2].level).toBe('WARN');
      expect(history[3].level).toBe('ERROR');
    });

    test('should maintain log history', () => {
      DebugUtilities.info('Test message 1');
      DebugUtilities.info('Test message 2');

      const history = DebugUtilities.getLogHistory();
      expect(history.length).toBe(2);
      expect(history[0].message).toBe('Test message 1');
      expect(history[1].message).toBe('Test message 2');

      DebugUtilities.clearLogHistory();
      const clearedHistory = DebugUtilities.getLogHistory();
      expect(clearedHistory.length).toBe(0);
    });

    test('should create performance timers', () => {
      const timer = DebugUtilities.startTimer('test-operation');
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait for at least 10ms
      }
      
      const duration = timer.stop();
      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    test('should inspect objects', () => {
      const testObject = {
        name: 'test',
        value: 42,
        nested: { inner: 'value' }
      };

      DebugUtilities.inspect(testObject, 'TestObject');

      const history = DebugUtilities.getLogHistory();
      const inspectLog = history.find(entry => entry.message.includes('Inspecting TestObject'));
      expect(inspectLog).toBeDefined();
    });
  });
});

describe('Package Build Integration Tests', () => {
  describe('CommonJS Build', () => {
    test('should have CommonJS exports', () => {
      // This test verifies that the CommonJS build exists and has the expected structure
      const fs = require('fs');
      const path = require('path');

      const cjsIndexPath = path.join(__dirname, '../../dist/cjs/index.js');
      expect(fs.existsSync(cjsIndexPath)).toBe(true);

      const cjsBigDeckEnergyPath = path.join(__dirname, '../../dist/cjs/big-deck-energy.js');
      expect(fs.existsSync(cjsBigDeckEnergyPath)).toBe(true);
    });
  });

  describe('ES Module Build', () => {
    test('should have ES Module exports', () => {
      const fs = require('fs');
      const path = require('path');

      const esmIndexPath = path.join(__dirname, '../../dist/esm/index.js');
      expect(fs.existsSync(esmIndexPath)).toBe(true);

      const esmBigDeckEnergyPath = path.join(__dirname, '../../dist/esm/big-deck-energy.js');
      expect(fs.existsSync(esmBigDeckEnergyPath)).toBe(true);
    });
  });

  describe('TypeScript Declarations', () => {
    test('should have TypeScript declaration files', () => {
      const fs = require('fs');
      const path = require('path');

      const typesIndexPath = path.join(__dirname, '../../dist/types/index.d.ts');
      expect(fs.existsSync(typesIndexPath)).toBe(true);

      const typesBigDeckEnergyPath = path.join(__dirname, '../../dist/types/big-deck-energy.d.ts');
      expect(fs.existsSync(typesBigDeckEnergyPath)).toBe(true);

      // Check that developer utilities types are included
      const utilsTypesPath = path.join(__dirname, '../../dist/types/utils/developer-utilities.d.ts');
      expect(fs.existsSync(utilsTypesPath)).toBe(true);
    });
  });
});