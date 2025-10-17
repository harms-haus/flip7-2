import { Hand } from '../../src/models/hand';
import { CardPile, CardPlacement } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { createCardInPile, createCardInPlacement } from '../../src/utils/card-helpers';

describe('Hand Model', () => {
  let testCard: Card;

  beforeEach(() => {
    testCard = new Card({
      id: 'test-card',
      faceId: 'test-face',
      tailId: 'test-tail',
      properties: { suit: 'hearts', rank: 'ace' }
    }, 'test-deck');
  });

  describe('Hand Creation and Immutability', () => {
    it('should create an empty hand', () => {
      const hand = new Hand('hand1', 'Player Hand', 'player1');
      
      expect(hand.id).toBe('hand1');
      expect(hand.name).toBe('Player Hand');
      expect(hand.participantId).toBe('player1');
      expect(hand.piles.size).toBe(0);
      expect(hand.placements.size).toBe(0);
      expect(hand.status).toEqual({});
    });

    it('should create a hand with piles and placements', () => {
      const pile = new CardPile('cards');
      const placement = new CardPlacement('active-card');
      const piles = new Map([['cards', pile]]);
      const placements = new Map([['active-card', placement]]);
      
      const hand = new Hand('hand1', 'Player Hand', 'player1', piles, placements);
      
      expect(hand.piles.size).toBe(1);
      expect(hand.placements.size).toBe(1);
      expect(hand.getPile('cards')).toBe(pile);
      expect(hand.getPlacement('active-card')).toBe(placement);
    });

    it('should be immutable', () => {
      const hand = new Hand('hand1', 'Player Hand', 'player1');
      
      expect(Object.isFrozen(hand)).toBe(true);
      expect(Object.isFrozen(hand.piles)).toBe(true);
      expect(Object.isFrozen(hand.placements)).toBe(true);
      expect(Object.isFrozen(hand.status)).toBe(true);
    });

    it('should create copies of input maps', () => {
      const piles = new Map([['cards', new CardPile('cards')]]);
      const placements = new Map([['active', new CardPlacement('active')]]);
      
      const hand = new Hand('hand1', 'Player Hand', 'player1', piles, placements);
      
      // Modify original maps
      piles.set('new-pile', new CardPile('new-pile'));
      placements.set('new-placement', new CardPlacement('new-placement'));
      
      // Hand should retain original
      expect(hand.piles.size).toBe(1);
      expect(hand.placements.size).toBe(1);
    });
  });

  describe('Pile and Placement Access', () => {
    let hand: Hand;
    let pile: CardPile;
    let placement: CardPlacement;

    beforeEach(() => {
      pile = new CardPile('cards');
      placement = new CardPlacement('active-card');
      const piles = new Map([['cards', pile]]);
      const placements = new Map([['active-card', placement]]);
      hand = new Hand('hand1', 'Player Hand', 'player1', piles, placements);
    });

    it('should get pile by name', () => {
      expect(hand.getPile('cards')).toBe(pile);
      expect(hand.getPile('nonexistent')).toBeUndefined();
    });

    it('should get placement by name', () => {
      expect(hand.getPlacement('active-card')).toBe(placement);
      expect(hand.getPlacement('nonexistent')).toBeUndefined();
    });

    it('should check pile existence', () => {
      expect(hand.hasPile('cards')).toBe(true);
      expect(hand.hasPile('nonexistent')).toBe(false);
    });

    it('should check placement existence', () => {
      expect(hand.hasPlacement('active-card')).toBe(true);
      expect(hand.hasPlacement('nonexistent')).toBe(false);
    });

    it('should get pile names', () => {
      const names = hand.getPileNames();
      expect(names).toContain('cards');
      expect(names).toHaveLength(1);
    });

    it('should get placement names', () => {
      const names = hand.getPlacementNames();
      expect(names).toContain('active-card');
      expect(names).toHaveLength(1);
    });
  });

  describe('Card Counting and State', () => {
    it('should count total cards correctly', () => {
      const cardInPile1 = createCardInPile(testCard, true, 'player1');
      const cardInPile2 = createCardInPile(testCard, false, 'player1');
      const cardInPlacement = createCardInPlacement(testCard, true, 'player1');
      
      const pile = new CardPile('cards', [cardInPile1, cardInPile2]);
      const placement = new CardPlacement('active-card', cardInPlacement);
      
      const piles = new Map([['cards', pile]]);
      const placements = new Map([['active-card', placement]]);
      
      const hand = new Hand('hand1', 'Player Hand', 'player1', piles, placements);
      
      expect(hand.getTotalCardCount()).toBe(3); // 2 in pile + 1 in placement
    });

    it('should count cards with empty placement', () => {
      const cardInPile = createCardInPile(testCard, true, 'player1');
      const pile = new CardPile('cards', [cardInPile]);
      const emptyPlacement = new CardPlacement('empty');
      
      const piles = new Map([['cards', pile]]);
      const placements = new Map([['empty', emptyPlacement]]);
      
      const hand = new Hand('hand1', 'Player Hand', 'player1', piles, placements);
      
      expect(hand.getTotalCardCount()).toBe(1); // 1 in pile + 0 in empty placement
    });

    it('should check if hand is empty', () => {
      const emptyHand = new Hand('hand1', 'Player Hand', 'player1');
      expect(emptyHand.isEmpty()).toBe(true);
      
      const cardInPile = createCardInPile(testCard, true, 'player1');
      const pile = new CardPile('cards', [cardInPile]);
      const piles = new Map([['cards', pile]]);
      
      const nonEmptyHand = new Hand('hand1', 'Player Hand', 'player1', piles);
      expect(nonEmptyHand.isEmpty()).toBe(false);
    });
  });

  describe('Hand Assignment and Ownership', () => {
    it('should track participant ownership', () => {
      const hand = new Hand('hand1', 'Player Hand', 'player1');
      
      expect(hand.participantId).toBe('player1');
    });

    it('should track card ownership within hand', () => {
      const ownedCard = createCardInPile(testCard, true, 'player1');
      const unownedCard = createCardInPile(testCard, false, null);
      
      const pile = new CardPile('cards', [ownedCard, unownedCard]);
      const piles = new Map([['cards', pile]]);
      
      const hand = new Hand('hand1', 'Player Hand', 'player1', piles);
      
      const cards = hand.getPile('cards')?.cards || [];
      expect(cards[0].owner).toBe('player1');
      expect(cards[1].owner).toBeNull();
    });

    it('should support ownership transfer in hand cards', () => {
      const originalCard = createCardInPile(testCard, true, 'player1');
      const transferredCard = createCardInPile(testCard, true, 'player2');
      
      const originalPile = new CardPile('cards', [originalCard]);
      const updatedPile = new CardPile('cards', [transferredCard]);
      
      const originalHand = new Hand('hand1', 'Player Hand', 'player1', new Map([['cards', originalPile]]));
      const updatedHand = originalHand.withPiles(new Map([['cards', updatedPile]]));
      
      expect(originalHand.getPile('cards')?.cards[0].owner).toBe('player1');
      expect(updatedHand.getPile('cards')?.cards[0].owner).toBe('player2');
    });
  });

  describe('Immutable Updates', () => {
    let originalHand: Hand;

    beforeEach(() => {
      const pile = new CardPile('cards');
      const placement = new CardPlacement('active');
      const piles = new Map([['cards', pile]]);
      const placements = new Map([['active', placement]]);
      originalHand = new Hand('hand1', 'Player Hand', 'player1', piles, placements, { score: 100 });
    });

    it('should create new hand with updated piles', () => {
      const newPile = new CardPile('new-cards');
      const newPiles = new Map([['new-cards', newPile]]);
      const updatedHand = originalHand.withPiles(newPiles);
      
      expect(updatedHand.piles.size).toBe(1);
      expect(updatedHand.getPile('new-cards')).toBe(newPile);
      expect(updatedHand.id).toBe(originalHand.id);
      expect(updatedHand.participantId).toBe(originalHand.participantId);
      
      // Original should be unchanged
      expect(originalHand.piles.size).toBe(1);
      expect(originalHand.hasPile('cards')).toBe(true);
    });

    it('should create new hand with updated placements', () => {
      const newPlacement = new CardPlacement('new-active');
      const newPlacements = new Map([['new-active', newPlacement]]);
      const updatedHand = originalHand.withPlacements(newPlacements);
      
      expect(updatedHand.placements.size).toBe(1);
      expect(updatedHand.getPlacement('new-active')).toBe(newPlacement);
      expect(updatedHand.id).toBe(originalHand.id);
      
      // Original should be unchanged
      expect(originalHand.placements.size).toBe(1);
      expect(originalHand.hasPlacement('active')).toBe(true);
    });

    it('should create new hand with updated status', () => {
      const newStatus = { score: 200, level: 5 };
      const updatedHand = originalHand.withStatus(newStatus);
      
      expect(updatedHand.status).toEqual(newStatus);
      expect(updatedHand.id).toBe(originalHand.id);
      
      // Original should be unchanged
      expect(originalHand.status).toEqual({ score: 100 });
    });
  });

  describe('String Representation', () => {
    it('should provide string representation', () => {
      const cardInPile = createCardInPile(testCard, true, 'player1');
      const pile = new CardPile('cards', [cardInPile]);
      const piles = new Map([['cards', pile]]);
      
      const hand = new Hand('hand1', 'Player Hand', 'player1', piles);
      const str = hand.toString();
      
      expect(str).toBe('Hand(hand1: Player Hand, owner: player1, cards: 1)');
    });
  });
});