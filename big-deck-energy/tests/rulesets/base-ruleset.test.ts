import { BaseRuleset } from '../../src/rulesets/base/base-ruleset';
import { GameState } from '../../src/models/game-state';
import { Participant } from '../../src/models/participant';
import { Hand } from '../../src/models/hand';
import { Gameboard } from '../../src/models/gameboard';
import { GamePhase } from '../../src/core/types';
import { DeckType, GameLoopResult, WinResult, ValidationError } from '../../src/core/interfaces';

// Test implementation of BaseRuleset
class TestRuleset extends BaseRuleset {
  public readonly name = 'test-ruleset';
  public readonly minPlayers = 2;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['standard-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    return this.transitionToPhase(gameState, GamePhase.DEALING);
  }

  public gameloop(gameState: GameState): GameLoopResult {
    if (gameState.phase === GamePhase.DEALING) {
      return this.createGameLoopResult(true, this.transitionToPhase(gameState, GamePhase.PLAYING));
    }
    
    return this.createGameLoopResult(false, gameState, true);
  }

  public wincondition(gameState: GameState): WinResult {
    const activeParticipants = this.getActiveParticipants(gameState);
    if (activeParticipants.length <= 1) {
      return this.createWinResult(true, activeParticipants, 'Last player remaining');
    }
    return this.createWinResult(false);
  }
}

