/**
 * BigDeckEnergy - A flexible TypeScript card game library
 * 
 * Main library entry point providing the BigDeckEnergy class and all public APIs
 * for creating card games by combining different rulesets with different deck types.
 */

// Export main library class
export { BigDeckEnergy, BigDeckEnergyUtils } from './big-deck-energy';
export type { BigDeckEnergyConfig } from './big-deck-energy';

// Export core interfaces with 'I' prefix to avoid conflicts with model implementations
export type {
  Card as ICard,
  CardDefinition,
  CardPile as ICardPile,
  CardPlacement as ICardPlacement,
  CardInPile,
  CardInPlacement,
  GameState as IGameState,
  Gameboard as IGameboard,
  Hand as IHand,
  Participant as IParticipant
} from './core/interfaces';

// Export other core interfaces without conflicts
export * from './core/interfaces/deck-type';
export * from './core/interfaces/ruleset';
export * from './core/interfaces/events';
export * from './core/interfaces/api';

// Export types and enums
export * from './core/types';

// Export error classes
export * from './core/errors';

// Export model implementations (concrete classes)
export * from './models';

// Export Game State API
export * from './api';

// Export utility functions
export * from './utils';

// Export engine components
export * from './engine';

// Export built-in deck types
export * from './deck-types';

// Export built-in rulesets
export * from './rulesets';

// Default export for convenience
export { BigDeckEnergy as default } from './big-deck-energy';