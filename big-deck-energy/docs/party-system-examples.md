# Party System Usage Examples

This document provides practical examples of using the BigDeckEnergy party system in different game scenarios.

## Example 1: Basic Team Formation

Creating teams and assigning players:

```typescript
import { BigDeckEnergy } from 'big-deck-energy';

const bde = BigDeckEnergy.getInstance();
const gameInstance = bde.createGame('my-team-game', 'standard-playing-deck');

// Add 4 players
gameInstance.addParticipant('alice', 'Alice', false);
gameInstance.addParticipant('bob', 'Bob', false);
gameInstance.addParticipant('charlie', 'Charlie', false);
gameInstance.addParticipant('diana', 'Diana', false);

const api = gameInstance.getGameStateAPI();

// Create two teams
api.createParty('team_red', 'Red Team');
api.createParty('team_blue', 'Blue Team');

// Assign players to teams
api.addParticipantToParty('alice', 'team_red');
api.addParticipantToParty('charlie', 'team_red');
api.addParticipantToParty('bob', 'team_blue');
api.addParticipantToParty('diana', 'team_blue');

// Initialize team scores
api.updatePartyStatus('team_red', 'score', 0);
api.updatePartyStatus('team_blue', 'score', 0);
```

## Example 2: Shared Team Resources

Setting up shared card storage for teams:

```typescript
// Create shared piles for each team
api.createPartyPile('team_red', 'captured_cards', true);
api.createPartyPile('team_red', 'special_cards', false);
api.createPartyPile('team_blue', 'captured_cards', true);
api.createPartyPile('team_blue', 'special_cards', false);

// Create team placements for special cards
api.setPartyPlacement('team_red', 'trump_card', null);
api.setPartyPlacement('team_blue', 'trump_card', null);

// Add cards to team piles
const capturedCard = someCard; // Card won by the team
api.addCardToPartyPile('team_red', 'captured_cards', capturedCard, false, 'alice');

// Set a special card for the team
const trumpCard = someSpecialCard;
api.setPartyPlacement('team_red', 'trump_card', trumpCard, true, 'charlie');
```

## Example 3: Team Communication System

Implementing team chat and information sharing:

```typescript
// Custom action for team communication
interface TeamCommunicationAction {
  type: 'team_message';
  participantId: string;
  data: {
    message: string;
    messageType: 'strategy' | 'info' | 'warning';
    targetTeammate?: string; // Optional specific teammate
  };
}

// Process team communication
function processTeamCommunication(api: GameStateAPI, action: TeamCommunicationAction) {
  const participant = api.getParticipant(action.participantId);
  if (!participant || !participant.partyId) {
    return; // Player not in a team
  }

  const party = api.getParty(participant.partyId);
  if (!party) return;

  // Add message to team communications
  const communications = party.status.communications || [];
  communications.push({
    from: action.participantId,
    to: action.data.targetTeammate || 'team',
    message: action.data.message,
    type: action.data.messageType,
    timestamp: Date.now()
  });

  api.updatePartyStatus(participant.partyId, 'communications', communications);
}

// Usage
processTeamCommunication(api, {
  type: 'team_message',
  participantId: 'alice',
  data: {
    message: 'I have the ace of spades, should I play it?',
    messageType: 'strategy',
    targetTeammate: 'charlie'
  }
});
```

## Example 4: Team Scoring and Win Conditions

Implementing team-based scoring:

```typescript
function updateTeamScore(api: GameStateAPI, teamId: string, points: number) {
  const party = api.getParty(teamId);
  if (!party) return;

  const currentScore = party.status.score || 0;
  const newScore = currentScore + points;
  
  api.updatePartyStatus(teamId, 'score', newScore);
  api.updatePartyStatus(teamId, 'lastScoredBy', points > 0 ? 'team' : null);
  
  // Track scoring history
  const scoreHistory = party.status.scoreHistory || [];
  scoreHistory.push({
    points,
    newTotal: newScore,
    timestamp: Date.now()
  });
  api.updatePartyStatus(teamId, 'scoreHistory', scoreHistory);
}

function checkTeamWinCondition(gameState: GameState): { winner: string | null, reason: string } {
  const targetScore = 500;
  
  for (const [partyId, party] of gameState.parties) {
    const score = party.status.score || 0;
    if (score >= targetScore) {
      return {
        winner: partyId,
        reason: `${party.name} reached ${targetScore} points with ${score} points`
      };
    }
  }
  
  return { winner: null, reason: '' };
}
```

## Example 5: Access Control and Visibility

Implementing proper access control for team resources:

