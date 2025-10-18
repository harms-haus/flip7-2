import { GameLoop, GameAction } from '../../src/engine/game-loop';

// Mock GameInstance for testing (based on actual BigDeckEnergy API)
const createMockGameInstance = (overrides: Partial<any> = {}) => {
  return {
    getState: jest.fn().mockReturnValue({ 
      gameId: 'test-game',
      phase: 'playing',
      gameboard: {},
      participants: new Map(),
      hands: new Map(),
      events: [],
      metadata: {}
    }),
    getCurrentPhase: jest.fn().mockReturnValue('playing'),
    getCurrentPlayer: jest.fn().mockReturnValue('player1'),
    applyAction: jest.fn().mockReturnValue(true),
    isGameEnded: jest.fn().mockReturnValue(false),
    getWinner: jest.fn().mockReturnValue(''),
    nextTurn: jest.fn(),
    getTurnCount: jest.fn().mockReturnValue(1),
    getFinalScores: jest.fn().mockReturnValue({}),
    startTime: Date.now(),
    ...overrides
  } as any;
};

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let mockGameInstance: any;

  beforeEach(() => {
    mockGameInstance = createMockGameInstance();
    gameLoop = new GameLoop(mockGameInstance);
  });

  afterEach(() => {
    gameLoop.removeAllListeners();
  });

  describe('initialization', () => {
    it('should create game loop with game instance', () => {
      expect(gameLoop).toBeDefined();
      expect(gameLoop.getGameState()).toBeDefined();
    });

    it('should create game loop with turn time limit', () => {
      const gameLoopWithTimer = new GameLoop(mockGameInstance, 30000);
      expect(gameLoopWithTimer).toBeDefined();
    });
  });

  describe('game start', () => {
    it('should emit gameStart event when started', () => {
      const gameStartSpy = jest.fn();
      gameLoop.on('gameStart', gameStartSpy);

      gameLoop.start();

      expect(gameStartSpy).toHaveBeenCalledWith(mockGameInstance);
    });

    it('should emit stateUpdate event when started', () => {
      const stateUpdateSpy = jest.fn();
      gameLoop.on('stateUpdate', stateUpdateSpy);

      gameLoop.start();

      expect(stateUpdateSpy).toHaveBeenCalledWith((mockGameInstance as any).getState());
    });
  });

  describe('action processing', () => {
    const validAction: GameAction = {
      type: 'test_action',
      playerId: 'player1',
      payload: { test: true },
      timestamp: Date.now()
    };

    beforeEach(() => {
      gameLoop.start();
    });

    it('should process valid action', () => {
      const result = gameLoop.processAction(validAction);
      expect(result).toBe(true);
    });

    it('should emit actionProcessed event for valid action', () => {
      const actionProcessedSpy = jest.fn();
      gameLoop.on('actionProcessed', actionProcessedSpy);

      gameLoop.processAction(validAction);

      expect(actionProcessedSpy).toHaveBeenCalledWith(validAction);
    });

    it('should emit stateUpdate event after processing action', () => {
      const stateUpdateSpy = jest.fn();
      gameLoop.on('stateUpdate', stateUpdateSpy);

      // Clear the initial stateUpdate from start()
      stateUpdateSpy.mockClear();

      gameLoop.processAction(validAction);

      expect(stateUpdateSpy).toHaveBeenCalled();
    });

    it('should reject action from wrong player', () => {
      const wrongPlayerAction: GameAction = {
        ...validAction,
        playerId: 'player2'
      };

      const actionRejectedSpy = jest.fn();
      gameLoop.on('actionRejected', actionRejectedSpy);

      const result = gameLoop.processAction(wrongPlayerAction);

      expect(result).toBe(false);
      expect(actionRejectedSpy).toHaveBeenCalledWith(wrongPlayerAction, 'Invalid action');
    });

    it('should reject action with missing type', () => {
      const invalidAction: GameAction = {
        ...validAction,
        type: ''
      };

      const result = gameLoop.processAction(invalidAction);
      expect(result).toBe(false);
    });

    it('should handle action application failure', () => {
      const failingGameInstance = createMockGameInstance({
        applyAction: jest.fn().mockReturnValue(false)
      });
      const failingGameLoop = new GameLoop(failingGameInstance);
      failingGameLoop.start();

      const actionRejectedSpy = jest.fn();
      failingGameLoop.on('actionRejected', actionRejectedSpy);

      const result = failingGameLoop.processAction(validAction);

      expect(result).toBe(false);
      expect(actionRejectedSpy).toHaveBeenCalledWith(validAction, 'Action failed to apply');
    });
  });

  describe('turn management', () => {
    beforeEach(() => {
      gameLoop.start();
    });

    it('should get current player', () => {
      const currentPlayer = gameLoop.getCurrentPlayer();
      expect(currentPlayer).toBeDefined();
    });

    it('should emit turnChange event when turn advances', () => {
      const turnChangeSpy = jest.fn();
      gameLoop.on('turnChange', turnChangeSpy);

      // Mock turn change by having getCurrentPlayer return different values
      let callCount = 0;
      (mockGameInstance as any).getCurrentPlayer = jest.fn(() => {
        callCount++;
        return callCount <= 2 ? 'player1' : 'player2';
      });

      // Mock nextTurn to actually change the current player
      (mockGameInstance as any).nextTurn = jest.fn(() => {
        callCount = 3; // Force the next getCurrentPlayer call to return 'player2'
      });

      const validAction: GameAction = {
        type: 'test_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now()
      };

      gameLoop.processAction(validAction);

      expect(turnChangeSpy).toHaveBeenCalledWith('player2', 'player1');
    });
  });

  describe('turn timer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      gameLoop = new GameLoop(mockGameInstance, 1000); // 1 second timer
      gameLoop.start();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start turn timer', () => {
      const timerStartedSpy = jest.fn();
      gameLoop.on('turnTimerStarted', timerStartedSpy);

      gameLoop.startTurnTimer(5000);

      expect(timerStartedSpy).toHaveBeenCalledWith(5000);
    });

    it('should emit turnTimeout when timer expires', () => {
      const timeoutSpy = jest.fn();
      gameLoop.on('turnTimeout', timeoutSpy);

      gameLoop.startTurnTimer(1000);
      jest.advanceTimersByTime(1000);

      expect(timeoutSpy).toHaveBeenCalled();
    });

    it('should clear turn timer', () => {
      const timerClearedSpy = jest.fn();
      gameLoop.on('turnTimerCleared', timerClearedSpy);

      gameLoop.startTurnTimer(1000);
      gameLoop.clearTurnTimer();

      expect(timerClearedSpy).toHaveBeenCalled();
    });
  });

  describe('game end', () => {
    it('should emit gameEnd event when game ends', () => {
      const endedGameInstance = createMockGameInstance({
        isGameEnded: jest.fn().mockReturnValue(true),
        getWinner: jest.fn().mockReturnValue('player1')
      });
      const endingGameLoop = new GameLoop(endedGameInstance);
      endingGameLoop.start();

      const gameEndSpy = jest.fn();
      endingGameLoop.on('gameEnd', gameEndSpy);

      const validAction: GameAction = {
        type: 'winning_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now()
      };

      endingGameLoop.processAction(validAction);

      expect(gameEndSpy).toHaveBeenCalled();
    });

    it('should force end game', () => {
      const gameEndSpy = jest.fn();
      gameLoop.on('gameEnd', gameEndSpy);

      gameLoop.forceEnd('test reason');

      expect(gameEndSpy).toHaveBeenCalledWith(
        mockGameInstance,
        expect.objectContaining({
          winner: '',
          endReason: 'forfeit',
          stats: expect.objectContaining({
            customStats: { endReason: 'test reason' }
          })
        })
      );
    });
  });

  describe('action queuing', () => {
    it('should queue actions when processing is in progress', () => {
      // This test verifies that actions can be queued
      const action1: GameAction = {
        type: 'action1',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now()
      };

      const action2: GameAction = {
        type: 'action2',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now() + 1
      };

      // Process both actions
      const result1 = gameLoop.processAction(action1);
      const result2 = gameLoop.processAction(action2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});