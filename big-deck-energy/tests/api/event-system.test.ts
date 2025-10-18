import { GameStateAPIImpl } from '../../src/api/game-state-api';
import { GameState } from '../../src/models/game-state';
import { Gameboard } from '../../src/models/gameboard';
import { Card } from '../../src/models/card';
import { GamePhase, CardOrientation } from '../../src/core/types';
import { GameEvent, EventFilter } from '../../src/core/interfaces/events';

describe('Event System', () => {
  let gameState: GameState;
  let api: GameStateAPIImpl;

  beforeEach(() => {
    gameState = new GameState(
      'test-game',
      GamePhase.SETUP,
      new Gameboard(),
      new Map(),
      new Map(),
      [],
      {}
    );
    api = new GameStateAPIImpl(gameState);
  });

  describe('Event Publishing and Subscription', () => {
    it('should automatically publish events for participant creation', () => {
      api.createParticipant('player1', 'Alice', false);
      
      const events = api.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'participant_created',
        participantId: 'player1',
        data: { name: 'Alice', isNPC: false }
      });
      expect(events[0]?.id).toBeDefined();
      expect(events[0]?.timestamp).toBeDefined();
    });

    it('should automatically publish events for participant status updates', () => {
      api.createParticipant('player1', 'Alice', false);
      api.updateParticipantStatus('player1', 'score', 100);
      
      const events = api.getEvents({ type: 'participant_status_updated' });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'participant_status_updated',
        participantId: 'player1',
        data: { key: 'score', value: 100 }
      });
    });

    it('should automatically publish events for hand operations', () => {
      api.createParticipant('player1', 'Alice', false);
      api.createHand('hand1', 'Main Hand', 'player1');
      api.addHandToParticipant('player1', 'hand1');
      
      const handEvents = api.getEvents({ type: 'hand_created' });
      expect(handEvents).toHaveLength(1);
      expect(handEvents[0]).toMatchObject({
        type: 'hand_created',
        participantId: 'player1',
        data: { handId: 'hand1', name: 'Main Hand' }
      });

      const participantEvents = api.getEvents({ type: 'hand_added_to_participant' });
      expect(participantEvents).toHaveLength(1);
      expect(participantEvents[0]).toMatchObject({
        type: 'hand_added_to_participant',
        participantId: 'player1',
        data: { handId: 'hand1' }
      });
    });

    it('should automatically publish events for card operations', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      api.createParticipant('player1', 'Alice', false);
      api.createHand('hand1', 'Main Hand', 'player1');
      api.createHandPile('hand1', 'cards', true);
      api.addCardToHandPile('hand1', 'cards', card, false, 'player1');
      
      const cardEvents = api.getEvents({ type: 'card_added_to_hand_pile' });
      expect(cardEvents).toHaveLength(1);
      expect(cardEvents[0]).toMatchObject({
        type: 'card_added_to_hand_pile',
        participantId: 'player1',
        data: { 
          handId: 'hand1', 
          pileName: 'cards', 
          cardId: 'card1', 
          faceUp: false, 
          owner: 'player1' 
        }
      });
    });

    it('should automatically publish events for gameboard operations', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      api.createGameboardPile('deck', true);
      api.addCardToGameboardPile('deck', card, false);
      
      const pileEvents = api.getEvents({ type: 'gameboard_pile_created' });
      expect(pileEvents).toHaveLength(1);
      expect(pileEvents[0]).toMatchObject({
        type: 'gameboard_pile_created',
        data: { pileName: 'deck', isOrdered: true }
      });

      const cardEvents = api.getEvents({ type: 'card_added_to_gameboard_pile' });
      expect(cardEvents).toHaveLength(1);
      expect(cardEvents[0]).toMatchObject({
        type: 'card_added_to_gameboard_pile',
        data: { pileName: 'deck', cardId: 'card1', faceUp: false }
      });
    });

    it('should allow manual event addition', () => {
      const customEvent: GameEvent = {
        id: 'custom-event-1',
        type: 'custom_action',
        timestamp: Date.now(),
        participantId: 'player1',
        data: { action: 'special_ability', target: 'card1' }
      };

      api.addEvent(customEvent);
      
      const events = api.getEvents({ type: 'custom_action' });
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(customEvent);
    });
  });

  describe('Event Filtering and Querying', () => {
    beforeEach(() => {
      // Set up test data with multiple events
      api.createParticipant('player1', 'Alice', false);
      api.createParticipant('player2', 'Bob', true);
      api.updateParticipantStatus('player1', 'score', 100);
      api.updateParticipantStatus('player2', 'score', 50);
      
      // Add custom events
      api.addEvent({
        id: 'custom1',
        type: 'custom_action',
        timestamp: Date.now() - 1000,
        participantId: 'player1',
        data: { action: 'draw_card' }
      });
      
      api.addEvent({
        id: 'custom2',
        type: 'custom_action',
        timestamp: Date.now(),
        participantId: 'player2',
        data: { action: 'play_card' }
      });
    });

    it('should filter events by type', () => {
      const participantEvents = api.getEvents({ type: 'participant_created' });
      expect(participantEvents).toHaveLength(2);
      expect(participantEvents.every(e => e.type === 'participant_created')).toBe(true);

      const customEvents = api.getEvents({ type: 'custom_action' });
      expect(customEvents).toHaveLength(2);
      expect(customEvents.every(e => e.type === 'custom_action')).toBe(true);
    });

    it('should filter events by participant ID', () => {
      const player1Events = api.getEvents({ participantId: 'player1' });
      expect(player1Events.length).toBeGreaterThan(0);
      expect(player1Events.every(e => e.participantId === 'player1')).toBe(true);

      const player2Events = api.getEvents({ participantId: 'player2' });
      expect(player2Events.length).toBeGreaterThan(0);
      expect(player2Events.every(e => e.participantId === 'player2')).toBe(true);
    });

    it('should filter events by timestamp', () => {
      const recentTimestamp = Date.now() - 500;
      const recentEvents = api.getEvents({ since: recentTimestamp });
      
      expect(recentEvents.length).toBeGreaterThan(0);
      expect(recentEvents.every(e => e.timestamp >= recentTimestamp)).toBe(true);
    });

    it('should support combined filters', () => {
      const filter: EventFilter = {
        type: 'custom_action',
        participantId: 'player1'
      };
      
      const filteredEvents = api.getEvents(filter);
      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0]).toMatchObject({
        type: 'custom_action',
        participantId: 'player1',
        data: { action: 'draw_card' }
      });
    });

    it('should return all events when no filter is provided', () => {
      const allEvents = api.getEvents();
      expect(allEvents.length).toBeGreaterThan(4); // At least participant creation, status updates, and custom events
    });

    it('should return empty array for non-matching filters', () => {
      const noEvents = api.getEvents({ type: 'non_existent_type' });
      expect(noEvents).toHaveLength(0);

      const noParticipantEvents = api.getEvents({ participantId: 'non_existent_player' });
      expect(noParticipantEvents).toHaveLength(0);
    });
  });

  describe('Custom Event Types', () => {
    it('should support custom event types for game-specific interactions', () => {
      const customEvents = [
        {
          id: 'spell-cast-1',
          type: 'spell_cast',
          timestamp: Date.now(),
          participantId: 'player1',
          data: { 
            spellName: 'Lightning Bolt', 
            target: 'player2', 
            damage: 3 
          }
        },
        {
          id: 'card-ability-1',
          type: 'card_ability_triggered',
          timestamp: Date.now(),
          participantId: 'player2',
          data: { 
            cardId: 'card1', 
            abilityName: 'Draw Two Cards',
            effect: 'draw_cards',
            amount: 2
          }
        },
        {
          id: 'phase-change-1',
          type: 'game_phase_changed',
          timestamp: Date.now(),
          data: { 
            fromPhase: 'setup', 
            toPhase: 'playing',
            reason: 'all_players_ready'
          }
        }
      ];

      customEvents.forEach(event => api.addEvent(event));
      
      // Test spell events
      const spellEvents = api.getEvents({ type: 'spell_cast' });
      expect(spellEvents).toHaveLength(1);
      expect(spellEvents[0]?.data.spellName).toBe('Lightning Bolt');
      expect(spellEvents[0]?.data.damage).toBe(3);

      // Test card ability events
      const abilityEvents = api.getEvents({ type: 'card_ability_triggered' });
      expect(abilityEvents).toHaveLength(1);
      expect(abilityEvents[0]?.data.abilityName).toBe('Draw Two Cards');
      expect(abilityEvents[0]?.data.amount).toBe(2);

      // Test phase change events
      const phaseEvents = api.getEvents({ type: 'game_phase_changed' });
      expect(phaseEvents).toHaveLength(1);
      expect(phaseEvents[0]?.data.fromPhase).toBe('setup');
      expect(phaseEvents[0]?.data.toPhase).toBe('playing');
    });

    it('should support complex custom event data structures', () => {
      const complexEvent: GameEvent = {
        id: 'complex-event-1',
        type: 'multi_card_interaction',
        timestamp: Date.now(),
        participantId: 'player1',
        data: {
          interaction: 'combo_play',
          cards: [
            { id: 'card1', role: 'trigger' },
            { id: 'card2', role: 'target' },
            { id: 'card3', role: 'modifier' }
          ],
          effects: [
            { type: 'damage', amount: 5, target: 'player2' },
            { type: 'heal', amount: 2, target: 'player1' },
            { type: 'draw_cards', amount: 1, target: 'player1' }
          ],
          metadata: {
            comboName: 'Fire Storm',
            rarity: 'legendary',
            manaCost: 7
          }
        }
      };

      api.addEvent(complexEvent);
      
      const events = api.getEvents({ type: 'multi_card_interaction' });
      expect(events).toHaveLength(1);
      expect(events[0]?.data.interaction).toBe('combo_play');
      expect(events[0]?.data.cards).toHaveLength(3);
      expect(events[0]?.data.effects).toHaveLength(3);
      expect(events[0]?.data.metadata.comboName).toBe('Fire Storm');
    });

    it('should maintain event order and uniqueness', () => {
      const eventIds = ['event1', 'event2', 'event3'];
      const timestamps = [1000, 2000, 3000];
      
      eventIds.forEach((id, index) => {
        api.addEvent({
          id,
          type: 'ordered_event',
          timestamp: timestamps[index]!,
          data: { order: index }
        });
      });

      const events = api.getEvents({ type: 'ordered_event' });
      expect(events).toHaveLength(3);
      
      // Events should maintain insertion order
      expect(events[0]?.id).toBe('event1');
      expect(events[1]?.id).toBe('event2');
      expect(events[2]?.id).toBe('event3');
      
      // Each event should have unique ID
      const ids = events.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Event Handler Execution', () => {
    it('should track card state change events', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      api.createParticipant('player1', 'Alice', false);
      api.createHand('hand1', 'Main Hand', 'player1');
      api.createHandPile('hand1', 'cards', true);
      api.addCardToHandPile('hand1', 'cards', card, false, 'player1');
      
      // Test card flipping
      api.flipCard('hand1', 'cards', 0, true);
      
      const flipEvents = api.getEvents({ type: 'card_flipped' });
      expect(flipEvents).toHaveLength(1);
      expect(flipEvents[0]).toMatchObject({
        type: 'card_flipped',
        data: { 
          location: 'hand1', 
          pileName: 'cards', 
          cardIndex: 0, 
          cardId: 'card1', 
          faceUp: true 
        }
      });
    });

    it('should track card ownership transfer events', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      api.createParticipant('player1', 'Alice', false);
      api.createParticipant('player2', 'Bob', false);
      api.createGameboardPile('deck', true);
      api.addCardToGameboardPile('deck', card, false, 'player1');
      
      // Transfer ownership
      api.updateCardOwnership('gameboard', 'deck', 0, 'player2');
      
      const ownershipEvents = api.getEvents({ type: 'card_ownership_updated' });
      expect(ownershipEvents).toHaveLength(1);
      expect(ownershipEvents[0]).toMatchObject({
        type: 'card_ownership_updated',
        data: {
          location: 'gameboard',
          pileName: 'deck',
          cardIndex: 0,
          cardId: 'card1',
          oldOwner: 'player1',
          newOwner: 'player2'
        }
      });
    });

    it('should track card movement events', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      api.createParticipant('player1', 'Alice', false);
      api.createHand('hand1', 'Main Hand', 'player1');
      api.createHandPile('hand1', 'cards', true);
      api.createGameboardPile('discard', true);
      
      // Add card to hand
      api.addCardToHandPile('hand1', 'cards', card, true, 'player1');
      
      // Move card from hand to gameboard
      api.moveCard('hand1', 'cards', 0, 'gameboard', 'discard');
      
      const moveEvents = api.getEvents({ type: 'card_moved' });
      expect(moveEvents).toHaveLength(1);
      expect(moveEvents[0]).toMatchObject({
        type: 'card_moved',
        data: {
          cardId: 'card1',
          fromLocation: 'hand1',
          fromPile: 'cards',
          fromIndex: 0,
          toLocation: 'gameboard',
          toPile: 'discard'
        }
      });
    });

    it('should track pile shuffle events', () => {
      const cards = [
        new Card({ id: 'card1', faceId: 'face1', tailId: 'tail1', properties: {} }, 'standard'),
        new Card({ id: 'card2', faceId: 'face2', tailId: 'tail1', properties: {} }, 'standard'),
        new Card({ id: 'card3', faceId: 'face3', tailId: 'tail1', properties: {} }, 'standard')
      ];

      api.createGameboardPile('deck', true);
      cards.forEach(card => api.addCardToGameboardPile('deck', card, false));
      
      // Shuffle the pile
      api.shufflePile('gameboard', 'deck');
      
      const shuffleEvents = api.getEvents({ type: 'pile_shuffled' });
      expect(shuffleEvents).toHaveLength(1);
      expect(shuffleEvents[0]).toMatchObject({
        type: 'pile_shuffled',
        data: { location: 'gameboard', pileName: 'deck' }
      });
    });

    it('should track card status update events', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      api.createGameboardPile('play', true);
      api.addCardToGameboardPile('play', card, true);
      
      // Update card status
      api.updateCardInPileStatus('gameboard', 'play', 0, 'tapped', true);
      
      const statusEvents = api.getEvents({ type: 'card_status_updated' });
      expect(statusEvents).toHaveLength(1);
      expect(statusEvents[0]).toMatchObject({
        type: 'card_status_updated',
        data: {
          location: 'gameboard',
          pileName: 'play',
          cardIndex: 0,
          cardId: 'card1',
          key: 'tapped',
          value: true
        }
      });
    });
  });

  describe('Event System Integration', () => {
    it('should maintain event history across multiple operations', () => {
      const cardDefinition = {
        id: 'card1',
        faceId: 'face1',
        tailId: 'tail1',
        properties: { suit: 'hearts', rank: 'A' }
      };
      const card = new Card(cardDefinition, 'standard');

      // Perform a sequence of operations
      api.createParticipant('player1', 'Alice', false);
      api.createHand('hand1', 'Main Hand', 'player1');
      api.createHandPile('hand1', 'cards', true);
      api.addCardToHandPile('hand1', 'cards', card, false, 'player1');
      api.flipCard('hand1', 'cards', 0, true);
      api.updateCardInPileStatus('hand1', 'cards', 0, 'selected', true);
      
      const allEvents = api.getEvents();
      expect(allEvents.length).toBeGreaterThanOrEqual(6);
      
      // Verify event sequence
      const eventTypes = allEvents.map(e => e.type);
      expect(eventTypes).toContain('participant_created');
      expect(eventTypes).toContain('hand_created');
      expect(eventTypes).toContain('hand_pile_created');
      expect(eventTypes).toContain('card_added_to_hand_pile');
      expect(eventTypes).toContain('card_flipped');
      expect(eventTypes).toContain('card_status_updated');
    });

    it('should generate unique event IDs for all events', () => {
      // Perform multiple operations quickly
      for (let i = 0; i < 10; i++) {
        api.createParticipant(`player${i}`, `Player ${i}`, false);
      }
      
      const events = api.getEvents({ type: 'participant_created' });
      expect(events).toHaveLength(10);
      
      const eventIds = events.map(e => e.id);
      const uniqueIds = new Set(eventIds);
      expect(uniqueIds.size).toBe(eventIds.length);
    });

    it('should include timestamps in chronological order', () => {
      const startTime = Date.now();
      
      api.createParticipant('player1', 'Alice', false);
      api.createParticipant('player2', 'Bob', false);
      api.createParticipant('player3', 'Charlie', false);
      
      const events = api.getEvents({ type: 'participant_created' });
      expect(events).toHaveLength(3);
      
      // All timestamps should be after start time
      events.forEach(event => {
        expect(event.timestamp).toBeGreaterThanOrEqual(startTime);
      });
      
      // Events should be in chronological order (or at least not decreasing)
      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.timestamp).toBeGreaterThanOrEqual(events[i-1]!.timestamp);
      }
    });
  });
});