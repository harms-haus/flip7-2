import { GameStateAPIImpl } from '../../src/api/game-state-api';
import { GameState } from '../../src/models/game-state';
import { Gameboard } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { CardOrientation, GamePhase } from '../../src/core/types';
import { AccessDeniedError } from '../../src/core/errors';

describe('Party API', () => {
  let api: GameStateAPIImpl;
  let gameState: GameState;
  let testCard: Card;

  beforeEach(() => {
    gameState = new GameState(
      'test-game',
      GamePhase.PLAYING,
      new Gameboard(),
      new Map(),
      new Map(),
      new Map(),
      []
    );
    api = new GameStateAPIImpl(gameState);
    api.setAutoCreateSnapshots(false); // Disable snapshots for cleaner tests

    testCard = new Card({
      id: 'card1',
      faceId: 'face1',
      tailId: 'tail1',
      properties: { suit: 'hearts', rank: 'A' }
    }, 'standard');
  });

  describe('party creation and management', () => {
    it('should create a party', () => {
      api.createParty('party1', 'Team Alpha');
      
      const party = api.getParty('party1');
      expect(party).toBeDefined();
      expect(party!.id).toBe('party1');
      expect(party!.name).toBe('Team Alpha');
      expect(party!.participantIds).toEqual([]);
    });

    it('should throw error when creating party with duplicate ID', () => {
      api.createParty('party1', 'Team Alpha');
      
      expect(() => {
        api.createParty('party1', 'Team Beta');
      }).toThrow("Party with ID 'party1' already exists");
    });

    it('should return null for non-existent party', () => {
      const party = api.getParty('nonexistent');
      expect(party).toBeNull();
    });

    it('should update party status', () => {
      api.createParty('party1', 'Team Alpha');
      api.updatePartyStatus('party1', 'score', 100);
      
      const party = api.getParty('party1');
      expect(party!.status.score).toBe(100);
    });

    it('should throw error when updating status of non-existent party', () => {
      expect(() => {
        api.updatePartyStatus('nonexistent', 'score', 100);
      }).toThrow("Party 'nonexistent' not found");
    });
  });

  describe('participant-party management', () => {
    beforeEach(() => {
      api.createParticipant('player1', 'Alice', false);
      api.createParticipant('player2', 'Bob', false);
      api.createParty('party1', 'Team Alpha');
    });

    it('should add participant to party', () => {
      api.addParticipantToParty('player1', 'party1');
      
      const participant = api.getParticipant('player1');
      const party = api.getParty('party1');
      
      expect(participant!.partyId).toBe('party1');
      expect(party!.participantIds).toContain('player1');
    });

    it('should remove participant from previous party when adding to new party', () => {
      api.createParty('party2', 'Team Beta');
      api.addParticipantToParty('player1', 'party1');
      api.addParticipantToParty('player1', 'party2');
      
      const participant = api.getParticipant('player1');
      const party1 = api.getParty('party1');
      const party2 = api.getParty('party2');
      
      expect(participant!.partyId).toBe('party2');
      expect(party1!.participantIds).not.toContain('player1');
      expect(party2!.participantIds).toContain('player1');
    });

    it('should remove participant from party', () => {
      api.addParticipantToParty('player1', 'party1');
      api.removeParticipantFromParty('player1');
      
      const participant = api.getParticipant('player1');
      const party = api.getParty('party1');
      
      expect(participant!.partyId).toBeNull();
      expect(party!.participantIds).not.toContain('player1');
    });

    it('should handle removing participant not in any party', () => {
      // Should not throw error
      api.removeParticipantFromParty('player1');
      
      const participant = api.getParticipant('player1');
      expect(participant!.partyId).toBeNull();
    });

    it('should throw error when adding non-existent participant to party', () => {
      expect(() => {
        api.addParticipantToParty('nonexistent', 'party1');
      }).toThrow("Participant 'nonexistent' not found");
    });

    it('should throw error when adding participant to non-existent party', () => {
      expect(() => {
        api.addParticipantToParty('player1', 'nonexistent');
      }).toThrow("Party 'nonexistent' not found");
    });
  });

  describe('party pile management', () => {
    beforeEach(() => {
      api.createParty('party1', 'Team Alpha');
    });

    it('should create party pile', () => {
      api.createPartyPile('party1', 'deck', true, CardOrientation.NORMAL);
      
      const party = api.getParty('party1');
      expect(party!.piles.has('deck')).toBe(true);
      
      const pile = party!.piles.get('deck');
      expect(pile!.name).toBe('deck');
      expect(pile!.isOrdered).toBe(true);
      expect(pile!.orientation).toBe(CardOrientation.NORMAL);
    });

    it('should add card to party pile', () => {
      api.createPartyPile('party1', 'deck', true);
      api.addCardToPartyPile('party1', 'deck', testCard, true, 'player1');
      
      const party = api.getParty('party1');
      const pile = party!.piles.get('deck');
      
      expect(pile!.cards.length).toBe(1);
      expect(pile!.cards[0].card.id).toBe('card1');
      expect(pile!.cards[0].faceUp).toBe(true);
      expect(pile!.cards[0].owner).toBe('player1');
    });

    it('should remove card from party pile', () => {
      api.createPartyPile('party1', 'deck', true);
      api.addCardToPartyPile('party1', 'deck', testCard, true);
      
      const removedCard = api.removeCardFromPartyPile('party1', 'deck');
      
      expect(removedCard).toBeDefined();
      expect(removedCard!.card.id).toBe('card1');
      
      const party = api.getParty('party1');
      const pile = party!.piles.get('deck');
      expect(pile!.cards.length).toBe(0);
    });

    it('should return null when removing from empty party pile', () => {
      api.createPartyPile('party1', 'deck', true);
      
      const removedCard = api.removeCardFromPartyPile('party1', 'deck');
      expect(removedCard).toBeNull();
    });

    it('should throw error when creating pile in non-existent party', () => {
      expect(() => {
        api.createPartyPile('nonexistent', 'deck', true);
      }).toThrow("Party 'nonexistent' not found");
    });

    it('should throw error when creating duplicate pile', () => {
      api.createPartyPile('party1', 'deck', true);
      
      expect(() => {
        api.createPartyPile('party1', 'deck', false);
      }).toThrow("Pile 'deck' already exists in party 'party1'");
    });
  });

  describe('party placement management', () => {
    beforeEach(() => {
      api.createParty('party1', 'Team Alpha');
    });

    it('should set card in party placement', () => {
      api.setPartyPlacement('party1', 'discard', testCard, true, 'player1');
      
      const placement = api.getPartyPlacement('party1', 'discard');
      expect(placement).toBeDefined();
      expect(placement!.card.id).toBe('card1');
      expect(placement!.faceUp).toBe(true);
      expect(placement!.owner).toBe('player1');
    });

    it('should clear party placement', () => {
      api.setPartyPlacement('party1', 'discard', testCard, true);
      api.setPartyPlacement('party1', 'discard', null);
      
      const placement = api.getPartyPlacement('party1', 'discard');
      expect(placement).toBeNull();
    });

    it('should return null for non-existent placement', () => {
      const placement = api.getPartyPlacement('party1', 'nonexistent');
      expect(placement).toBeNull();
    });

    it('should throw error when setting placement in non-existent party', () => {
      expect(() => {
        api.setPartyPlacement('nonexistent', 'discard', testCard, true);
      }).toThrow("Party 'nonexistent' not found");
    });
  });

  describe('party access control', () => {
    beforeEach(() => {
      api.createParticipant('player1', 'Alice', false);
      api.createParticipant('player2', 'Bob', false);
      api.createParty('party1', 'Team Alpha');
      api.createPartyPile('party1', 'deck', true);
      api.addParticipantToParty('player1', 'party1');
    });

    it('should allow party member to access party pile', () => {
      const canAccess = api.canAccessPile('player1', 'party', 'deck', 'party1');
      expect(canAccess).toBe(true);
    });

    it('should deny non-party member access to party pile', () => {
      const canAccess = api.canAccessPile('player2', 'party', 'deck', 'party1');
      expect(canAccess).toBe(false);
    });

    it('should deny access without party ID', () => {
      const canAccess = api.canAccessPile('player1', 'party', 'deck');
      expect(canAccess).toBe(false);
    });

    it('should allow party member to get visible cards', () => {
      api.addCardToPartyPile('party1', 'deck', testCard, false); // Face down card
      
      const visibleCards = api.getVisibleCards('player1', 'party', 'deck', 'party1');
      expect(visibleCards.length).toBe(1); // Party members can see face-down cards
    });

    it('should throw access denied error for non-party member', () => {
      api.addCardToPartyPile('party1', 'deck', testCard, true);
      
      expect(() => {
        api.getVisibleCards('player2', 'party', 'deck', 'party1');
      }).toThrow(AccessDeniedError);
    });
  });

  describe('party utility functions', () => {
    beforeEach(() => {
      api.createParticipant('player1', 'Alice', false);
      api.createParty('party1', 'Team Alpha');
      api.createPartyPile('party1', 'deck', true);
      api.addParticipantToParty('player1', 'party1');
    });

    it('should shuffle party pile', () => {
      // Add multiple cards to test shuffling
      for (let i = 0; i < 5; i++) {
        const card = new Card({
          id: `card${i}`,
          faceId: 'face1',
          tailId: 'tail1',
          properties: { value: i }
        }, 'standard');
        api.addCardToPartyPile('party1', 'deck', card, true);
      }
      
      const party = api.getParty('party1');
      const originalOrder = party!.piles.get('deck')!.cards.map(c => c.card.id);
      
      api.shufflePile('party', 'deck', 'party1');
      
      const shuffledParty = api.getParty('party1');
      const shuffledOrder = shuffledParty!.piles.get('deck')!.cards.map(c => c.card.id);
      
      // Should have same cards but potentially different order
      expect(shuffledOrder.sort()).toEqual(originalOrder.sort());
    });

    it('should move card from party to gameboard', () => {
      api.createGameboardPile('discard', false);
      api.addCardToPartyPile('party1', 'deck', testCard, true);
      
      api.moveCard('party', 'deck', 0, 'gameboard', 'discard', 'party1');
      
      const party = api.getParty('party1');
      const gameState = api.getGameState();
      
      expect(party!.piles.get('deck')!.cards.length).toBe(0);
      expect(gameState.gameboard.piles.get('discard')!.cards.length).toBe(1);
      expect(gameState.gameboard.piles.get('discard')!.cards[0].card.id).toBe('card1');
    });

    it('should move card from gameboard to party', () => {
      api.createGameboardPile('discard', false);
      api.addCardToGameboardPile('discard', testCard, true);
      
      api.moveCard('gameboard', 'discard', 0, 'party', 'deck', undefined, 'party1');
      
      const party = api.getParty('party1');
      const gameState = api.getGameState();
      
      expect(gameState.gameboard.piles.get('discard')!.cards.length).toBe(0);
      expect(party!.piles.get('deck')!.cards.length).toBe(1);
      expect(party!.piles.get('deck')!.cards[0].card.id).toBe('card1');
    });

    it('should throw error when moving from party without party ID', () => {
      api.addCardToPartyPile('party1', 'deck', testCard, true);
      
      expect(() => {
        api.moveCard('party', 'deck', 0, 'gameboard', 'discard');
      }).toThrow('Party ID (fromLocationId) is required when moving from party location');
    });

    it('should throw error when moving to party without party ID', () => {
      api.createGameboardPile('discard', false);
      api.addCardToGameboardPile('discard', testCard, true);
      
      expect(() => {
        api.moveCard('gameboard', 'discard', 0, 'party', 'deck');
      }).toThrow('Party ID (toLocationId) is required when moving to party location');
    });
  });
});