```typescript
function getTeamVisibleCards(api: GameStateAPI, participantId: string, teamId: string): any {
  // Check if participant is on the team
  if (!api.canAccessPile(participantId, 'party', 'captured_cards', teamId)) {
    throw new Error('Access denied: Not a team member');
  }

  const party = api.getParty(teamId);
  if (!party) return null;

  return {
    capturedCards: api.getVisibleCards(participantId, 'party', 'captured_cards', teamId),
    specialCards: api.getVisibleCards(participantId, 'party', 'special_cards', teamId),
    trumpCard: api.getPartyPlacement(teamId, 'trump_card'),
    teamStatus: {
      score: party.status.score || 0,
      memberCount: party.participantIds.length,
      communications: party.status.communications || []
    }
  };
}

// Safe access pattern
function displayTeamInfo(api: GameStateAPI, participantId: string) {
  const participant = api.getParticipant(participantId);
  if (!participant || !participant.partyId) {
    console.log('Player is not on a team');
    return;
  }

  try {
    const teamInfo = getTeamVisibleCards(api, participantId, participant.partyId);
    console.log('Team Info:', teamInfo);
  } catch (error) {
    console.error('Cannot access team information:', error.message);
  }
}
```

## Example 6: Dynamic Team Management

Handling team changes during gameplay:

```typescript
function switchPlayerTeam(api: GameStateAPI, participantId: string, newTeamId: string) {
  const participant = api.getParticipant(participantId);
  if (!participant) return;

  const oldTeamId = participant.partyId;
  
  // Remove from old team
  if (oldTeamId) {
    api.removeParticipantFromParty(participantId);
    
    // Update old team status
    const oldParty = api.getParty(oldTeamId);
    if (oldParty) {
      const memberCount = oldParty.participantIds.length;
      api.updatePartyStatus(oldTeamId, 'memberCount', memberCount);
    }
  }

  // Add to new team
  api.addParticipantToParty(participantId, newTeamId);
  
  // Update new team status
  const newParty = api.getParty(newTeamId);
  if (newParty) {
    const memberCount = newParty.participantIds.length;
    api.updatePartyStatus(newTeamId, 'memberCount', memberCount);
    
    // Welcome message
    const communications = newParty.status.communications || [];
    communications.push({
      from: 'system',
      to: 'team',
      message: `${participant.name} joined the team!`,
      type: 'info',
      timestamp: Date.now()
    });
    api.updatePartyStatus(newTeamId, 'communications', communications);
  }
}
```

## Example 7: Team-Based Card Movement

Moving cards between individual hands and team resources:

```typescript
function contributeCardToTeam(api: GameStateAPI, participantId: string, cardIndex: number) {
  const participant = api.getParticipant(participantId);
  if (!participant || !participant.partyId) {
    throw new Error('Player is not on a team');
  }

  const handId = `${participantId}_hand`;
  const hand = api.getGameState().hands.get(handId);
  if (!hand) {
    throw new Error('Player hand not found');
  }

  const cardsPile = hand.piles.get('cards');
  if (!cardsPile || cardIndex >= cardsPile.cards.length) {
    throw new Error('Invalid card index');
  }

  // Move card from player hand to team pile
  api.moveCard(
    handId,           // from location (player hand)
    'cards',          // from pile
    cardIndex,        // card index
    'party',          // to location (party)
    'shared_cards',   // to pile
    undefined,        // from location ID (not needed for hands)
    participant.partyId // to location ID (party ID)
  );

  // Update team status
  const party = api.getParty(participant.partyId);
  if (party) {
    const contributions = party.status.contributions || {};
    contributions[participantId] = (contributions[participantId] || 0) + 1;
    api.updatePartyStatus(participant.partyId, 'contributions', contributions);
  }
}

function takeCardFromTeam(api: GameStateAPI, participantId: string, cardIndex: number) {
  const participant = api.getParticipant(participantId);
  if (!participant || !participant.partyId) {
    throw new Error('Player is not on a team');
  }

  // Check if player can access team resources
  if (!api.canAccessPile(participantId, 'party', 'shared_cards', participant.partyId)) {
    throw new Error('Access denied to team resources');
  }

  const handId = `${participantId}_hand`;
  
  // Move card from team pile to player hand
  api.moveCard(
    'party',          // from location (party)
    'shared_cards',   // from pile
    cardIndex,        // card index
    handId,           // to location (player hand)
    'cards',          // to pile
    participant.partyId, // from location ID (party ID)
    undefined         // to location ID (not needed for hands)
  );
}
```

## Example 8: Event-Driven Team Updates

