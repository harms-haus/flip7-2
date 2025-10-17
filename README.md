# BigDeckEnergy

A flexible TypeScript card game library for creating various card games by combining different rulesets with different deck types.

## Features

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

## Usage

```typescript
import { BigDeckEnergy } from 'big-deck-energy';

// Example usage will be added as the library is implemented
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## License

MIT