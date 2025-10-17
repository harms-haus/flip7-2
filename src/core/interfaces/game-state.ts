import { Participant } from './participant';
import { Gameboard } from './gameboard';
import { Hand } from './hand';
import { GameEvent } from './events';
import { GamePhase } from '../types';

/**
 * Complete state of a card game instance
 */
export interface GameState {
  /** Unique identifier for this game instance */
  readonly gameId: string;
  
  /** Current phase of the game */
  readonly phase: GamePhase;
  
  /** Shared game state visible to all participants */
  readonly gameboard: Gameboard;
  
  /** All participants in the game */
  readonly participants: Map<string, Participant>;
  
  /** All hands in the game */
  readonly hands: Map<string, Hand>;
  
  /** Complete event history */
  readonly events: GameEvent[];
  
  /** Custom metadata for this game instance */
  readonly metadata: Record<string, any>;
}