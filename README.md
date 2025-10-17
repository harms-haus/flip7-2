# BigDeckEnergy

A flexible TypeScript card game library for creating various card games by combining different rulesets with different deck types.

[![npm version](https://badge.fury.io/js/big-deck-energy.svg)](https://badge.fury.io/js/big-deck-energy)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎮 **Flexible Architecture**: Plugin-based system for deck types and rulesets
- 🔒 **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🎯 **Immutable Cards**: Cards have static properties and cannot be modified during gameplay
- 🖼️ **Visual Support**: Cards include face and tail image definitions for UI integration
- ✅ **Compatibility Validation**: Prevents mixing incompatible deck types with rulesets
- 📊 **State Management**: Comprehensive tracking of card ownership, orientation, and status
- 📝 **Event System**: Automatic tracking of all game state changes with custom event support
- 🔐 **Access Control**: Face-down cards are invisible to non-owning participants
- 💾 **Serialization**: Full game state can be serialized for save/load functionality
- 🧪 **Developer Tools**: Built-in validation and debugging utilities

## Installation

```bash
npm install big-deck-energy
```

## Quick Start

### Creating a Simple Game

```typescript
import { BigDeckEnergy } from 'big-deck-energy';

// Get the library instance
const bde = BigDeckEnergy.getInstance();

// Create a quick game with built-in components
const result = await bde.createQuickGame('my-war-game', 'war', 'standard');

if (result.success) {
  const game = result.gameInstance!;
  
  // Initialize the game
  game.initialize();
  
  // Create participants
  game.createParticipant('player1', 'Alice');
  game.createParticipant('player2', 'Bob');
  
  // Create hands for participants
  game.createHand('hand1', 'Alice Hand', 'player1');
  game.createHand('hand2', 'Bob Hand', 'player2');
  
  // Execute game loop
  const loopResult = game.executeGameLoop();
  console.log('Game can continue:', loopResult.canContinue);
}
```

### Using Custom Components

```typescript
import { BigDeckEnergy, BaseDeckType, BaseRuleset } from 'big-deck-energy';

// Create a custom deck type
class MyCustomDeck extends BaseDeckType {
  constructor() {
    const faces = new Map([
      ['red', '/images/red-card.png'],
      ['blue', '/images/blue-card.png']
    ]);
    
    const tails = new Map([
      ['back', '/images/card-back.png']
    ]);
    
    const cards = [
      { id: 'red-1', faceId: 'red', tailId: 'back', properties: { color: 'red', value: 1 } },
      { id: 'blue-1', faceId: 'blue', tailId: 'back', properties: { color: 'blue', value: 1 } }
    ];
    
    super('my-custom-deck', faces, tails, cards);
  }
}

// Create a custom ruleset
class MyCustomRules extends BaseRuleset {
  constructor() {
    super('my-rules', 2, 4, ['my-custom-deck']);
  }

  setup(gameState, deckType) {
    // Custom setup logic
    return gameState;
  }

  gameloop(gameState) {
    // Custom game loop logic
    return {
      canContinue: true,
      updatedGameState: gameState,
      requiresParticipantInteraction: false
    };
  }

  validate(gameState) {
    // Custom validation logic
    return [];
  }

  wincondition(gameState) {
    // Custom win condition logic
    return { gameEnded: false, winners: [], reason: '' };
  }
}

// Register and use custom components
const bde = BigDeckEnergy.getInstance();
bde.registerDeckType('my-custom-deck', new MyCustomDeck());
bde.registerRuleset('my-rules', new MyCustomRules());

const customGame = await bde.createGame({
  gameId: 'custom-game',
  ruleset: bde.getRuleset('my-rules')!,
  deckType: bde.getDeckType('my-custom-deck')!
});
```

## Built-in Components

### Deck Types

- **standard**: Standard 52-card playing deck with suits and ranks
- **custom**: Customizable deck type for developer-defined cards
- **monopoly-property**: Monopoly-style property cards with special abilities

### Rulesets

- **war**: Simple War card game for 2 players
- **go-fish**: Classic Go Fish card game for 2-6 players

## API Reference

### BigDeckEnergy Class

The main library class providing factory methods and component registration.

#### Static Methods

- `getInstance(config?)`: Get singleton instance
- `create(config?)`: Create new instance

#### Instance Methods

- `createGame(config)`: Create game with custom components
- `createQuickGame(gameId, ruleset, deckType, metadata?)`: Create game with built-in components
- `registerDeckType(name, deckType, metadata?)`: Register custom deck type
- `registerRuleset(name, ruleset, metadata?)`: Register custom ruleset
- `getDeckType(name)`: Get registered deck type
- `getRuleset(name)`: Get registered ruleset
- `validateCompatibility(rulesetName, deckTypeName)`: Check compatibility
- `findCompatibleDeckTypes(rulesetName)`: Find compatible deck types
- `findCompatibleRulesets(deckTypeName)`: Find compatible rulesets

### Game Instance

Represents a running game with state management and lifecycle methods.

#### Key Methods

- `initialize()`: Initialize the game with ruleset setup
- `createParticipant(id, name, isNPC?)`: Add participant to game
- `createHand(id, name, participantId)`: Create hand for participant
- `executeGameLoop()`: Run one iteration of game loop
- `validateGameState()`: Validate current game state
- `checkWinConditions()`: Check if game has ended
- `processAction(action)`: Process participant action

### Developer Utilities

Tools for validating and debugging custom implementations.

```typescript
import { DeveloperUtilities, DebugUtilities } from 'big-deck-energy';

// Validate custom deck type
const deckValidation = DeveloperUtilities.validateDeckType(myDeck);
console.log('Deck is valid:', deckValidation.isValid);

// Validate custom ruleset
const rulesetValidation = DeveloperUtilities.validateRuleset(myRuleset);
console.log('Ruleset is valid:', rulesetValidation.isValid);

// Enable debug logging
DebugUtilities.setDebugEnabled(true);
DebugUtilities.info('Debug message');

// Performance timing
const timer = DebugUtilities.startTimer('operation');
// ... do work ...
const duration = timer.stop();
```

## Architecture

BigDeckEnergy follows a modular architecture with clear separation of concerns:

- **Deck Types**: Define cards, their properties, and visual assets
- **Rulesets**: Define game logic, win conditions, and player interactions
- **Game State**: Manages participants, hands, gameboards, and card ownership
- **Compatibility System**: Ensures rulesets and deck types work together
- **Event System**: Tracks all game state changes automatically
- **Serialization**: Enables save/load functionality

## TypeScript Support

BigDeckEnergy is written in TypeScript and provides comprehensive type definitions:

```typescript
import type { 
  DeckType, 
  Ruleset, 
  GameState, 
  GameInstance,
  ValidationResult 
} from 'big-deck-energy';
```

## Package Exports

The library provides both CommonJS and ES Module builds:

```javascript
// CommonJS
const { BigDeckEnergy } = require('big-deck-energy');

// ES Modules
import { BigDeckEnergy } from 'big-deck-energy';
```

## Development

### Building

```bash
npm run build          # Build all formats
npm run build:cjs      # Build CommonJS
npm run build:esm      # Build ES Modules
npm run build:types    # Build TypeScript declarations
```

### Testing

```bash
npm run tests          # Run all tests
npm run tests:coverage # Run tests with coverage
```

### Linting and Formatting

```bash
npm run lint           # Check code style
npm run lint:fix       # Fix code style issues
npm run format         # Format code with Prettier
```

## Examples

### War Card Game

```typescript
const result = await bde.createQuickGame('war-game', 'war', 'standard');
const game = result.gameInstance!;

game.initialize();
game.createParticipant('player1', 'Alice');
game.createParticipant('player2', 'Bob');

// Game automatically handles card dealing and gameplay
while (!game.isGameFinished()) {
  const loopResult = game.executeGameLoop();
  if (!loopResult.canContinue) break;
}

const winResult = game.checkWinConditions();
console.log('Winners:', winResult.winners);
```

### Go Fish Card Game

```typescript
const result = await bde.createQuickGame('go-fish-game', 'go-fish', 'standard');
const game = result.gameInstance!;

game.initialize();
for (let i = 1; i <= 4; i++) {
  game.createParticipant(`player${i}`, `Player ${i}`);
}

// Go Fish supports 2-6 players with interactive gameplay
const loopResult = game.executeGameLoop();
if (loopResult.requiresParticipantInteraction) {
  // Handle player input for asking for cards
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/bigdeckenergy/big-deck-energy#readme)
- 🐛 [Issue Tracker](https://github.com/bigdeckenergy/big-deck-energy/issues)
- 💬 [Discussions](https://github.com/bigdeckenergy/big-deck-energy/discussions)

---

Made with ❤️ by the BigDeckEnergy team