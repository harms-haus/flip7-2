# BigDeckEnergy

A flexible TypeScript card game library for creating various card games by combining different rulesets with different deck types.

## Overview

BigDeckEnergy (BDE) is a flexible TypeScript card game library distributed as an npm package that enables developers to create various card games by combining different rulesets with different deck types.

## Core Concept

The library separates concerns between:
- **Deck Types**: Define cards, their properties, and visual assets (face/tail images)
- **Rulesets**: Define game logic, win conditions, and player interactions
- **Game State**: Manages participants, hands, gameboards, and card ownership

## Key Features

- **Immutable Cards**: Cards have static properties and cannot be modified during gameplay
- **Visual Support**: Cards include face and tail image definitions for UI integration
- **Flexible Architecture**: Plugin-based system allowing independent development of deck types and rulesets
- **Compatibility Validation**: Prevents mixing incompatible deck types with rulesets
- **Comprehensive State Management**: Tracks card ownership, orientation, face-up status, and custom properties
- **Event System**: Automatic tracking of all game state changes with custom event support
- **Access Control**: Face-down cards are invisible to non-owning participants
- **JSON Serialization**: Full game state can be serialized for save/load functionality

## Installation

```bash
npm install big-deck-energy
```

## Quick Start

```typescript
import { BigDeckEnergy } from 'big-deck-energy';

// Create a game instance
const game = new BigDeckEnergy();

// Add participants
game.addParticipant('player1');
game.addParticipant('player2');

// Start your game logic here
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm run tests

# Development mode
npm run dev
```

## License

MIT