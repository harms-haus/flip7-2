import { TeamHeartsRuleset } from '../../src/rulesets/team-hearts/team-hearts-ruleset';
import { StandardPlayingDeck } from '../../src/deck-types/standard/standard-playing-deck';
import { GameState } from '../../src/core/interfaces/game-state';
import { GamePhase } from '../../src/core/types';
import { Gameboard } from '../../src/models/gameboard';
import { Participant } from '../../src/models/participant';

describe('TeamHeartsRuleset', () => {
  let ruleset: TeamHeartsRuleset;
  let deckType: StandardPlayingDeck;
  let initialGameState: GameState;

  beforeEach(() => {
    ruleset = new TeamHeartsRuleset();
    deckType = new StandardPlayingDeck();
    
    // Create initial game state with 4 participants
    initialGameState = {
      gameId: 'test-game',
      phase: GamePhase.SETUP,
      gameboard: new Gameboard(),
      participants: new Map([
        ['alice', new Participant('alice', 'Alice', false)],
        ['bob', new Participant('bob', 'Bob', false)],
        ['charlie', new Participant('charlie', 'Charlie', false)],
        ['diana', new Participant('diana', 'Diana', false)]
      ]),
      hands: new Map(),
      parties: new Map(),
      events: [],
      metadata: {},
      version: '1.0.0',
      timestamp: Date.now()
    };
  });

  describe('Basic Properties', () => {
    test('should have correct name and player limits', () => {
      expect(ruleset.name).toBe('team-hearts');
      expect(ruleset.minPlayers).toBe(4);
      expect(ruleset.maxPlayers).toBe(4);
      expect(ruleset.compatibleDeckTypes).toEqual(['standard-playing-deck']);
    });
  });

  describe('Game Setup', () => {
    test('should set up game with teams and deal cards', () => {
      const gameState = ruleset.setup(initialGameState, deckType);

      // Check that teams were created
      expect(gameState.parties.size).toBe(2);
      expect(gameState.parties.has('team_north_south')).toBe(true);
      expect(gameState.parties.has('team_east_west')).toBe(true);

      // Check team membership
      const northSouthTeam = gameState.parties.get('team_north_south')!;
      const eastWestTeam = gameState.parties.get('team_east_west')!;
      
      expect(northSouthTeam.participantIds).toEqual(['alice', 'charlie']);
      expect(eastWestTeam.participantIds).toEqual(['bob', 'diana']);

      // Check that participants are assigned to teams
      expect(gameState.participants.get('alice')!.partyId).toBe('team_north_south');
      expect(gameState.participants.get('bob')!.partyId).toBe('team_east_west');
      expect(gameState.participants.get('charlie')!.partyId).toBe('team_north_south');
      expect(gameState.participants.get('diana')!.partyId).toBe('team_east_west');

      // Check that hands were created and cards dealt
      expect(gameState.hands.size).toBe(4);
      for (const participantId of ['alice', 'bob', 'charlie', 'diana']) {
        const hand = gameState.hands.get(`${participantId}_hand`);
        expect(hand).toBeDefined();
        expect(hand!.piles.get('cards')!.cards.length).toBe(13);
      }

      // Check team score piles were created
      expect(northSouthTeam.piles.has('score_cards')).toBe(true);
      expect(eastWestTeam.piles.has('score_cards')).toBe(true);

      // Check initial team scores
      expect(northSouthTeam.status.score).toBe(0);
      expect(eastWestTeam.status.score).toBe(0);

      // Check game phase
      expect(gameState.phase).toBe(GamePhase.PLAYING);
    });

    test('should assign correct positions to players', () => {
      const gameState = ruleset.setup(initialGameState, deckType);

      expect(gameState.participants.get('alice')!.status.position).toBe('North');
      expect(gameState.participants.get('bob')!.status.position).toBe('East');
      expect(gameState.participants.get('charlie')!.status.position).toBe('South');
      expect(gameState.participants.get('diana')!.status.position).toBe('West');
    });

    test('should set first player turn', () => {
      const gameState = ruleset.setup(initialGameState, deckType);

      expect(gameState.participants.get('alice')!.status.is_turn).toBe(true);
      expect(gameState.participants.get('bob')!.status.is_turn).toBe(false);
      expect(gameState.participants.get('charlie')!.status.is_turn).toBe(false);
      expect(gameState.participants.get('diana')!.status.is_turn).toBe(false);
    });
  });

  describe('Validation', () => {
    test('should validate correct game state', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      const errors = ruleset.validate(gameState);
      expect(errors).toHaveLength(0);
    });

    test('should detect invalid player count', () => {
      const invalidState = {
        ...initialGameState,
        participants: new Map([
          ['alice', new Participant('alice', 'Alice', false)],
          ['bob', new Participant('bob', 'Bob', false)]
        ])
      };

      const errors = ruleset.validate(invalidState);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.code === 'INVALID_PLAYER_COUNT')).toBe(true);
    });

    test('should detect invalid team count', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      // Remove one team
      gameState.parties.delete('team_east_west');

      const errors = ruleset.validate(gameState);
      expect(errors.some(e => e.code === 'INVALID_TEAM_COUNT')).toBe(true);
    });
  });

  describe('Team Information', () => {
    test('should provide correct team information', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      const aliceTeamInfo = ruleset.getTeamInfo(gameState, 'alice');

      expect(aliceTeamInfo).toBeDefined();
      expect(aliceTeamInfo.teamId).toBe('team_north_south');
      expect(aliceTeamInfo.teamName).toBe('North/South Team');
      expect(aliceTeamInfo.teammates).toEqual(['charlie']);
      expect(aliceTeamInfo.score).toBe(0);
      expect(aliceTeamInfo.tricksWon).toBe(0);
    });

    test('should return null for participant not in team', () => {
      const teamInfo = ruleset.getTeamInfo(initialGameState, 'alice');
      expect(teamInfo).toBeNull();
    });
  });

  describe('Action Processing', () => {
    test('should process team communication', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      
      const updatedState = ruleset.processAction(gameState, {
        type: 'share_team_info',
        participantId: 'alice',
        data: {
          message: 'I have the Queen of Spades',
          targetTeammate: 'charlie'
        }
      });

      const northSouthTeam = updatedState.parties.get('team_north_south')!;
      const communications = northSouthTeam.status.communications as any[];
      
      expect(communications).toBeDefined();
      expect(communications.length).toBe(1);
      expect(communications[0].from).toBe('alice');
      expect(communications[0].message).toBe('I have the Queen of Spades');
    });

    test('should process card play action', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      
      // Get Alice's first card
      const aliceHand = gameState.hands.get('alice_hand')!;
      const firstCard = aliceHand.piles.get('cards')!.cards[0]!;

      const updatedState = ruleset.processAction(gameState, {
        type: 'play_card',
        participantId: 'alice',
        data: {
          cardId: firstCard.card.id
        }
      });

      // Check that card was moved to current trick
      const currentTrick = updatedState.gameboard.piles.get('current_trick')!;
      expect(currentTrick.cards.length).toBe(1);
      expect(currentTrick.cards[0]!.card.id).toBe(firstCard.card.id);

      // Check that Alice's turn ended
      expect(updatedState.participants.get('alice')!.status.is_turn).toBe(false);
      expect(updatedState.participants.get('alice')!.status.has_played_card).toBe(true);

      // Check that next player's turn started
      expect(updatedState.participants.get('bob')!.status.is_turn).toBe(true);
    });
  });

  describe('Win Conditions', () => {
    test('should detect no winner initially', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      const winResult = ruleset.wincondition(gameState);

      expect(winResult.gameEnded).toBe(false);
      expect(winResult.winners).toEqual([]);
    });

    test('should detect team winner when score reaches 100', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      const api = (ruleset as any).createGameStateAPI(gameState);
      
      // Manually set team scores using API
      api.updatePartyStatus('team_north_south', 'score', 85);
      api.updatePartyStatus('team_east_west', 'score', 100);

      const winResult = ruleset.wincondition(api.getGameState());

      expect(winResult.gameEnded).toBe(true);
      expect(winResult.winners).toEqual(['team_north_south']);
      expect(winResult.reason).toContain('North/South team wins');
    });
  });

  describe('Current Trick Information', () => {
    test('should provide current trick information', () => {
      const gameState = ruleset.setup(initialGameState, deckType);
      const trickInfo = ruleset.getCurrentTrick(gameState);

      expect(trickInfo).toBeDefined();
      expect(trickInfo.cards).toEqual([]);
      expect(trickInfo.leader).toBe('alice');
      expect(trickInfo.trickNumber).toBe(1);
    });
  });
});