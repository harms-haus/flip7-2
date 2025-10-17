// Main library entry point

// Export interfaces with 'I' prefix to avoid conflicts with model implementations
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

// Export other interfaces without conflicts
export * from './core/interfaces/deck-type';
export * from './core/interfaces/ruleset';
export * from './core/interfaces/events';
export * from './core/interfaces/api';

// Export types and errors
export * from './core/types';
export * from './core/errors';

// Export model implementations (these will have the same names as interfaces but are concrete classes)
export * from './models';

// Export API and utilities
export * from './api';
export * from './utils';

// Only export from these modules if they have actual exports
export * from './engine';
export * from './deck-types';
// export * from './rulesets';