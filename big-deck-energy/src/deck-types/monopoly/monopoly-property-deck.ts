import { CardDefinition } from '../../core/interfaces/card';
import { BaseDeckType } from '../base/base-deck-type';

/**
 * Monopoly-style property deck with different property types and special abilities
 */
export class MonopolyPropertyDeck extends BaseDeckType {
  public static readonly PROPERTY_COLORS = [
    'brown', 'light-blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark-blue'
  ] as const;
  
  public static readonly PROPERTY_TYPES = [
    'property', 'railroad', 'utility', 'special'
  ] as const;
  
  public static readonly SPECIAL_ABILITIES = [
    'rent_boost', 'property_swap', 'steal_property', 'force_trade', 'immunity'
  ] as const;

  constructor() {
    const faces = MonopolyPropertyDeck.createFaceMap();
    const tails = MonopolyPropertyDeck.createTailMap();
    const cards = MonopolyPropertyDeck.createCardDefinitions();

    super('monopoly-property-deck', faces, tails, cards);
  }

  /**
   * Creates the face image map for property cards
   */
  private static createFaceMap(): Map<string, string> {
    const faces = new Map<string, string>();

    // Property cards
    const properties = [
      // Brown properties
      { id: 'mediterranean_ave', name: 'Mediterranean Avenue' },
      { id: 'baltic_ave', name: 'Baltic Avenue' },
      
      // Light Blue properties
      { id: 'oriental_ave', name: 'Oriental Avenue' },
      { id: 'vermont_ave', name: 'Vermont Avenue' },
      { id: 'connecticut_ave', name: 'Connecticut Avenue' },
      
      // Pink properties
      { id: 'st_charles_place', name: 'St. Charles Place' },
      { id: 'states_ave', name: 'States Avenue' },
      { id: 'virginia_ave', name: 'Virginia Avenue' },
      
      // Orange properties
      { id: 'st_james_place', name: 'St. James Place' },
      { id: 'tennessee_ave', name: 'Tennessee Avenue' },
      { id: 'new_york_ave', name: 'New York Avenue' },
      
      // Red properties
      { id: 'kentucky_ave', name: 'Kentucky Avenue' },
      { id: 'indiana_ave', name: 'Indiana Avenue' },
      { id: 'illinois_ave', name: 'Illinois Avenue' },
      
      // Yellow properties
      { id: 'atlantic_ave', name: 'Atlantic Avenue' },
      { id: 'ventnor_ave', name: 'Ventnor Avenue' },
      { id: 'marvin_gardens', name: 'Marvin Gardens' },
      
      // Green properties
      { id: 'pacific_ave', name: 'Pacific Avenue' },
      { id: 'north_carolina_ave', name: 'North Carolina Avenue' },
      { id: 'pennsylvania_ave', name: 'Pennsylvania Avenue' },
      
      // Dark Blue properties
      { id: 'park_place', name: 'Park Place' },
      { id: 'boardwalk', name: 'Boardwalk' }
    ];

    for (const property of properties) {
      faces.set(property.id, `/cards/monopoly/properties/${property.id}.png`);
    }

    // Railroads
    const railroads = [
      'reading_railroad', 'pennsylvania_railroad', 'b_o_railroad', 'short_line'
    ];
    
    for (const railroad of railroads) {
      faces.set(railroad, `/cards/monopoly/railroads/${railroad}.png`);
    }

    // Utilities
    faces.set('electric_company', '/cards/monopoly/utilities/electric_company.png');
    faces.set('water_works', '/cards/monopoly/utilities/water_works.png');

    // Special cards
    const specials = [
      'property_wild', 'rent_boost', 'property_swap', 'steal_property', 'force_trade', 'immunity_shield'
    ];
    
    for (const special of specials) {
      faces.set(special, `/cards/monopoly/specials/${special}.png`);
    }

    return faces;
  }

  /**
   * Creates the tail image map for property cards
   */
  private static createTailMap(): Map<string, string> {
    const tails = new Map<string, string>();
    tails.set('monopoly_back', '/cards/monopoly/backs/monopoly_back.png');
    return tails;
  }

