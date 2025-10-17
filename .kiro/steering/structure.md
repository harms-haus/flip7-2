# Project Structure & Organization

## Root Directory Structure

```
big-deck-energy/
├── src/                    # Source code
├── dist/                   # Built output (generated)
├── tests/                  # Test files
├── examples/               # Example implementations
├── docs/                   # Documentation
├── .kiro/                  # Kiro configuration
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── README.md               # Project documentation
```

## Source Code Organization

```
src/
├── index.ts                # Main library entry point
├── core/                   # Core interfaces and types
│   ├── interfaces/         # All TypeScript interfaces
│   ├── types/              # Type definitions and enums
│   └── errors/             # Custom error classes
├── models/                 # Data models and implementations
│   ├── card.ts             # Card model
│   ├── participant.ts      # Participant model
│   ├── gameboard.ts        # Gameboard model
│   ├── hand.ts             # Hand model
│   └── game-state.ts       # Game state model
├── deck-types/             # Deck type implementations
│   ├── base/               # Base deck type classes
│   ├── standard/           # Standard 52-card deck
│   └── custom/             # Custom deck templates
├── rulesets/               # Ruleset implementations
│   ├── base/               # Base ruleset classes
│   ├── war/                # War card game
│   └── go-fish/            # Go Fish card game
├── engine/                 # Game engine components
│   ├── game-instance.ts    # Game instance manager
│   ├── compatibility.ts    # Compatibility validator
│   ├── serialization.ts    # Serialization engine
│   └── events.ts           # Event system
├── api/                    # Game State API
│   ├── game-state-api.ts   # Main API implementation
│   ├── participant-api.ts  # Participant management
│   ├── hand-api.ts         # Hand management
│   └── gameboard-api.ts    # Gameboard management
└── utils/                  # Utility functions
    ├── shuffling.ts        # Card shuffling algorithms
    ├── validation.ts       # Validation utilities
    └── access-control.ts   # Access control helpers
```

## Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── models/             # Model tests
│   ├── deck-types/         # Deck type tests
│   ├── rulesets/           # Ruleset tests
│   └── engine/             # Engine tests
├── integration/            # Integration tests
│   ├── game-scenarios/     # Complete game tests
│   └── compatibility/      # Compatibility tests
└── examples/               # Example game tests
```

## Key Architectural Principles

### Separation of Concerns
- **Core**: Interfaces and type definitions
- **Models**: Data structures and state management
- **Engine**: Game logic orchestration
- **API**: State manipulation interface
- **Utils**: Shared utility functions

### Interface-Driven Design
- All major components implement well-defined interfaces
- Enables plugin architecture and extensibility
- Facilitates testing with mock implementations

### Immutability
- Cards are immutable once created
- Game state changes through controlled API methods
- Event-driven state tracking for all modifications

### Access Control
- Participant-based visibility rules
- Face-down card protection
- Ownership-based access validation

## Module Dependencies

### Core Dependencies
- `core/` → No internal dependencies (base interfaces)
- `models/` → Depends on `core/interfaces`
- `engine/` → Depends on `models/` and `core/`
- `api/` → Depends on `models/` and `engine/`

### Plugin Dependencies
- `deck-types/` → Depends on `core/interfaces`
- `rulesets/` → Depends on `core/interfaces` and `api/`

### Utility Dependencies
- `utils/` → Minimal dependencies, mostly pure functions

## Naming Conventions

### Files and Directories
- Use kebab-case for file and directory names
- Use descriptive names that indicate purpose
- Group related functionality in directories

### TypeScript Code
- Use PascalCase for interfaces, classes, and types
- Use camelCase for variables, functions, and methods
- Use UPPER_SNAKE_CASE for constants and enums
- Prefix interfaces with 'I' only when needed for disambiguation

### Package Structure
- Export main functionality from `index.ts`
- Use barrel exports for clean public API
- Keep internal implementation details private