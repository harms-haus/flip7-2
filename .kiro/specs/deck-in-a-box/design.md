# Design Document

## Overview

DeckInABox is a command-line interface (TUI) application that provides an interactive terminal-based interface for playing card games built with the BigDeckEnergy library. The application follows a modular architecture that separates game logic (handled by BigDeckEnergy) from presentation logic (handled by DeckInABox), enabling developers to create custom TUI configurations for their card games while leveraging the robust game engine provided by BigDeckEnergy.

The architecture centers around a plugin-based system where Game Configuration Classes define how specific games should be displayed and played in the terminal. This approach enables extensibility while maintaining consistency in the core application framework.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DeckInABox CLI                           │
├─────────────────────────────────────────────────────────────┤
│  Main Menu System  │  Game Discovery  │  Save/Load Manager │
├─────────────────────────────────────────────────────────────┤
│              Game Configuration Classes                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   War Config    │  │ Go Fish Config  │  │ Custom Games │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                  TUI Framework (Ink)                       │
├─────────────────────────────────────────────────────────────┤
│                BigDeckEnergy Library                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Rulesets   │  │ Deck Types  │  │   Game Engine       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: Ink (React-based TUI framework) for declarative UI components
- **Language**: TypeScript for type safety and development experience
- **CLI Framework**: Commander.js for command-line argument parsing
- **Styling**: Chalk for terminal colors and text effects
- **Input Handling**: Ink's useInput hook for keyboard interaction
- **Game Engine**: BigDeckEnergy library for game logic and state management
- **Event System**: Node.js EventEmitter for game state changes and turn management
- **Layout System**: Flexbox-based responsive layouts with dynamic terminal size detection

### Core Components

1. **Application Shell**: Main entry point and CLI argument handling
2. **Game Discovery System**: Automatic detection and loading of game configurations
3. **Main Menu Interface**: Game selection and navigation
4. **Game Configuration Classes**: Plugin system for game-specific UI implementations
5. **TUI Renderer**: Terminal display management and layout
6. **Input Handler**: Keyboard input processing and action mapping
7. **Save/Load System**: Game state persistence and restoration

## Components and Interfaces

### Game Configuration Class Interface

The core extensibility mechanism is the `GameConfiguration` abstract class that developers extend to create custom TUI implementations for their games:

```typescript
abstract class GameConfiguration {
  abstract readonly gameId: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly deckType: string;
  abstract readonly rulesetType: string;
  
  // Game initialization
  abstract setupGame(): Promise<GameSetupResult>;
  abstract validatePlayerCount(count: number): boolean;
  abstract getDefaultPlayerCount(): number;
  
  // UI rendering
  abstract renderGameState(state: GameState, currentPlayer: string): React.ReactElement;
  abstract renderPlayerHand(hand: Hand, isCurrentPlayer: boolean): React.ReactElement;
  abstract renderGameBoard(board: GameBoard): React.ReactElement;
  abstract renderWinScreen(winner: string, gameStats: GameStats): React.ReactElement;
  
  // Input handling
  abstract getAvailableActions(state: GameState, player: string): ActionDefinition[];
  abstract handlePlayerInput(input: string, state: GameState): Promise<GameAction | null>;
  
  // Game flow
  abstract onGameStart(gameInstance: GameInstance): void;
  abstract onGameEnd(gameInstance: GameInstance, result: GameResult): void;
  abstract onTurnChange(gameInstance: GameInstance, newPlayer: string): void;
}
```

### UI Adapter Interface

The UI Adapter provides utility methods that Game Configuration Classes can use to create consistent UI elements:

```typescript
interface UIAdapter {
  // Layout utilities
  createBox(content: React.ReactElement, options: BoxOptions): React.ReactElement;
  createList(items: ListItem[], options: ListOptions): React.ReactElement;
  createTable(data: TableData, options: TableOptions): React.ReactElement;
  
  // Card rendering
  renderCard(card: Card, options: CardRenderOptions): React.ReactElement;
  renderCardBack(options: CardBackOptions): React.ReactElement;
  renderEmptySlot(options: SlotOptions): React.ReactElement;
  
  // Interactive elements
  createActionMenu(actions: ActionDefinition[]): React.ReactElement;
  createPlayerSelector(players: Player[]): React.ReactElement;
  
  // Status and feedback
  showMessage(message: string, type: MessageType): void;
  showProgress(operation: string): void;
  hideProgress(): void;
}
```

