# Party System API Documentation

The Party System in BigDeckEnergy enables team-based card games where multiple participants work together as teams with shared resources and status tracking.

## Overview

Parties (teams) are optional containers that group participants together and provide:
- Shared card storage (piles and placements)
- Team-specific status tracking
- Access control for team resources
- Team communication capabilities

## Core Interfaces

### Party Interface

```typescript
interface Party {
  readonly id: string;              // Unique party identifier
  readonly name: string;            // Display name for the party
  readonly participantIds: string[]; // IDs of participants in this party
  readonly piles: Map<string, CardPile>;      // Shared card piles
  readonly placements: Map<string, CardPlacement>; // Shared card placements
  readonly status: Record<string, any>;       // Custom party status data
}
```

### Participant Party Relationship

```typescript
interface Participant {
  readonly id: string;
  readonly name: string;
  readonly isNPC: boolean;
  readonly handIds: string[];
  readonly partyId: string | null;  // ID of party this participant belongs to
  readonly status: Record<string, any>;
}
```

## Game State API Methods

### Party Management

#### `createParty(id: string, name: string): void`

Creates a new party with the specified ID and name.

```typescript
api.createParty('team_alpha', 'Team Alpha');
```

**Parameters:**
- `id`: Unique identifier for the party
- `name`: Display name for the party

**Throws:**
- Error if party with the same ID already exists

#### `addParticipantToParty(participantId: string, partyId: string): void`

Adds a participant to a party. If the participant is already in another party, they are removed from the previous party first.

```typescript
api.addParticipantToParty('player1', 'team_alpha');
```

**Parameters:**
- `participantId`: ID of the participant to add
- `partyId`: ID of the party to add the participant to

**Throws:**
- Error if participant or party doesn't exist

#### `removeParticipantFromParty(participantId: string): void`

Removes a participant from their current party.

```typescript
api.removeParticipantFromParty('player1');
```

**Parameters:**
- `participantId`: ID of the participant to remove from their party

**Note:** Does nothing if the participant is not in a party

#### `updatePartyStatus(partyId: string, key: string, value: any): void`

Updates a status value for a party.

```typescript
api.updatePartyStatus('team_alpha', 'score', 150);
api.updatePartyStatus('team_alpha', 'wins', 3);
```

**Parameters:**
- `partyId`: ID of the party to update
- `key`: Status key to update
- `value`: New value for the status

#### `getParty(partyId: string): Party | null`

Retrieves a party by its ID.

```typescript
const party = api.getParty('team_alpha');
if (party) {
  console.log(`Team ${party.name} has ${party.participantIds.length} members`);
}
```

**Returns:** Party object or null if not found

### Party Resource Management

#### `createPartyPile(partyId: string, pileName: string, isOrdered: boolean, orientation?: CardOrientation): void`

Creates a new pile for a party.

```typescript
api.createPartyPile('team_alpha', 'shared_cards', true, CardOrientation.NORMAL);
```

**Parameters:**
- `partyId`: ID of the party
- `pileName`: Name of the pile to create
- `isOrdered`: Whether the pile maintains card order
- `orientation`: Optional default orientation for cards in the pile

#### `addCardToPartyPile(partyId: string, pileName: string, card: Card, faceUp: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void`

Adds a card to a party pile.

```typescript
api.addCardToPartyPile('team_alpha', 'shared_cards', card, true, 'player1');
```

**Parameters:**
- `partyId`: ID of the party
- `pileName`: Name of the pile
- `card`: Card to add
- `faceUp`: Whether the card is face up
- `owner`: Optional owner of the card (usually the participant who played it)
- `orientation`: Optional card orientation
- `status`: Optional custom status data for the card

#### `removeCardFromPartyPile(partyId: string, pileName: string, index?: number): CardInPile | null`

Removes a card from a party pile.

```typescript
const removedCard = api.removeCardFromPartyPile('team_alpha', 'shared_cards', 0);
```

**Parameters:**
- `partyId`: ID of the party
- `pileName`: Name of the pile
- `index`: Optional index of card to remove (defaults to last card)

**Returns:** Removed card or null if pile is empty

#### `setPartyPlacement(partyId: string, placementName: string, card: Card | null, faceUp?: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void`

Sets a card in a party placement (single card slot).

```typescript
api.setPartyPlacement('team_alpha', 'team_card', card, true, 'player1');
```

**Parameters:**
- `partyId`: ID of the party
- `placementName`: Name of the placement
- `card`: Card to place (null to clear the placement)
- `faceUp`: Whether the card is face up
- `owner`: Optional owner of the card
- `orientation`: Optional card orientation
- `status`: Optional custom status data

