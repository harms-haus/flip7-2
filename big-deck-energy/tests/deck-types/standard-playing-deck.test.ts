import { StandardPlayingDeck } from '../../src/deck-types/standard/standard-playing-deck';

describe('StandardPlayingDeck', () => {
  let deck: StandardPlayingDeck;

  beforeEach(() => {
    deck = new StandardPlayingDeck();
  });

  describe('constructor', () => {
    it('should create a standard playing deck', () => {
      expect(deck.name).toBe('standard-playing-deck');
      expect(deck.faces.size).toBe(52); // 13 ranks × 4 suits
      expect(deck.tails.size).toBe(1); // Standard back
      expect(deck.cards.length).toBe(52);
    });

    it('should have correct face mappings', () => {
      expect(deck.faces.get('A_hearts')).toBe('/cards/faces/A_hearts.png');
      expect(deck.faces.get('K_spades')).toBe('/cards/faces/K_spades.png');
      expect(deck.faces.get('10_diamonds')).toBe('/cards/faces/10_diamonds.png');
    });

    it('should have correct tail mapping', () => {
      expect(deck.tails.get('standard_back')).toBe('/cards/backs/standard_back.png');
    });
  });

  describe('createDeck', () => {
    it('should create 52 unique cards', () => {
      const cards = deck.createDeck();
      expect(cards).toHaveLength(52);

      const cardIds = new Set(cards.map(card => card.id));
      expect(cardIds.size).toBe(52); // All cards should be unique
    });

    it('should create cards with correct properties', () => {
      const cards = deck.createDeck();
      
      // Test Ace of Hearts
      const aceOfHearts = cards.find(card => card.id === 'A_hearts');
      expect(aceOfHearts).toBeDefined();
      expect(aceOfHearts!.faceId).toBe('A_hearts');
      expect(aceOfHearts!.tailId).toBe('standard_back');
      expect(aceOfHearts!.deckType).toBe('standard-playing-deck');
      expect(aceOfHearts!.properties).toEqual({
        suit: 'hearts',
        rank: 'A',
        numericValue: 1,
        color: 'red'
      });

      // Test King of Spades
      const kingOfSpades = cards.find(card => card.id === 'K_spades');
      expect(kingOfSpades).toBeDefined();
      expect(kingOfSpades!.properties).toEqual({
        suit: 'spades',
        rank: 'K',
        numericValue: 13,
        color: 'black'
      });
    });

    it('should create cards with correct colors', () => {
      const cards = deck.createDeck();
      
      const redCards = cards.filter(card => card.properties.color === 'red');
      const blackCards = cards.filter(card => card.properties.color === 'black');
      
      expect(redCards).toHaveLength(26); // Hearts and Diamonds
      expect(blackCards).toHaveLength(26); // Clubs and Spades
      
      // Verify red suits
      redCards.forEach(card => {
        expect(['hearts', 'diamonds']).toContain(card.properties.suit);
      });
      
      // Verify black suits
      blackCards.forEach(card => {
        expect(['clubs', 'spades']).toContain(card.properties.suit);
      });
    });
  });

  describe('validateCard', () => {
    it('should validate correct standard playing cards', () => {
      const validCard = {
        id: 'A_hearts',
        faceId: 'A_hearts',
        tailId: 'standard_back',
        deckType: 'standard-playing-deck',
        properties: {
          suit: 'hearts',
          rank: 'A',
          numericValue: 1,
          color: 'red'
        }
      };

      expect(deck.validateCard(validCard)).toBe(true);
    });

    it('should reject cards with invalid properties', () => {
      const invalidCard = {
        id: 'A_hearts',
        faceId: 'A_hearts',
        tailId: 'standard_back',
        deckType: 'standard-playing-deck',
        properties: {
          suit: 'hearts',
          rank: 'A',
          numericValue: 999, // Wrong value
          color: 'red'
        }
      };

      expect(deck.validateCard(invalidCard)).toBe(false);
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = deck.getCapabilities();
      expect(capabilities).toEqual(['SUITS', 'RANKS', 'NUMERIC_VALUES']);
    });
  });

  describe('getSuits', () => {
    it('should return all suits', () => {
      const suits = deck.getSuits();
      expect(suits).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    });
  });

  describe('getRanks', () => {
    it('should return all ranks', () => {
      const ranks = deck.getRanks();
      expect(ranks).toEqual(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
    });
  });

  describe('getNumericValue', () => {
    it('should return correct numeric values', () => {
      expect(deck.getNumericValue('A')).toBe(1);
      expect(deck.getNumericValue('2')).toBe(2);
      expect(deck.getNumericValue('10')).toBe(10);
      expect(deck.getNumericValue('J')).toBe(11);
      expect(deck.getNumericValue('Q')).toBe(12);
      expect(deck.getNumericValue('K')).toBe(13);
    });

    it('should return undefined for invalid ranks', () => {
      expect(deck.getNumericValue('invalid')).toBeUndefined();
    });
  });

  describe('static constants', () => {
    it('should have correct SUITS constant', () => {
      expect(StandardPlayingDeck.SUITS).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    });

    it('should have correct RANKS constant', () => {
      expect(StandardPlayingDeck.RANKS).toEqual(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
    });

    it('should have correct NUMERIC_VALUES constant', () => {
      expect(StandardPlayingDeck.NUMERIC_VALUES).toEqual({
        'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
      });
    });
  });
});