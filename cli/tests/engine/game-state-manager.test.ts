import { GameStateManager } from '../../src/engine/game-state-manager';
import { GamePhase } from '../../src/types/application-state';

// Mock GameState for testing (based on actual BigDeckEnergy API)
const createMockGameState = (overrides: Partial<any> = {}) => {
  return {
    gameId: 'test-game',
    phase: 'playing',
    gameboard: {},
    participants: new Map(),
    hands: new Map(),
    events: [],
    metadata: {},
    currentPlayer: 'player1',
    isEnded: false,
    isPlaying: true,
    isSetup: false,
    ...overrides
  } as any;
};

describe('GameStateManager', () => {
  let stateManager: GameStateManager;

  beforeEach(() => {
    stateManager = new GameStateManager();
  });

  afterEach(() => {
    stateManager.removeAllListeners();
  });

  describe('initialization', () => {
    it('should create state manager with default values', () => {
      expect(stateManager.getCurrentState()).toBeNull();
      expect(stateManager.getCurrentPhase()).toBe('setup');
    });

    it('should create state manager with custom history size', () => {
      const customManager = new GameStateManager(50);
      expect(customManager).toBeDefined();
    });
  });

  describe('state updates', () => {
    const mockState = createMockGameState();

    it('should update state and emit events', () => {
      const stateUpdateSpy = jest.fn();
      const stateChangedSpy = jest.fn();
      
      stateManager.on('stateUpdate', stateUpdateSpy);
      stateManager.on('stateChanged', stateChangedSpy);

      stateManager.updateState(mockState, 'initialization');

      expect(stateManager.getCurrentState()).toBe(mockState);
      expect(stateUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          newState: mockState,
          changeType: 'initialization',
          previousState: null
        })
      );
      expect(stateChangedSpy).toHaveBeenCalledWith(mockState, null);
    });

    it('should add metadata to state changes', () => {
      const stateUpdateSpy = jest.fn();
      stateManager.on('stateUpdate', stateUpdateSpy);

      const metadata = { testData: 'value' };
      stateManager.updateState(mockState, 'action_applied', metadata);

      expect(stateUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata
        })
      );
    });

    it('should maintain state history', () => {
      const state1 = createMockGameState({ currentPlayer: 'player1' });
      const state2 = createMockGameState({ currentPlayer: 'player2' });

      stateManager.updateState(state1, 'initialization');
      stateManager.updateState(state2, 'turn_change');

      const history = stateManager.getStateHistory();
      expect(history).toHaveLength(2);
      expect(history[0].changeType).toBe('initialization');
      expect(history[1].changeType).toBe('turn_change');
    });

    it('should limit history size', () => {
      const smallHistoryManager = new GameStateManager(2);
      smallHistoryManager.setValidationEnabled(false); // Disable validation for this test
      
      for (let i = 0; i < 5; i++) {
        const state = createMockGameState({ turn: i });
        smallHistoryManager.updateState(state, 'turn_change');
      }

      const history = smallHistoryManager.getStateHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('phase management', () => {
    it('should set phase and emit transition events', () => {
      const phaseTransitionSpy = jest.fn();
      const phaseChangedSpy = jest.fn();
      
      stateManager.on('phaseTransition', phaseTransitionSpy);
      stateManager.on('phaseChanged', phaseChangedSpy);

      stateManager.setPhase('playing', 'game started');

      expect(stateManager.getCurrentPhase()).toBe('playing');
      expect(phaseTransitionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'setup',
          to: 'playing',
          reason: 'game started'
        })
      );
      expect(phaseChangedSpy).toHaveBeenCalledWith('playing', 'setup');
    });

    it('should not emit events for same phase', () => {
      const phaseTransitionSpy = jest.fn();
      stateManager.on('phaseTransition', phaseTransitionSpy);

      stateManager.setPhase('setup'); // Same as initial phase

      expect(phaseTransitionSpy).not.toHaveBeenCalled();
    });

    it('should automatically transition phases based on state', () => {
      const phaseChangedSpy = jest.fn();
      stateManager.on('phaseChanged', phaseChangedSpy);

      // Mock state that indicates game is playing
      const playingState = createMockGameState({ 
        isPlaying: true,
        isSetup: false,
        isEnded: false 
      });

      stateManager.updateState(playingState, 'initialization');

      expect(phaseChangedSpy).toHaveBeenCalledWith('playing', 'setup');
    });
  });

  describe('state validation', () => {
    it('should validate state changes when enabled', () => {
      const validationErrorSpy = jest.fn();
      stateManager.on('stateValidationError', validationErrorSpy);

      // First set an initial state
      const initialState = createMockGameState({ currentPlayer: 'player1' });
      stateManager.updateState(initialState, 'initialization');

      // Try to do turn_change with same player (should fail validation)
      const invalidState = createMockGameState({ currentPlayer: 'player1' });
      stateManager.updateState(invalidState, 'turn_change');

      expect(validationErrorSpy).toHaveBeenCalled();
    });

    it('should skip validation when disabled', () => {
      const validationErrorSpy = jest.fn();
      stateManager.on('stateValidationError', validationErrorSpy);

      stateManager.setValidationEnabled(false);

      const state = createMockGameState();
      stateManager.updateState(state, 'turn_change');

      expect(validationErrorSpy).not.toHaveBeenCalled();
      expect(stateManager.getCurrentState()).toBe(state);
    });

    it('should validate initialization change type', () => {
      const state = createMockGameState();
      const isValid = stateManager.validateStateChange(null, state, 'initialization');
      expect(isValid).toBe(true);
    });

    it('should validate turn change', () => {
      const state1 = createMockGameState({ currentPlayer: 'player1' });
      const state2 = createMockGameState({ currentPlayer: 'player2' });
      
      const isValid = stateManager.validateStateChange(state1, state2, 'turn_change');
      expect(isValid).toBe(true);
    });

    it('should reject invalid turn change', () => {
      const state1 = createMockGameState({ currentPlayer: 'player1' });
      const state2 = createMockGameState({ currentPlayer: 'player1' }); // Same player
      
      const isValid = stateManager.validateStateChange(state1, state2, 'turn_change');
      expect(isValid).toBe(false);
    });
  });

  describe('snapshots', () => {
    it('should create state snapshot', () => {
      const state = createMockGameState();
      stateManager.updateState(state, 'initialization');
      stateManager.setPhase('playing');

      const snapshot = stateManager.createSnapshot();

      expect(snapshot.state).toBe(state);
      expect(snapshot.phase).toBe('playing');
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should restore from snapshot', () => {
      const originalState = createMockGameState({ currentPlayer: 'player1' });
      const snapshotState = createMockGameState({ currentPlayer: 'player2' });
      
      stateManager.updateState(originalState, 'initialization');
      
      const snapshot = {
        state: snapshotState,
        phase: 'playing' as GamePhase,
        timestamp: Date.now(),
        history: []
      };

      const stateRestoredSpy = jest.fn();
      stateManager.on('stateRestored', stateRestoredSpy);

      stateManager.restoreFromSnapshot(snapshot);

      expect(stateManager.getCurrentState()).toBe(snapshotState);
      expect(stateManager.getCurrentPhase()).toBe('playing');
      expect(stateRestoredSpy).toHaveBeenCalledWith(snapshot, originalState);
    });

    it('should throw error for invalid snapshot', () => {
      const invalidSnapshot = {
        state: null,
        phase: 'playing' as GamePhase,
        timestamp: Date.now()
      };

      expect(() => {
        stateManager.restoreFromSnapshot(invalidSnapshot);
      }).toThrow('Invalid snapshot: missing state');
    });
  });

  describe('consistency reporting', () => {
    it('should report consistent state', () => {
      const state = createMockGameState();
      stateManager.updateState(state, 'initialization');

      const report = stateManager.getConsistencyReport();

      expect(report.isConsistent).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('should report inconsistent state when no state available', () => {
      const report = stateManager.getConsistencyReport();

      expect(report.isConsistent).toBe(false);
      expect(report.issues).toContain('No current state available');
    });
  });

  describe('history management', () => {
    it('should clear history', () => {
      const state = createMockGameState();
      stateManager.updateState(state, 'initialization');

      expect(stateManager.getStateHistory()).toHaveLength(1);

      const historyCleanedSpy = jest.fn();
      stateManager.on('historyCleaned', historyCleanedSpy);

      stateManager.clearHistory();

      expect(stateManager.getStateHistory()).toHaveLength(0);
      expect(historyCleanedSpy).toHaveBeenCalled();
    });

    it('should return copy of history', () => {
      const state = createMockGameState();
      stateManager.updateState(state, 'initialization');

      const history1 = stateManager.getStateHistory();
      const history2 = stateManager.getStateHistory();

      expect(history1).not.toBe(history2); // Different objects
      expect(history1).toEqual(history2); // Same content
    });
  });
});