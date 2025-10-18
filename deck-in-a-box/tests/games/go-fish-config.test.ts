import { GoFishGameConfiguration } from '../../games/go-fish/go-fish-config';

describe('GoFishGameConfiguration', () => {
  let config: GoFishGameConfiguration;

  beforeEach(() => {
    config = new GoFishGameConfiguration();
  });

  test('should have correct game properties', () => {
    expect(config.gameId).toBe('go-fish');
    expect(config.displayName).toBe('Go Fish');
    expect(config.description).toContain('Go Fish');
    expect(config.deckType).toBe('standard');
    expect(config.rulesetType).toBe('go-fish');
  });

  test('should validate player count correctly', () => {
    expect(config.validatePlayerCount(1)).toBe(false);
    expect(config.validatePlayerCount(2)).toBe(true);
    expect(config.validatePlayerCount(3)).toBe(true);
    expect(config.validatePlayerCount(6)).toBe(true);
    expect(config.validatePlayerCount(7)).toBe(false);
  });

  test('should return default player count', () => {
    expect(config.getDefaultPlayerCount()).toBe(3);
  });

  test('should setup game correctly', async () => {
    const result = await config.setupGame();
    
    expect(result.players).toHaveLength(3);
    expect(result.players[0]).toHaveProperty('id');
    expect(result.players[0]).toHaveProperty('name');
    expect(result.gameOptions).toHaveProperty('cardsPerPlayer');
    expect(result.gameOptions).toHaveProperty('maxBooks');
    expect(result.deckConfiguration).toHaveProperty('shuffled');
    expect(result.rulesetConfiguration).toHaveProperty('minPlayers');
    expect(result.rulesetConfiguration).toHaveProperty('maxPlayers');
  });

  test('should handle player input correctly', async () => {
    const mockState = {
      participants: new Map([
        ['player_1', { status: { turn: true } }],
        ['player_2', { status: { turn: false } }]
      ]),
      hands: new Map([
        ['player_1_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'A' } } },
                { card: { properties: { rank: 'K' } } }
              ]
            }]
          ])
        }],
        ['player_2_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'Q' } } }
              ]
            }]
          ])
        }]
      ])
    } as any;

    // Test numeric input for asking for cards
    const result1 = await config.handlePlayerInput('1', mockState);
    expect(result1).toHaveProperty('type', 'ask_for_cards');

    // Test show hand input
    const result2 = await config.handlePlayerInput('h', mockState);
    expect(result2).toBeNull();

    // Test invalid input
    const result3 = await config.handlePlayerInput('x', mockState);
    expect(result3).toBeNull();
  });

  test('should get available actions correctly', () => {
    const mockState = {
      participants: new Map([
        ['player_1', { status: { turn: true } }],
        ['player_2', { status: { turn: false } }]
      ]),
      hands: new Map([
        ['player_1_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'A' } } },
                { card: { properties: { rank: 'K' } } }
              ]
            }]
          ])
        }],
        ['player_2_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'Q' } } }
              ]
            }]
          ])
        }]
      ])
    } as any;

    const actions = config.getAvailableActions(mockState, 'player_1');
    
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(action => action.id.startsWith('ask_for_'))).toBe(true);
    expect(actions.some(action => action.id === 'show_hand')).toBe(true);
    expect(actions.some(action => action.id === 'show_status')).toBe(true);
  });

  test('should handle game events', () => {
    const mockGameInstance = {} as any;
    const mockResult = { winner: 'player_1', stats: {} } as any;

    // These should not throw errors
    expect(() => config.onGameStart(mockGameInstance)).not.toThrow();
    expect(() => config.onGameEnd(mockGameInstance, mockResult)).not.toThrow();
    expect(() => config.onTurnChange(mockGameInstance, 'player_2')).not.toThrow();
  });
});