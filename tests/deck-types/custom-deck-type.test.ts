import { CustomDeckType, CustomDeckConfig, SpecialAbility } from '../../src/deck-types/custom/custom-deck-type';
import { Card, CardDefinition } from '../../src/core/interfaces/card';

describe('CustomDeckType', () => {
  let basicConfig: CustomDeckConfig;

  beforeEach(() => {
    basicConfig = {
      name: 'test-custom-deck',
      faces: new Map([
        ['fire_card', '/images/fire.png'],
        ['water_card', '/images/water.png']
      ]),
      tails: new Map([
        ['magic_back', '/images/magic_back.png']
      ]),
      cards: [
        {
          id: 'fire_1',
          faceId: 'fire_card',
          tailId: 'magic_back',
          properties: { element: 'fire', power: 5 }
        },
        {
          id: 'water_1',
          faceId: 'water_card',
          tailId: 'magic_back',
          properties: { element: 'water', power: 3 }
        }
      ]
    };
  });

  describe('constructor', () => {
    it('should create a custom deck type', () => {
      const deck = new CustomDeckType(basicConfig);
      
      expect(deck.name).toBe('test-custom-deck');
      expect(deck.faces.size).toBe(2);
      expect(deck.tails.size).toBe(1);
      expect(deck.cards.length).toBe(2);
    });

    it('should accept property validators', () => {
      const config = {
        ...basicConfig,
        propertyValidators: new Map([
          ['power', (value: any) => typeof value === 'number' && value > 0]
        ])
      };

      const deck = new CustomDeckType(config);
      expect(deck).toBeDefined();
    });

    it('should accept special abilities', () => {
      const burnAbility: SpecialAbility = {
        id: 'burn',
        name: 'Burn',
        description: 'Deals fire damage',
        execute: (card: Card, context: any) => ({ damage: card.properties.power })
      };

      const config = {
        ...basicConfig,
        specialAbilities: new Map([['burn', burnAbility]])
      };

      const deck = new CustomDeckType(config);
      expect(deck).toBeDefined();
    });

    it('should throw error for invalid special ability', () => {
      const invalidAbility = {
        id: '',
        name: 'Invalid',
        description: 'Invalid ability',
        execute: (card: Card, context: any) => {}
      };

      const config = {
        ...basicConfig,
        specialAbilities: new Map([['invalid', invalidAbility]])
      };

      expect(() => new CustomDeckType(config)).toThrow('Special ability must have a non-empty ID');
    });

    it('should throw error for ability without execute function', () => {
      const invalidAbility = {
        id: 'invalid',
        name: 'Invalid',
        description: 'Invalid ability',
        execute: 'not a function' as any
      };

      const config = {
        ...basicConfig,
        specialAbilities: new Map([['invalid', invalidAbility]])
      };

      expect(() => new CustomDeckType(config)).toThrow('Special ability must have an execute function');
    });

    it('should throw error for card referencing unknown ability', () => {
      const config = {
        ...basicConfig,
        cards: [
          {
            id: 'fire_1',
            faceId: 'fire_card',
            tailId: 'magic_back',
            properties: { element: 'fire', power: 5, ability_unknown: true }
          }
        ]
      };

      expect(() => new CustomDeckType(config)).toThrow('Card fire_1 references unknown ability: unknown');
    });
  });

  describe('validateCard', () => {
    it('should validate cards with custom properties', () => {
      const deck = new CustomDeckType(basicConfig);
      const validCard: Card = {
        id: 'fire_1',
        faceId: 'fire_card',
        tailId: 'magic_back',
        deckType: 'test-custom-deck',
        properties: { element: 'fire', power: 5 }
      };

      expect(deck.validateCard(validCard)).toBe(true);
    });

    it('should use custom property validators', () => {
      const config = {
        ...basicConfig,
        propertyValidators: new Map([
          ['power', (value: any) => typeof value === 'number' && value > 0 && value <= 10]
        ])
      };

      const deck = new CustomDeckType(config);
      
      const validCard: Card = {
        id: 'fire_1',
        faceId: 'fire_card',
        tailId: 'magic_back',
        deckType: 'test-custom-deck',
        properties: { element: 'fire', power: 5 }
      };

      const invalidCard: Card = {
        id: 'fire_1',
        faceId: 'fire_card',
        tailId: 'magic_back',
        deckType: 'test-custom-deck',
        properties: { element: 'fire', power: 15 } // Too high
      };

      expect(deck.validateCard(validCard)).toBe(true);
      expect(deck.validateCard(invalidCard)).toBe(false);
    });
  });

  describe('special abilities', () => {
    let deck: CustomDeckType;
    let burnAbility: SpecialAbility;
    let healAbility: SpecialAbility;

    beforeEach(() => {
      burnAbility = {
        id: 'burn',
        name: 'Burn',
        description: 'Deals fire damage',
        execute: (card: Card, context: any) => ({ damage: card.properties.power })
      };

      healAbility = {
        id: 'heal',
        name: 'Heal',
        description: 'Restores health',
        execute: (card: Card, context: any) => ({ healing: card.properties.power })
      };

      const config = {
        ...basicConfig,
        cards: [
          {
            id: 'fire_1',
            faceId: 'fire_card',
            tailId: 'magic_back',
            properties: { element: 'fire', power: 5, ability_burn: true }
          },
          {
            id: 'water_1',
            faceId: 'water_card',
            tailId: 'magic_back',
            properties: { element: 'water', power: 3, ability_heal: true }
          }
        ],
        specialAbilities: new Map([
          ['burn', burnAbility],
          ['heal', healAbility]
        ])
      };

      deck = new CustomDeckType(config);
    });

    describe('getCardAbilities', () => {
      it('should return abilities for cards that have them', () => {
        const fireCard: Card = {
          id: 'fire_1',
          faceId: 'fire_card',
          tailId: 'magic_back',
          deckType: 'test-custom-deck',
          properties: { element: 'fire', power: 5, ability_burn: true }
        };

        const abilities = deck.getCardAbilities(fireCard);
        expect(abilities).toHaveLength(1);
        expect(abilities[0].id).toBe('burn');
      });

      it('should return empty array for cards without abilities', () => {
        const normalCard: Card = {
          id: 'normal_1',
          faceId: 'fire_card',
          tailId: 'magic_back',
          deckType: 'test-custom-deck',
          properties: { element: 'fire', power: 5 }
        };

        const abilities = deck.getCardAbilities(normalCard);
        expect(abilities).toHaveLength(0);
      });
    });

    describe('executeAbility', () => {
      it('should execute ability for card that has it', () => {
        const fireCard: Card = {
          id: 'fire_1',
          faceId: 'fire_card',
          tailId: 'magic_back',
          deckType: 'test-custom-deck',
          properties: { element: 'fire', power: 5, ability_burn: true }
        };

        const result = deck.executeAbility(fireCard, 'burn', {});
        expect(result).toEqual({ damage: 5 });
      });

      it('should throw error for unknown ability', () => {
        const fireCard: Card = {
          id: 'fire_1',
          faceId: 'fire_card',
          tailId: 'magic_back',
          deckType: 'test-custom-deck',
          properties: { element: 'fire', power: 5, ability_burn: true }
        };

        expect(() => {
          deck.executeAbility(fireCard, 'unknown', {});
        }).toThrow('Unknown ability: unknown');
      });

      it('should throw error for card without ability', () => {
        const normalCard: Card = {
          id: 'normal_1',
          faceId: 'fire_card',
          tailId: 'magic_back',
          deckType: 'test-custom-deck',
          properties: { element: 'fire', power: 5 }
        };

        expect(() => {
          deck.executeAbility(normalCard, 'burn', {});
        }).toThrow('Card normal_1 does not have ability burn');
      });
    });

    describe('getAllAbilities', () => {
      it('should return all available abilities', () => {
        const abilities = deck.getAllAbilities();
        expect(abilities).toHaveLength(2);
        expect(abilities.map(a => a.id)).toContain('burn');
        expect(abilities.map(a => a.id)).toContain('heal');
      });
    });
  });

  describe('runtime modification', () => {
    it('should allow adding property validators at runtime', () => {
      const deck = new CustomDeckType(basicConfig);
      
      deck.addPropertyValidator('element', (value: any) => ['fire', 'water', 'earth', 'air'].includes(value));
      
      const validCard: Card = {
        id: 'fire_1',
        faceId: 'fire_card',
        tailId: 'magic_back',
        deckType: 'test-custom-deck',
        properties: { element: 'fire', power: 5 }
      };

      const invalidCard: Card = {
        id: 'fire_1',
        faceId: 'fire_card',
        tailId: 'magic_back',
        deckType: 'test-custom-deck',
        properties: { element: 'invalid', power: 5 }
      };

      expect(deck.validateCard(validCard)).toBe(true);
      expect(deck.validateCard(invalidCard)).toBe(false);
    });

    it('should allow adding special abilities at runtime', () => {
      const deck = new CustomDeckType(basicConfig);
      
      const newAbility: SpecialAbility = {
        id: 'freeze',
        name: 'Freeze',
        description: 'Freezes target',
        execute: (card: Card, context: any) => ({ frozen: true })
      };

      deck.addSpecialAbility(newAbility);
      
      const abilities = deck.getAllAbilities();
      expect(abilities).toHaveLength(1);
      expect(abilities[0].id).toBe('freeze');
    });
  });
});