import React from 'react';
import { render } from 'ink-testing-library';
import { 
  PlayerInfoPanel, 
  GamePhaseIndicator, 
  MessageDisplay, 
  GameStatsDisplay,
  HelpDisplay,
  useGameMessages,
  type GameMessage 
} from '../../src/components/StatusDisplays';
import { DefaultUIAdapter } from '../../src/components/UIAdapter';
import { GameState, Participant, Hand, Card, GamePhase, CardPile } from 'big-deck-energy';

// Mock data
const createMockParticipant = (id: string, name: string, cardCount: number = 5): Participant => {
  return {
    id,
    name,
    isNPC: false,
    handIds: [`${id}_hand`],
    status: {}
  };
};

const createMockHand = (id: string, participantId: string, cardCount: number = 5): Hand => {
  const { Card: CardClass } = require('big-deck-energy');
  const mockCards: Card[] = Array.from({ length: cardCount }, (_, i) => 
    new CardClass(
      {
        id: `card-${i}`,
        faceId: `face-${i}`,
        tailId: 'standard-back',
        properties: { rank: String(i + 1), suit: 'hearts' }
      },
      'standard'
    )
  );

  const mockCardPile: CardPile = {
    cards: mockCards,
    maxSize: 10,
    status: {}
  };

  return {
    id,
    name: `${participantId} Hand`,
    participantId,
    piles: new Map([['cards', mockCardPile]]),
    placements: new Map(),
    status: {}
  };
};

const createMockGameState = (): GameState => {
  const { GameState: GameStateClass } = require('big-deck-energy');
  
  const participants = new Map([
    ['player1', createMockParticipant('player1', 'Alice', 5)],
    ['player2', createMockParticipant('player2', 'Bob', 3)]
  ]);
  
  const hands = new Map([
    ['player1_hand', createMockHand('player1_hand', 'player1', 5)],
    ['player2_hand', createMockHand('player2_hand', 'player2', 3)]
  ]);
  
  return new GameStateClass(
    'test-game',
    GamePhase.PLAYING,
    undefined,
    participants,
    hands,
    [],
    {}
  );
};

