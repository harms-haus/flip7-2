import { Card, CardDefinition } from './card';

/**
 * Defines a deck type with visual assets and card specifications
 */
export interface DeckType {
  /** Unique name for this deck type */
  readonly name: string;
  
  /** Map of face IDs to image URLs/paths */
  readonly faces: Map<string, string>;
  
  /** Map of tail IDs to image URLs/paths */
  readonly tails: Map<string, string>;
  
  /** Card definitions for this deck type */
  readonly cards: CardDefinition[];
  
  /**
   * Creates a complete deck of cards
   * @returns Array of immutable cards
   */
  createDeck(): Card[];
  
  /**
   * Validates that a card belongs to this deck type
   * @param card Card to validate
   * @returns True if card is valid for this deck type
   */
  validateCard(card: Card): boolean;
}