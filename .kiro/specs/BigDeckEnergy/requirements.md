# Requirements Document

## Introduction

BigDeckEnergy (BDE) is a flexible TypeScript card game library distributed as an npm package that enables developers to create various card games by combining different rulesets with different deck types. The library should support traditional playing card decks (52-card standard deck) as well as custom deck types like those found in Monopoly or other specialized card games.

**Package Name:** `@bigdeckenergy/core` or `big-deck-energy`
**Language:** TypeScript with full type definitions
**Distribution:** npm package with CommonJS and ES Module support

## Glossary

- **BigDeckEnergy**: The main system that provides the framework for building card games
- **BDE**: Short form reference to BigDeckEnergy
- **Ruleset**: A collection of game rules that define how a specific card game is played
- **Deck_Type**: A specific configuration of cards with defined properties, suits, ranks, and behaviors
- **Game_Instance**: A running instance of a card game created by combining a ruleset with a deck type
- **Card**: An individual playing piece with properties defined by its deck type
- **Participant**: An entity that participates in a card game instance, can be a human player or NPC
- **Hand**: A collection of piles and placements belonging to a participant
- **Game_State**: The current condition of all game elements including player hands, deck status, and game progress

## Requirements

### Requirement 1

**User Story:** As a game developer, I want to create card games using different deck types with immutable cards and visual representation, so that I can build diverse card-based games with proper card definitions and visual assets.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL support deck types with face and tail image definitions for visual card representation
2. THE BigDeckEnergy SHALL provide immutable cards with face IDs, tail IDs, and static properties
3. THE BigDeckEnergy SHALL allow deck types to define all cards in the deck with face IDs, tail IDs, and custom properties
4. THE BigDeckEnergy SHALL maintain card immutability throughout game execution
5. THE BigDeckEnergy SHALL provide interfaces for creating new deck types without modifying core library code

### Requirement 2

**User Story:** As a game developer, I want to implement different game rulesets with full game state access and automated game progression, so that I can create various card games with complete control over game flow and state management.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL provide a ruleset interface with setup, gameloop, validate, and wincondition methods that receive full game state
2. THE BigDeckEnergy SHALL allow rulesets to manipulate all aspects of game state through a comprehensive Game State API
3. WHEN a gameloop executes, THE BigDeckEnergy SHALL determine if the game can continue automatically or requires participant interaction
4. THE BigDeckEnergy SHALL provide game state validation with detailed error reporting
5. THE BigDeckEnergy SHALL support win condition checking that identifies winners and end game reasons

### Requirement 3

**User Story:** As a game developer, I want rulesets to define their compatible deck types, so that games can only be created with appropriate deck configurations without mixing incompatible decks.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL allow rulesets to specify one or more compatible deck types during ruleset definition
2. WHEN creating a game instance, THE BigDeckEnergy SHALL validate that the specified deck type is compatible with the ruleset
3. THE BigDeckEnergy SHALL prevent mixing of different deck types within a single game instance
4. THE BigDeckEnergy SHALL maintain separation between ruleset logic and deck type implementation
5. IF an incompatible deck type is attempted, THEN THE BigDeckEnergy SHALL provide specific compatibility error information

### Requirement 4

**User Story:** As a game developer, I want to manage participants and their hands with comprehensive card ownership tracking, so that I can build interactive card games with proper participant management and card ownership systems.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL provide a participant interface for managing players and NPCs with status tracking and multiple hand support
2. THE BigDeckEnergy SHALL provide a hand interface separate from participants that contains piles, placements, and status data
3. THE BigDeckEnergy SHALL track card ownership in piles and placements to identify which participant owns each card
4. THE BigDeckEnergy SHALL allow participants to have zero or more hands, with handless participants considered inactive
5. THE BigDeckEnergy SHALL support ownership transfer of cards between participants through ruleset operations

### Requirement 5

**User Story:** As a game developer, I want extensible card and game mechanics, so that I can implement complex card interactions and special abilities.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL support card-specific behaviors and special abilities as defined by deck types
2. THE BigDeckEnergy SHALL provide event hooks for custom game logic and card interactions
3. WHEN special card abilities are triggered, THE BigDeckEnergy SHALL execute the appropriate behavior
4. THE BigDeckEnergy SHALL allow rulesets to define custom game phases and state transitions
5. WHERE complex interactions occur, THE BigDeckEnergy SHALL resolve them according to ruleset priority definitions
### Req
uirement 6

**User Story:** As a game developer, I want comprehensive state management for gameboards and hands with card state tracking, so that I can build interactive card games with proper state organization and card context management.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL provide a gameboard interface for shared game state with piles, placements, and status data that track card face-up status, orientation, ownership, and custom status
2. THE BigDeckEnergy SHALL store all card gameplay state in piles and placements including face-up status, orientation, ownership, and card-specific status data
3. THE BigDeckEnergy SHALL support game state serialization including all card state data within gameboard and hand containers
4. WHILE a game is in progress, THE BigDeckEnergy SHALL derive all gameplay state from gameboard and participant hands without modifying immutable cards
5. THE BigDeckEnergy SHALL provide methods for updating card ownership, orientation, and status within piles and placements
#
## Requirement 7

**User Story:** As a game developer, I want comprehensive game state management API with access control and event tracking, so that I can build secure card games with proper visibility rules and complete interaction history.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL provide a Game State API that allows rulesets to manipulate participants, hands, gameboards, and card states
2. THE BigDeckEnergy SHALL enforce access control where face-down cards are invisible to non-owning participants
3. THE BigDeckEnergy SHALL automatically track all game state changes as events including ownership transfers and card state changes
4. THE BigDeckEnergy SHALL allow rulesets to define and emit custom event types for game-specific interactions
5. THE BigDeckEnergy SHALL provide utility functions including pile shuffling and card movement between containers

### Requirement 8

**User Story:** As a library user, I want a TypeScript npm package with comprehensive type definitions and JSON serialization support, so that I can integrate BigDeckEnergy into server applications with full type safety and no UI or networking dependencies.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL be implemented as a TypeScript library distributed as an npm package with full type definitions
2. THE BigDeckEnergy SHALL provide CommonJS and ES Module builds for broad compatibility
3. THE BigDeckEnergy SHALL maintain game state in memory with support for JSON serialization and deserialization
4. THE BigDeckEnergy SHALL provide thread-safe operations for concurrent access in server environments
5. THE BigDeckEnergy SHALL have no external dependencies beyond TypeScript/JavaScript runtime features

### Requirement 9

**User Story:** As a game developer, I want backwards-compatible serialization with complete game history tracking and immutable state snapshots, so that I can save and replay entire games while maintaining compatibility across library versions.

#### Acceptance Criteria

1. THE BigDeckEnergy SHALL provide backwards-compatible serialization that anticipates future library versions and maintains compatibility with previous serialized game states
2. THE BigDeckEnergy SHALL create immutable state snapshots for each game state change that cannot be modified once created
3. THE BigDeckEnergy SHALL maintain a complete history of all game states as a linked list of immutable snapshots with action descriptions
4. WHEN any game state change occurs, THE BigDeckEnergy SHALL generate a new immutable state snapshot linked to the previous state with a detailed action description
5. THE BigDeckEnergy SHALL output the complete game history containing all state transitions and action descriptions for every change that occurs during gameplay