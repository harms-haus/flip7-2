import { 
  Gameboard as IGameboard, 
  CardPile as ICardPile, 
  CardPlacement as ICardPlacement,
  CardInPile,
  CardInPlacement
} from '../core/interfaces/gameboard';
import { Card } from './card';
import { CardOrientation } from '../core/types';

/**
 * Implementation of a card pile with ordering and state tracking
 */
export class CardPile implements ICardPile {
  public readonly name: string;
  public readonly cards: CardInPile[];
  public readonly isOrdered: boolean;
  public readonly orientation: CardOrientation;
  public readonly status: Record<string, any>;

  constructor(
    name: string,
    cards: CardInPile[] = [],
    isOrdered: boolean = true,
    orientation: CardOrientation = CardOrientation.NORMAL,
    status: Record<string, any> = {}
  ) {
    this.name = name;
    this.cards = [...cards]; // Create a copy
    this.isOrdered = isOrdered;
    this.orientation = orientation;
    this.status = Object.freeze({ ...status });
    
    // Freeze the cards array and the instance
    Object.freeze(this.cards);
    Object.freeze(this);
  }

  /**
   * Get the number of cards in this pile
   */
  public size(): number {
    return this.cards.length;
  }

  /**
   * Check if this pile is empty
   */
  public isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /**
   * Get the top card (last in array for ordered piles)
   */
  public getTopCard(): CardInPile | null {
    if (this.isEmpty()) return null;
    return this.isOrdered ? (this.cards[this.cards.length - 1] || null) : (this.cards[0] || null);
  }

  /**
   * Get the bottom card (first in array for ordered piles)
   */
  public getBottomCard(): CardInPile | null {
    if (this.isEmpty()) return null;
    return this.isOrdered ? (this.cards[0] || null) : (this.cards[this.cards.length - 1] || null);
  }

  /**
   * Create a new pile with additional cards
   */
  public withCards(cards: CardInPile[]): CardPile {
    return new CardPile(this.name, cards, this.isOrdered, this.orientation, this.status);
  }

  /**
   * Create a new pile with updated status
   */
  public withStatus(status: Record<string, any>): CardPile {
    return new CardPile(this.name, this.cards, this.isOrdered, this.orientation, status);
  }
}

/**
 * Implementation of a single card placement
 */
export class CardPlacement implements ICardPlacement {
  public readonly name: string;
  public readonly card: CardInPlacement | null;
  public readonly orientation: CardOrientation;
  public readonly status: Record<string, any>;

  constructor(
    name: string,
    card: CardInPlacement | null = null,
    orientation: CardOrientation = CardOrientation.NORMAL,
    status: Record<string, any> = {}
  ) {
    this.name = name;
    this.card = card;
    this.orientation = orientation;
    this.status = Object.freeze({ ...status });
    
    // Freeze the instance
    Object.freeze(this);
  }

  /**
   * Check if this placement is empty
   */
  public isEmpty(): boolean {
    return this.card === null;
  }

  /**
   * Check if this placement is occupied
   */
  public isOccupied(): boolean {
    return this.card !== null;
  }

  /**
   * Create a new placement with a card
   */
  public withCard(card: CardInPlacement | null): CardPlacement {
    return new CardPlacement(this.name, card, this.orientation, this.status);
  }

  /**
   * Create a new placement with updated status
   */
  public withStatus(status: Record<string, any>): CardPlacement {
    return new CardPlacement(this.name, this.card, this.orientation, status);
  }
}

/**
 * Implementation of the shared gameboard state
 */
export class Gameboard implements IGameboard {
  public readonly piles: Map<string, CardPile>;
  public readonly placements: Map<string, CardPlacement>;
  public readonly status: Record<string, any>;

  constructor(
    piles: Map<string, CardPile> = new Map(),
    placements: Map<string, CardPlacement> = new Map(),
    status: Record<string, any> = {}
  ) {
    this.piles = new Map(piles); // Create a copy
    this.placements = new Map(placements); // Create a copy
    this.status = Object.freeze({ ...status });
    
    // Freeze the maps and the instance
    Object.freeze(this.piles);
    Object.freeze(this.placements);
    Object.freeze(this);
  }

  /**
   * Get a pile by name
   */
  public getPile(name: string): CardPile | undefined {
    return this.piles.get(name);
  }

  /**
   * Get a placement by name
   */
  public getPlacement(name: string): CardPlacement | undefined {
    return this.placements.get(name);
  }

  /**
   * Check if a pile exists
   */
  public hasPile(name: string): boolean {
    return this.piles.has(name);
  }

  /**
   * Check if a placement exists
   */
  public hasPlacement(name: string): boolean {
    return this.placements.has(name);
  }

  /**
   * Get all pile names
   */
  public getPileNames(): string[] {
    return Array.from(this.piles.keys());
  }

  /**
   * Get all placement names
   */
  public getPlacementNames(): string[] {
    return Array.from(this.placements.keys());
  }

  /**
   * Create a new gameboard with updated piles
   */
  public withPiles(piles: Map<string, CardPile>): Gameboard {
    return new Gameboard(piles, this.placements, this.status);
  }

  /**
   * Create a new gameboard with updated placements
   */
  public withPlacements(placements: Map<string, CardPlacement>): Gameboard {
    return new Gameboard(this.piles, placements, this.status);
  }

  /**
   * Create a new gameboard with updated status
   */
  public withStatus(status: Record<string, any>): Gameboard {
    return new Gameboard(this.piles, this.placements, status);
  }
}