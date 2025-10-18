import { GameInstance, Participant } from 'big-deck-energy';
import { GameConfiguration } from './game-configuration';

/**
 * Possible screens in the application.
 */
export type ApplicationScreen = 'menu' | 'game' | 'loading' | 'error';

/**
 * Game phases during gameplay.
 */
export type GamePhase = 'setup' | 'playing' | 'ended' | 'paused';

/**
 * Complete application state managed by React hooks.
 * Separates application state from game state for clean architecture.
 */
export interface ApplicationState {
  /** Current screen being displayed */
  currentScreen: ApplicationScreen;
  
  /** List of available game configurations */
  availableGames: GameConfiguration[];
  
  /** Currently selected game configuration */
  selectedGame: GameConfiguration | null;
  
  /** Active BigDeckEnergy game instance */
  gameInstance: GameInstance | null;
  
  /** List of players in the current game */
  players: Participant[];
  
  /** ID of the current active player */
  currentPlayer: string | null;
  
  /** Current phase of the game */
  gamePhase: GamePhase;
  
  /** Last action performed in the game */
  lastAction: any | null;
  
  /** Current error message (if any) */
  errorMessage: string | null;
  
  /** Current terminal dimensions */
  terminalSize: {
    width: number;
    height: number;
  };
  
  /** Whether the terminal supports interactive input */
  isInteractive: boolean;
  
  /** Whether the application is in debug mode */
  debugMode: boolean;
  
  /** Application settings and preferences */
  settings: ApplicationSettings;
}

/**
 * User preferences and application settings.
 */
export interface ApplicationSettings {
  /** Whether to show help hints */
  showHints: boolean;
  
  /** Whether to use colors in the terminal */
  useColors: boolean;
  
  /** Whether to use Unicode characters */
  useUnicode: boolean;
  
  /** Color theme to use */
  theme: string;
  
  /** Default save directory for game files */
  saveDirectory: string;
  
  /** Whether to auto-save games */
  autoSave: boolean;
  
  /** Auto-save interval in minutes */
  autoSaveInterval: number;
  
  /** Recently played games */
  recentGames: string[];
  
  /** Maximum number of recent games to remember */
  maxRecentGames: number;
}