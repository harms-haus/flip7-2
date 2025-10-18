import { WarGameConfiguration } from '../../games/war/war-config';

describe('WarGameConfiguration', () => {
  let config: WarGameConfiguration;

  beforeEach(() => {
    config = new WarGameConfiguration();
  });

  test('should have correct game properties', () => {
    expect(config.gameId).toBe('war');
    expect(config.displayName).toBe('War');
    expect(config.description).toContain('War');
    expect(config.deckType).toBe('standard');
    expect(config.rulesetType).toBe('war');
  });

  test('should validate player count correctly', () => {
    expect(config.validatePlayerCount(1)).toBe(false);
    expect(config.validatePlayerCount(2)).toBe(true);
    expect(config.validatePlayerCount(3)).toBe(false);
  });

  test('should return default player count', () => {
    expect(config.getDefaultPlayerCount()).toBe(2);
  });

  test('should setup game correctly', async () => {
    const result = await config.setupGame();
    
    expect(result.players).toHaveLength(2);
    expect(result.players[0]).toHaveProperty('id');
    expect(result.players[0]).toHaveProperty('name');
    expect(result.gameOptions).toHaveProperty('autoPlay');
    expect(result.deckConfiguration).toHaveProperty('shuffled');
    expect(result.rulesetConfiguration).toHaveProperty('minPlayers');
    expect(result.rulesetConfiguration).toHaveProperty('maxPlayers');
  });

  test('should handle player input correctly', async () => {
    const mockState = {
      phase: 'playing',
      participants: new Map([
        ['player_1', { status: { turn: true } }],
        ['player_2', { status: { turn: false } }]
      ]),
      hands: new Map([
        ['player_1_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'A', suit: 'hearts' } } }
              ]
            }]
          ])
        }]
      ]),
      gameboard: {
        piles: new Map([
          ['battle', { cards: [] }]
        ])
      }
    } as any;

    // Test space input for playing battle
    const result1 = await config.handlePlayerInput(' ', mockState);
    expect(result1).toHaveProperty('type', 'play_round');

    // Test enter input for playing battle
    const result2 = await config.handlePlayerInput('enter', mockState);
    expect(result2).toHaveProperty('type', 'play_round');

    // Test show hand input
    const result3 = await config.handlePlayerInput('h', mockState);
    expect(result3).toBeNull();

    // Test show status input
    const result4 = await config.handlePlayerInput('s', mockState);
    expect(result4).toBeNull();

    // Test invalid input
    const result5 = await config.handlePlayerInput('x', mockState);
    expect(result5).toBeNull();
  });

  test('should not handle input when game is finished', async () => {
    const mockState = {
      phase: 'finished',
      participants: new Map(),
      hands: new Map(),
      gameboard: { piles: new Map() }
    } as any;

    const result = await config.handlePlayerInput(' ', mockState);
    expect(result).toBeNull();
  });

  test('should get available actions correctly', () => {
    const mockState = {
      phase: 'playing',
      participants: new Map([
        ['player_1', { status: { turn: true } }]
      ]),
      hands: new Map([
        ['player_1_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'A', suit: 'hearts' } } }
              ]
            }]
          ])
        }]
      ])
    } as any;

    const actions = config.getAvailableActions(mockState, 'player_1');
    
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(action => action.id === 'play_battle')).toBe(true);
    expect(actions.some(action => action.id === 'play_battle_enter')).toBe(true);
    expect(actions.some(action => action.id === 'show_hand')).toBe(true);
    expect(actions.some(action => action.id === 'show_status')).toBe(true);
  });

  test('should return no actions when game is finished', () => {
    const mockState = {
      phase: 'finished',
      participants: new Map(),
      hands: new Map()
    } as any;

    const actions = config.getAvailableActions(mockState, 'player_1');
    expect(actions).toHaveLength(0);
  });

  test('should return no play actions when player has no cards', () => {
    const mockState = {
      phase: 'playing',
      participants: new Map([
        ['player_1', { status: { turn: true } }]
      ]),
      hands: new Map([
        ['player_1_hand', {
          piles: new Map([
            ['cards', { cards: [] }]
          ])
        }]
      ])
    } as any;

    const actions = config.getAvailableActions(mockState, 'player_1');
    
    // Should still have show actions but no play actions
    expect(actions.some(action => action.id === 'play_battle')).toBe(false);
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

  test('should render components without errors', () => {
    const mockState = {
      phase: 'playing',
      participants: new Map([
        ['player_1', { name: 'Player 1', status: { turn: true } }],
        ['player_2', { name: 'Player 2', status: { turn: false } }]
      ]),
      hands: new Map([
        ['player_1_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'A', suit: 'hearts' } } }
              ]
            }]
          ])
        }],
        ['player_2_hand', {
          piles: new Map([
            ['cards', {
              cards: [
                { card: { properties: { rank: 'K', suit: 'spades' } } }
              ]
            }]
          ])
        }]
      ]),
      gameboard: {
        piles: new Map([
          ['battle', { 
            cards: [
              { card: { properties: { rank: 'A', suit: 'hearts' } }, faceUp: true, owner: 'player_1' },
              { card: { properties: { rank: 'K', suit: 'spades' } }, faceUp: true, owner: 'player_2' }
            ] 
          }]
        ])
      }
    } as any;

    const mockHand = {
      piles: new Map([
        ['cards', {
          cards: [
            { card: { properties: { rank: 'A', suit: 'hearts' } } }
          ]
        }]
      ])
    } as any;

    const mockGameboard = {
      piles: new Map([
        ['battle', { cards: [] }]
      ])
    } as any;

    const mockStats = {
      totalTurns: 10,
      gameDuration: 30000,
      finalScores: { 'player_1': 52, 'player_2': 0 },
      customStats: { totalBattles: 15, totalWars: 2 }
    } as any;

    // These should not throw errors when rendering
    expect(() => config.renderGameState(mockState, 'player_1')).not.toThrow();
    expect(() => config.renderPlayerHand(mockHand, true)).not.toThrow();
    expect(() => config.renderPlayerHand(mockHand, false)).not.toThrow();
    expect(() => config.renderGameBoard(mockGameboard)).not.toThrow();
    expect(() => config.renderWinScreen('player_1', mockStats)).not.toThrow();
  });
});