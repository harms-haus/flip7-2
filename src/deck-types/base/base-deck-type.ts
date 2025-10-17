import { Card, CardDefinition } from '../../core/interfaces/card';
import { DeckType } from '../../core/interfaces/deck-type';

/**
 * Abstract base class for deck type implementations
 * Provides common functionality for deck creation and validation
 */
export abstract class BaseDeckType implements DeckType {
  public readonly name: string;
  public readonly faces: Map<string, string>;
  public readonly tails: Map<string, string>;
  public readonly cards: CardDefinition[];

  constructor(
    name: string,
    faces: Map<string, string>,
    tails: Map<string, string>,
    cards: CardDefinition[]
  ) {
    this.name = name;
    this.faces = new Map(faces);
    this.tails = new Map(tails);
    this.cards = [...cards]; // Create defensive copy
    
    this.validateDeckConfiguration();
  }

  /**
   * Creates a complete deck of immutable cards
   * @returns Array of immutable Card objects
   */
  public createDeck(): Card[] {
    return this.cards.map(cardDef => this.createCard(cardDef));
  }

  /**
   * Validates that a card belongs to this deck type
   * @param card Card to validate
   * @returns True if card is valid for this deck type
   */
  public validateCard(card: Card): boolean {
    // Check if card belongs to this deck type
    if (card.deckType !== this.name) {
      return false;
    }

    // Check if face and tail IDs exist in this deck type
    if (!this.faces.has(card.faceId) || !this.tails.has(card.tailId)) {
      return false;
    }

    // Find matching card definition
    const cardDef = this.cards.find(def => def.id === card.id);
    if (!cardDef) {
      return false;
    }

    // Validate card properties match definition
    return this.validateCardProperties(card, cardDef);
  }

  /**
   * Creates an immutable card from a card definition
   * @param cardDef Card definition to create card from
   * @returns Immutable Card object
   */
  protected createCard(cardDef: CardDefinition): Card {
    return {
      id: cardDef.id,
      faceId: cardDef.faceId,
      tailId: cardDef.tailId,
      deckType: this.name,
      properties: { ...cardDef.properties } // Create defensive copy
    };
  }

  /**
   * Validates the deck configuration during construction
   * @throws Error if configuration is invalid
   */
  protected validateDeckConfiguration(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Deck type name cannot be empty');
    }

    if (this.faces.size === 0) {
      throw new Error('Deck type must have at least one face image');
    }

    if (this.tails.size === 0) {
      throw new Error('Deck type must have at least one tail image');
    }

    if (this.cards.length === 0) {
      throw new Error('Deck type must have at least one card definition');
    }

    // Validate all card definitions reference valid face and tail IDs
    for (const cardDef of this.cards) {
      if (!this.faces.has(cardDef.faceId)) {
        throw new Error(`Card definition '${cardDef.id}' references unknown face ID '${cardDef.faceId}'`);
      }
      if (!this.tails.has(cardDef.tailId)) {
        throw new Error(`Card definition '${cardDef.id}' references unknown tail ID '${cardDef.tailId}'`);
      }
    }

    // Validate unique card IDs
    const cardIds = new Set(this.cards.map(card => card.id));
    if (cardIds.size !== this.cards.length) {
      throw new Error('All card definitions must have unique IDs');
    }
  }

  /**
   * Validates that card properties match the card definition
   * @param card Card to validate
   * @param cardDef Expected card definition
   * @returns True if properties match
   */
  protected validateCardProperties(card: Card, cardDef: CardDefinition): boolean {
    // Check if all expected properties exist and match
    for (const [key, expectedValue] of Object.entries(cardDef.properties)) {
      if (card.properties[key] !== expectedValue) {
        return false;
      }
    }

    // Check if card has any unexpected properties
    for (const key of Object.keys(card.properties)) {
      if (!(key in cardDef.properties)) {
        return false;
      }
    }

    return true;
  }
}