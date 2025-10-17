import { GameState } from '../../src/models/game-state';
import { Participant } from '../../src/models/participant';
import { Hand } from '../../src/models/hand';
import { Gameboard, CardPile } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { GamePhase } from '../../src/core/types';
import { GameEvent } from '../../src/core/interfaces/events';
import { createCardInPile } from '../../src/utils/card-helpers';

describe('GameState Model', () => {
  let testCard: Card;
  let participant1: Participant;
  let participant2: Participant;
  let hand1: Hand;
  let hand2: Hand;
  let gameboard: Gameboard;
  let testEvents: GameEvent[];

  beforeEach(() => {
    testCard = new Card({
      id: 'test-card',
      faceId: 'test-face',
      tailId: 'test-tail',
      properties: { suit: 'hearts', rank: 'ace' }
    }, 'test-deck');

    participant1 = new Participant('player1', 'Alice', false, ['hand1']);
    participant2 = new Participant('player2', 'Bob', false, ['hand2']);
    
    hand1 = new Hand('hand1', 'Alice Hand', 'player1');
    hand2 = new Hand('hand2', 'Bob Hand', 'player2');
    
    gameboard = new Gameboard();
    
    testEvents = [
      {
        id: 'event1',
        type: 'game_started',
        timestamp: Date.now(),
        participantId: 'player1',
        data: { message: 'Game started' }
      },
      {
        id: 'event2',
        type: 'card_drawn',
        timestamp: Date.now() + 1000,
        participantId: 'player2',
        data: { cardId: 'test-card' }
      }
    ];
  });

  describe('GameState Creation and Immutability', () => {
    it('should create a game state with default values', () => {
      const gameState = new GameState('game1');
      
      expect(gameState.gameId).toBe('game1');
      expect(gameState.phase).toBe(GamePhase.SETUP);
      expect(gameState.participants.size).toBe(0);
      expect(gameState.hands.size).toBe(0);
      expect(gameState.events).toEqual([]);
      expect(gameState.metadata).toEqual({});
    });

    it('should create a game state with all components', () => {
      const participants = new Map([
        ['player1', participant1],
        ['player2', participant2]
      ]);
      const hands = new Map([
        ['hand1', hand1],
        ['hand2', hand2]
      ]);
      
      const gameState = new GameState(
        'game1',
        GamePhase.PLAYING,
        gameboard,
        participants,
        hands,
        testEvents,
        { round: 1 }
      );
      
      expect(gameState.gameId).toBe('game1');
      expect(gameState.phase).toBe(GamePhase.PLAYING);
      expect(gameState.participants.size).toBe(2);
      expect(gameState.hands.size).toBe(2);
      expect(gameState.events).toHaveLength(2);
      expect(gameState.metadata).toEqual({ round: 1 });
    });

    it('should be immutable', () => {
      const gameState = new GameState('game1');
      
      expect(Object.isFrozen(gameState)).toBe(true);
      expect(Object.isFrozen(gameState.participants)).toBe(true);
      expect(Object.isFrozen(gameState.hands)).toBe(true);
      expect(Object.isFrozen(gameState.events)).toBe(true);
      expect(Object.isFrozen(gameState.metadata)).toBe(true);
    });

    it('should create copies of input collections', () => {
      const participants = new Map([['player1', participant1]]);
      const hands = new Map([['hand1', hand1]]);
      const events = [...testEvents];
      
      const gameState = new GameState('game1', GamePhase.SETUP, gameboard, participants, hands, events);
      
      // Modify original collections
      participants.set('player3', new Participant('player3', 'Charlie'));
      hands.set('hand3', new Hand('hand3', 'Charlie Hand', 'player3'));
      events.push({
        id: 'event3',
        type: 'new_event',
        timestamp: Date.now(),
        data: {}
      });
      
      // GameState should retain original
      expect(gameState.participants.size).toBe(1);
      expect(gameState.hands.size).toBe(1);
      expect(gameState.events).toHaveLength(2);
    });
  });

  describe('Participant Management', () => {
    let gameState: GameState;

    beforeEach(() => {
      const participants = new Map([
        ['player1', participant1],
        ['player2', participant2]
      ]);
      gameState = new GameState('game1', GamePhase.SETUP, gameboard, participants);
    });

    it('should get participant by ID', () => {
      expect(gameState.getParticipant('player1')).toBe(participant1);
      expect(gameState.getParticipant('player2')).toBe(participant2);
      expect(gameState.getParticipant('nonexistent')).toBeUndefined();
    });

    it('should check participant existence', () => {
      expect(gameState.hasParticipant('player1')).toBe(true);
      expect(gameState.hasParticipant('player2')).toBe(true);
      expect(gameState.hasParticipant('nonexistent')).toBe(false);
    });

    it('should get all participant IDs', () => {
      const ids = gameState.getParticipantIds();
      expect(ids).toContain('player1');
      expect(ids).toContain('player2');
      expect(ids).toHaveLength(2);
    });
  });

  describe('Hand Management and Assignment', () => {
    let gameState: GameState;

    beforeEach(() => {
      const participants = new Map([
        ['player1', participant1],
        ['player2', participant2]
      ]);
      const hands = new Map([
        ['hand1', hand1],
        ['hand2', hand2]
      ]);
      gameState = new GameState('game1', GamePhase.SETUP, gameboard, participants, hands);
    });

    it('should get hand by ID', () => {
      expect(gameState.getHand('hand1')).toBe(hand1);
      expect(gameState.getHand('hand2')).toBe(hand2);
      expect(gameState.getHand('nonexistent')).toBeUndefined();
    });

    it('should check hand existence', () => {
      expect(gameState.hasHand('hand1')).toBe(true);
      expect(gameState.hasHand('hand2')).toBe(true);
      expect(gameState.hasHand('nonexistent')).toBe(false);
    });

    it('should get all hand IDs', () => {
      const ids = gameState.getHandIds();
      expect(ids).toContain('hand1');
      expect(ids).toContain('hand2');
      expect(ids).toHaveLength(2);
    });

    it('should get participant hands', () => {
      const player1Hands = gameState.getParticipantHands('player1');
      expect(player1Hands).toHaveLength(1);
      expect(player1Hands[0]).toBe(hand1);
      
      const player2Hands = gameState.getParticipantHands('player2');
      expect(player2Hands).toHaveLength(1);
      expect(player2Hands[0]).toBe(hand2);
      
      const nonexistentHands = gameState.getParticipantHands('nonexistent');
      expect(nonexistentHands).toEqual([]);
    });

    it('should handle participant with multiple hands', () => {
      const multiHandParticipant = new Participant('player3', 'Charlie', false, ['hand3', 'hand4']);
      const hand3 = new Hand('hand3', 'Charlie Hand 1', 'player3');
      const hand4 = new Hand('hand4', 'Charlie Hand 2', 'player3');
      
      const participants = new Map([
        ['player1', participant1],
        ['player3', multiHandParticipant]
      ]);
      const hands = new Map([
        ['hand1', hand1],
        ['hand3', hand3],
        ['hand4', hand4]
      ]);
      
      const multiHandGameState = new GameState('game1', GamePhase.SETUP, gameboard, participants, hands);
      
      const charlieHands = multiHandGameState.getParticipantHands('player3');
      expect(charlieHands).toHaveLength(2);
      expect(charlieHands).toContain(hand3);
      expect(charlieHands).toContain(hand4);
    });
  });

  describe('Event Management and Transitions', () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = new GameState('game1', GamePhase.SETUP, gameboard, new Map(), new Map(), testEvents);
    });

    it('should filter events by type', () => {
      const gameStartedEvents = gameState.getEventsByType('game_started');
      expect(gameStartedEvents).toHaveLength(1);
      expect(gameStartedEvents[0].type).toBe('game_started');
      
      const cardDrawnEvents = gameState.getEventsByType('card_drawn');
      expect(cardDrawnEvents).toHaveLength(1);
      expect(cardDrawnEvents[0].type).toBe('card_drawn');
    });

    it('should filter events by participant', () => {
      const player1Events = gameState.getParticipantEvents('player1');
      expect(player1Events).toHaveLength(1);
      expect(player1Events[0].participantId).toBe('player1');
      
      const player2Events = gameState.getParticipantEvents('player2');
      expect(player2Events).toHaveLength(1);
      expect(player2Events[0].participantId).toBe('player2');
    });

    it('should filter events with complex criteria', () => {
      const recentEvents = gameState.filterEvents({ since: Date.now() + 500 });
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].type).toBe('card_drawn');
      
      const player1GameEvents = gameState.filterEvents({ 
        type: 'game_started', 
        participantId: 'player1' 
      });
      expect(player1GameEvents).toHaveLength(1);
    });

    it('should get last event', () => {
      const lastEvent = gameState.getLastEvent();
      expect(lastEvent?.type).toBe('card_drawn');
      
      const emptyGameState = new GameState('empty');
      expect(emptyGameState.getLastEvent()).toBeUndefined();
    });
  });

  describe('State Derivation from Gameboard and Hands', () => {
    it('should derive game state from gameboard and hands', () => {
      const cardInPile = createCardInPile(testCard, true, 'player1');
      const pile = new CardPile('deck', [cardInPile]);
      const gameboardWithCards = new Gameboard(new Map([['deck', pile]]));
      
      const handWithCards = new Hand('hand1', 'Player Hand', 'player1', new Map([['cards', new CardPile('cards', [cardInPile])]]));
      
      const participants = new Map([['player1', participant1]]);
      const hands = new Map([['hand1', handWithCards]]);
      
      const gameState = new GameState('game1', GamePhase.PLAYING, gameboardWithCards, participants, hands);
      
      // Verify state is properly derived
      expect(gameState.gameboard.getPile('deck')?.cards).toHaveLength(1);
      expect(gameState.getHand('hand1')?.getPile('cards')?.cards).toHaveLength(1);
      
      // Verify ownership tracking
      const gameboardCard = gameState.gameboard.getPile('deck')?.cards[0];
      const handCard = gameState.getHand('hand1')?.getPile('cards')?.cards[0];
      
      expect(gameboardCard?.owner).toBe('player1');
      expect(handCard?.owner).toBe('player1');
    });

    it('should track card ownership transfer between containers', () => {
      const originalCard = createCardInPile(testCard, true, 'player1');
      const transferredCard = createCardInPile(testCard, true, 'player2');
      
      const originalPile = new CardPile('shared', [originalCard]);
      const transferredPile = new CardPile('shared', [transferredCard]);
      
      const originalGameboard = new Gameboard(new Map([['shared', originalPile]]));
      const transferredGameboard = new Gameboard(new Map([['shared', transferredPile]]));
      
      const originalState = new GameState('game1', GamePhase.PLAYING, originalGameboard);
      const transferredState = originalState.withGameboard(transferredGameboard);
      
      expect(originalState.gameboard.getPile('shared')?.cards[0].owner).toBe('player1');
      expect(transferredState.gameboard.getPile('shared')?.cards[0].owner).toBe('player2');
    });
  });

  describe('Immutable Updates', () => {
    let originalGameState: GameState;

    beforeEach(() => {
      const participants = new Map([['player1', participant1]]);
      const hands = new Map([['hand1', hand1]]);
      originalGameState = new GameState(
        'game1',
        GamePhase.SETUP,
        gameboard,
        participants,
        hands,
        testEvents,
        { round: 1 }
      );
    });

    it('should create new game state with updated phase', () => {
      const updatedState = originalGameState.withPhase(GamePhase.PLAYING);
      
      expect(updatedState.phase).toBe(GamePhase.PLAYING);
      expect(updatedState.gameId).toBe(originalGameState.gameId);
      expect(originalGameState.phase).toBe(GamePhase.SETUP);
    });

    it('should create new game state with updated gameboard', () => {
      const newGameboard = new Gameboard(new Map(), new Map(), { status: 'updated' });
      const updatedState = originalGameState.withGameboard(newGameboard);
      
      expect(updatedState.gameboard).toBe(newGameboard);
      expect(updatedState.gameId).toBe(originalGameState.gameId);
      expect(originalGameState.gameboard).toBe(gameboard);
    });

    it('should create new game state with updated participants', () => {
      const newParticipants = new Map([
        ['player1', participant1],
        ['player2', participant2]
      ]);
      const updatedState = originalGameState.withParticipants(newParticipants);
      
      expect(updatedState.participants.size).toBe(2);
      expect(updatedState.hasParticipant('player2')).toBe(true);
      expect(originalGameState.participants.size).toBe(1);
    });

    it('should create new game state with updated hands', () => {
      const newHands = new Map([
        ['hand1', hand1],
        ['hand2', hand2]
      ]);
      const updatedState = originalGameState.withHands(newHands);
      
      expect(updatedState.hands.size).toBe(2);
      expect(updatedState.hasHand('hand2')).toBe(true);
      expect(originalGameState.hands.size).toBe(1);
    });

    it('should create new game state with updated events', () => {
      const newEvent: GameEvent = {
        id: 'event3',
        type: 'new_event',
        timestamp: Date.now(),
        data: {}
      };
      const newEvents = [...testEvents, newEvent];
      const updatedState = originalGameState.withEvents(newEvents);
      
      expect(updatedState.events).toHaveLength(3);
      expect(updatedState.events[2]).toBe(newEvent);
      expect(originalGameState.events).toHaveLength(2);
    });

    it('should create new game state with updated metadata', () => {
      const newMetadata = { round: 2, turn: 'player1' };
      const updatedState = originalGameState.withMetadata(newMetadata);
      
      expect(updatedState.metadata).toEqual(newMetadata);
      expect(originalGameState.metadata).toEqual({ round: 1 });
    });
  });

  describe('String Representation', () => {
    it('should provide string representation', () => {
      const participants = new Map([['player1', participant1]]);
      const hands = new Map([['hand1', hand1]]);
      const gameState = new GameState('game1', GamePhase.PLAYING, gameboard, participants, hands, testEvents);
      
      const str = gameState.toString();
      expect(str).toBe('GameState(game1, phase: playing, participants: 1, hands: 1, events: 2)');
    });
  });
});