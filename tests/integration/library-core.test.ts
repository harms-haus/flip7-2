/**
 * Core integration tests for BigDeckEnergy library
 * 
 * Simplified tests focusing on essential functionality
 */

import { BigDeckEnergy } from '../../src/big-deck-energy';

describe('BigDeckEnergy Core Integration Tests', () => {
  let bde: BigDeckEnergy;

  beforeEach(() => {
    bde = BigDeckEnergy.create({ debug: false });
  });

  afterEach(() => {
    bde.reset();
  });

  test('should initialize library with built-in components', () => {
    const deckTypes = bde.getAvailableDeckTypes();
    const rulesets = bde.getAvailableRulesets();

    expect(deckTypes).toContain('standard');
    expect(deckTypes).toContain('custom');
    expect(deckTypes).toContain('monopoly-property');
    
    expect(rulesets).toContain('war');
    expect(rulesets).toContain('go-fish');
  });

  test('should create game with built-in components', async () => {
    const result = await bde.createQuickGame('test-game', 'war', 'standard');
    
    expect(result.success).toBe(true);
    expect(result.gameInstance).toBeDefined();
    
    const game = result.gameInstance!;
    expect(game.getGameId()).toBe('test-game');
  });

  test('should validate compatibility', () => {
    const result = bde.validateCompatibility('war', 'standard');
    expect(result.isCompatible).toBe(true);
  });

  test('should provide library information', () => {
    const info = bde.getLibraryInfo();
    
    expect(info.name).toBe('BigDeckEnergy');
    expect(info.version).toBe('1.0.0');
    expect(info.totalDeckTypes).toBeGreaterThanOrEqual(3);
    expect(info.totalRulesets).toBeGreaterThanOrEqual(2);
  });

  test('should manage active games', async () => {
    expect(bde.getActiveGameCount()).toBe(0);

    await bde.createQuickGame('game1', 'war', 'standard');
    expect(bde.getActiveGameCount()).toBe(1);
    expect(bde.getActiveGameIds()).toContain('game1');

    const game = bde.getGame('game1');
    expect(game).toBeDefined();
    expect(game!.getGameId()).toBe('game1');

    bde.removeGame('game1');
    expect(bde.getActiveGameCount()).toBe(0);
  });
});