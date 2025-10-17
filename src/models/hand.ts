import { Hand as IHand } from '../core/interfaces/hand';
import { CardPile, CardPlacement } from './gameboard';

/**
 * Implementation of a participant's hand containing piles and placements
 */
export class Hand implements IHand {
  public readonly id: string;
  public readonly name: string;
  public readonly participantId: string;
  public readonly piles: Map<string, CardPile>;
  public readonly placements: Map<string, CardPlacement>;
  public readonly status: Record<string, any>;

  constructor(
    id: string,
    name: string,
    participantId: string,
    piles: Map<string, CardPile> = new Map(),
    placements: Map<string, CardPlacement> = new Map(),
    status: Record<string, any> = {}
  ) {
    this.id = id;
    this.name = name;
    this.participantId = participantId;
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
   * Get total number of cards in all piles
   */
  public getTotalCardCount(): number {
    let count = 0;
    for (const pile of this.piles.values()) {
      count += pile.size();
    }
    for (const placement of this.placements.values()) {
      if (placement.isOccupied()) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Check if this hand is empty (no cards in any piles or placements)
   */
  public isEmpty(): boolean {
    return this.getTotalCardCount() === 0;
  }

  /**
   * Create a new hand with updated piles
   */
  public withPiles(piles: Map<string, CardPile>): Hand {
    return new Hand(this.id, this.name, this.participantId, piles, this.placements, this.status);
  }

  /**
   * Create a new hand with updated placements
   */
  public withPlacements(placements: Map<string, CardPlacement>): Hand {
    return new Hand(this.id, this.name, this.participantId, this.piles, placements, this.status);
  }

  /**
   * Create a new hand with updated status
   */
  public withStatus(status: Record<string, any>): Hand {
    return new Hand(this.id, this.name, this.participantId, this.piles, this.placements, status);
  }

  /**
   * Create a string representation of this hand
   */
  public toString(): string {
    return `Hand(${this.id}: ${this.name}, owner: ${this.participantId}, cards: ${this.getTotalCardCount()})`;
  }
}