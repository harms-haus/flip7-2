import React from 'react';
import { render } from 'ink-testing-library';
import { GameStateRenderer } from '../../src/components/GameStateRenderer';
import { GameConfiguration } from '../../src/types/game-configuration';
import { DefaultUIAdapter } from '../../src/components/UIAdapter';
import { GameState, Participant, Hand, Card, GamePhase, CardPile } from 'big-deck-energy';

// Mock game configuration for testing
class MockGameConfiguration extends GameConfiguration {
  readonly gameId = 'test-game';
  readonly displayName = 'Test Game';
  readonly description = 'A test game';
  readonly deckType = 'standard';
  readonly rulesetType = 'test';

  async setupGame() {
    return {
      players: [
        { 
          id: 'player1', 
          name: 'Player 1',
          isNPC: false,
          handIds: ['player1_hand'],
          status: {}
        },
        { 
          id: 'player2', 
          name: 'Player 2',
          isNPC: false,
          handIds: ['player2_hand'],
          status: {}
        }
      ],
      gameOptions: {},
      deckConfiguration: {},
      rulesetConfiguration: {}
    };
  }

  validatePlayerCount(count: number): boolean {
    return count >= 2 && count <= 4;
  }

  getDefaultPlayerCount(): number {
    return 2;
  }

  renderGameState(state: GameState, currentPlayer: string): React.ReactElement {
    return <div data-testid="game-state">Game State for {currentPlayer}</div>;
  }

  renderPlayerHand(hand: Hand, isCurrentPlayer: boolean): React.ReactElement {
    const cardsPile = hand.piles.get('cards');
    const cardCount = cardsPile?.cards.length || 0;
    return (
      <div data-testid="player-hand">
        Hand with {cardCount} cards {isCurrentPlayer ? '(current)' : ''}
      </div>
    );
  }

  renderGameBoard(board: any): React.ReactElement {
    return <div data-testid="game-board">Game Board</div>;
  }

  renderWinScreen(winner: string, gameStats: any): React.ReactElement {
    return <div data-testid="win-screen">Winner: {winner}</div>;
  }

  getAvailableActions(state: GameState, player: string) {
    return [
      {
        id: 'test-action',
        label: 'Test Action',
        description: 'A test action',
        keyBinding: 't',
        enabled: true
      }
    ];
  }

  async handlePlayerInput(input: string, state: GameState) {
    if (input === 't') {
      return { type: 'test-action', playerId: 'player1' };
    }
    return null;
  }

  onGameStart() {}
  onGameEnd() {}
  onTurnChange() {}
}

// Mock game state
const createMockGameState = (): GameState => {
  const { Card: CardClass } = require('big-deck-energy');
  const mockCard = new CardClass(
    {
      id: 'card1',
      faceId: 'ace-hearts-face',
      tailId: 'standard-back',
      properties: { rank: 'A', suit: 'hearts' }
    },
    'standard'
  );

  const mockCardPile: CardPile = {
    cards: [mockCard],
    maxSize: 10,
    status: {}
  };

  const mockHand: Hand = {
    id: 'player1_hand',
    name: 'Player 1 Hand',
    participantId: 'player1',
    piles: new Map([['cards', mockCardPile]]),
    placements: new Map(),
    status: {}
  };

  const mockParticipant: Participant = {
    id: 'player1',
    name: 'Player 1',
    isNPC: false,
    handIds: ['player1_hand'],
    status: {}
  };

  // Use the actual GameState constructor
  const { GameState: GameStateClass } = require('big-deck-energy');
  return new GameStateClass(
    'test-game',
    GamePhase.PLAYING,
    undefined, // gameboard
    new Map([['player1', mockParticipant]]),
    new Map([['player1_hand', mockHand]]),
    [],
    {}
  );
};

describe('GameStateRenderer', () => {
  const mockGameConfig = new MockGameConfiguration();
  const mockUIAdapter = new DefaultUIAdapter();
  const mockGameState = createMockGameState();
  const terminalSize = { width: 80, height: 24 };

  const defaultProps = {
    gameConfiguration: mockGameConfig,
    gameState: mockGameState,
    currentPlayer: 'player1',
    uiAdapter: mockUIAdapter,
    terminalSize,
    onPlayerAction: jest.fn(),
    onBackToMenu: jest.fn(),
    onError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders game state display', () => {
    const { lastFrame } = render(<GameStateRenderer {...defaultProps} />);
    
    expect(lastFrame()).toContain('Test Game');
    expect(lastFrame()).toContain('Player 1');
  });

  test('displays current player information', () => {
    const { lastFrame } = render(<GameStateRenderer {...defaultProps} />);
    
    expect(lastFrame()).toContain('Current Player');
    expect(lastFrame()).toContain('Player 1');
  });

  test('shows available actions', () => {
    const { lastFrame } = render(<GameStateRenderer {...defaultProps} />);
    
    expect(lastFrame()).toContain('[t]');
    expect(lastFrame()).toContain('Test Action');
  });

  test('handles different terminal sizes', () => {
    const smallTerminal = { width: 40, height: 12 };
    const { lastFrame: smallFrame } = render(
      <GameStateRenderer {...defaultProps} terminalSize={smallTerminal} />
    );
    
    const largeTerminal = { width: 120, height: 30 };
    const { lastFrame: largeFrame } = render(
      <GameStateRenderer {...defaultProps} terminalSize={largeTerminal} />
    );
    
    // Both should render without errors
    expect(smallFrame()).toBeTruthy();
    expect(largeFrame()).toBeTruthy();
  });

  test('handles game state with no participants', () => {
    const { GameState: GameStateClass } = require('big-deck-energy');
    const emptyGameState = new GameStateClass(
      'empty-game',
      GamePhase.SETUP,
      undefined,
      new Map(),
      new Map(),
      [],
      {}
    );
    
    const { lastFrame } = render(
      <GameStateRenderer {...defaultProps} gameState={emptyGameState} />
    );
    
    expect(lastFrame()).toBeTruthy();
  });

  test('handles errors in game configuration gracefully', () => {
    const errorGameConfig = {
      ...mockGameConfig,
      getAvailableActions: () => {
        throw new Error('Test error');
      }
    };
    
    const { lastFrame } = render(
      <GameStateRenderer {...defaultProps} gameConfiguration={errorGameConfig} />
    );
    
    expect(defaultProps.onError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to get available actions')
    );
  });

  test('renders player hand when available', () => {
    const { lastFrame } = render(<GameStateRenderer {...defaultProps} />);
    
    expect(lastFrame()).toContain('Your Hand');
    expect(lastFrame()).toContain('1 cards');
  });

  test('adapts layout for narrow terminals', () => {
    const narrowTerminal = { width: 50, height: 20 };
    const { lastFrame } = render(
      <GameStateRenderer {...defaultProps} terminalSize={narrowTerminal} />
    );
    
    // Should still render successfully
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()).toContain('Test Game');
  });
});