### Application State Management

The application uses React hooks for state management with clear separation between application state and game state. The event-driven architecture leverages Node.js EventEmitter for game state changes:

```typescript
interface ApplicationState {
  currentScreen: 'menu' | 'game' | 'loading' | 'error';
  availableGames: GameConfiguration[];
  selectedGame: GameConfiguration | null;
  gameInstance: GameInstance | null;
  players: Player[];
  currentPlayer: string | null;
  gamePhase: GamePhase;
  lastAction: GameAction | null;
  errorMessage: string | null;
  terminalSize: { width: number; height: number };
  isInteractive: boolean;
}
```

### Event-Driven Game Loop

The game loop follows Node.js event-driven patterns for turn-based gameplay:

```typescript
class GameLoop extends EventEmitter {
  private gameInstance: GameInstance;
  private turnTimer?: NodeJS.Timeout;
  
  // Event handlers for game actions
  on(event: 'playerAction', listener: (action: GameAction) => void): this;
  on(event: 'turnChange', listener: (player: string) => void): this;
  on(event: 'gameEnd', listener: (result: GameResult) => void): this;
  on(event: 'stateUpdate', listener: (state: GameState) => void): this;
  
  // Process player actions atomically
  processAction(action: GameAction): boolean {
    if (this.isValidAction(action)) {
      this.gameInstance.applyAction(action);
      this.emit('stateUpdate', this.gameInstance.getState());
      this.checkGameEnd();
      this.nextTurn();
      return true;
    }
    return false;
  }
  
  // Handle turn timeouts (optional)
  startTurnTimer(duration: number): void {
    this.turnTimer = setTimeout(() => {
      this.emit('turnTimeout', this.gameInstance.getCurrentPlayer());
    }, duration);
  }
}
```

### Game Discovery System

The game discovery system automatically detects available Game Configuration Classes through a plugin directory structure:

```
games/
├── war/
│   ├── war-config.ts
│   └── index.ts
├── go-fish/
│   ├── go-fish-config.ts
│   └── index.ts
└── custom/
    └── my-game-config.ts
```

Each game directory exports a Game Configuration Class that the discovery system loads at startup.

## Data Models

### Game Setup Result

```typescript
interface GameSetupResult {
  players: Player[];
  gameOptions: GameOptions;
  deckConfiguration: DeckConfiguration;
  rulesetConfiguration: RulesetConfiguration;
}
```

### Action Definition

```typescript
interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  keyBinding: string;
  enabled: boolean;
  requiresTarget?: boolean;
  targetType?: 'card' | 'player' | 'position';
}
```

### Card Render Options

```typescript
interface CardRenderOptions {
  showFace: boolean;
  highlight: boolean;
  selectable: boolean;
  position?: 'hand' | 'board' | 'deck';
  orientation?: 'up' | 'down' | 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
}
```

### Responsive Layout System

The layout system adapts to different terminal sizes using responsive design principles:

```typescript
interface LayoutConfiguration {
  terminalWidth: number;
  terminalHeight: number;
  minWidth: number;
  minHeight: number;
  breakpoints: {
    small: number;    // < 60 columns
    medium: number;   // 60-100 columns  
    large: number;    // > 100 columns
  };
  areas: {
    playerHandArea: ResponsiveAreaDefinition;
    gameBoardArea: ResponsiveAreaDefinition;
    opponentArea: ResponsiveAreaDefinition;
    statusArea: ResponsiveAreaDefinition;
    actionArea: ResponsiveAreaDefinition;
  };
}

interface ResponsiveAreaDefinition {
  small: AreaDefinition;   // Layout for narrow terminals
  medium: AreaDefinition;  // Layout for medium terminals
  large: AreaDefinition;   // Layout for wide terminals
  flexDirection: 'row' | 'column';
  priority: number;        // Hide lower priority areas when space is limited
}
```

### Terminal Compatibility

The application handles various terminal capabilities gracefully:

