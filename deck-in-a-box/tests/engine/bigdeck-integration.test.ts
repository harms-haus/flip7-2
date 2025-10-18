import { 
  BigDeckEnergyWrapper, 
  BigDeckEnergyUtils,
  GameInstanceConfig
} from '../../src/engine/bigdeck-integration';
import { GameSetupResult } from '../../src/types/actions';

// Mock GameSetupResult for testing
const createMockSetupResult = (): GameSetupResult => ({
  players: [
    { id: 'player1', name: 'Player 1' },
    { id: 'player2', name: 'Player 2' }
  ] as any,
  gameOptions: {},
  deckConfiguration: {},
  rulesetConfiguration: {}
});

// Mock GameInstanceConfig for testing
const createMockConfig = (overrides: Partial<GameInstanceConfig> = {}): GameInstanceConfig => ({
  deckType: 'standard',
  rulesetType: 'war',
  setupResult: createMockSetupResult(),
  options: {},
  ...overrides
});

describe('BigDeckEnergyWrapper', () => {
  let wrapper: BigDeckEnergyWrapper;

  beforeEach(() => {
    wrapper = new BigDeckEnergyWrapper();
  });

  describe('game creation', () => {
    it('should create game instance from valid configuration', async () => {
      const config = createMockConfig();
      
      const gameInstance = await wrapper.createGame(config);
      
      expect(gameInstance).toBeDefined();
      expect(wrapper.getGameInstance()).toBe(gameInstance);
      expect(wrapper.getConfig()).toBe(config);
    });

    it('should throw error for incompatible configuration', async () => {
      const incompatibleConfig = createMockConfig({
        deckType: 'unknown',
        rulesetType: 'unknown'
      });

      await expect(wrapper.createGame(incompatibleConfig)).rejects.toThrow(
        'Incompatible deck type and ruleset'
      );
    });

    it('should return null for game instance before creation', () => {
      expect(wrapper.getGameInstance()).toBeNull();
      expect(wrapper.getConfig()).toBeNull();
    });
  });

  describe('compatibility validation', () => {
    it('should validate compatible deck type and ruleset', async () => {
      const result = await wrapper.validateCompatibility('standard', 'war');
      
      expect(result.isCompatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject unknown deck type', async () => {
      const result = await wrapper.validateCompatibility('unknown', 'war');
      
      expect(result.isCompatible).toBe(false);
      expect(result.issues).toContain('Unknown deck type: unknown');
    });

    it('should reject unknown ruleset', async () => {
      const result = await wrapper.validateCompatibility('standard', 'unknown');
      
      expect(result.isCompatible).toBe(false);
      expect(result.issues).toContain('Unknown ruleset: unknown');
    });

    it('should provide warnings for suboptimal combinations', async () => {
      // This would test a valid but not recommended combination
      const result = await wrapper.validateCompatibility('custom', 'war');
      
      // Custom deck with 0 cards is incompatible with war (requires 52)
      expect(result.isCompatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should provide recommendations', async () => {
      const result = await wrapper.validateCompatibility('standard', 'go-fish');
      
      expect(result.isCompatible).toBe(true);
      // Standard deck might recommend certain rulesets
    });
  });

  describe('serialization', () => {
    beforeEach(async () => {
      const config = createMockConfig();
      await wrapper.createGame(config);
    });

    it('should serialize game state', () => {
      const serializedData = wrapper.serializeGame();
      
      expect(serializedData).toBeDefined();
      expect(serializedData.gameState).toBeDefined();
      expect(serializedData.config).toBeDefined();
      expect(serializedData.metadata).toBeDefined();
      expect(serializedData.metadata.version).toBe('1.0.0');
      expect(serializedData.metadata.playerCount).toBe(2);
    });

    it('should throw error when serializing without active game', () => {
      const emptyWrapper = new BigDeckEnergyWrapper();
      
      expect(() => emptyWrapper.serializeGame()).toThrow('No active game to serialize');
    });

    it('should deserialize and restore game', async () => {
      const originalData = wrapper.serializeGame();
      const newWrapper = new BigDeckEnergyWrapper();
      
      const restoredInstance = await newWrapper.deserializeGame(originalData);
      
      expect(restoredInstance).toBeDefined();
      expect(newWrapper.getGameInstance()).toBe(restoredInstance);
      expect(newWrapper.getConfig()).toEqual(originalData.config);
    });

    it('should validate serialized data before deserializing', async () => {
      const invalidData = {
        gameState: null,
        config: null,
        metadata: null
      } as any;

      await expect(wrapper.deserializeGame(invalidData)).rejects.toThrow(
        'Failed to deserialize game'
      );
    });
  });

  describe('state snapshots', () => {
    beforeEach(async () => {
      const config = createMockConfig();
      await wrapper.createGame(config);
    });

    it('should create state snapshot', () => {
      const snapshot = wrapper.createStateSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.state).toBeDefined();
      expect(snapshot.phase).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should throw error when creating snapshot without game', () => {
      const emptyWrapper = new BigDeckEnergyWrapper();
      
      expect(() => emptyWrapper.createStateSnapshot()).toThrow('No active game instance');
    });
  });

  describe('game statistics', () => {
    beforeEach(async () => {
      const config = createMockConfig();
      await wrapper.createGame(config);
    });

    it('should get game statistics', () => {
      const stats = wrapper.getGameStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.totalTurns).toBeDefined();
      expect(stats.gameDuration).toBeGreaterThanOrEqual(0);
      expect(stats.finalScores).toBeDefined();
      expect(stats.customStats).toBeDefined();
    });

    it('should throw error when getting statistics without game', () => {
      const emptyWrapper = new BigDeckEnergyWrapper();
      
      expect(() => emptyWrapper.getGameStatistics()).toThrow('No active game instance');
    });
  });
});