#### `getPartyPlacement(partyId: string, placementName: string): CardInPlacement | null`

Gets the card in a party placement.

```typescript
const placedCard = api.getPartyPlacement('team_alpha', 'team_card');
```

**Returns:** Card in placement or null if empty

### Access Control

#### `canAccessPile(participantId: string, location: 'party', pileName: string, locationId: string): boolean`

Checks if a participant can access a party pile.

```typescript
const canAccess = api.canAccessPile('player1', 'party', 'shared_cards', 'team_alpha');
```

**Parameters:**
- `participantId`: ID of the participant
- `location`: Must be 'party' for party resources
- `pileName`: Name of the pile
- `locationId`: ID of the party

**Returns:** True if participant can access the pile

#### `canAccessPlacement(participantId: string, location: 'party', placementName: string, locationId: string): boolean`

Checks if a participant can access a party placement.

```typescript
const canAccess = api.canAccessPlacement('player1', 'party', 'team_card', 'team_alpha');
```

**Parameters:**
- `participantId`: ID of the participant
- `location`: Must be 'party' for party resources
- `placementName`: Name of the placement
- `locationId`: ID of the party

**Returns:** True if participant can access the placement

#### `getVisibleCards(participantId: string, location: 'party', pileName: string, locationId: string): CardInPile[]`

Gets the cards visible to a participant in a party pile.

```typescript
const visibleCards = api.getVisibleCards('player1', 'party', 'shared_cards', 'team_alpha');
```

**Parameters:**
- `participantId`: ID of the participant
- `location`: Must be 'party' for party resources
- `pileName`: Name of the pile
- `locationId`: ID of the party

**Returns:** Array of visible cards (face-down cards are filtered out for non-owners)

### Utility Methods

#### `shufflePile(location: 'party', pileName: string, locationId: string): void`

Shuffles a party pile.

```typescript
api.shufflePile('party', 'shared_cards', 'team_alpha');
```

#### `moveCard(fromLocation: string, fromPile: string, fromIndex: number, toLocation: 'party', toPile: string, fromLocationId?: string, toLocationId: string): void`

Moves a card to a party pile.

```typescript
// Move card from player hand to party pile
api.moveCard('player1_hand', 'cards', 0, 'party', 'shared_cards', undefined, 'team_alpha');
```

## Access Control Rules

### Party Membership Requirements

1. **Party Access**: Only participants who are members of a party can access that party's resources
2. **Shared Access**: All party members have equal access to all party piles and placements
3. **No Cross-Party Access**: Participants cannot access resources of parties they don't belong to

### Visibility Rules

1. **Face-Up Cards**: Always visible to all party members
2. **Face-Down Cards**: Only visible to the card owner and party members
3. **Ownership**: Cards in party piles retain their original owner information
4. **Access Denied**: Non-party members receive AccessDeniedError when trying to access party resources

## Event System Integration

The party system automatically generates events for all party operations:

### Party Events

- `party_created`: When a new party is created
- `participant_added_to_party`: When a participant joins a party
- `participant_removed_from_party`: When a participant leaves a party
- `party_status_updated`: When party status is updated

### Party Resource Events

- `party_pile_created`: When a party pile is created
- `card_added_to_party_pile`: When a card is added to a party pile
- `card_removed_from_party_pile`: When a card is removed from a party pile
- `party_placement_set`: When a party placement is set

### Event Filtering

```typescript
// Get all events for a specific party
const partyEvents = api.getEvents({ partyId: 'team_alpha' });

// Get party-related events for a participant
const participantPartyEvents = api.getEvents({ 
  participantId: 'player1',
  type: 'participant_added_to_party'
});
```

## Serialization Support

The party system is fully integrated with the serialization system:

- Party data is included in game state serialization
- Party information is preserved in state snapshots
- Party operations create action descriptors in game history
- Backwards compatibility is maintained across library versions

## Best Practices

### Party Design

1. **Team Size**: Keep teams reasonably sized (2-4 members typically)
2. **Resource Naming**: Use descriptive names for party piles and placements
3. **Status Tracking**: Use party status for team-specific game state
4. **Communication**: Implement team communication through party status

### Access Control

1. **Validate Access**: Always check access before showing party resources to players
2. **Error Handling**: Handle AccessDeniedError appropriately in your UI
3. **Visibility**: Respect face-down card visibility rules in party contexts

### Performance

1. **Batch Operations**: Group related party operations together
2. **Event Filtering**: Use event filters to get relevant party events
3. **Status Updates**: Use party status for frequently accessed team data

## Example Implementation

See the [Team Hearts example](../examples/team-hearts-example.ts) for a complete implementation of a team-based card game using the party system.