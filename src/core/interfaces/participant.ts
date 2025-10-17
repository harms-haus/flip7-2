/**
 * Represents a participant in a card game (player or NPC)
 */
export interface Participant {
  /** Unique identifier for this participant */
  readonly id: string;
  
  /** Display name for this participant */
  readonly name: string;
  
  /** Whether this participant is an NPC (non-player character) */
  readonly isNPC: boolean;
  
  /** IDs of hands belonging to this participant */
  readonly handIds: string[];
  
  /** Custom status data for this participant */
  readonly status: Record<string, any>;
}