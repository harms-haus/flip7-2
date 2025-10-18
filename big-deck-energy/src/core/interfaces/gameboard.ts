import { Card } from './card';
import { CardOrientation } from '../types';

/**
 * Represents the shared game state visible to all participants
 */
export interface Gameboard {
  /** Named piles of cards on the gameboard */
  readonly piles: Map<string, CardPile>;
  
  /** Named single-card placements on the gameboard */
  readonly placements: Map<string, CardPlacement>;
  
  /** Custom status data for the gameboard */
  readonly status: Record<string, any>;
}

/**
 * A pile of cards with ordering and orientation
 */
export interface CardPile {
  /** Name of this pile */
  readonly name: string;
  
  /** Cards in this pile with their state */
  readonly cards: CardInPile[];
  
  /** Whether the order of cards matters */
  readonly isOrdered: boolean;
  
  /** Default orientation for cards in this pile */
  readonly orientation: CardOrientation;
  
  /** Custom status data for this pile */
  readonly status: Record<string, any>;
}

/**
 * A single card placement with orientation
 */
export interface CardPlacement {
  /** Name of this placement */
  readonly name: string;
  
  /** Card in this placement (null if empty) */
  readonly card: CardInPlacement | null;
  
  /** Default orientation for cards in this placement */
  readonly orientation: CardOrientation;
  
  /** Custom status data for this placement */
  readonly status: Record<string, any>;
}

/**
 * A card within a pile with gameplay state
 */
export interface CardInPile {
  /** The immutable card */
  readonly card: Card;
  
  /** Whether this card is face-up */
  readonly faceUp: boolean;
  
  /** Orientation of this card */
  readonly orientation: CardOrientation;
  
  /** ID of participant who owns this card (null if unowned) */
  readonly owner: string | null;
  
  /** Custom status data for this card instance */
  readonly status: Record<string, any>;
}

/**
 * A card within a placement with gameplay state
 */
export interface CardInPlacement {
  /** The immutable card */
  readonly card: Card;
  
  /** Whether this card is face-up */
  readonly faceUp: boolean;
  
  /** Orientation of this card */
  readonly orientation: CardOrientation;
  
  /** ID of participant who owns this card (null if unowned) */
  readonly owner: string | null;
  
  /** Custom status data for this card instance */
  readonly status: Record<string, any>;
}