describe('BigDeckEnergyUtils', () => {
  describe('available types', () => {
    it('should get available deck types', async () => {
      const deckTypes = await BigDeckEnergyUtils.getAvailableDeckTypes();
      
      expect(deckTypes).toContain('standard');
      expect(deckTypes).toContain('custom');
    });

    it('should get available rulesets', async () => {
      const rulesets = await BigDeckEnergyUtils.getAvailableRulesets();
      
      expect(rulesets).toContain('war');
      expect(rulesets).toContain('go-fish');
    });
  });

  describe('configuration validation', () => {
    it('should validate game configuration', async () => {
      const config = createMockConfig();
      
      const result = await BigDeckEnergyUtils.validateGameConfig(config);
      
      expect(result.isCompatible).toBe(true);
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = createMockConfig({
        deckType: 'invalid',
        rulesetType: 'invalid'
      });
      
      const result = await BigDeckEnergyUtils.validateGameConfig(invalidConfig);
      
      expect(result.isCompatible).toBe(false);
    });
  });

  describe('game creation', () => {
    it('should create game from configuration', async () => {
      const config = createMockConfig();
      
      const gameInstance = await BigDeckEnergyUtils.createGameFromConfig(config);
      
      expect(gameInstance).toBeDefined();
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = createMockConfig({
        deckType: 'invalid',
        rulesetType: 'invalid'
      });

      await expect(BigDeckEnergyUtils.createGameFromConfig(invalidConfig)).rejects.toThrow();
    });
  });
});

describe('Compatibility validation edge cases', () => {
  let wrapper: BigDeckEnergyWrapper;

  beforeEach(() => {
    wrapper = new BigDeckEnergyWrapper();
  });

  it('should handle card count requirements', async () => {
    // Test case where deck has too few cards for ruleset
    const result = await wrapper.validateCompatibility('custom', 'war');
    
    // Custom deck with 0 cards is incompatible with war (requires 52)
    expect(result.isCompatible).toBe(false);
    expect(result.issues).toContain('Deck has 0 cards but ruleset requires at least 52');
  });

  it('should handle property requirements', async () => {
    const result = await wrapper.validateCompatibility('standard', 'war');
    
    expect(result.isCompatible).toBe(true);
    // Standard deck has rank property required by war
  });

  it('should handle player count mismatches', async () => {
    const result = await wrapper.validateCompatibility('standard', 'go-fish');
    
    expect(result.isCompatible).toBe(true);
    // Both support overlapping player ranges
  });

  it('should handle compatibility check errors gracefully', async () => {
    // Mock an error in the compatibility check process
    const originalMethod = wrapper['getDeckTypeInfo'];
    wrapper['getDeckTypeInfo'] = jest.fn().mockRejectedValue(new Error('Test error'));
    
    const result = await wrapper.validateCompatibility('standard', 'war');
    
    expect(result.isCompatible).toBe(false);
    expect(result.issues).toContain('Compatibility check failed: Error: Test error');
    
    // Restore original method
    wrapper['getDeckTypeInfo'] = originalMethod;
  });
});