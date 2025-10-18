import { BaseDeckType } from '../../src/deck-types/base/base-deck-type';
import { Card, CardDefinition } from '../../src/core/interfaces/card';

// Test implementation of BaseDeckType for testing purposes
class TestDeckType extends BaseDeckType {
  constructor(
    name: string,
    faces: Map<string, string>,
    tails: Map<string, string>,
    cards: CardDefinition[]
  ) {
    super(name, faces, tails, cards);
  }
}

describe('BaseDeckType', () => {
  let testFaces: Map<string, string>;
  let testTails: Map<string, string>;
  let testCards: CardDefinition[];

  beforeEach(() => {
    testFaces = new Map([
      ['face1', '/images/face1.png'],
      ['face2', '/images/face2.png']
    ]);

    testTails = new Map([
      ['tail1', '/images/tail1.png']
    ]);

    testCards = [
      {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { value: 1, suit: 'hearts' }
      },
      {
        id: 'card2',
        faceId: 'face2',
        tailId: 'tail1',
        properties: { value: 2, suit: 'spades' }
      }
    ];
  });

  describe('constructor', () => {
    it('should create a valid deck type', () => {
      const deckType = new TestDeckType('test-deck', testFaces, testTails, testCards);
      
      expect(deckType.name).toBe('test-deck');
      expect(deckType.faces.size).toBe(2);
      expect(deckType.tails.size).toBe(1);
      expect(deckType.cards.length).toBe(2);
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new TestDeckType('', testFaces, testTails, testCards);
      }).toThrow('Deck type name cannot be empty');
    });

    it('should throw error for no faces', () => {
      expect(() => {
        new TestDeckType('test-deck', new Map(), testTails, testCards);
      }).toThrow('Deck type must have at least one face image');
    });

    it('should throw error for no tails', () => {
      expect(() => {
        new TestDeckType('test-deck', testFaces, new Map(), testCards);
      }).toThrow('Deck type must have at least one tail image');
    });

    it('should throw error for no cards', () => {
      expect(() => {
        new TestDeckType('test-deck', testFaces, testTails, []);
      }).toThrow('Deck type must have at least one card definition');
    });

    it('should throw error for invalid face ID reference', () => {
      const invalidCards = [{
        id: 'card1',
        faceId: 'invalid-face',
        tailId: 'tail1',
        properties: {}
      }];

      expect(() => {
        new TestDeckType('test-deck', testFaces, testTails, invalidCards);
      }).toThrow("Card definition 'card1' references unknown face ID 'invalid-face'");
    });

    it('should throw error for invalid tail ID reference', () => {
      const invalidCards = [{
        id: 'card1',
        faceId: 'face1',
        tailId: 'invalid-tail',
        properties: {}
      }];

      expect(() => {
        new TestDeckType('test-deck', testFaces, testTails, invalidCards);
      }).toThrow("Card definition 'card1' references unknown tail ID 'invalid-tail'");
    });

    it('should throw error for duplicate card IDs', () => {
      const duplicateCards = [
        { id: 'card1', faceId: 'face1', tailId: 'tail1', properties: {} },
        { id: 'card1', faceId: 'face2', tailId: 'tail1', properties: {} }
      ];

      expect(() => {
        new TestDeckType('test-deck', testFaces, testTails, duplicateCards);
      }).toThrow('All card definitions must have unique IDs');
    });
  });

  describe('createDeck', () => {
    it('should create immutable cards from definitions', () => {
      const deckType = new TestDeckType('test-deck', testFaces, testTails, testCards);
      const deck = deckType.createDeck();

      expect(deck).toHaveLength(2);
      expect(deck[0].id).toBe('card1');
      expect(deck[0].faceId).toBe('face1');
      expect(deck[0].tailId).toBe('tail1');
      expect(deck[0].deckType).toBe('test-deck');
      expect(deck[0].properties).toEqual({ value: 1, suit: 'hearts' });

      expect(deck[1].id).toBe('card2');
      expect(deck[1].faceId).toBe('face2');
      expect(deck[1].tailId).toBe('tail1');
      expect(deck[1].deckType).toBe('test-deck');
      expect(deck[1].properties).toEqual({ value: 2, suit: 'spades' });
    });

    it('should create defensive copies of properties', () => {
      const deckType = new TestDeckType('test-deck', testFaces, testTails, testCards);
      const deck = deckType.createDeck();

      // Modifying original card definition should not affect created cards
      testCards[0].properties.value = 999;
      expect(deck[0].properties.value).toBe(1);
    });
  });

  describe('validateCard', () => {
    let deckType: TestDeckType;
    let validCard: Card;

    beforeEach(() => {
      deckType = new TestDeckType('test-deck', testFaces, testTails, testCards);
      validCard = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        deckType: 'test-deck',
        properties: { value: 1, suit: 'hearts' }
      };
    });

    it('should validate a correct card', () => {
      expect(deckType.validateCard(validCard)).toBe(true);
    });

    it('should reject card with wrong deck type', () => {
      const invalidCard = { ...validCard, deckType: 'wrong-deck' };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });

    it('should reject card with invalid face ID', () => {
      const invalidCard = { ...validCard, faceId: 'invalid-face' };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });

    it('should reject card with invalid tail ID', () => {
      const invalidCard = { ...validCard, tailId: 'invalid-tail' };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });

    it('should reject card with unknown ID', () => {
      const invalidCard = { ...validCard, id: 'unknown-card' };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });

    it('should reject card with wrong properties', () => {
      const invalidCard = { ...validCard, properties: { value: 999, suit: 'hearts' } };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });

    it('should reject card with missing properties', () => {
      const invalidCard = { ...validCard, properties: { value: 1 } };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });

    it('should reject card with extra properties', () => {
      const invalidCard = { ...validCard, properties: { value: 1, suit: 'hearts', extra: 'prop' } };
      expect(deckType.validateCard(invalidCard)).toBe(false);
    });
  });
});