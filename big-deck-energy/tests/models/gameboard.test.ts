import { CardPile, CardPlacement, Gameboard } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { CardOrientation } from '../../src/core/types';
import { createCardInPile, createCardInPlacement } from '../../src/utils/card-helpers';

describe('Gameboard Models', () => {
  let testCard: Card;

  beforeEach(() => {
    testCard = new Card({
      id: 'test-card',
      faceId: 'test-face',
      tailId: 'test-tail',
      properties: { suit: 'hearts', rank: 'ace' }
    }, 'test-deck');
  });

  describe('CardPile', () => {
    describe('Creation and Immutability', () => {
      it('should create an empty pile', () => {
        const pile = new CardPile('test-pile');
        
        expect(pile.name).toBe('test-pile');
        expect(pile.cards).toEqual([]);
        expect(pile.isOrdered).toBe(true);
        expect(pile.orientation).toBe(CardOrientation.NORMAL);
        expect(pile.status).toEqual({});
      });

      it('should create a pile with cards', () => {
        const cardInPile = createCardInPile(testCard, true, 'player1');
        const pile = new CardPile('test-pile', [cardInPile]);
        
        expect(pile.cards).toHaveLength(1);
        expect(pile.cards[0]).toBe(cardInPile);
      });

      it('should be immutable', () => {
        const pile = new CardPile('test-pile');
        
        expect(Object.isFrozen(pile)).toBe(true);
        expect(Object.isFrozen(pile.cards)).toBe(true);
        expect(Object.isFrozen(pile.status)).toBe(true);
      });

      it('should create copies of input arrays', () => {
        const cards = [createCardInPile(testCard, true)];
        const pile = new CardPile('test-pile', cards);
        
        // Modify original array
        cards.push(createCardInPile(testCard, false));
        
        // Pile should retain original
        expect(pile.cards).toHaveLength(1);
      });
    });

    describe('Card Access', () => {
      it('should return correct size', () => {
        const emptyPile = new CardPile('empty');
        expect(emptyPile.size()).toBe(0);
        
        const cardInPile = createCardInPile(testCard, true);
        const filledPile = new CardPile('filled', [cardInPile]);
        expect(filledPile.size()).toBe(1);
      });

      it('should check if empty', () => {
        const emptyPile = new CardPile('empty');
        expect(emptyPile.isEmpty()).toBe(true);
        
        const cardInPile = createCardInPile(testCard, true);
        const filledPile = new CardPile('filled', [cardInPile]);
        expect(filledPile.isEmpty()).toBe(false);
      });

      it('should get top card for ordered pile', () => {
        const card1 = createCardInPile(testCard, true, 'player1');
        const card2 = createCardInPile(testCard, false, 'player2');
        const pile = new CardPile('ordered', [card1, card2], true);
        
        expect(pile.getTopCard()).toBe(card2); // Last in array
        expect(pile.getBottomCard()).toBe(card1); // First in array
      });

      it('should get top card for unordered pile', () => {
        const card1 = createCardInPile(testCard, true, 'player1');
        const card2 = createCardInPile(testCard, false, 'player2');
        const pile = new CardPile('unordered', [card1, card2], false);
        
        expect(pile.getTopCard()).toBe(card1); // First in array
        expect(pile.getBottomCard()).toBe(card2); // Last in array
      });

      it('should return null for empty pile card access', () => {
        const pile = new CardPile('empty');
        
        expect(pile.getTopCard()).toBeNull();
        expect(pile.getBottomCard()).toBeNull();
      });
    });

    describe('Card Ownership Tracking', () => {
      it('should track card ownership in pile', () => {
        const ownedCard = createCardInPile(testCard, true, 'player1');
        const unownedCard = createCardInPile(testCard, false, null);
        const pile = new CardPile('ownership-test', [ownedCard, unownedCard]);
        
        expect(pile.cards[0].owner).toBe('player1');
        expect(pile.cards[1].owner).toBeNull();
      });

      it('should track card face-up status and orientation', () => {
        const faceUpCard = createCardInPile(testCard, true, 'player1', CardOrientation.ROTATED_90);
        const faceDownCard = createCardInPile(testCard, false, 'player2', CardOrientation.ROTATED_180);
        const pile = new CardPile('state-test', [faceUpCard, faceDownCard]);
        
        expect(pile.cards[0].faceUp).toBe(true);
        expect(pile.cards[0].orientation).toBe(CardOrientation.ROTATED_90);
        expect(pile.cards[1].faceUp).toBe(false);
        expect(pile.cards[1].orientation).toBe(CardOrientation.ROTATED_180);
      });
    });

    describe('Immutable Updates', () => {
      it('should create new pile with updated cards', () => {
        const originalPile = new CardPile('test');
        const newCard = createCardInPile(testCard, true);
        const updatedPile = originalPile.withCards([newCard]);
        
        expect(updatedPile.cards).toHaveLength(1);
        expect(updatedPile.name).toBe(originalPile.name);
        expect(originalPile.cards).toHaveLength(0);
      });

      it('should create new pile with updated status', () => {
        const originalPile = new CardPile('test');
        const updatedPile = originalPile.withStatus({ locked: true });
        
        expect(updatedPile.status).toEqual({ locked: true });
        expect(originalPile.status).toEqual({});
      });
    });
  });

  describe('CardPlacement', () => {
    describe('Creation and Immutability', () => {
      it('should create an empty placement', () => {
        const placement = new CardPlacement('test-placement');
        
        expect(placement.name).toBe('test-placement');
        expect(placement.card).toBeNull();
        expect(placement.orientation).toBe(CardOrientation.NORMAL);
        expect(placement.status).toEqual({});
      });

      it('should create a placement with a card', () => {
        const cardInPlacement = createCardInPlacement(testCard, true, 'player1');
        const placement = new CardPlacement('test-placement', cardInPlacement);
        
        expect(placement.card).toBe(cardInPlacement);
      });

      it('should be immutable', () => {
        const placement = new CardPlacement('test-placement');
        
        expect(Object.isFrozen(placement)).toBe(true);
        expect(Object.isFrozen(placement.status)).toBe(true);
      });
    });

    describe('Occupancy', () => {
      it('should check if empty', () => {
        const emptyPlacement = new CardPlacement('empty');
        expect(emptyPlacement.isEmpty()).toBe(true);
        expect(emptyPlacement.isOccupied()).toBe(false);
      });

      it('should check if occupied', () => {
        const cardInPlacement = createCardInPlacement(testCard, true);
        const occupiedPlacement = new CardPlacement('occupied', cardInPlacement);
        
        expect(occupiedPlacement.isEmpty()).toBe(false);
        expect(occupiedPlacement.isOccupied()).toBe(true);
      });
    });

    describe('Card Ownership Tracking', () => {
      it('should track card ownership in placement', () => {
        const ownedCard = createCardInPlacement(testCard, true, 'player1');
        const placement = new CardPlacement('ownership-test', ownedCard);
        
        expect(placement.card?.owner).toBe('player1');
      });

      it('should track card state in placement', () => {
        const cardInPlacement = createCardInPlacement(
          testCard, 
          false, 
          'player1', 
          CardOrientation.ROTATED_270,
          { special: true }
        );
        const placement = new CardPlacement('state-test', cardInPlacement);
        
        expect(placement.card?.faceUp).toBe(false);
        expect(placement.card?.orientation).toBe(CardOrientation.ROTATED_270);
        expect(placement.card?.status).toEqual({ special: true });
      });
    });

    describe('Immutable Updates', () => {
      it('should create new placement with updated card', () => {
        const originalPlacement = new CardPlacement('test');
        const newCard = createCardInPlacement(testCard, true);
        const updatedPlacement = originalPlacement.withCard(newCard);
        
        expect(updatedPlacement.card).toBe(newCard);
        expect(updatedPlacement.name).toBe(originalPlacement.name);
        expect(originalPlacement.card).toBeNull();
      });

      it('should create new placement with updated status', () => {
        const originalPlacement = new CardPlacement('test');
        const updatedPlacement = originalPlacement.withStatus({ locked: true });
        
        expect(updatedPlacement.status).toEqual({ locked: true });
        expect(originalPlacement.status).toEqual({});
      });
    });
  });

  describe('Gameboard', () => {
    describe('Creation and Immutability', () => {
      it('should create an empty gameboard', () => {
        const gameboard = new Gameboard();
        
        expect(gameboard.piles.size).toBe(0);
        expect(gameboard.placements.size).toBe(0);
        expect(gameboard.status).toEqual({});
      });

      it('should create a gameboard with piles and placements', () => {
        const pile = new CardPile('test-pile');
        const placement = new CardPlacement('test-placement');
        const piles = new Map([['test-pile', pile]]);
        const placements = new Map([['test-placement', placement]]);
        
        const gameboard = new Gameboard(piles, placements);
        
        expect(gameboard.piles.size).toBe(1);
        expect(gameboard.placements.size).toBe(1);
        expect(gameboard.getPile('test-pile')).toBe(pile);
        expect(gameboard.getPlacement('test-placement')).toBe(placement);
      });

      it('should be immutable', () => {
        const gameboard = new Gameboard();
        
        expect(Object.isFrozen(gameboard)).toBe(true);
        expect(Object.isFrozen(gameboard.piles)).toBe(true);
        expect(Object.isFrozen(gameboard.placements)).toBe(true);
        expect(Object.isFrozen(gameboard.status)).toBe(true);
      });
    });

    describe('Pile and Placement Access', () => {
      let gameboard: Gameboard;
      let pile: CardPile;
      let placement: CardPlacement;

      beforeEach(() => {
        pile = new CardPile('test-pile');
        placement = new CardPlacement('test-placement');
        const piles = new Map([['test-pile', pile]]);
        const placements = new Map([['test-placement', placement]]);
        gameboard = new Gameboard(piles, placements);
      });

      it('should get pile by name', () => {
        expect(gameboard.getPile('test-pile')).toBe(pile);
        expect(gameboard.getPile('nonexistent')).toBeUndefined();
      });

      it('should get placement by name', () => {
        expect(gameboard.getPlacement('test-placement')).toBe(placement);
        expect(gameboard.getPlacement('nonexistent')).toBeUndefined();
      });

      it('should check pile existence', () => {
        expect(gameboard.hasPile('test-pile')).toBe(true);
        expect(gameboard.hasPile('nonexistent')).toBe(false);
      });

      it('should check placement existence', () => {
        expect(gameboard.hasPlacement('test-placement')).toBe(true);
        expect(gameboard.hasPlacement('nonexistent')).toBe(false);
      });

      it('should get pile names', () => {
        const names = gameboard.getPileNames();
        expect(names).toContain('test-pile');
        expect(names).toHaveLength(1);
      });

      it('should get placement names', () => {
        const names = gameboard.getPlacementNames();
        expect(names).toContain('test-placement');
        expect(names).toHaveLength(1);
      });
    });

    describe('Immutable Updates', () => {
      it('should create new gameboard with updated piles', () => {
        const originalGameboard = new Gameboard();
        const newPile = new CardPile('new-pile');
        const newPiles = new Map([['new-pile', newPile]]);
        const updatedGameboard = originalGameboard.withPiles(newPiles);
        
        expect(updatedGameboard.piles.size).toBe(1);
        expect(updatedGameboard.getPile('new-pile')).toBe(newPile);
        expect(originalGameboard.piles.size).toBe(0);
      });

      it('should create new gameboard with updated placements', () => {
        const originalGameboard = new Gameboard();
        const newPlacement = new CardPlacement('new-placement');
        const newPlacements = new Map([['new-placement', newPlacement]]);
        const updatedGameboard = originalGameboard.withPlacements(newPlacements);
        
        expect(updatedGameboard.placements.size).toBe(1);
        expect(updatedGameboard.getPlacement('new-placement')).toBe(newPlacement);
        expect(originalGameboard.placements.size).toBe(0);
      });

      it('should create new gameboard with updated status', () => {
        const originalGameboard = new Gameboard();
        const updatedGameboard = originalGameboard.withStatus({ round: 1 });
        
        expect(updatedGameboard.status).toEqual({ round: 1 });
        expect(originalGameboard.status).toEqual({});
      });
    });
  });
});