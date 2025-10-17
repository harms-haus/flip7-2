import { CardPile, CardPlacement } from './gameboard';

/**
 * Represents a participant's hand containing piles and placements
 */
export interface Hand {
  /** Unique identifier for this hand */
  readonly id: string;
  
  /** Display name for this hand */
  readonly name: string;
  
  /** ID of participant who owns this hand */
  readonly participantId: string;
  
  /** Named piles of cards in this hand */
  readonly piles: Map<string, CardPile>;
  
  /** Named single-card placements in this hand */
  readonly placements: Map<string, CardPlacement>;
  
  /** Custom status data for this hand */
  readonly status: Record<string, any>;
}