// Main library exports for programmatic use
export * from './types';
export * from './components/App';
export * from './utils/terminal-detection';
export * from './utils/game-discovery';

// Re-export BigDeckEnergy types that CLI users might need
export type {
  GameState,
  GameInstance,
  Participant,
  Card,
  Hand,
  Gameboard
} from 'big-deck-energy';