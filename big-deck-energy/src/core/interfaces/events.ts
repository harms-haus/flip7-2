/**
 * Represents a game event that occurred during gameplay
 */
export interface GameEvent {
  /** Unique identifier for this event */
  readonly id: string;
  
  /** Type of event that occurred */
  readonly type: string;
  
  /** Timestamp when the event occurred */
  readonly timestamp: number;
  
  /** ID of participant who triggered this event (optional) */
  readonly participantId?: string;
  
  /** Event-specific data */
  readonly data: Record<string, any>;
}

/**
 * Filter criteria for querying game events
 */
export interface EventFilter {
  /** Filter by event type */
  type?: string;
  
  /** Filter by participant ID */
  participantId?: string;
  
  /** Filter by party ID */
  partyId?: string;
  
  /** Filter events since this timestamp */
  since?: number;
}