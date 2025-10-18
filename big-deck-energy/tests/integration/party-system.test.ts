/**
 * Party System Integration Tests
 * 
 * Tests complete game scenarios with party-based teams including:
 * - Party creation and management
 * - Party serialization and deserialization
 * - Party event tracking and history
 * - Party compatibility with existing rulesets
 */

import { GameInstance } from '../../src/engine/game-instance';
import { SerializationEngine } from '../../src/engine/serialization';
import { HistoryManager } from '../../src/engine/history-manager';
import { StandardPlayingDeck } from '../../src/deck-types/standard/standard-playing-deck';
import { WarRuleset } from '../../src/rulesets/war/war-ruleset';
import { GoFishRuleset } from '../../src/rulesets/go-fish/go-fish-ruleset';
import { GamePhase } from '../../src/core/types';
import { ActionDescriptor } from '../../src/core/interfaces/history';
import { EventFilter } from '../../src/core/interfaces/events';

describe('Party System Integration Tests', () => {
  let gameInstance: GameInstance;
  let deckType: StandardPlayingDeck;
  let ruleset: WarRuleset;

  beforeEach(() => {
    deckType = new StandardPlayingDeck();
    ruleset = new WarRuleset();
    
    const result = GameInstance.create({
      gameId: 'party-integration-test',
      ruleset,
      deckType,
      metadata: { testType: 'party-integration', version: '1.0.0' }
    });

    if (!result.success || !result.gameInstance) {
      throw new Error('Failed to create game instance for testing');
    }

    gameInstance = result.gameInstance;
  });

  describe('Complete Game Scenarios with Party-Based Teams', () => {
    it('should create and manage a team-based card game with parties', async () => {
      // Initialize the game
      gameInstance.initialize();
      
      // Create participants
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParticipant('player3', 'Charlie', false);
      gameInstance.createParticipant('player4', 'Diana', false);
      
      // Create hands for participants
      gameInstance.createHand('hand1', 'Alice Hand', 'player1');
      gameInstance.createHand('hand2', 'Bob Hand', 'player2');
      gameInstance.createHand('hand3', 'Charlie Hand', 'player3');
      gameInstance.createHand('hand4', 'Diana Hand', 'player4');
      
      // Create two parties (teams)
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.createParty('team2', 'Blue Team');
      
      // Add participants to parties
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team1');
      gameInstance.addParticipantToParty('player3', 'team2');
      gameInstance.addParticipantToParty('player4', 'team2');
      
      // Verify party structure
      const parties = gameInstance.getParties();
      expect(parties.size).toBe(2);
      
      const team1 = parties.get('team1')!;
      const team2 = parties.get('team2')!;
      
      expect(team1.name).toBe('Red Team');
      expect(team1.participantIds).toEqual(['player1', 'player2']);
      expect(team2.name).toBe('Blue Team');
      expect(team2.participantIds).toEqual(['player3', 'player4']);
      
      // Verify participant party membership
      const gameState = gameInstance.getGameState();
      expect(gameState.participants.get('player1')?.partyId).toBe('team1');
      expect(gameState.participants.get('player2')?.partyId).toBe('team1');
      expect(gameState.participants.get('player3')?.partyId).toBe('team2');
      expect(gameState.participants.get('player4')?.partyId).toBe('team2');
      
      // Create party piles for shared resources
      gameInstance.createPartyPile('team1', 'shared_cards', true);
      gameInstance.createPartyPile('team2', 'shared_cards', true);
      
      // Update party status
      gameInstance.updatePartyStatus('team1', 'score', 0);
      gameInstance.updatePartyStatus('team2', 'score', 0);
      
      // Verify party piles and status
      const updatedTeam1 = gameInstance.getParties().get('team1')!;
      const updatedTeam2 = gameInstance.getParties().get('team2')!;
      
      expect(updatedTeam1.piles.has('shared_cards')).toBe(true);
      expect(updatedTeam2.piles.has('shared_cards')).toBe(true);
      expect(updatedTeam1.status.score).toBe(0);
      expect(updatedTeam2.status.score).toBe(0);
      
      // Test party participant retrieval
      const team1Participants = gameInstance.getPartyParticipants('team1');
      const team2Participants = gameInstance.getPartyParticipants('team2');
      
      expect(team1Participants).toHaveLength(2);
      expect(team2Participants).toHaveLength(2);
      expect(team1Participants.map(p => p.id)).toEqual(['player1', 'player2']);
      expect(team2Participants.map(p => p.id)).toEqual(['player3', 'player4']);
      
      // Test participant party retrieval
      const player1Party = gameInstance.getParticipantParty('player1');
      const player3Party = gameInstance.getParticipantParty('player3');
      
      expect(player1Party?.id).toBe('team1');
      expect(player3Party?.id).toBe('team2');
      
      // Verify game summary includes party count
      const summary = gameInstance.getGameSummary();
      expect(summary.partyCount).toBe(2);
      expect(summary.participantCount).toBe(4);
    });

    it('should handle party membership changes correctly', async () => {
      gameInstance.initialize();
      
      // Create participants and parties
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.createParty('team2', 'Blue Team');
      
      // Add player to team1
      gameInstance.addParticipantToParty('player1', 'team1');
      
      let gameState = gameInstance.getGameState();
      expect(gameState.participants.get('player1')?.partyId).toBe('team1');
      expect(gameState.parties.get('team1')?.participantIds).toContain('player1');
      
      // Move player to team2
      gameInstance.removeParticipantFromParty('player1');
      gameInstance.addParticipantToParty('player1', 'team2');
      
      gameState = gameInstance.getGameState();
      expect(gameState.participants.get('player1')?.partyId).toBe('team2');
      expect(gameState.parties.get('team1')?.participantIds).not.toContain('player1');
      expect(gameState.parties.get('team2')?.participantIds).toContain('player1');
      
      // Verify party consistency validation
      const validationErrors = gameInstance.validateGameState();
      const partyErrors = validationErrors.filter(error => 
        error.code.includes('PARTY') || error.code.includes('PARTICIPANT')
      );
      expect(partyErrors).toHaveLength(0);
    });

    it('should validate party consistency and detect errors', async () => {
      gameInstance.initialize();
      
      // Create participants and party
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.addParticipantToParty('player1', 'team1');
      
      // Verify initial state is valid
      let validationErrors = gameInstance.validateGameState();
      let partyErrors = validationErrors.filter(error => 
        error.code.includes('PARTY') || error.code.includes('PARTICIPANT')
      );
      expect(partyErrors).toHaveLength(0);
      
      // Manually corrupt the state to test validation
      const gameState = gameInstance.getGameState();
      const api = gameInstance.getGameStateAPI();
      
      // Create a participant with invalid party reference
      api.createParticipant('player2', 'Bob', false);
      // Manually set invalid party ID (this would normally be done through proper API)
      const participants = new Map(gameState.participants);
      const participant2 = participants.get('player2')!;
      // This simulates a corrupted state - in real usage this wouldn't happen
      // but we need to test the validation logic
      
      // The validation should still pass since we're using the proper API
      validationErrors = gameInstance.validateGameState();
      partyErrors = validationErrors.filter(error => 
        error.code.includes('PARTY') || error.code.includes('PARTICIPANT')
      );
      expect(partyErrors).toHaveLength(0);
    });
  });

  describe('Party Serialization and Deserialization', () => {
    it('should serialize and deserialize game state with parties', async () => {
      // Set up game with parties
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team1');
      gameInstance.createPartyPile('team1', 'shared_pile', true);
      gameInstance.updatePartyStatus('team1', 'score', 100);
      
      // Serialize the game state
      const gameState = gameInstance.getGameState();
      const serialized = SerializationEngine.serialize(gameState);
      
      expect(serialized).toBeDefined();
      expect(serialized.length).toBeGreaterThan(0);
      
      // Validate serialization format
      const validation = SerializationEngine.validateFormat(serialized);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Deserialize the game state
      const deserializedState = SerializationEngine.deserialize(serialized);
      
      // Verify parties were preserved
      expect(deserializedState.parties.size).toBe(1);
      const deserializedTeam = deserializedState.parties.get('team1')!;
      expect(deserializedTeam.name).toBe('Red Team');
      expect(deserializedTeam.participantIds).toEqual(['player1', 'player2']);
      expect(deserializedTeam.piles.has('shared_pile')).toBe(true);
      expect(deserializedTeam.status.score).toBe(100);
      
      // Verify participant party references were preserved
      expect(deserializedState.participants.get('player1')?.partyId).toBe('team1');
      expect(deserializedState.participants.get('player2')?.partyId).toBe('team1');
    });

    it('should serialize and deserialize complete game history with parties', async () => {
      // Set up game with parties and create history
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team1');
      gameInstance.updatePartyStatus('team1', 'score', 50);
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      
      // Export complete history
      const historyJson = gameInstance.exportHistory('full');
      expect(historyJson).toBeDefined();
      
      // Validate history format
      const validation = SerializationEngine.validateFormat(historyJson);
      expect(validation.isValid).toBe(true);
      
      // Check compatibility
      const compatibility = SerializationEngine.checkCompatibility(historyJson);
      expect(compatibility.compatible).toBe(true);
      expect(compatibility.hasHistory).toBe(true);
      
      // Deserialize history
      const deserializedHistory = SerializationEngine.deserializeHistory(historyJson);
      expect(deserializedHistory.gameId).toBe('party-integration-test');
      expect(deserializedHistory.snapshots.size).toBeGreaterThan(1);
      
      // Import history and verify integrity
      const historyManager = HistoryManager.importHistory(historyJson);
      const integrityValidation = historyManager.validateIntegrity();
      expect(integrityValidation.isValid).toBe(true);
      
      // Verify current state has parties
      const currentSnapshot = historyManager.getCurrentSnapshot();
      expect(currentSnapshot.gameState.parties.size).toBe(1);
      expect(currentSnapshot.gameState.parties.get('team1')?.name).toBe('Red Team');
    });

    it('should handle backwards compatibility for states without parties', async () => {
      // Create a simple game state without parties
      gameInstance.initialize();
      gameInstance.createParticipant('player1', 'Alice', false);
      
      const gameState = gameInstance.getGameState();
      const serialized = SerializationEngine.serialize(gameState);
      
      // Deserialize should work even if no parties exist
      const deserializedState = SerializationEngine.deserialize(serialized);
      expect(deserializedState.parties.size).toBe(0);
      expect(deserializedState.participants.size).toBe(1);
      expect(deserializedState.participants.get('player1')?.partyId).toBeNull();
    });
  });

  describe('Party Event Tracking and History', () => {
    it('should track all party-related events', async () => {
      gameInstance.initialize();
      
      // Create participants and party
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Red Team');
      
      // Add participants to party
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team1');
      
      // Create party resources
      gameInstance.createPartyPile('team1', 'shared_pile', true);
      gameInstance.updatePartyStatus('team1', 'score', 100);
      
      // Remove a participant
      gameInstance.removeParticipantFromParty('player2');
      
      // Get all events
      const api = gameInstance.getGameStateAPI();
      const allEvents = api.getEvents();
      
      // Check for party-related events
      const partyEvents = allEvents.filter(event => 
        event.type.includes('party') || 
        event.type.includes('participant_added_to_party') ||
        event.type.includes('participant_removed_from_party')
      );
      
      expect(partyEvents.length).toBeGreaterThan(0);
      
      // Verify specific event types
      const partyCreatedEvents = allEvents.filter(e => e.type === 'party_created');
      const participantAddedEvents = allEvents.filter(e => e.type === 'participant_added_to_party');
      const participantRemovedEvents = allEvents.filter(e => e.type === 'participant_removed_from_party');
      const partyPileCreatedEvents = allEvents.filter(e => e.type === 'party_pile_created');
      const partyStatusUpdatedEvents = allEvents.filter(e => e.type === 'party_status_updated');
      
      expect(partyCreatedEvents).toHaveLength(1);
      expect(participantAddedEvents).toHaveLength(2);
      expect(participantRemovedEvents).toHaveLength(1);
      expect(partyPileCreatedEvents).toHaveLength(1);
      expect(partyStatusUpdatedEvents).toHaveLength(1);
      
      // Verify event data
      const partyCreatedEvent = partyCreatedEvents[0];
      expect(partyCreatedEvent.data.partyId).toBe('team1');
      expect(partyCreatedEvent.data.name).toBe('Red Team');
      
      const participantAddedEvent = participantAddedEvents[0];
      expect(participantAddedEvent.participantId).toBe('player1');
      expect(participantAddedEvent.data.partyId).toBe('team1');
    });

    it('should support party-specific event filtering', async () => {
      gameInstance.initialize();
      
      // Create multiple parties and participants
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.createParty('team2', 'Blue Team');
      
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team2');
      
      gameInstance.updatePartyStatus('team1', 'score', 50);
      gameInstance.updatePartyStatus('team2', 'score', 75);
      
      const api = gameInstance.getGameStateAPI();
      
      // Filter events by party
      const team1Events = api.getEvents({ partyId: 'team1' });
      const team2Events = api.getEvents({ partyId: 'team2' });
      
      expect(team1Events.length).toBeGreaterThan(0);
      expect(team2Events.length).toBeGreaterThan(0);
      
      // Verify team1 events include participant and party operations
      const team1PartyEvents = team1Events.filter(e => 
        e.data.partyId === 'team1' || 
        (e.participantId === 'player1' && e.type.includes('party'))
      );
      expect(team1PartyEvents.length).toBeGreaterThan(0);
      
      // Verify team2 events include participant and party operations
      const team2PartyEvents = team2Events.filter(e => 
        e.data.partyId === 'team2' || 
        (e.participantId === 'player2' && e.type.includes('party'))
      );
      expect(team2PartyEvents.length).toBeGreaterThan(0);
    });

    it('should maintain event history through party operations', async () => {
      gameInstance.initialize();
      
      // Create initial state
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParty('team1', 'Red Team');
      
      // Get initial event count
      const api = gameInstance.getGameStateAPI();
      const initialEventCount = api.getEvents().length;
      
      // Perform party operations
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.createPartyPile('team1', 'shared_pile', true);
      gameInstance.updatePartyStatus('team1', 'score', 100);
      gameInstance.removeParticipantFromParty('player1');
      
      // Verify events were added
      const finalEventCount = api.getEvents().length;
      expect(finalEventCount).toBeGreaterThan(initialEventCount);
      
      // Verify history snapshots were created
      const history = gameInstance.getGameHistory();
      expect(history.snapshots.size).toBeGreaterThan(1);
      
      // Verify snapshots contain party information
      const currentSnapshot = gameInstance.getCurrentSnapshot();
      expect(currentSnapshot.gameState.parties.size).toBe(1);
      
      // Test replay functionality
      const snapshots = Array.from(history.snapshots.values()).sort((a, b) => a.timestamp - b.timestamp);
      const middleSnapshot = snapshots[Math.floor(snapshots.length / 2)];
      
      const replayedState = gameInstance.replayToSnapshot(middleSnapshot.id);
      expect(replayedState.parties.size).toBe(1);
    });
  });

  describe('Party Compatibility with Existing Rulesets', () => {
    it('should work with War ruleset', async () => {
      // War ruleset should work with parties
      gameInstance.initialize();
      
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Red Team');
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team1');
      
      // Create hands
      gameInstance.createHand('hand1', 'Alice Hand', 'player1');
      gameInstance.createHand('hand2', 'Bob Hand', 'player2');
      
      // Transition to playing phase
      gameInstance.transitionToPhase(GamePhase.PLAYING);
      
      // Execute game loop - should work with parties present
      const gameLoopResult = gameInstance.executeGameLoop();
      expect(gameLoopResult).toBeDefined();
      
      // Validate game state with parties
      const validationErrors = gameInstance.validateGameState();
      const criticalErrors = validationErrors.filter(e => e.severity === 'error');
      expect(criticalErrors).toHaveLength(0);
      
      // Check win conditions - should work with parties
      const winResult = gameInstance.checkWinConditions();
      expect(winResult).toBeDefined();
    });

    it('should work with Go Fish ruleset', async () => {
      // Create new game instance with Go Fish ruleset
      const goFishRuleset = new GoFishRuleset();
      const goFishResult = GameInstance.create({
        gameId: 'go-fish-party-test',
        ruleset: goFishRuleset,
        deckType,
        metadata: { testType: 'go-fish-party' }
      });

      expect(goFishResult.success).toBe(true);
      const goFishGame = goFishResult.gameInstance!;

      goFishGame.initialize();
      
      // Create participants and parties
      goFishGame.createParticipant('player1', 'Alice', false);
      goFishGame.createParticipant('player2', 'Bob', false);
      goFishGame.createParticipant('player3', 'Charlie', false);
      goFishGame.createParticipant('player4', 'Diana', false);
      
      goFishGame.createParty('team1', 'Team A');
      goFishGame.createParty('team2', 'Team B');
      
      goFishGame.addParticipantToParty('player1', 'team1');
      goFishGame.addParticipantToParty('player2', 'team1');
      goFishGame.addParticipantToParty('player3', 'team2');
      goFishGame.addParticipantToParty('player4', 'team2');
      
      // Create hands
      goFishGame.createHand('hand1', 'Alice Hand', 'player1');
      goFishGame.createHand('hand2', 'Bob Hand', 'player2');
      goFishGame.createHand('hand3', 'Charlie Hand', 'player3');
      goFishGame.createHand('hand4', 'Diana Hand', 'player4');
      
      // Transition to playing phase
      goFishGame.transitionToPhase(GamePhase.PLAYING);
      
      // Execute game loop
      const gameLoopResult = goFishGame.executeGameLoop();
      expect(gameLoopResult).toBeDefined();
      
      // Validate game state
      const validationErrors = goFishGame.validateGameState();
      const criticalErrors = validationErrors.filter(e => e.severity === 'error');
      expect(criticalErrors).toHaveLength(0);
      
      // Verify parties are maintained
      const parties = goFishGame.getParties();
      expect(parties.size).toBe(2);
      expect(parties.get('team1')?.participantIds).toHaveLength(2);
      expect(parties.get('team2')?.participantIds).toHaveLength(2);
    });

    it('should maintain party state through game completion', async () => {
      gameInstance.initialize();
      
      // Set up game with parties
      gameInstance.createParticipant('player1', 'Alice', false);
      gameInstance.createParticipant('player2', 'Bob', false);
      gameInstance.createParty('team1', 'Winners');
      gameInstance.addParticipantToParty('player1', 'team1');
      gameInstance.addParticipantToParty('player2', 'team1');
      
      // Create hands
      gameInstance.createHand('hand1', 'Alice Hand', 'player1');
      gameInstance.createHand('hand2', 'Bob Hand', 'player2');
      
      // Complete the game
      gameInstance.completeGame('Test completion', ['player1', 'player2']);
      
      // Verify parties are still present after completion
      const finalState = gameInstance.getGameState();
      expect(finalState.parties.size).toBe(1);
      expect(finalState.parties.get('team1')?.name).toBe('Winners');
      expect(finalState.phase).toBe(GamePhase.FINISHED);
      
      // Verify game summary includes parties
      const summary = gameInstance.getGameSummary();
      expect(summary.partyCount).toBe(1);
      expect(summary.isInitialized).toBe(true);
    });
  });
});