```typescript
interface TerminalCapabilities {
  hasColors: boolean;
  hasUnicode: boolean;
  hasMouse: boolean;
  isInteractive: boolean;
  colorDepth: 1 | 4 | 8 | 24;
  width: number;
  height: number;
}

// Graceful degradation strategies
const adaptToTerminal = (capabilities: TerminalCapabilities) => {
  return {
    useColors: capabilities.hasColors,
    useUnicode: capabilities.hasUnicode ? '♠♥♦♣' : 'SHDC',
    cardStyle: capabilities.width > 80 ? 'detailed' : 'compact',
    showHelp: capabilities.isInteractive,
    maxPlayers: Math.min(4, Math.floor(capabilities.height / 8))
  };
};
```

## Error Handling

### Error Categories

1. **Configuration Errors**: Invalid game configurations or missing dependencies
2. **Game Logic Errors**: Violations of game rules or invalid actions
3. **UI Errors**: Terminal rendering issues or input handling failures
4. **Persistence Errors**: Save/load operation failures
5. **Network Errors**: Multiplayer connection issues (future enhancement)

### Error Handling Strategy

- **Graceful Degradation**: Continue operation when possible, falling back to simpler displays
- **User-Friendly Messages**: Convert technical errors to actionable user guidance
- **Error Recovery**: Provide options to retry operations or return to stable states
- **Logging**: Comprehensive error logging for debugging while hiding technical details from users
- **Validation**: Input validation at multiple layers to prevent invalid states

### Error Display

Errors are displayed using consistent UI patterns:
- Critical errors show full-screen error messages with recovery options
- Warning messages appear as temporary overlays that auto-dismiss
- Validation errors highlight problematic inputs with inline messages
- System errors provide options to report issues or restart the application

## Testing Strategy

### Unit Testing

- **Game Configuration Classes**: Test rendering methods with mock game states
- **UI Components**: Test component rendering and prop handling
- **Input Handlers**: Test keyboard input processing and action mapping
- **State Management**: Test state transitions and side effects
- **Utility Functions**: Test helper functions and data transformations

### Integration Testing

- **Game Flow**: Test complete game sessions from start to finish
- **Save/Load**: Test game state persistence and restoration
- **Error Scenarios**: Test error handling and recovery paths
- **Terminal Compatibility**: Test across different terminal emulators
- **BigDeckEnergy Integration**: Test interaction with the game library

### End-to-End Testing

- **User Workflows**: Test complete user journeys through the application
- **Game Scenarios**: Test various game situations and edge cases
- **Performance**: Test responsiveness with large game states
- **Accessibility**: Test keyboard navigation and screen reader compatibility

### Testing Tools

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Component testing utilities
- **Mock Terminal**: Simulated terminal environment for testing
- **Snapshot Testing**: UI regression testing through component snapshots

### Test Data Management

- **Mock Game States**: Predefined game states for consistent testing
- **Test Configurations**: Simplified game configurations for testing
- **Fixture Data**: Sample save files and configuration data
- **Performance Benchmarks**: Baseline measurements for performance testing

## Performance Considerations

### Rendering Optimization

- **Selective Updates**: Only re-render components when their props change
- **Memoization**: Cache expensive computations using React.memo and useMemo
- **Lazy Loading**: Load game configurations only when needed
- **Efficient Layouts**: Minimize terminal redraws through smart layout algorithms

### Memory Management

- **State Cleanup**: Properly dispose of game instances and event listeners
- **Garbage Collection**: Avoid memory leaks through proper object lifecycle management
- **Resource Pooling**: Reuse objects where possible to reduce allocation overhead

### Terminal Performance

- **Batch Updates**: Group multiple state changes into single renders
- **Minimal Redraws**: Calculate minimal changes needed for screen updates
- **Terminal Capabilities**: Adapt rendering complexity to terminal capabilities
- **Responsive Design**: Adjust layout complexity based on terminal size

The design emphasizes modularity, extensibility, and user experience while maintaining clean separation between game logic and presentation concerns. The plugin-based architecture enables developers to create rich, game-specific TUI experiences while leveraging the robust foundation provided by both DeckInABox and BigDeckEnergy.