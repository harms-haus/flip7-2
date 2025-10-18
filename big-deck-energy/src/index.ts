/**
 * BigDeckEnergy - A flexible TypeScript card game library
 * 
 * Main library entry point providing the BigDeckEnergy class and all public APIs
 * for creating card games by combining different rulesets with different deck types.
 */

// Export main library class
export { BigDeckEnergy, BigDeckEnergyUtils } from './big-deck-energy.js';
export type { BigDeckEnergyConfig } from './big-deck-energy.js';

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
} from './core/interfaces/index.js';

// Export other core interfaces without conflicts
export * from './core/interfaces/deck-type.js';
export * from './core/interfaces/ruleset.js';
export * from './core/interfaces/events.js';
export * from './core/interfaces/api.js';

// Export types and enums
export * from './core/types/index.js';

// Export error classes
export * from './core/errors/index.js';

// Export model implementations (concrete classes)
export * from './models/index.js';

// Export Game State API
export * from './api/index.js';

// Export utility functions
export * from './utils/index.js';

// Export engine components
export * from './engine/index.js';

// Export built-in deck types
export * from './deck-types/index.js';

// Export built-in rulesets
export * from './rulesets/index.js';

// Default export for convenience
export { BigDeckEnergy as default } from './big-deck-energy.js';