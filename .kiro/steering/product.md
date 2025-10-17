# BigDeckEnergy Product Overview

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

## Target Use Cases

- Server-side card game implementations
- Game logic libraries for web/mobile applications
- Educational card game development
- Custom card game prototyping
- Multi-player card game backends

## Package Information

- **Package Name**: `big-deck-energy` (or `@bigdeckenergy/core`)
- **Language**: TypeScript 5.0+
- **Distribution**: npm package with CommonJS and ES Module support
- **Dependencies**: None (pure TypeScript/JavaScript runtime)