describe('BaseRuleset', () => {
  let testRuleset: TestRuleset;
  let gameState: GameState;
  let participant1: Participant;
  let participant2: Participant;
  let participant3: Participant;
  let hand1: Hand;
  let hand2: Hand;
  let gameboard: Gameboard;

  beforeEach(() => {
    testRuleset = new TestRuleset();
    
    participant1 = new Participant('player1', 'Alice', false, ['hand1']);
    participant2 = new Participant('player2', 'Bob', false, ['hand2']);
    participant3 = new Participant('player3', 'Charlie', false, []); // No hands (inactive)
    
    hand1 = new Hand('hand1', 'Alice Hand', 'player1');
    hand2 = new Hand('hand2', 'Bob Hand', 'player2');
    
    gameboard = new Gameboard();
    
    const participants = new Map([
      ['player1', participant1],
      ['player2', participant2],
      ['player3', participant3]
    ]);
    
    const hands = new Map([
      ['hand1', hand1],
      ['hand2', hand2]
    ]);
    
    gameState = new GameState('test-game', GamePhase.SETUP, gameboard, participants, hands);
  });

  describe('Basic Ruleset Properties', () => {
    it('should have correct basic properties', () => {
      expect(testRuleset.name).toBe('test-ruleset');
      expect(testRuleset.minPlayers).toBe(2);
      expect(testRuleset.maxPlayers).toBe(4);
      expect(testRuleset.compatibleDeckTypes).toEqual(['standard-deck']);
    });
  });

  describe('Default Validation', () => {
    it('should validate participant count - sufficient players', () => {
      const errors = testRuleset.validate(gameState);
      const playerCountErrors = errors.filter(e => e.code === 'INSUFFICIENT_PLAYERS');
      expect(playerCountErrors).toHaveLength(0);
    });

    it('should validate participant count - insufficient players', () => {
      const singlePlayerState = new GameState(
        'test-game',
        GamePhase.SETUP,
        gameboard,
        new Map([['player1', participant1]]),
        new Map([['hand1', hand1]])
      );
      
      const errors = testRuleset.validate(singlePlayerState);
      const playerCountErrors = errors.filter(e => e.code === 'INSUFFICIENT_PLAYERS');
      expect(playerCountErrors).toHaveLength(1);
      expect(playerCountErrors[0].message).toContain('at least 2 players');
      expect(playerCountErrors[0].severity).toBe('error');
    });

    it('should validate participant count - too many players', () => {
      const participants = new Map();
      const hands = new Map();
      
      for (let i = 1; i <= 5; i++) {
        const participant = new Participant(`player${i}`, `Player ${i}`, false, [`hand${i}`]);
        const hand = new Hand(`hand${i}`, `Hand ${i}`, `player${i}`);
        participants.set(`player${i}`, participant);
        hands.set(`hand${i}`, hand);
      }
      
      const tooManyPlayersState = new GameState('test-game', GamePhase.SETUP, gameboard, participants, hands);
      
      const errors = testRuleset.validate(tooManyPlayersState);
      const playerCountErrors = errors.filter(e => e.code === 'TOO_MANY_PLAYERS');
      expect(playerCountErrors).toHaveLength(1);
      expect(playerCountErrors[0].message).toContain('at most 4 players');
      expect(playerCountErrors[0].severity).toBe('error');
    });

    it('should validate game phase', () => {
      const invalidPhaseState = new GameState(
        'test-game',
        'invalid-phase' as GamePhase,
        gameboard,
        gameState.participants,
        gameState.hands
      );
      
      const errors = testRuleset.validate(invalidPhaseState);
      const phaseErrors = errors.filter(e => e.code === 'INVALID_GAME_PHASE');
      expect(phaseErrors).toHaveLength(1);
      expect(phaseErrors[0].message).toContain('Invalid game phase');
      expect(phaseErrors[0].severity).toBe('error');
    });

    it('should validate participant-hand relationships', () => {
      // Create participant referencing non-existent hand
      const badParticipant = new Participant('bad-player', 'Bad Player', false, ['nonexistent-hand']);
      const participants = new Map([
        ['player1', participant1],
        ['bad-player', badParticipant]
      ]);
      
      const badState = new GameState('test-game', GamePhase.SETUP, gameboard, participants, gameState.hands);
      
      const errors = testRuleset.validate(badState);
      const handErrors = errors.filter(e => e.code === 'MISSING_HAND');
      expect(handErrors).toHaveLength(1);
      expect(handErrors[0].message).toContain('nonexistent-hand');
    });

    it('should validate hand ownership', () => {
      // Create hand with wrong participant ID
      const wrongHand = new Hand('wrong-hand', 'Wrong Hand', 'wrong-participant');
      const participant = new Participant('correct-participant', 'Correct', false, ['wrong-hand']);
      
      const participants = new Map([['correct-participant', participant]]);
      const hands = new Map([['wrong-hand', wrongHand]]);
      
      const badState = new GameState('test-game', GamePhase.SETUP, gameboard, participants, hands);
      
      const errors = testRuleset.validate(badState);
      const ownershipErrors = errors.filter(e => e.code === 'HAND_OWNERSHIP_MISMATCH');
      expect(ownershipErrors).toHaveLength(1);
    });

    it('should validate orphaned hands', () => {
      const orphanedHand = new Hand('orphaned', 'Orphaned Hand', 'nonexistent-participant');
      const hands = new Map([
        ['hand1', hand1],
        ['orphaned', orphanedHand]
      ]);
      
      const badState = new GameState('test-game', GamePhase.SETUP, gameboard, gameState.participants, hands);
      
      const errors = testRuleset.validate(badState);
      const orphanErrors = errors.filter(e => e.code === 'ORPHANED_HAND');
      expect(orphanErrors).toHaveLength(1);
      expect(orphanErrors[0].message).toContain('nonexistent-participant');
    });
  });

  describe('Utility Methods', () => {
    it('should create Game State API', () => {
      const api = (testRuleset as any).createGameStateAPI(gameState);
      expect(api).toBeDefined();
      expect(typeof api.createParticipant).toBe('function');
      expect(typeof api.createHand).toBe('function');
    });

    it('should check if game has ended', () => {
      expect((testRuleset as any).isGameEnded(gameState)).toBe(false);
      
      const finishedState = gameState.withPhase(GamePhase.FINISHED);
      expect((testRuleset as any).isGameEnded(finishedState)).toBe(true);
    });

    it('should transition game phase', () => {
      const newState = (testRuleset as any).transitionToPhase(gameState, GamePhase.PLAYING);
      expect(newState.phase).toBe(GamePhase.PLAYING);
      expect(newState.gameId).toBe(gameState.gameId);
      expect(gameState.phase).toBe(GamePhase.SETUP); // Original unchanged
    });

    it('should get active participants', () => {
      const activeParticipants = (testRuleset as any).getActiveParticipants(gameState);
      expect(activeParticipants).toEqual(['player1', 'player2']);
      expect(activeParticipants).not.toContain('player3'); // No hands
    });

    it('should check if participant is active', () => {
      expect((testRuleset as any).isParticipantActive(gameState, 'player1')).toBe(true);
      expect((testRuleset as any).isParticipantActive(gameState, 'player2')).toBe(true);
      expect((testRuleset as any).isParticipantActive(gameState, 'player3')).toBe(false); // No hands
      expect((testRuleset as any).isParticipantActive(gameState, 'nonexistent')).toBe(false);
    });

    it('should create game loop result', () => {
      const result = (testRuleset as any).createGameLoopResult(true, gameState, false);
      expect(result.canContinue).toBe(true);
      expect(result.updatedGameState).toBe(gameState);
      expect(result.requiresParticipantInteraction).toBe(false);
    });

    it('should create win result', () => {
      const result = (testRuleset as any).createWinResult(true, ['player1'], 'Player 1 wins');
      expect(result.gameEnded).toBe(true);
      expect(result.winners).toEqual(['player1']);
      expect(result.reason).toBe('Player 1 wins');
    });

    it('should create validation error', () => {
      const error = (testRuleset as any).createValidationError('TEST_ERROR', 'Test message', 'warning');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.severity).toBe('warning');
    });

    it('should handle errors', () => {
      const testError = new Error('Test error');
      const validationError = (testRuleset as any).handleError(testError, 'test context');
      expect(validationError.code).toBe('RULESET_ERROR');
      expect(validationError.message).toContain('test context');
      expect(validationError.message).toContain('Test error');
      expect(validationError.severity).toBe('error');
    });

    it('should safely execute operations', () => {
      // Successful operation
      const successResult = (testRuleset as any).safeExecute(() => 'success', 'test');
      expect(successResult.result).toBe('success');
      expect(successResult.error).toBeUndefined();
      
      // Failed operation
      const failResult = (testRuleset as any).safeExecute(() => {
        throw new Error('Test error');
      }, 'test');
      expect(failResult.result).toBeUndefined();
      expect(failResult.error).toBeDefined();
      expect(failResult.error?.code).toBe('RULESET_ERROR');
    });

    it('should safely execute with custom error handler', () => {
      const customErrorHandler = (error: Error) => ({
        code: 'CUSTOM_ERROR',
        message: `Custom: ${error.message}`,
        severity: 'warning' as const
      });
      
      const result = (testRuleset as any).safeExecute(() => {
        throw new Error('Test error');
      }, 'test', customErrorHandler);
      
      expect(result.error?.code).toBe('CUSTOM_ERROR');
      expect(result.error?.message).toBe('Custom: Test error');
      expect(result.error?.severity).toBe('warning');
    });
  });

  describe('Abstract Method Implementation', () => {
    it('should implement setup method', () => {
      const mockDeckType = { name: 'test-deck' } as DeckType;
      const result = testRuleset.setup(gameState, mockDeckType);
      expect(result.phase).toBe(GamePhase.DEALING);
    });

    it('should implement gameloop method', () => {
      // Test dealing phase
      const dealingState = gameState.withPhase(GamePhase.DEALING);
      const dealingResult = testRuleset.gameloop(dealingState);
      expect(dealingResult.canContinue).toBe(true);
      expect(dealingResult.updatedGameState.phase).toBe(GamePhase.PLAYING);
      expect(dealingResult.requiresParticipantInteraction).toBe(false);
      
      // Test playing phase
      const playingState = gameState.withPhase(GamePhase.PLAYING);
      const playingResult = testRuleset.gameloop(playingState);
      expect(playingResult.canContinue).toBe(false);
      expect(playingResult.requiresParticipantInteraction).toBe(true);
    });

    it('should implement wincondition method', () => {
      // Multiple active participants - no winner
      const noWinResult = testRuleset.wincondition(gameState);
      expect(noWinResult.gameEnded).toBe(false);
      expect(noWinResult.winners).toEqual([]);
      
      // Single active participant - winner
      const singlePlayerState = new GameState(
        'test-game',
        GamePhase.PLAYING,
        gameboard,
        new Map([['player1', participant1]]),
        new Map([['hand1', hand1]])
      );
      
      const winResult = testRuleset.wincondition(singlePlayerState);
      expect(winResult.gameEnded).toBe(true);
      expect(winResult.winners).toEqual(['player1']);
      expect(winResult.reason).toBe('Last player remaining');
    });
  });

  describe('Integration with Game State API', () => {
    it('should create and use Game State API', () => {
      const api = (testRuleset as any).createGameStateAPI(gameState);
      
      // Test API functionality
      api.createParticipant('new-player', 'New Player', false);
      const updatedState = api.getGameState();
      
      expect(updatedState.participants.has('new-player')).toBe(true);
      expect(updatedState.participants.get('new-player')?.name).toBe('New Player');
    });
  });
});