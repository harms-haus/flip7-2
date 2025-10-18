import { GameStateAPIImpl } from '../../src/api/game-state-api';
import { GameState } from '../../src/models/game-state';
import { Gameboard } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { GamePhase, CardOrientation } from '../../src/core/types';

describe('GameStateAPI', () => {
  let gameState: GameState;
  let api: GameStateAPIImpl;

  beforeEach(() => {
    // Create a minimal game state for testing
    gameState = new GameState(
      'test-game',
      GamePhase.SETUP,
      new Gameboard(),
      new Map(),
      new Map(),
      [],
      {}
    );
    api = new GameStateAPIImpl(gameState);
  });

  describe('Participant Management', () => {
    it('should create a participant', () => {
      api.createParticipant('player1', 'Alice', false);
      
      const participant = api.getParticipant('player1');
      expect(participant).toBeTruthy();
      expect(participant?.id).toBe('player1');
      expect(participant?.name).toBe('Alice');
      expect(participant?.isNPC).toBe(false);
    });

    it('should update participant status', () => {
      api.createParticipant('player1', 'Alice', false);
      api.updateParticipantStatus('player1', 'score', 100);
      
      const participant = api.getParticipant('player1');
      expect(participant?.status.score).toBe(100);
    });

    it('should throw error when creating duplicate participant', () => {
      api.createParticipant('player1', 'Alice', false);
      
      expect(() => {
        api.createParticipant('player1', 'Bob', false);
      }).toThrow("Participant with ID 'player1' already exists");
    });
  });

  describe('Hand Management', () => {
    beforeEach(() => {
      api.createParticipant('player1', 'Alice', false);
    });

    it('should create a hand', () => {
      api.createHand('hand1', 'Main Hand', 'player1');
      
      const hand = api.getGameState().hands.get('hand1');
      expect(hand).toBeTruthy();
      expect(hand?.id).toBe('hand1');
      expect(hand?.name).toBe('Main Hand');
      expect(hand?.participantId).toBe('player1');
    });

    it('should create a pile in a hand', () => {
      api.createHand('hand1', 'Main Hand', 'player1');
      api.createHandPile('hand1', 'cards', true, CardOrientation.NORMAL);
      
      const hand = api.getGameState().hands.get('hand1');
      expect(hand?.piles.has('cards')).toBe(true);
    });

    it('should add a card to a hand pile', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');
      
      api.createHand('hand1', 'Main Hand', 'player1');
      api.createHandPile('hand1', 'cards', true);
      api.addCardToHandPile('hand1', 'cards', card, false);
      
      const hand = api.getGameState().hands.get('hand1');
      const pile = hand?.piles.get('cards');
      expect(pile?.size()).toBe(1);
      expect(pile?.cards[0]?.card.id).toBe('card1');
      expect(pile?.cards[0]?.faceUp).toBe(false);
    });
  });

  describe('Gameboard Management', () => {
    it('should create a gameboard pile', () => {
      api.createGameboardPile('deck', true, CardOrientation.NORMAL);
      
      const gameboard = api.getGameState().gameboard;
      expect(gameboard.piles.has('deck')).toBe(true);
    });

    it('should add a card to a gameboard pile', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');
      
      api.createGameboardPile('deck', true);
      api.addCardToGameboardPile('deck', card, false);
      
      const gameboard = api.getGameState().gameboard;
      const pile = gameboard.piles.get('deck');
      expect(pile?.size()).toBe(1);
      expect(pile?.cards[0]?.card.id).toBe('card1');
    });
  });

  describe('Event Tracking', () => {
    it('should track events when creating participants', () => {
      api.createParticipant('player1', 'Alice', false);
      
      const events = api.getEvents({ type: 'participant_created' });
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('participant_created');
      expect(events[0]?.participantId).toBe('player1');
    });

    it('should filter events by participant', () => {
      api.createParticipant('player1', 'Alice', false);
      api.createParticipant('player2', 'Bob', false);
      
      const aliceEvents = api.getEvents({ participantId: 'player1' });
      expect(aliceEvents).toHaveLength(1);
      expect(aliceEvents[0]?.participantId).toBe('player1');
    });
  });
});