  /**
   * Creates card definitions for all property cards
   */
  private static createCardDefinitions(): CardDefinition[] {
    const cards: CardDefinition[] = [];

    // Brown properties (2 cards)
    cards.push(
      {
        id: 'mediterranean_ave',
        faceId: 'mediterranean_ave',
        tailId: 'monopoly_back',
        properties: {
          name: 'Mediterranean Avenue',
          type: 'property',
          color: 'brown',
          rent: [2, 10, 30, 90, 160, 250],
          cost: 60,
          houseCost: 50,
          mortgageValue: 30,
          groupSize: 2,
          canBuildHouses: true
        }
      },
      {
        id: 'baltic_ave',
        faceId: 'baltic_ave',
        tailId: 'monopoly_back',
        properties: {
          name: 'Baltic Avenue',
          type: 'property',
          color: 'brown',
          rent: [4, 20, 60, 180, 320, 450],
          cost: 60,
          houseCost: 50,
          mortgageValue: 30,
          groupSize: 2,
          canBuildHouses: true
        }
      }
    );

    // Light Blue properties (3 cards)
    const lightBlueProperties = [
      { id: 'oriental_ave', name: 'Oriental Avenue', rent: [6, 30, 90, 270, 400, 550], cost: 100 },
      { id: 'vermont_ave', name: 'Vermont Avenue', rent: [6, 30, 90, 270, 400, 550], cost: 100 },
      { id: 'connecticut_ave', name: 'Connecticut Avenue', rent: [8, 40, 100, 300, 450, 600], cost: 120 }
    ];

    for (const prop of lightBlueProperties) {
      cards.push({
        id: prop.id,
        faceId: prop.id,
        tailId: 'monopoly_back',
        properties: {
          name: prop.name,
          type: 'property',
          color: 'light-blue',
          rent: prop.rent,
          cost: prop.cost,
          houseCost: 50,
          mortgageValue: prop.cost / 2,
          groupSize: 3,
          canBuildHouses: true
        }
      });
    }

    // Pink properties (3 cards)
    const pinkProperties = [
      { id: 'st_charles_place', name: 'St. Charles Place', rent: [10, 50, 150, 450, 625, 750], cost: 140 },
      { id: 'states_ave', name: 'States Avenue', rent: [10, 50, 150, 450, 625, 750], cost: 140 },
      { id: 'virginia_ave', name: 'Virginia Avenue', rent: [12, 60, 180, 500, 700, 900], cost: 160 }
    ];

    for (const prop of pinkProperties) {
      cards.push({
        id: prop.id,
        faceId: prop.id,
        tailId: 'monopoly_back',
        properties: {
          name: prop.name,
          type: 'property',
          color: 'pink',
          rent: prop.rent,
          cost: prop.cost,
          houseCost: 100,
          mortgageValue: prop.cost / 2,
          groupSize: 3,
          canBuildHouses: true
        }
      });
    }

    // Orange properties (3 cards)
    const orangeProperties = [
      { id: 'st_james_place', name: 'St. James Place', rent: [14, 70, 200, 550, 750, 950], cost: 180 },
      { id: 'tennessee_ave', name: 'Tennessee Avenue', rent: [14, 70, 200, 550, 750, 950], cost: 180 },
      { id: 'new_york_ave', name: 'New York Avenue', rent: [16, 80, 220, 600, 800, 1000], cost: 200 }
    ];

    for (const prop of orangeProperties) {
      cards.push({
        id: prop.id,
        faceId: prop.id,
        tailId: 'monopoly_back',
        properties: {
          name: prop.name,
          type: 'property',
          color: 'orange',
          rent: prop.rent,
          cost: prop.cost,
          houseCost: 100,
          mortgageValue: prop.cost / 2,
          groupSize: 3,
          canBuildHouses: true
        }
      });
    }

    // Red properties (3 cards)
    const redProperties = [
      { id: 'kentucky_ave', name: 'Kentucky Avenue', rent: [18, 90, 250, 700, 875, 1050], cost: 220 },
      { id: 'indiana_ave', name: 'Indiana Avenue', rent: [18, 90, 250, 700, 875, 1050], cost: 220 },
      { id: 'illinois_ave', name: 'Illinois Avenue', rent: [20, 100, 300, 750, 925, 1100], cost: 240 }
    ];

    for (const prop of redProperties) {
      cards.push({
        id: prop.id,
        faceId: prop.id,
        tailId: 'monopoly_back',
        properties: {
          name: prop.name,
          type: 'property',
          color: 'red',
          rent: prop.rent,
          cost: prop.cost,
          houseCost: 150,
          mortgageValue: prop.cost / 2,
          groupSize: 3,
          canBuildHouses: true
        }
      });
    }

    // Yellow properties (3 cards)
    const yellowProperties = [
      { id: 'atlantic_ave', name: 'Atlantic Avenue', rent: [22, 110, 330, 800, 975, 1150], cost: 260 },
      { id: 'ventnor_ave', name: 'Ventnor Avenue', rent: [22, 110, 330, 800, 975, 1150], cost: 260 },
      { id: 'marvin_gardens', name: 'Marvin Gardens', rent: [24, 120, 360, 850, 1025, 1200], cost: 280 }
    ];

    for (const prop of yellowProperties) {
      cards.push({
        id: prop.id,
        faceId: prop.id,
        tailId: 'monopoly_back',
        properties: {
          name: prop.name,
          type: 'property',
          color: 'yellow',
          rent: prop.rent,
          cost: prop.cost,
          houseCost: 150,
          mortgageValue: prop.cost / 2,
          groupSize: 3,
          canBuildHouses: true
        }
      });
    }

    // Green properties (3 cards)
    const greenProperties = [
      { id: 'pacific_ave', name: 'Pacific Avenue', rent: [26, 130, 390, 900, 1100, 1275], cost: 300 },
      { id: 'north_carolina_ave', name: 'North Carolina Avenue', rent: [26, 130, 390, 900, 1100, 1275], cost: 300 },
      { id: 'pennsylvania_ave', name: 'Pennsylvania Avenue', rent: [28, 150, 450, 1000, 1200, 1400], cost: 320 }
    ];

    for (const prop of greenProperties) {
      cards.push({
        id: prop.id,
        faceId: prop.id,
        tailId: 'monopoly_back',
        properties: {
          name: prop.name,
          type: 'property',
          color: 'green',
          rent: prop.rent,
          cost: prop.cost,
          houseCost: 200,
          mortgageValue: prop.cost / 2,
          groupSize: 3,
          canBuildHouses: true
        }
      });
    }

    // Dark Blue properties (2 cards)
    cards.push(
      {
        id: 'park_place',
        faceId: 'park_place',
        tailId: 'monopoly_back',
        properties: {
          name: 'Park Place',
          type: 'property',
          color: 'dark-blue',
          rent: [35, 175, 500, 1100, 1300, 1500],
          cost: 350,
          houseCost: 200,
          mortgageValue: 175,
          groupSize: 2,
          canBuildHouses: true
        }
      },
      {
        id: 'boardwalk',
        faceId: 'boardwalk',
        tailId: 'monopoly_back',
        properties: {
          name: 'Boardwalk',
          type: 'property',
          color: 'dark-blue',
          rent: [50, 200, 600, 1400, 1700, 2000],
          cost: 400,
          houseCost: 200,
          mortgageValue: 200,
          groupSize: 2,
          canBuildHouses: true
        }
      }
    );

    // Railroads (4 cards)
    const railroads = [
      { id: 'reading_railroad', name: 'Reading Railroad' },
      { id: 'pennsylvania_railroad', name: 'Pennsylvania Railroad' },
      { id: 'b_o_railroad', name: 'B. & O. Railroad' },
      { id: 'short_line', name: 'Short Line' }
    ];

    for (const railroad of railroads) {
      cards.push({
        id: railroad.id,
        faceId: railroad.id,
        tailId: 'monopoly_back',
        properties: {
          name: railroad.name,
          type: 'railroad',
          color: 'black',
          rent: [25, 50, 100, 200], // Rent based on number of railroads owned
          cost: 200,
          mortgageValue: 100,
          groupSize: 4,
          canBuildHouses: false
        }
      });
    }

    // Utilities (2 cards)
    cards.push(
      {
        id: 'electric_company',
        faceId: 'electric_company',
        tailId: 'monopoly_back',
        properties: {
          name: 'Electric Company',
          type: 'utility',
          color: 'white',
          rentMultiplier: [4, 10], // Multiplier based on dice roll and number of utilities owned
          cost: 150,
          mortgageValue: 75,
          groupSize: 2,
          canBuildHouses: false
        }
      },
      {
        id: 'water_works',
        faceId: 'water_works',
        tailId: 'monopoly_back',
        properties: {
          name: 'Water Works',
          type: 'utility',
          color: 'white',
          rentMultiplier: [4, 10], // Multiplier based on dice roll and number of utilities owned
          cost: 150,
          mortgageValue: 75,
          groupSize: 2,
          canBuildHouses: false
        }
      }
    );

    // Special ability cards (6 cards)
    const specialCards = [
      {
        id: 'property_wild',
        name: 'Property Wild Card',
        ability: 'wild_property',
        description: 'Can be used as any property to complete a color group'
      },
      {
        id: 'rent_boost',
        name: 'Rent Boost',
        ability: 'rent_boost',
        description: 'Double the rent on your next property collection'
      },
      {
        id: 'property_swap',
        name: 'Property Swap',
        ability: 'property_swap',
        description: 'Force another player to trade one of their properties with you'
      },
      {
        id: 'steal_property',
        name: 'Steal Property',
        ability: 'steal_property',
        description: 'Take any single property from another player'
      },
      {
        id: 'force_trade',
        name: 'Force Trade',
        ability: 'force_trade',
        description: 'Force any player to accept a trade of your choosing'
      },
      {
        id: 'immunity_shield',
        name: 'Immunity Shield',
        ability: 'immunity',
        description: 'Protect yourself from one special ability card'
      }
    ];

    for (const special of specialCards) {
      cards.push({
        id: special.id,
        faceId: special.id,
        tailId: 'monopoly_back',
        properties: {
          name: special.name,
          type: 'special',
          color: 'special',
          ability: special.ability,
          description: special.description,
          canBuildHouses: false,
          isOneTimeUse: true
        }
      });
    }

    return cards;
  }

