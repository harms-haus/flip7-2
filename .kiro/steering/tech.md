# Technology Stack & Build System

## Core Technologies

- **Language**: TypeScript 5.0+
- **Target**: ES2020+ with CommonJS and ES Module builds
- **Runtime**: Node.js (no browser-specific dependencies)
- **Package Manager**: npm
- **Distribution**: npm package with full type definitions

## Build System

### TypeScript Configuration
- Target ES2020+ for modern JavaScript features
- Strict type checking enabled
- Generate both CommonJS and ES Module outputs
- Include full TypeScript declaration files (.d.ts)

### Package Structure
```
dist/
├── cjs/          # CommonJS build
├── esm/          # ES Module build
└── types/        # TypeScript declarations
```

### Development Tools
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Testing**: Jest or Vitest for unit and integration tests
- **Type Checking**: TypeScript compiler (tsc)

## Common Commands

### Development
```bash
npm run dev          # Watch mode compilation
npm run build        # Production build (both CJS and ESM)
npm run type-check   # TypeScript type checking
npm run lint         # ESLint checking
npm run format       # Prettier formatting
```

### Testing
```bash
npm tests             # Run all tests
npm run tests:unit    # Unit tests only
npm run tests:integration  # Integration tests
npm run tests:coverage     # Test coverage report
```

### Package Management
```bash
npm run clean        # Clean build artifacts
npm run prepublish   # Pre-publish validation
npm publish          # Publish to npm registry
```

## Architecture Patterns

- **Strategy Pattern**: Rulesets and deck types implement common interfaces
- **Observer Pattern**: Event system for game state changes
- **Factory Pattern**: Game instance creation with validation
- **Plugin Architecture**: Runtime loading of rulesets and deck types
- **Composition over Inheritance**: Flexible component combination

## Key Dependencies

- **Runtime**: None (pure TypeScript/JavaScript)
- **Development**: TypeScript, ESLint, Prettier, testing framework
- **Build**: TypeScript compiler, bundling tools if needed

## Performance Considerations

- Lazy loading of deck types and rulesets
- Efficient shuffling algorithms (Fisher-Yates)
- Minimal object creation during gameplay
- Thread-safe operations for concurrent access
- Optimized state comparison for change detection