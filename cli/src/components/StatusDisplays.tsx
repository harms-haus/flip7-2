import React from 'react';
import { Box, Text } from 'ink';
import { GameState, Participant } from 'big-deck-energy';
import { UIAdapter } from '../types/ui-adapter';

/**
 * Player information panel showing scores, status, and game-specific data.
 */
export const PlayerInfoPanel: React.FC<{
  players: Participant[];
  currentPlayer: string;
  gameState: GameState;
  uiAdapter: UIAdapter;
  showScores?: boolean;
  showHandSizes?: boolean;
  compact?: boolean;
}> = ({ 
  players, 
  currentPlayer, 
  gameState, 
  uiAdapter, 
  showScores = true, 
  showHandSizes = true,
  compact = false 
}) => {
  const currentPlayerData = players.find(p => p.id === currentPlayer);
  
  if (compact) {
    return (
      <Box flexDirection="row">
        {players.map((player, index) => (
          <Box key={player.id} marginRight={2}>
            <Text 
              color={player.id === currentPlayer ? 'yellow' : 'white'}
              bold={player.id === currentPlayer}
            >
              {player.name}
              {showHandSizes && player.hand && ` (${player.hand.cards.length})`}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  return uiAdapter.createBox(
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Players</Text>
      </Box>
      
      {players.map((player, index) => (
        <Box key={player.id} marginBottom={1} flexDirection="column">
          <Box flexDirection="row" justifyContent="space-between">
            <Box>
              <Text 
                color={player.id === currentPlayer ? 'yellow' : 'white'}
                bold={player.id === currentPlayer}
              >
                {player.id === currentPlayer ? '► ' : '  '}
                {player.name}
              </Text>
            </Box>
            
            <Box flexDirection="row">
              {showHandSizes && player.hand && (
                <Box marginRight={2}>
                  <Text color="gray">
                    Cards: {player.hand.cards.length}
                  </Text>
                </Box>
              )}
              
              {showScores && (
                <Box>
                  <Text color="green">
                    Score: {getPlayerScore(player, gameState)}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
          
          {/* Player status indicators */}
          <Box marginLeft={2}>
            <PlayerStatusIndicators player={player} gameState={gameState} />
          </Box>
        </Box>
      ))}
    </Box>,
    {
      title: "Players",
      borderStyle: 'single',
      borderColor: 'blue',
      padding: 1,
    }
  );
};

/**
 * Game phase indicator showing current phase and turn information.
 */
export const GamePhaseIndicator: React.FC<{
  gameState: GameState;
  currentPlayer: string;
  uiAdapter: UIAdapter;
  showTurnTimer?: boolean;
  turnTimeRemaining?: number;
}> = ({ 
  gameState, 
  currentPlayer, 
  uiAdapter, 
  showTurnTimer = false, 
  turnTimeRemaining 
}) => {
  const currentPlayerName = gameState.participants.find(p => p.id === currentPlayer)?.name || currentPlayer;
  const phase = getGamePhase(gameState);
  
  return uiAdapter.createBox(
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text bold color="cyan">Game Phase</Text>
        </Box>
        {showTurnTimer && turnTimeRemaining !== undefined && (
          <Box>
            <Text color={turnTimeRemaining < 10 ? 'red' : 'yellow'}>
              ⏱ {turnTimeRemaining}s
            </Text>
          </Box>
        )}
      </Box>
      
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text>
            Phase: <Text bold color="yellow">{phase}</Text>
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>
            Current Turn: <Text bold color="green">{currentPlayerName}</Text>
          </Text>
        </Box>
        
        <Box>
          <GamePhaseDetails gameState={gameState} />
        </Box>
      </Box>
    </Box>,
    {
      borderStyle: 'single',
      borderColor: 'green',
      padding: 1,
    }
  );
};

/**
 * Message display system for game events and feedback.
 */
export const MessageDisplay: React.FC<{
  messages: GameMessage[];
  uiAdapter: UIAdapter;
  maxMessages?: number;
  showTimestamps?: boolean;
}> = ({ messages, uiAdapter, maxMessages = 5, showTimestamps = false }) => {
  const recentMessages = messages.slice(-maxMessages);
  
  return uiAdapter.createBox(
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Game Messages</Text>
      </Box>
      
      {recentMessages.length === 0 ? (
        <Text color="gray">No messages</Text>
      ) : (
        recentMessages.map((message, index) => (
          <Box key={index} marginBottom={0}>
            <MessageItem 
              message={message} 
              showTimestamp={showTimestamps}
            />
          </Box>
        ))
      )}
    </Box>,
    {
      title: "Messages",
      borderStyle: 'single',
      borderColor: 'gray',
      padding: 1,
      minHeight: 6,
    }
  );
};

/**
 * Game statistics display.
 */
export const GameStatsDisplay: React.FC<{
  gameState: GameState;
  uiAdapter: UIAdapter;
  showDetailedStats?: boolean;
}> = ({ gameState, uiAdapter, showDetailedStats = false }) => {
  const stats = calculateGameStats(gameState);
  
  return uiAdapter.createBox(
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Game Statistics</Text>
      </Box>
      
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text>Turn: <Text bold>{stats.currentTurn}</Text></Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>Actions: <Text bold>{stats.totalActions}</Text></Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>Duration: <Text bold>{stats.gameDuration}</Text></Text>
        </Box>
        
        {showDetailedStats && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text>Cards in Play: <Text bold>{stats.cardsInPlay}</Text></Text>
            </Box>
            
            <Box marginBottom={1}>
              <Text>Cards Remaining: <Text bold>{stats.cardsRemaining}</Text></Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>,
    {
      borderStyle: 'single',
      borderColor: 'magenta',
      padding: 1,
    }
  );
};

/**
 * Help display showing available controls and shortcuts.
 */
export const HelpDisplay: React.FC<{
  uiAdapter: UIAdapter;
  gameSpecificHelp?: string[];
  showKeyboardShortcuts?: boolean;
}> = ({ uiAdapter, gameSpecificHelp = [], showKeyboardShortcuts = true }) => {
  return uiAdapter.createBox(
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Help</Text>
      </Box>
      
      {showKeyboardShortcuts && (
        <Box flexDirection="column" marginBottom={2}>
          <Text bold color="yellow">Keyboard Shortcuts:</Text>
          <Text>← → : Navigate cards</Text>
          <Text>Enter: Select/Confirm</Text>
          <Text>Esc: Cancel/Back</Text>
          <Text>q: Quit to menu</Text>
          <Text>h: Toggle help</Text>
        </Box>
      )}
      
      {gameSpecificHelp.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="yellow">Game Controls:</Text>
          {gameSpecificHelp.map((help, index) => (
            <Text key={index}>{help}</Text>
          ))}
        </Box>
      )}
    </Box>,
    {
      title: "Help",
      borderStyle: 'single',
      borderColor: 'cyan',
      padding: 1,
    }
  );
};

// Supporting components and types

export interface GameMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action';
  timestamp: Date;
  playerId?: string;
}

const MessageItem: React.FC<{
  message: GameMessage;
  showTimestamp: boolean;
}> = ({ message, showTimestamp }) => {
  const getMessageColor = (type: GameMessage['type']) => {
    switch (type) {
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'action': return 'cyan';
      default: return 'white';
    }
  };

  const getMessageIcon = (type: GameMessage['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      case 'action': return '→';
      default: return 'ℹ';
    }
  };

  return (
    <Box flexDirection="row">
      <Text color={getMessageColor(message.type)}>
        {getMessageIcon(message.type)} {message.text}
      </Text>
      {showTimestamp && (
        <Text color="gray" marginLeft={1}>
          [{message.timestamp.toLocaleTimeString()}]
        </Text>
      )}
    </Box>
  );
};

const PlayerStatusIndicators: React.FC<{
  player: Participant;
  gameState: GameState;
}> = ({ player, gameState }) => {
  const indicators: string[] = [];
  
  // Add game-specific status indicators
  if (player.hand && player.hand.cards.length === 0) {
    indicators.push('No cards');
  }
  
  // Add more indicators based on game state
  // This would be customized per game type
  
  if (indicators.length === 0) {
    return null;
  }
  
  return (
    <Box flexDirection="row">
      {indicators.map((indicator, index) => (
        <Box key={index} marginRight={1}>
          <Text color="gray" dimColor>
            • {indicator}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

const GamePhaseDetails: React.FC<{
  gameState: GameState;
}> = ({ gameState }) => {
  // This would be customized based on the specific game
  // For now, show basic information
  
  const totalCards = gameState.participants.reduce(
    (sum, p) => sum + (p.hand?.cards.length || 0), 
    0
  );
  
  return (
    <Box flexDirection="column">
      <Text color="gray">
        Total cards in hands: {totalCards}
      </Text>
      {gameState.gameboard && (
        <Text color="gray">
          Cards on board: {gameState.gameboard.areas?.length || 0} areas
        </Text>
      )}
    </Box>
  );
};

// Helper functions

function getPlayerScore(player: Participant, gameState: GameState): number {
  // This would be game-specific logic
  // For now, return a placeholder
  return player.hand?.cards.length || 0;
}

function getGamePhase(gameState: GameState): string {
  // This would be extracted from the game state
  // For now, return a placeholder
  return 'Playing';
}

interface GameStats {
  currentTurn: number;
  totalActions: number;
  gameDuration: string;
  cardsInPlay: number;
  cardsRemaining: number;
}

function calculateGameStats(gameState: GameState): GameStats {
  // This would calculate actual game statistics
  // For now, return placeholder data
  
  const totalCards = gameState.participants.reduce(
    (sum, p) => sum + (p.hand?.cards.length || 0), 
    0
  );
  
  return {
    currentTurn: 1,
    totalActions: 0,
    gameDuration: '0:00',
    cardsInPlay: totalCards,
    cardsRemaining: totalCards,
  };
}

/**
 * Utility hook for managing game messages.
 */
export function useGameMessages() {
  const [messages, setMessages] = React.useState<GameMessage[]>([]);
  
  const addMessage = React.useCallback((
    text: string, 
    type: GameMessage['type'] = 'info',
    playerId?: string
  ) => {
    const message: GameMessage = {
      id: Date.now().toString(),
      text,
      type,
      timestamp: new Date(),
      playerId,
    };
    
    setMessages(prev => [...prev, message]);
  }, []);
  
  const clearMessages = React.useCallback(() => {
    setMessages([]);
  }, []);
  
  return {
    messages,
    addMessage,
    clearMessages,
  };
}