  /**
   * Gets the capabilities supported by this deck type
   */
  public getCapabilities(): string[] {
    return ['PROPERTY_COLORS', 'PROPERTY_TYPES', 'SPECIAL_ABILITIES', 'RENT_CALCULATION'];
  }

  /**
   * Gets all property colors in this deck
   */
  public getPropertyColors(): readonly string[] {
    return MonopolyPropertyDeck.PROPERTY_COLORS;
  }

  /**
   * Gets all property types in this deck
   */
  public getPropertyTypes(): readonly string[] {
    return MonopolyPropertyDeck.PROPERTY_TYPES;
  }

  /**
   * Gets all special abilities in this deck
   */
  public getSpecialAbilities(): readonly string[] {
    return MonopolyPropertyDeck.SPECIAL_ABILITIES;
  }

  /**
   * Calculate rent for a property based on ownership and development
   */
  public calculateRent(
    propertyCard: { properties: Record<string, any> },
    ownedPropertiesInGroup: number,
    housesBuilt: number = 0
  ): number {
    const properties = propertyCard.properties;
    
    if (properties.type === 'property') {
      const rent = properties.rent as number[];
      if (housesBuilt > 0 && housesBuilt <= 5 && rent[housesBuilt] !== undefined) {
        return rent[housesBuilt];
      } else if (ownedPropertiesInGroup === properties.groupSize && rent[0] !== undefined) {
        // Monopoly - double base rent
        return rent[0] * 2;
      } else if (rent[0] !== undefined) {
        return rent[0];
      }
    } else if (properties.type === 'railroad') {
      const rent = properties.rent as number[];
      const index = Math.min(ownedPropertiesInGroup - 1, 3);
      if (rent[index] !== undefined) {
        return rent[index];
      }
    } else if (properties.type === 'utility') {
      // Utility rent is calculated based on dice roll and number owned
      // This would need to be calculated at runtime with dice roll
      return 0; // Placeholder - actual calculation needs dice roll
    }
    
    return 0;
  }

  /**
   * Check if a property can have houses built on it
   */
  public canBuildHouses(propertyCard: { properties: Record<string, any> }): boolean {
    return propertyCard.properties.canBuildHouses === true;
  }

  /**
   * Get properties by color group
   */
  public getPropertiesByColor(color: string): string[] {
    return this.cards
      .filter(card => card.properties.color === color && card.properties.type === 'property')
      .map(card => card.id);
  }

  /**
   * Check if a card has a special ability
   */
  public hasSpecialAbility(card: { properties: Record<string, any> }): boolean {
    return card.properties.type === 'special' && !!card.properties.ability;
  }

  /**
   * Get the special ability of a card
   */
  public getSpecialAbility(card: { properties: Record<string, any> }): string | null {
    return this.hasSpecialAbility(card) ? card.properties.ability : null;
  }
}