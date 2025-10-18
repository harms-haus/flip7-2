import { Participant as IParticipant } from '../core/interfaces/participant';

/**
 * Participant implementation for managing players and NPCs
 */
export class Participant implements IParticipant {
  public readonly id: string;
  public readonly name: string;
  public readonly isNPC: boolean;
  public readonly handIds: string[];
  public readonly partyId: string | null;
  public readonly status: Record<string, any>;

  constructor(
    id: string,
    name: string,
    isNPC: boolean = false,
    handIds: string[] = [],
    partyId: string | null = null,
    status: Record<string, any> = {}
  ) {
    this.id = id;
    this.name = name;
    this.isNPC = isNPC;
    this.handIds = [...handIds]; // Create a copy
    this.partyId = partyId;
    this.status = Object.freeze({ ...status });
    
    // Freeze the instance
    Object.freeze(this.handIds);
    Object.freeze(this);
  }

  /**
   * Check if this participant has any hands
   */
  public hasHands(): boolean {
    return this.handIds.length > 0;
  }

  /**
   * Check if this participant owns a specific hand
   */
  public ownsHand(handId: string): boolean {
    return this.handIds.includes(handId);
  }

  /**
   * Get a status value for this participant
   */
  public getStatus<T = any>(key: string): T | undefined {
    return this.status[key] as T;
  }

  /**
   * Check if this participant has a specific status
   */
  public hasStatus(key: string): boolean {
    return key in this.status;
  }

  /**
   * Check if this participant belongs to a party
   */
  public isInParty(): boolean {
    return this.partyId !== null;
  }

  /**
   * Check if this participant belongs to a specific party
   */
  public belongsToParty(partyId: string): boolean {
    return this.partyId === partyId;
  }

  /**
   * Create a new participant with updated hand IDs
   */
  public withHandIds(handIds: string[]): Participant {
    return new Participant(this.id, this.name, this.isNPC, handIds, this.partyId, this.status);
  }

  /**
   * Create a new participant with updated party ID
   */
  public withPartyId(partyId: string | null): Participant {
    return new Participant(this.id, this.name, this.isNPC, this.handIds, partyId, this.status);
  }

  /**
   * Create a new participant with updated status
   */
  public withStatus(status: Record<string, any>): Participant {
    return new Participant(this.id, this.name, this.isNPC, this.handIds, this.partyId, status);
  }

  /**
   * Create a string representation of this participant
   */
  public toString(): string {
    const type = this.isNPC ? 'NPC' : 'Player';
    return `${type}(${this.id}: ${this.name}, hands: ${this.handIds.length})`;
  }
}