describe('PlayerInfoPanel', () => {
  const mockUIAdapter = new DefaultUIAdapter();
  const mockPlayers = [
    createMockParticipant('player1', 'Alice'),
    createMockParticipant('player2', 'Bob')
  ];
  const mockGameState = createMockGameState();

  test('renders player information', () => {
    const { lastFrame } = render(
      <PlayerInfoPanel
        players={mockPlayers}
        currentPlayer="player1"
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Alice');
    expect(output).toContain('Bob');
    expect(output).toContain('Players');
  });

  test('highlights current player', () => {
    const { lastFrame } = render(
      <PlayerInfoPanel
        players={mockPlayers}
        currentPlayer="player1"
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('►'); // Current player indicator
  });

  test('shows hand sizes when enabled', () => {
    const { lastFrame } = render(
      <PlayerInfoPanel
        players={mockPlayers}
        currentPlayer="player1"
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
        showHandSizes={true}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Cards: 5');
    expect(output).toContain('Cards: 3');
  });

  test('shows scores when enabled', () => {
    const { lastFrame } = render(
      <PlayerInfoPanel
        players={mockPlayers}
        currentPlayer="player1"
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
        showScores={true}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Score:');
  });

  test('renders in compact mode', () => {
    const { lastFrame } = render(
      <PlayerInfoPanel
        players={mockPlayers}
        currentPlayer="player1"
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
        compact={true}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Alice');
    expect(output).toContain('Bob');
  });
});

describe('GamePhaseIndicator', () => {
  const mockUIAdapter = new DefaultUIAdapter();
  const mockGameState = createMockGameState();

  test('renders game phase information', () => {
    const { lastFrame } = render(
      <GamePhaseIndicator
        gameState={mockGameState}
        currentPlayer="player1"
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Game Phase');
    expect(output).toContain('Current Turn');
    expect(output).toContain('Alice');
  });

  test('shows turn timer when enabled', () => {
    const { lastFrame } = render(
      <GamePhaseIndicator
        gameState={mockGameState}
        currentPlayer="player1"
        uiAdapter={mockUIAdapter}
        showTurnTimer={true}
        turnTimeRemaining={30}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('30s');
    expect(output).toContain('⏱');
  });

  test('highlights low time remaining', () => {
    const { lastFrame } = render(
      <GamePhaseIndicator
        gameState={mockGameState}
        currentPlayer="player1"
        uiAdapter={mockUIAdapter}
        showTurnTimer={true}
        turnTimeRemaining={5}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('5s');
  });
});

describe('MessageDisplay', () => {
  const mockUIAdapter = new DefaultUIAdapter();
  
  const mockMessages: GameMessage[] = [
    {
      id: '1',
      text: 'Game started',
      type: 'info',
      timestamp: new Date('2023-01-01T10:00:00Z')
    },
    {
      id: '2',
      text: 'Player 1 drew a card',
      type: 'action',
      timestamp: new Date('2023-01-01T10:01:00Z')
    },
    {
      id: '3',
      text: 'Invalid move',
      type: 'error',
      timestamp: new Date('2023-01-01T10:02:00Z')
    }
  ];

  test('renders game messages', () => {
    const { lastFrame } = render(
      <MessageDisplay
        messages={mockMessages}
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Game started');
    expect(output).toContain('Player 1 drew a card');
    expect(output).toContain('Invalid move');
  });

  test('shows message icons', () => {
    const { lastFrame } = render(
      <MessageDisplay
        messages={mockMessages}
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('ℹ'); // Info icon
    expect(output).toContain('→'); // Action icon
    expect(output).toContain('✗'); // Error icon
  });

  test('limits number of messages displayed', () => {
    const manyMessages = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      text: `Message ${i}`,
      type: 'info' as const,
      timestamp: new Date()
    }));

    const { lastFrame } = render(
      <MessageDisplay
        messages={manyMessages}
        uiAdapter={mockUIAdapter}
        maxMessages={3}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Message 7'); // Should show last 3 messages
    expect(output).toContain('Message 8');
    expect(output).toContain('Message 9');
    expect(output).not.toContain('Message 0'); // Should not show early messages
  });

  test('shows timestamps when enabled', () => {
    const { lastFrame } = render(
      <MessageDisplay
        messages={mockMessages}
        uiAdapter={mockUIAdapter}
        showTimestamps={true}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('['); // Timestamp brackets
  });

  test('handles empty message list', () => {
    const { lastFrame } = render(
      <MessageDisplay
        messages={[]}
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('No messages');
  });
});

describe('GameStatsDisplay', () => {
  const mockUIAdapter = new DefaultUIAdapter();
  const mockGameState = createMockGameState();

  test('renders basic game statistics', () => {
    const { lastFrame } = render(
      <GameStatsDisplay
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Game Statistics');
    expect(output).toContain('Turn:');
    expect(output).toContain('Actions:');
    expect(output).toContain('Duration:');
  });

  test('shows detailed statistics when enabled', () => {
    const { lastFrame } = render(
      <GameStatsDisplay
        gameState={mockGameState}
        uiAdapter={mockUIAdapter}
        showDetailedStats={true}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Cards in Play:');
    expect(output).toContain('Cards Remaining:');
  });
});

describe('HelpDisplay', () => {
  const mockUIAdapter = new DefaultUIAdapter();

  test('renders help information', () => {
    const { lastFrame } = render(
      <HelpDisplay
        uiAdapter={mockUIAdapter}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Help');
    expect(output).toContain('Keyboard Shortcuts');
  });

  test('shows keyboard shortcuts when enabled', () => {
    const { lastFrame } = render(
      <HelpDisplay
        uiAdapter={mockUIAdapter}
        showKeyboardShortcuts={true}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('← →');
    expect(output).toContain('Enter');
    expect(output).toContain('Esc');
    expect(output).toContain('q:');
  });

  test('shows game-specific help', () => {
    const gameHelp = [
      'Press "d" to draw a card',
      'Press "p" to play a card'
    ];

    const { lastFrame } = render(
      <HelpDisplay
        uiAdapter={mockUIAdapter}
        gameSpecificHelp={gameHelp}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Press "d" to draw a card');
    expect(output).toContain('Press "p" to play a card');
    expect(output).toContain('Game Controls');
  });

  test('hides keyboard shortcuts when disabled', () => {
    const { lastFrame } = render(
      <HelpDisplay
        uiAdapter={mockUIAdapter}
        showKeyboardShortcuts={false}
      />
    );
    
    const output = lastFrame();
    expect(output).not.toContain('Keyboard Shortcuts');
  });
});

describe('useGameMessages hook', () => {
  // Test component to test the hook
  const TestComponent: React.FC = () => {
    const { messages, addMessage, clearMessages } = useGameMessages();
    
    React.useEffect(() => {
      addMessage('Test message', 'info');
    }, [addMessage]);
    
    return (
      <div>
        <div data-testid="message-count">{messages.length}</div>
        <button onClick={() => addMessage('New message', 'success')}>
          Add Message
        </button>
        <button onClick={clearMessages}>
          Clear Messages
        </button>
      </div>
    );
  };

  test('manages messages correctly', () => {
    const { lastFrame } = render(<TestComponent />);
    
    // Should have initial message
    expect(lastFrame()).toContain('1');
  });
});