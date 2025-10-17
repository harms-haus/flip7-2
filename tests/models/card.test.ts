import { Card } from '../../src/models/card';
import { CardDefinition } from '../../src/core/interfaces/card';

describe('Card Model', () => {
  const mockCardDefinition: CardDefinition = {
    id: 'ace-spades',
    faceId: 'ace-spades-face',
    tailId: 'standard-back',
    properties: {
      suit: 'spades',
      rank: 'ace',
      value: 1,
      color: 'black'
    }
  };

  describe('Card Immutability', () => {
    it('should create an immutable card instance', () => {
      const card = new Card(mockCardDefinition, 'standard-deck');
      
      expect(() => {
        (card as any).id = 'modified-id';
      }).toThrow();
      
      expect(() => {
        (card as any).faceId = 'modified-face';
      }).toThrow();
      
      expect(() => {
        (card as any).properties.suit = 'hearts';
      }).toThrow();
    });

    it('should freeze the properties object', () => {
      const card = new Card(mockCardDefinition, 'standard-deck');
      
      expect(Object.isFrozen(card.properties)).toBe(true);
      expect(Object.isFrozen(card)).toBe(true);
    });

    it('should create a deep copy of properties to prevent external mutation', () => {
      const mutableDefinition = {
        id: 'test-card',
        faceId: 'test-face',
        tailId: 'test-tail',
        properties: {
          mutable: 'value'
        }
      };
      
      const card = new Card(mutableDefinition, 'test-deck');
      
      // Modify original definition
      mutableDefinition.properties.mutable = 'changed';
      
      // Card should retain original value
      expect(card.properties.mutable).toBe('value');
    });
  });

  describe('Property Access', () => {
    let card: Card;

    beforeEach(() => {
      card = new Card(mockCardDefinition, 'standard-deck');
    });

    it('should provide correct basic properties', () => {
      expect(card.id).toBe('ace-spades');
      expect(card.faceId).toBe('ace-spades-face');
      expect(card.tailId).toBe('standard-back');
      expect(card.deckType).toBe('standard-deck');
    });

    it('should provide access to custom properties', () => {
      expect(card.getProperty('suit')).toBe('spades');
      expect(card.getProperty('rank')).toBe('ace');
      expect(card.getProperty('value')).toBe(1);
      expect(card.getProperty('color')).toBe('black');
    });

    it('should return undefined for non-existent properties', () => {
      expect(card.getProperty('nonexistent')).toBeUndefined();
    });

    it('should check property existence correctly', () => {
      expect(card.hasProperty('suit')).toBe(true);
      expect(card.hasProperty('rank')).toBe(true);
      expect(card.hasProperty('nonexistent')).toBe(false);
    });

    it('should return all property keys', () => {
      const keys = card.getPropertyKeys();
      expect(keys).toContain('suit');
      expect(keys).toContain('rank');
      expect(keys).toContain('value');
      expect(keys).toContain('color');
      expect(keys).toHaveLength(4);
    });

    it('should provide string representation', () => {
      const str = card.toString();
      expect(str).toBe('Card(ace-spades, deck: standard-deck)');
    });
  });

  describe('Type Safety', () => {
    it('should support typed property access', () => {
      const card = new Card(mockCardDefinition, 'standard-deck');
      
      const suit: string | undefined = card.getProperty<string>('suit');
      const value: number | undefined = card.getProperty<number>('value');
      
      expect(suit).toBe('spades');
      expect(value).toBe(1);
    });
  });
});