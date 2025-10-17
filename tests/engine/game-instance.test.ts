import { GameInstance, GameInstanceConfig, GameCreationResult } from '../../src/engine/game-instance';
import { Ruleset, GameLoopResult, ValidationError, WinResult, ParticipantAction } from '../../src/core/interfaces/ruleset';
import { DeckType } from '../../src/core/interfaces/deck-type';
import { GameState } from '../../src/core/interfaces/game-state';
import { CardDefinition } from '../../src/core/interfaces/card';
import { GamePhase } from '../../src/core/types';
import { CompatibilityError, InvalidActionError } from '../../src/core/errors';

// Test implementations for GameInstance testing
class TestRuleset implements Ruleset {
  constructor(
    public readonly name: string,
    public readonly compatibleDeckTypes: string[],
    public readonly minPlayers: number = 2,
    public readonly maxPlayers: number = 4
  ) {}

  setup(gameState: GameState, deckType: DeckType): GameState {
    // Simple setup that just transitions to dealing phase
    return {
      ...gameState,
      phase: GamePhase.DEALING,
      metadata: { ...gameState.metadata, setupComplete: true }
    };
  }

  gameloop(gameState: GameState): GameLoopResult {
    return {
      canContinue: gameState.phase !== GamePhase.FINISHED,
      updatedGameState: gameState,
      requiresParticipantInteraction: gameState.participants.size > 0
    };
  }

  validate(gameState: GameState): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (gameState.participants.size < this.minPlayers) {
      errors.push({
        code: 'INSUFFICIENT_PLAYERS',
        message: `Need at least ${this.minPlayers} players, have ${gameState.participants.size}`,
        severity: 'error'
      });
    }
    
    if (gameState.participants.size > this.maxPlayers) {
      errors.push({
        code: 'TOO_MANY_PLAYERS',
        message: `Maximum ${this.maxPlayers} players allowed, have ${gameState.participants.size}`,
        severity: 'error'
      });
    }

    return errors;
  }

  wincondition(gameState: GameState): WinResult {
    // Simple win condition: game ends when in finished phase
    if (gameState.phase === GamePhase.FINISHED) {
      const participantIds = Array.from(gameState.participants.keys());
      return {
        gameEnded: true,
        winners: participantIds.slice(0, 1), // First participant wins
        reason: 'Game completed'
      };
    }

    return {
      gameEnded: false,
      winners: [],
      reason: ''
    };
  }
}

class TestDeckType implements DeckType {
  public readonly faces = new Map<string, string>([
    ['face1', '/images/face1.png'],
    ['face2', '/images/face2.png']
  ]);
  
  public readonly tails = new Map<string, string>([
    ['tail1', '/images/tail1.png']
  ]);
  
  public readonly cards: CardDefinition[] = [
    { id: 'card1', faceId: 'face1', tailId: 'tail1', properties: { value: 1 } },
    { id: 'card2', faceId: 'face2', tailId: 'tail1', properties: { value: 2 } }
  ];

  constructor(public readonly name: string) {}

  createDeck() {
    return this.cards.map(cardDef => ({
      id: cardDef.id,
      faceId: cardDef.faceId,
      tailId: cardDef.tailId,
      deckType: this.name,
      properties: cardDef.properties
    }));
  }

  validateCard() {
    return true;
  }
}

