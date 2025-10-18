import { GameState as IGameState } from '../core/interfaces/game-state';
import { GameEvent, EventFilter } from '../core/interfaces/events';
import { GamePhase } from '../core/types';
import { Participant } from './participant';
import { Party } from './party';
import { Gameboard } from './gameboard';
import { Hand } from './hand';

/**
 * Implementation of complete game state
 */
export class GameState implements IGameState {
  public readonly gameId: string;
  public readonly phase: GamePhase;
  public readonly gameboard: Gameboard;
  public readonly participants: Map<string, Participant>;
  public readonly hands: Map<string, Hand>;
  public readonly parties: Map<string, Party>;
  public readonly events: GameEvent[];
  public readonly metadata: Record<string, any>;

  constructor(
    gameId: string,
    phase: GamePhase = GamePhase.SETUP,
    gameboard: Gameboard = new Gameboard(),
    participants: Map<string, Participant> = new Map(),
    hands: Map<string, Hand> = new Map(),
    events: GameEvent[] | undefined = [],
    metadata: Record<string, any> = {},
    parties: Map<string, Party> = new Map()
  ) {
    this.gameId = gameId;
    this.phase = phase;
    this.gameboard = gameboard;
    this.participants = new Map(participants); // Create a copy
    this.hands = new Map(hands); // Create a copy
    this.parties = new Map(parties); // Create a copy
    this.events = events ? [...events] : []; // Create a copy, handle undefined
    this.metadata = Object.freeze({ ...metadata });
    
    // Freeze collections and the instance
    Object.freeze(this.participants);
    Object.freeze(this.hands);
    Object.freeze(this.parties);
    Object.freeze(this.events);
    Object.freeze(this);
  }

  /**
   * Get a participant by ID
   */
  public getParticipant(id: string): Participant | undefined {
    return this.participants.get(id);
  }

  /**
   * Get a hand by ID
   */
  public getHand(id: string): Hand | undefined {
    return this.hands.get(id);
  }

  /**
   * Get a party by ID
   */
  public getParty(id: string): Party | undefined {
    return this.parties.get(id);
  }

  /**
   * Check if a participant exists
   */
  public hasParticipant(id: string): boolean {
    return this.participants.has(id);
  }

  /**
   * Check if a hand exists
   */
  public hasHand(id: string): boolean {
    return this.hands.has(id);
  }

  /**
   * Check if a party exists
   */
  public hasParty(id: string): boolean {
    return this.parties.has(id);
  }

  /**
   * Get all participant IDs
   */
  public getParticipantIds(): string[] {
    return Array.from(this.participants.keys());
  }

  /**
   * Get all hand IDs
   */
  public getHandIds(): string[] {
    return Array.from(this.hands.keys());
  }

  /**
   * Get all party IDs
   */
  public getPartyIds(): string[] {
    return Array.from(this.parties.keys());
  }

  /**
   * Get hands belonging to a specific participant
   */
  public getParticipantHands(participantId: string): Hand[] {
    const participant = this.getParticipant(participantId);
    if (!participant) return [];
    
    return participant.handIds
      .map(handId => this.getHand(handId))
      .filter((hand): hand is Hand => hand !== undefined);
  }

  /**
   * Get the party that a participant belongs to
   */
  public getParticipantParty(participantId: string): Party | undefined {
    const participant = this.getParticipant(participantId);
    if (!participant || !participant.partyId) return undefined;
    
    return this.getParty(participant.partyId);
  }

  /**
   * Get all participants in a specific party
   */
  public getPartyParticipants(partyId: string): Participant[] {
    const party = this.getParty(partyId);
    if (!party) return [];
    
    return party.participantIds
      .map(participantId => this.getParticipant(participantId))
      .filter((participant): participant is Participant => participant !== undefined);
  }

  /**
   * Filter events based on criteria
   */
  public filterEvents(filter: EventFilter): GameEvent[] {
    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.participantId && event.participantId !== filter.participantId) return false;
      if (filter.since && event.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Get the most recent event
   */
  public getLastEvent(): GameEvent | undefined {
    return this.events.length > 0 ? this.events[this.events.length - 1] : undefined;
  }

  /**
   * Get events of a specific type
   */
  public getEventsByType(type: string): GameEvent[] {
    return this.filterEvents({ type });
  }

  /**
   * Get events for a specific participant
   */
  public getParticipantEvents(participantId: string): GameEvent[] {
    return this.filterEvents({ participantId });
  }

  /**
   * Create a new game state with updated phase
   */
  public withPhase(phase: GamePhase): GameState {
    return new GameState(
      this.gameId,
      phase,
      this.gameboard,
      this.participants,
      this.hands,
      this.events,
      this.metadata,
      this.parties
    );
  }

  /**
   * Create a new game state with updated gameboard
   */
  public withGameboard(gameboard: Gameboard): GameState {
    return new GameState(
      this.gameId,
      this.phase,
      gameboard,
      this.participants,
      this.hands,
      this.events,
      this.metadata,
      this.parties
    );
  }

  /**
   * Create a new game state with updated participants
   */
  public withParticipants(participants: Map<string, Participant>): GameState {
    return new GameState(
      this.gameId,
      this.phase,
      this.gameboard,
      participants,
      this.hands,
      this.events,
      this.metadata,
      this.parties
    );
  }

  /**
   * Create a new game state with updated hands
   */
  public withHands(hands: Map<string, Hand>): GameState {
    return new GameState(
      this.gameId,
      this.phase,
      this.gameboard,
      this.participants,
      hands,
      this.events,
      this.metadata,
      this.parties
    );
  }

  /**
   * Create a new game state with updated parties
   */
  public withParties(parties: Map<string, Party>): GameState {
    return new GameState(
      this.gameId,
      this.phase,
      this.gameboard,
      this.participants,
      this.hands,
      this.events,
      this.metadata,
      parties
    );
  }

  /**
   * Create a new game state with additional events
   */
  public withEvents(events: GameEvent[]): GameState {
    return new GameState(
      this.gameId,
      this.phase,
      this.gameboard,
      this.participants,
      this.hands,
      events,
      this.metadata,
      this.parties
    );
  }

  /**
   * Create a new game state with updated metadata
   */
  public withMetadata(metadata: Record<string, any>): GameState {
    return new GameState(
      this.gameId,
      this.phase,
      this.gameboard,
      this.participants,
      this.hands,
      this.events,
      metadata,
      this.parties
    );
  }

  /**
   * Create a string representation of this game state
   */
  public toString(): string {
    return `GameState(${this.gameId}, phase: ${this.phase}, participants: ${this.participants.size}, hands: ${this.hands.size}, parties: ${this.parties.size}, events: ${this.events.length})`;
  }
}