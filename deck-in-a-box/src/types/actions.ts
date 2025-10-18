import { Participant } from 'big-deck-energy';

/**
 * Defines an action that a player can take in the game.
 * Used for building action menus and keyboard shortcuts.
 */
export interface ActionDefinition {
  /** Unique identifier for this action */
  id: string;
  
  /** Human-readable label shown in menus */
  label: string;
  
  /** Detailed description of what this action does */
  description: string;
  
  /** Keyboard key that triggers this action */
  keyBinding: string;
  
  /** Whether this action is currently available */
  enabled: boolean;
  
  /** Whether this action requires selecting a target */
  requiresTarget?: boolean;
  
  /** Type of target required (if any) */
  targetType?: 'card' | 'player' | 'position';
}

/**
 * Result of game setup process.
 * Contains all information needed to initialize a BigDeckEnergy game instance.
 */
export interface GameSetupResult {
  /** List of players participating in the game */
  players: Participant[];
  
  /** Game-specific options and settings */
  gameOptions: Record<string, any>;
  
  /** Configuration for the deck to be used */
  deckConfiguration: Record<string, any>;
  
  /** Configuration for the ruleset to be used */
  rulesetConfiguration: Record<string, any>;
}

/**
 * Statistics and information about a completed game.
 */
export interface GameStats {
  /** Total number of turns played */
  totalTurns: number;
  
  /** Duration of the game in milliseconds */
  gameDuration: number;
  
  /** Final scores for each player */
  finalScores: Record<string, number>;
  
  /** Additional game-specific statistics */
  customStats: Record<string, any>;
}

/**
 * Result of a completed game.
 */
export interface GameResult {
  /** ID of the winning player */
  winner: string;
  
  /** Reason the game ended */
  endReason: 'win' | 'forfeit' | 'timeout' | 'error';
  
  /** Game statistics */
  stats: GameStats;
}