describe('GameInstance', () => {
  let testRuleset: Ruleset;
  let incompatibleRuleset: Ruleset;
  let testDeckType: DeckType;
  let incompatibleDeckType: DeckType;

  beforeEach(() => {
    testRuleset = new TestRuleset('test-ruleset', ['test-deck']);
    incompatibleRuleset = new TestRuleset('incompatible-ruleset', ['other-deck']);
    testDeckType = new TestDeckType('test-deck');
    incompatibleDeckType = new TestDeckType('other-deck');
  });

  describe('create', () => {
    it('should create a game instance with compatible ruleset and deck type', () => {
      const config: GameInstanceConfig = {
        gameId: 'test-game-1',
        ruleset: testRuleset,
        deckType: testDeckType,
        metadata: { testMode: true }
      };

      const result: GameCreationResult = GameInstance.create(config);

      expect(result.success).toBe(true);
      expect(result.gameInstance).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.messages).toContain('Game instance \'test-game-1\' created successfully');
      expect(result.messages).toContain('Using ruleset: test-ruleset');
      expect(result.messages).toContain('Using deck type: test-deck');
    });

    it('should fail to create game instance with incompatible ruleset and deck type', () => {
      const config: GameInstanceConfig = {
        gameId: 'test-game-2',
        ruleset: testRuleset,
        deckType: incompatibleDeckType
      };

      const result: GameCreationResult = GameInstance.create(config);

      expect(result.success).toBe(false);
      expect(result.gameInstance).toBeUndefined();
      expect(result.error).toBeInstanceOf(CompatibilityError);
      expect(result.messages).toContain('Ruleset \'test-ruleset\' requires one of: test-deck');
    });

    it('should create game instance with default metadata when none provided', () => {
      const config: GameInstanceConfig = {
        gameId: 'test-game-3',
        ruleset: testRuleset,
        deckType: testDeckType
      };

      const result: GameCreationResult = GameInstance.create(config);

      expect(result.success).toBe(true);
      expect(result.gameInstance?.getGameState().metadata).toEqual({});
    });
  });

  describe('basic getters', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType,
        metadata: { test: true }
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
    });

    it('should return correct game state', () => {
      const gameState = gameInstance.getGameState();
      expect(gameState.gameId).toBe('test-game');
      expect(gameState.phase).toBe(GamePhase.SETUP);
      expect(gameState.metadata).toEqual({ test: true });
    });

    it('should return correct ruleset', () => {
      const ruleset = gameInstance.getRuleset();
      expect(ruleset.name).toBe('test-ruleset');
    });

    it('should return correct deck type', () => {
      const deckType = gameInstance.getDeckType();
      expect(deckType.name).toBe('test-deck');
    });

    it('should return correct game ID', () => {
      expect(gameInstance.getGameId()).toBe('test-game');
    });

    it('should return correct current phase', () => {
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.SETUP);
    });

    it('should indicate game is not initialized initially', () => {
      expect(gameInstance.isGameInitialized()).toBe(false);
    });
  });

  describe('initialization', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
    });

    it('should initialize game successfully', () => {
      const initializedState = gameInstance.initialize();

      expect(gameInstance.isGameInitialized()).toBe(true);
      expect(initializedState.phase).toBe(GamePhase.DEALING);
      expect(initializedState.metadata.setupComplete).toBe(true);
    });

    it('should throw error when trying to initialize twice', () => {
      gameInstance.initialize();

      expect(() => gameInstance.initialize()).toThrow('Game has already been initialized');
    });

    it('should transition to dealing phase after initialization', () => {
      gameInstance.initialize();
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.DEALING);
    });
  });

  describe('participant management', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
    });

    it('should create participants successfully', () => {
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('npc1', 'Bot', true);

      const participants = gameInstance.getParticipants();
      expect(participants.size).toBe(2);
      expect(participants.get('player1')?.name).toBe('Alice');
      expect(participants.get('player1')?.isNPC).toBe(false);
      expect(participants.get('npc1')?.name).toBe('Bot');
      expect(participants.get('npc1')?.isNPC).toBe(true);
    });

    it('should throw error when creating duplicate participant', () => {
      gameInstance.createParticipant('player1', 'Alice', false);

      expect(() => gameInstance.createParticipant('player1', 'Bob', false))
        .toThrow('Participant \'player1\' already exists');
    });

    it('should update participant status', () => {
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.updateParticipantStatus('player1', 'score', 100);

      const participant = gameInstance.getParticipants().get('player1');
      expect(participant?.status.score).toBe(100);
    });

    it('should throw error when updating non-existent participant', () => {
      expect(() => gameInstance.updateParticipantStatus('nonexistent', 'score', 100))
        .toThrow('Participant \'nonexistent\' does not exist');
    });
  });

  describe('hand management', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
      gameInstance.createParticipant('player1', 'Alice', false);
    });

    it('should create hands successfully', () => {
      gameInstance.createHand('hand1', 'Main Hand', 'player1');

      const hands = gameInstance.getHands();
      expect(hands.size).toBe(1);
      expect(hands.get('hand1')?.name).toBe('Main Hand');
      expect(hands.get('hand1')?.participantId).toBe('player1');
    });

    it('should assign hand to participant', () => {
      gameInstance.createHand('hand1', 'Main Hand', 'player1');

      const participantHands = gameInstance.getParticipantHands('player1');
      expect(participantHands).toHaveLength(1);
      expect(participantHands[0].id).toBe('hand1');
    });

    it('should throw error when creating hand for non-existent participant', () => {
      expect(() => gameInstance.createHand('hand1', 'Main Hand', 'nonexistent'))
        .toThrow('Participant \'nonexistent\' does not exist');
    });

    it('should throw error when creating duplicate hand', () => {
      gameInstance.createHand('hand1', 'Main Hand', 'player1');

      expect(() => gameInstance.createHand('hand1', 'Another Hand', 'player1'))
        .toThrow('Hand \'hand1\' already exists');
    });

    it('should update hand status', () => {
      gameInstance.createHand('hand1', 'Main Hand', 'player1');
      gameInstance.updateHandStatus('hand1', 'cardCount', 5);

      const hand = gameInstance.getHands().get('hand1');
      expect(hand?.status.cardCount).toBe(5);
    });
  });

  describe('phase transitions', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
    });

    it('should transition phases correctly', () => {
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.SETUP);

      gameInstance.transitionToPhase(GamePhase.DEALING);
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.DEALING);

      gameInstance.transitionToPhase(GamePhase.PLAYING);
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.PLAYING);
    });

    it('should not transition to same phase', () => {
      gameInstance.transitionToPhase(GamePhase.SETUP);
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.SETUP);
    });

    it('should throw error for invalid phase transitions', () => {
      expect(() => gameInstance.transitionToPhase(GamePhase.FINISHED))
        .toThrow('Invalid phase transition from setup to finished');
    });

    it('should prevent transitions from finished phase', () => {
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      gameInstance.transitionToPhase(GamePhase.FINISHED);

      expect(() => gameInstance.transitionToPhase(GamePhase.SETUP))
        .toThrow('Invalid phase transition from finished to setup');
    });
  });

  describe('game loop execution', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
    });

    it('should throw error when executing game loop before initialization', () => {
      expect(() => gameInstance.executeGameLoop())
        .toThrow('Game must be initialized before executing game loop');
    });

    it('should execute game loop successfully after initialization', () => {
      gameInstance.initialize();
      const result = gameInstance.executeGameLoop();

      expect(result.canContinue).toBe(true);
      expect(result.updatedGameState).toBeDefined();
      expect(result.requiresParticipantInteraction).toBe(false);
    });

    it('should require participant interaction when participants exist', () => {
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);

      const result = gameInstance.executeGameLoop();
      expect(result.requiresParticipantInteraction).toBe(true);
    });
  });

  describe('validation and win conditions', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
    });

    it('should validate game state', () => {
      const errors = gameInstance.validateGameState();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INSUFFICIENT_PLAYERS');
    });

    it('should pass validation with correct number of players', () => {
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);

      const errors = gameInstance.validateGameState();
      expect(errors).toHaveLength(0);
    });

    it('should check win conditions', () => {
      const winResult = gameInstance.checkWinConditions();
      expect(winResult.gameEnded).toBe(false);
      expect(winResult.winners).toHaveLength(0);
    });

    it('should detect win condition when game is finished', () => {
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      gameInstance.transitionToPhase(GamePhase.FINISHED);

      const winResult = gameInstance.checkWinConditions();
      expect(winResult.gameEnded).toBe(true);
      expect(winResult.winners).toContain('player1');
      expect(winResult.reason).toBe('Game completed');
    });
  });

  describe('action processing', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
    });

    it('should throw error when processing action before initialization', () => {
      const uninitializedConfig: GameInstanceConfig = {
        gameId: 'uninit-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const uninitializedGame = GameInstance.create(uninitializedConfig).gameInstance!;

      const action: ParticipantAction = {
        type: 'test_action',
        participantId: 'player1',
        data: {}
      };

      expect(() => uninitializedGame.processAction(action))
        .toThrow('Game must be initialized before processing actions');
    });

    it('should throw error for non-existent participant', () => {
      const action: ParticipantAction = {
        type: 'test_action',
        participantId: 'nonexistent',
        data: {}
      };

      expect(() => gameInstance.processAction(action))
        .toThrow(InvalidActionError);
    });

    it('should process valid action successfully', () => {
      // Add second player to meet minimum requirements
      gameInstance.createParticipant('player2', 'Bob', false);
      
      const action: ParticipantAction = {
        type: 'update_status',
        participantId: 'player1',
        data: { key: 'score', value: 100 }
      };

      const updatedState = gameInstance.processAction(action);
      expect(updatedState).toBeDefined();

      const participant = gameInstance.getParticipants().get('player1');
      expect(participant?.status.score).toBe(100);
    });

    it('should validate actions', () => {
      const validAction: ParticipantAction = {
        type: 'test_action',
        participantId: 'player1',
        data: {}
      };

      const result = gameInstance.validateAction(validAction);
      expect(result.isValid).toBe(true);
    });

    it('should get action history for participant', () => {
      // Add second player to meet minimum requirements
      gameInstance.createParticipant('player2', 'Bob', false);
      
      const action: ParticipantAction = {
        type: 'update_status',
        participantId: 'player1',
        data: { key: 'score', value: 100 }
      };

      gameInstance.processAction(action);
      const history = gameInstance.getParticipantActionHistory('player1');
      
      expect(history.length).toBeGreaterThan(0);
      expect(history.some(event => event.data.actionType === 'update_status')).toBe(true);
    });

    it('should get available actions for participant', () => {
      const actions = gameInstance.getAvailableActions('player1');
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('game completion and lifecycle', () => {
    let gameInstance: GameInstance;

    beforeEach(() => {
      const config: GameInstanceConfig = {
        gameId: 'test-game',
        ruleset: testRuleset,
        deckType: testDeckType
      };
      const result = GameInstance.create(config);
      gameInstance = result.gameInstance!;
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
    });

    it('should complete game successfully', () => {
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      gameInstance.completeGame('Test completion', ['player1']);

      expect(gameInstance.isGameFinished()).toBe(true);
      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.FINISHED);
    });

    it('should throw error when completing game with non-existent winner', () => {
      expect(() => gameInstance.completeGame('Test completion', ['nonexistent']))
        .toThrow('Winner \'nonexistent\' does not exist');
    });

    it('should reset game successfully', () => {
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      gameInstance.resetGame();

      expect(gameInstance.getCurrentPhase()).toBe(GamePhase.SETUP);
      expect(gameInstance.isGameInitialized()).toBe(false);
      expect(gameInstance.getHands().size).toBe(0);
      expect(gameInstance.getParticipants().size).toBe(2); // Participants should remain
    });

    it('should provide comprehensive game summary', () => {
      const summary = gameInstance.getGameSummary();

      expect(summary.gameId).toBe('test-game');
      expect(summary.phase).toBe(GamePhase.DEALING);
      expect(summary.ruleset).toBe('test-ruleset');
      expect(summary.deckType).toBe('test-deck');
      expect(summary.participantCount).toBe(2);
      expect(summary.isInitialized).toBe(true);
      expect(Array.isArray(summary.validationErrors)).toBe(true);
      expect(summary.winResult).toBeDefined();
    });
  });
});