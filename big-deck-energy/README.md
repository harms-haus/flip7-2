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
- **Party System**: Optional team-based gameplay with shared resources and status tracking
- **JSON Serialization**: Full game state can be serialized for save/load functionality

## Installation

```bash
npm install big-deck-energy
```

## Quick Start

```typescript
import { BigDeckEnergy } from 'big-deck-energy';
import { WarRuleset } from 'big-deck-energy/rulesets';
import { StandardPlayingDeck } from 'big-deck-energy/deck-types';

// Get BigDeckEnergy singleton instance
const bde = BigDeckEnergy.getInstance();

// Register ruleset and deck type
bde.registerRuleset(new WarRuleset());
bde.registerDeckType(new StandardPlayingDeck());

// Create a game instance
const gameInstance = bde.createGame('war', 'standard-playing-deck');

// Add participants
gameInstance.addParticipant('player1', 'Alice', false);
gameInstance.addParticipant('player2', 'Bob', false);

// Start the game
gameInstance.startGame();

// Game loop
while (!gameInstance.checkWinCondition().gameEnded) {
  const result = gameInstance.executeGameLoop();
  if (!result.canContinue) break;
}
```

## Party System (Team-Based Games)

BigDeckEnergy includes an optional party system that enables team-based card games where multiple participants work together as teams with shared resources and status.

### Party Features

- **Team Formation**: Group participants into parties (teams)
- **Shared Resources**: Parties have their own piles and placements separate from individual hands
- **Team Status**: Track team-specific information like scores, wins, and custom data
- **Access Control**: Party members have shared access to party resources
- **Team Communication**: Built-in support for team information sharing

### Creating Team-Based Games

```typescript
import { BigDeckEnergy } from 'big-deck-energy';
import { TeamHeartsRuleset } from 'big-deck-energy/rulesets';
import { StandardPlayingDeck } from 'big-deck-energy/deck-types';

const bde = BigDeckEnergy.getInstance();
bde.registerRuleset(new TeamHeartsRuleset());
bde.registerDeckType(new StandardPlayingDeck());

const gameInstance = bde.createGame('team-hearts', 'standard-playing-deck');

// Add 4 players
gameInstance.addParticipant('alice', 'Alice', false);
gameInstance.addParticipant('bob', 'Bob', false);
gameInstance.addParticipant('charlie', 'Charlie', false);
gameInstance.addParticipant('diana', 'Diana', false);

// Start game (teams are created automatically by the ruleset)
gameInstance.startGame();

// Access team information
const api = gameInstance.getGameStateAPI();
const gameState = gameInstance.getGameState();

// Check team membership
for (const [participantId, participant] of gameState.participants) {
  if (participant.partyId) {
    const party = gameState.parties.get(participant.partyId);
    console.log(`${participant.name} is on team: ${party?.name}`);
  }
}
```

### Party API Methods

The Game State API provides comprehensive methods for party management:

#### Party Creation and Management
```typescript
// Create a party
api.createParty('team1', 'Team Alpha');

// Add participants to party
api.addParticipantToParty('player1', 'team1');
api.addParticipantToParty('player2', 'team1');

// Remove participant from party
api.removeParticipantFromParty('player1');

// Update party status
api.updatePartyStatus('team1', 'score', 100);
api.updatePartyStatus('team1', 'wins', 5);
```

#### Party Resources
```typescript
// Create party piles and placements
api.createPartyPile('team1', 'shared_cards', true);
api.setPartyPlacement('team1', 'team_card', someCard, true);

// Add cards to party pile
api.addCardToPartyPile('team1', 'shared_cards', card, true, 'player1');

// Remove cards from party pile
const removedCard = api.removeCardFromPartyPile('team1', 'shared_cards', 0);
```

#### Access Control
```typescript
// Check if participant can access party resources
const canAccess = api.canAccessPile('player1', 'party', 'shared_cards', 'team1');

// Get visible cards for party member
const visibleCards = api.getVisibleCards('player1', 'party', 'shared_cards', 'team1');
```

### Party Access Control Rules

1. **Party Membership**: Only party members can access party resources
2. **Shared Access**: All party members have equal access to party piles and placements
3. **Visibility Rules**: Face-down cards in party piles follow standard visibility rules
4. **Non-Members**: Participants not in a party cannot access any party resources

### Team Communication Example

```typescript
// Process team communication action
gameInstance.processAction({
  type: 'share_team_info',
  participantId: 'alice',
  data: {
    message: 'I have the Queen of Spades, be careful!',
    targetTeammate: 'charlie'
  }
});

// Access team communications
const party = gameState.parties.get('team_north_south');
const communications = party?.status.communications || [];
console.log('Team communications:', communications);
```

### Example: Team Hearts Implementation

The library includes a complete Team Hearts implementation that demonstrates all party system features:

```typescript
import { TeamHeartsRuleset } from 'big-deck-energy/rulesets';

const ruleset = new TeamHeartsRuleset();

// Get team information for a player
const teamInfo = ruleset.getTeamInfo(gameState, 'alice');
console.log('Team:', teamInfo.teamName);
console.log('Teammates:', teamInfo.teammates);
console.log('Score:', teamInfo.score);

// Get current trick information
const trickInfo = ruleset.getCurrentTrick(gameState);
console.log('Cards in trick:', trickInfo.cards.length);
console.log('Trick leader:', trickInfo.leader);
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