Using the event system to track team activities:

```typescript
function setupTeamEventHandlers(api: GameStateAPI) {
  // Listen for party-related events
  const gameState = api.getGameState();
  
  // Process recent party events
  const partyEvents = api.getEvents({
    type: 'participant_added_to_party'
  });

  for (const event of partyEvents) {
    const participantId = event.participantId;
    const partyId = event.data.partyId;
    
    if (participantId && partyId) {
      // Update team welcome status
      const party = api.getParty(partyId);
      if (party) {
        const welcomeMessages = party.status.welcomeMessages || [];
        welcomeMessages.push({
          participantId,
          timestamp: event.timestamp,
          message: `Welcome to ${party.name}!`
        });
        api.updatePartyStatus(partyId, 'welcomeMessages', welcomeMessages);
      }
    }
  }
}

// Track team performance
function updateTeamPerformanceMetrics(api: GameStateAPI) {
  const gameState = api.getGameState();
  
  for (const [partyId, party] of gameState.parties) {
    const partyEvents = api.getEvents({ partyId });
    
    const metrics = {
      totalActions: partyEvents.length,
      cardsMoved: partyEvents.filter(e => e.type === 'card_added_to_party_pile').length,
      communicationCount: partyEvents.filter(e => e.type === 'party_status_updated' && 
        e.data.key === 'communications').length,
      lastActivity: partyEvents.length > 0 ? 
        Math.max(...partyEvents.map(e => e.timestamp)) : 0
    };
    
    api.updatePartyStatus(partyId, 'performanceMetrics', metrics);
  }
}
```

## Example 9: Complex Team Interactions

Implementing advanced team mechanics:

```typescript
// Team ability system
interface TeamAbility {
  id: string;
  name: string;
  description: string;
  cost: number;
  cooldown: number;
  effect: (api: GameStateAPI, teamId: string, targetId?: string) => void;
}

const teamAbilities: TeamAbility[] = [
  {
    id: 'card_share',
    name: 'Share Cards',
    description: 'All team members can see each other\'s hands',
    cost: 2,
    cooldown: 3,
    effect: (api, teamId) => {
      api.updatePartyStatus(teamId, 'cardSharingActive', true);
      api.updatePartyStatus(teamId, 'cardSharingExpires', Date.now() + 30000); // 30 seconds
    }
  },
  {
    id: 'team_draw',
    name: 'Team Draw',
    description: 'Draw extra cards for the team',
    cost: 3,
    cooldown: 5,
    effect: (api, teamId) => {
      const party = api.getParty(teamId);
      if (party) {
        // Each team member draws an extra card (implementation depends on game rules)
        for (const participantId of party.participantIds) {
          // Draw card logic here
        }
      }
    }
  }
];

function useTeamAbility(api: GameStateAPI, teamId: string, abilityId: string, activatedBy: string) {
  const party = api.getParty(teamId);
  if (!party) return;

  const ability = teamAbilities.find(a => a.id === abilityId);
  if (!ability) return;

  const teamEnergy = party.status.energy || 0;
  const cooldowns = party.status.abilityCooldowns || {};
  
  // Check cost and cooldown
  if (teamEnergy < ability.cost) {
    throw new Error('Insufficient team energy');
  }
  
  if (cooldowns[abilityId] && cooldowns[abilityId] > Date.now()) {
    throw new Error('Ability is on cooldown');
  }

  // Use ability
  ability.effect(api, teamId);
  
  // Update team status
  api.updatePartyStatus(teamId, 'energy', teamEnergy - ability.cost);
  cooldowns[abilityId] = Date.now() + (ability.cooldown * 1000);
  api.updatePartyStatus(teamId, 'abilityCooldowns', cooldowns);
  
  // Log ability usage
  const abilityLog = party.status.abilityLog || [];
  abilityLog.push({
    abilityId,
    activatedBy,
    timestamp: Date.now(),
    cost: ability.cost
  });
  api.updatePartyStatus(teamId, 'abilityLog', abilityLog);
}
```

## Best Practices Summary

1. **Team Formation**: Create teams early in game setup
2. **Resource Management**: Use party piles for shared resources
3. **Access Control**: Always validate team membership before granting access
4. **Communication**: Implement team communication through party status
5. **Event Tracking**: Use the event system to monitor team activities
6. **Status Updates**: Keep team status current with game state changes
7. **Error Handling**: Handle access denied errors gracefully
8. **Performance**: Batch party operations when possible

These examples demonstrate the flexibility and power of the BigDeckEnergy party system for creating engaging team-based card games.