import { Party as IParty } from '../core/interfaces/party';
import { CardPile, CardPlacement } from '../core/interfaces/gameboard';

/**
 * Party implementation for managing teams of participants
 */
export class Party implements IParty {
  public readonly id: string;
  public readonly name: string;
  public readonly participantIds: string[];
  public readonly piles: Map<string, CardPile>;
  public readonly placements: Map<string, CardPlacement>;
  public readonly status: Record<string, any>;

  constructor(
    id: string,
    name: string,
    participantIds: string[] = [],
    piles: Map<string, CardPile> = new Map(),
    placements: Map<string, CardPlacement> = new Map(),
    status: Record<string, any> = {}
  ) {
    this.id = id;
    this.name = name;
    this.participantIds = [...participantIds]; // Create a copy
    this.piles = new Map(piles); // Create a copy
    this.placements = new Map(placements); // Create a copy
    this.status = Object.freeze({ ...status });
    
    // Freeze the arrays and maps
    Object.freeze(this.participantIds);
    Object.freeze(this.piles);
    Object.freeze(this.placements);
    Object.freeze(this);
  }

  /**
   * Check if this party has any participants
   */
  public hasParticipants(): boolean {
    return this.participantIds.length > 0;
  }

  /**
   * Check if this party contains a specific participant
   */
  public hasParticipant(participantId: string): boolean {
    return this.participantIds.includes(participantId);
  }

  /**
   * Get the number of participants in this party
   */
  public getParticipantCount(): number {
    return this.participantIds.length;
  }

  /**
   * Check if this party has a specific pile
   */
  public hasPile(pileName: string): boolean {
    return this.piles.has(pileName);
  }

  /**
   * Check if this party has a specific placement
   */
  public hasPlacement(placementName: string): boolean {
    return this.placements.has(placementName);
  }

  /**
   * Get a status value for this party
   */
  public getStatus<T = any>(key: string): T | undefined {
    return this.status[key] as T;
  }

  /**
   * Check if this party has a specific status
   */
  public hasStatus(key: string): boolean {
    return key in this.status;
  }

  /**
   * Create a new party with updated participant IDs
   */
  public withParticipantIds(participantIds: string[]): Party {
    return new Party(this.id, this.name, participantIds, this.piles, this.placements, this.status);
  }

  /**
   * Create a new party with updated piles
   */
  public withPiles(piles: Map<string, CardPile>): Party {
    return new Party(this.id, this.name, this.participantIds, piles, this.placements, this.status);
  }

  /**
   * Create a new party with updated placements
   */
  public withPlacements(placements: Map<string, CardPlacement>): Party {
    return new Party(this.id, this.name, this.participantIds, this.piles, placements, this.status);
  }

  /**
   * Create a new party with updated status
   */
  public withStatus(status: Record<string, any>): Party {
    return new Party(this.id, this.name, this.participantIds, this.piles, this.placements, status);
  }

  /**
   * Create a string representation of this party
   */
  public toString(): string {
    return `Party(${this.id}: ${this.name}, participants: ${this.participantIds.length}, piles: ${this.piles.size}, placements: ${this.placements.size})`;
  }
}