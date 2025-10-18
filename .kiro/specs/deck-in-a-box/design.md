# Design Document

## Overview

DeckInABox is a simple command-line validation tool for BigDeckEnergy card games. The application provides a minimal text-based interface for testing BigDeckEnergy game implementations through basic validation sessions. The architecture focuses on simplicity and functionality validation rather than rich user experience.

The design centers around Game Configuration classes that define how to set up BigDeckEnergy games for validation and what actions participants can take during testing. This approach enables systematic validation of different game implementations while maintaining a consistent, simple interface.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DeckInABox CLI                           │
├─────────────────────────────────────────────────────────────┤
│     Main Menu     │  Game Discovery  │  Simple Renderer    │
├─────────────────────────────────────────────────────────────┤
│              Game Configuration Classes                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   War Config    │  │ Go Fish Config  │  │ Custom Games │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                BigDeckEnergy Library                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Rulesets   │  │ Deck Types  │  │   Game Engine       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Language**: TypeScript for type safety and development experience
- **CLI Framework**: Commander.js for command-line argument parsing
- **Input/Output**: Node.js readline for simple text input/output
- **Game Engine**: BigDeckEnergy library for game logic and state management
- **Text Formatting**: Basic console.log and string formatting for output

### Core Components

1. **Application Shell**: Main entry point and CLI argument handling
2. **Game Discovery System**: Automatic detection and loading of game configurations
3. **Main Menu Interface**: Simple text-based game selection
4. **Game Configuration Classes**: Classes that define game setup and available actions
5. **State Renderer**: Simple text output for game state display
6. **Action Handler**: Basic input processing for action selection
7. **Validation Loop**: Simple game loop for validation sessions

## Components and Interfaces

### Game Configuration Class Interface

The core extensibility mechanism is the `GameConfiguration` abstract class that developers extend to define validation configurations for their games:

```typescript
abstract class GameConfiguration {
  abstract readonly gameId: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly deckType: string;
  abstract readonly rulesetType: string;
  
  // Game initialization for validation
  abstract setupValidationGame(): GameSetupResult;
  abstract getPlayerCount(): number;
  
  // Action definitions
  abstract getAvailableActions(gameInstance: GameInstance, participantId: string): ActionDefinition[];
  abstract executeAction(gameInstance: GameInstance, participantId: string, actionId: string): boolean;
  
  // Simple state display
  abstract formatGameState(gameInstance: GameInstance): string;
  abstract formatParticipantHand(gameInstance: GameInstance, participantId: string): string;
  abstract formatGameBoard(gameInstance: GameInstance): string;
}
```

### State Renderer Interface

The State Renderer provides simple text formatting utilities for displaying game state:

```typescript
interface StateRenderer {
  // Game state formatting
  formatGameBoard(piles: Pile[], placements: Placement[]): string;
  formatParticipantHand(piles: Pile[], placements: Placement[]): string;
  formatPileCount(pile: Pile): string;
  formatCurrentParticipant(participantId: string): string;
  
  // Action formatting
  formatActionList(actions: ActionDefinition[]): string;
  formatActionPrompt(): string;
  
  // Status formatting
  formatGameStatus(phase: GamePhase, winner?: string): string;
  formatErrorMessage(error: string): string;
}
```

### Application State Management

The application uses simple state management with clear separation between application state and game state:

```typescript
interface ApplicationState {
  currentScreen: 'menu' | 'validation' | 'error';
  availableGames: GameConfiguration[];
  selectedGame: GameConfiguration | null;
  gameInstance: GameInstance | null;
  currentParticipant: string | null;
  gamePhase: GamePhase;
  errorMessage: string | null;
  isRunning: boolean;
}
```

### Simple Validation Loop

The validation loop follows a simple synchronous pattern for turn-based validation:

```typescript
class ValidationLoop {
  private gameInstance: GameInstance;
  private gameConfiguration: GameConfiguration;
  private stateRenderer: StateRenderer;
  
  // Run validation session
  async runValidation(): Promise<void> {
    while (!this.gameInstance.isGameOver()) {
      this.displayCurrentState();
      const currentParticipant = this.gameInstance.getCurrentParticipant();
      const actions = this.gameConfiguration.getAvailableActions(this.gameInstance, currentParticipant);
      
      if (actions.length === 0) {
        console.log('No actions available, ending turn...');
        this.gameInstance.endTurn();
        continue;
      }
      
      const selectedAction = await this.promptForAction(actions);
      const success = this.gameConfiguration.executeAction(this.gameInstance, currentParticipant, selectedAction);
      
      if (!success) {
        console.log('Action failed, please try again.');
      }
    }
    
    this.displayFinalState();
  }
  
  private displayCurrentState(): void {
    console.clear();
    console.log(this.gameConfiguration.formatGameState(this.gameInstance));
  }
  
  private async promptForAction(actions: ActionDefinition[]): Promise<string> {
    console.log(this.stateRenderer.formatActionList(actions));
    // Simple readline input handling
    return await this.getInput();
  }
}
```

### Game Discovery System

The game discovery system automatically detects available Game Configuration Classes through a simple directory structure:

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
  participantCount: number;
  deckType: string;
  rulesetType: string;
  gameOptions?: Record<string, any>;
}
```

### Action Definition

```typescript
interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}
```

### Validation Session State

```typescript
interface ValidationSessionState {
  gameInstance: GameInstance;
  currentParticipant: string;
  gamePhase: GamePhase;
  isGameOver: boolean;
  winner?: string;
}
```

## Error Handling

### Error Categories

1. **Configuration Errors**: Invalid game configurations or missing dependencies
2. **Game Logic Errors**: Violations of game rules or invalid actions
3. **Input Errors**: Invalid user input or action selection
4. **BigDeckEnergy Errors**: Errors from the underlying game library

### Error Handling Strategy

- **Simple Error Messages**: Display clear, actionable error messages
- **Graceful Recovery**: Return to previous state when errors occur
- **Input Validation**: Validate user input before processing actions
- **Error Logging**: Log errors for debugging while showing simple messages to users

### Error Display

Errors are displayed as simple text messages:
- Critical errors show error message and return to main menu
- Action errors show error message and prompt for new action
- Input errors show validation message and re-prompt for input

## Testing Strategy

### Unit Testing

- **Game Configuration Classes**: Test action definitions and game setup with mock game states
- **State Renderer**: Test text formatting functions
- **Action Handler**: Test input processing and action execution
- **Validation Loop**: Test game loop logic and state transitions
- **Utility Functions**: Test helper functions and data transformations

### Integration Testing

- **Game Flow**: Test complete validation sessions from start to finish
- **Error Scenarios**: Test error handling and recovery paths
- **BigDeckEnergy Integration**: Test interaction with the game library
- **Game Discovery**: Test automatic loading of game configurations

### Testing Tools

- **Jest**: Unit and integration testing framework
- **Mock Console**: Simulated console environment for testing
- **Test Game Configurations**: Simplified game configurations for testing

### Test Data Management

- **Mock Game States**: Predefined game states for consistent testing
- **Test Configurations**: Simplified game configurations for testing
- **Fixture Data**: Sample game data and configurations

The design emphasizes simplicity and functionality validation while maintaining clean separation between game logic and presentation concerns. The configuration-based architecture enables developers to create validation scenarios for their BigDeckEnergy games while leveraging a consistent, minimal interface.