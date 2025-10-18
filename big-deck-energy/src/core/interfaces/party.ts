import { CardPile, CardPlacement } from './gameboard';

/**
 * Represents a party (team) in a card game containing multiple participants
 */
export interface Party {
  /** Unique identifier for this party */
  readonly id: string;
  
  /** Display name for this party */
  readonly name: string;
  
  /** IDs of participants belonging to this party */
  readonly participantIds: string[];
  
  /** Card piles belonging to this party */
  readonly piles: Map<string, CardPile>;
  
  /** Card placements belonging to this party */
  readonly placements: Map<string, CardPlacement>;
  
  /** Custom status data for this party */
  readonly status: Record<string, any>;
}