import React from 'react';
import { Box, Text, useInput } from 'ink';
import { GameState, Hand, Gameboard } from 'big-deck-energy';
import { GameConfiguration } from '../types/game-configuration';
import { UIAdapter } from '../types/ui-adapter';
import { ActionDefinition } from '../types/actions';

interface GameStateRendererProps {
  /** The game configuration that defines how to render this game */
  gameConfiguration: GameConfiguration;
  
  /** Current game state from BigDeckEnergy */
  gameState: GameState;
  
  /** ID of the current player */
  currentPlayer: string;
  
  /** UI adapter for consistent styling */
  uiAdapter: UIAdapter;
  
  /** Terminal size for responsive layout */
  terminalSize: { width: number; height: number };
  
  /** Callback when player performs an action */
  onPlayerAction: (action: any) => void;
  
  /** Callback for navigation back to menu */
  onBackToMenu: () => void;
  
  /** Callback for error handling */
  onError: (message: string) => void;
}

/**
 * Main game display component that renders the current game state.
 * Uses the GameConfiguration to delegate rendering to game-specific implementations.
 */
export const GameStateRenderer: React.FC<GameStateRendererProps> = ({
  gameConfiguration,
  gameState,
  currentPlayer,
  uiAdapter,
  terminalSize,
  onPlayerAction,
  onBackToMenu,
  onError,
}) => {
  const [selectedCardIndex, setSelectedCardIndex] = React.useState<number | null>(null);
  const [availableActions, setAvailableActions] = React.useState<ActionDefinition[]>([]);

  // Update available actions when game state or current player changes
  React.useEffect(() => {
    try {
      const actions = gameConfiguration.getAvailableActions(gameState, currentPlayer);
      setAvailableActions(actions);
    } catch (error) {
      onError(`Failed to get available actions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [gameState, currentPlayer, gameConfiguration, onError]);

  // Handle keyboard input
  useInput((input, key) => {
    try {
      // Handle global shortcuts
      if (key.escape || input === 'q') {
        onBackToMenu();
        return;
      }

      // Handle card selection navigation
      if (key.leftArrow || key.rightArrow) {
        const currentPlayerHand = gameState.participants.find(p => p.id === currentPlayer)?.hand;
        if (currentPlayerHand && currentPlayerHand.cards.length > 0) {
          const maxIndex = currentPlayerHand.cards.length - 1;
          if (key.leftArrow) {
            setSelectedCardIndex(prev => 
              prev === null ? maxIndex : Math.max(0, prev - 1)
            );
          } else {
            setSelectedCardIndex(prev => 
              prev === null ? 0 : Math.min(maxIndex, prev + 1)
            );
          }
        }
        return;
      }

      // Clear selection on escape
      if (key.escape) {
        setSelectedCardIndex(null);
        return;
      }

      // Delegate input handling to game configuration
      gameConfiguration.handlePlayerInput(input, gameState)
        .then(action => {
          if (action) {
            onPlayerAction(action);
          }
        })
        .catch(error => {
          onError(`Invalid action: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    } catch (error) {
      onError(`Input handling error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Calculate layout areas based on terminal size
  const layout = calculateGameLayout(terminalSize);

  try {
    // Get the main game state rendering from the game configuration
    const gameStateDisplay = gameConfiguration.renderGameState(gameState, currentPlayer);

    return (
      <Box flexDirection="column" height={terminalSize.height - 2}>
        {/* Game header */}
        <Box marginBottom={1}>
          <GameHeader 
            gameConfiguration={gameConfiguration}
            gameState={gameState}
            currentPlayer={currentPlayer}
            uiAdapter={uiAdapter}
          />
        </Box>

        {/* Main game area */}
        <Box flexGrow={1} flexDirection={layout.direction}>
          {/* Game state display (delegated to game configuration) */}
          <Box flexGrow={1} minHeight={layout.gameAreaHeight}>
            {gameStateDisplay}
          </Box>

          {/* Player hand display */}
          {layout.showPlayerHand && (
            <Box marginTop={layout.direction === 'column' ? 1 : 0} marginLeft={layout.direction === 'row' ? 2 : 0}>
              <PlayerHandDisplay
                gameState={gameState}
                currentPlayer={currentPlayer}
                selectedCardIndex={selectedCardIndex}
                gameConfiguration={gameConfiguration}
                uiAdapter={uiAdapter}
                layout={layout}
              />
            </Box>
          )}
        </Box>

        {/* Action menu and status */}
        <Box marginTop={1}>
          <GameFooter
            availableActions={availableActions}
            uiAdapter={uiAdapter}
            terminalWidth={terminalSize.width}
          />
        </Box>
      </Box>
    );
  } catch (error) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Text color="red">Error rendering game state</Text>
        <Text color="gray">{error instanceof Error ? error.message : 'Unknown error'}</Text>
        <Text color="gray">Press 'q' to return to menu</Text>
      </Box>
    );
  }
};

interface GameHeaderProps {
  gameConfiguration: GameConfiguration;
  gameState: GameState;
  currentPlayer: string;
  uiAdapter: UIAdapter;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  gameConfiguration,
  gameState,
  currentPlayer,
  uiAdapter,
}) => {
  const currentPlayerName = gameState.participants.find(p => p.id === currentPlayer)?.name || currentPlayer;
  
  return uiAdapter.createBox(
    <Box flexDirection="row" justifyContent="space-between">
      <Box>
        <Text bold color="cyan">{gameConfiguration.displayName}</Text>
      </Box>
      <Box>
        <Text>Current Player: </Text>
        <Text bold color="yellow">{currentPlayerName}</Text>
      </Box>
      <Box>
        <Text color="gray">Press 'q' to quit</Text>
      </Box>
    </Box>,
    {
      borderStyle: 'single',
      borderColor: 'blue',
      padding: 1,
    }
  );
};

interface PlayerHandDisplayProps {
  gameState: GameState;
  currentPlayer: string;
  selectedCardIndex: number | null;
  gameConfiguration: GameConfiguration;
  uiAdapter: UIAdapter;
  layout: GameLayout;
}

const PlayerHandDisplay: React.FC<PlayerHandDisplayProps> = ({
  gameState,
  currentPlayer,
  selectedCardIndex,
  gameConfiguration,
  uiAdapter,
  layout,
}) => {
  const currentPlayerData = gameState.participants.find(p => p.id === currentPlayer);
  
  if (!currentPlayerData || !currentPlayerData.hand) {
    return (
      <Box>
        <Text color="gray">No hand data available</Text>
      </Box>
    );
  }

  try {
    // Use game configuration to render the player's hand
    const handDisplay = gameConfiguration.renderPlayerHand(currentPlayerData.hand, true);
    
    return uiAdapter.createBox(
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Your Hand ({currentPlayerData.hand.cards.length} cards)</Text>
          {selectedCardIndex !== null && (
            <Text color="yellow"> - Card {selectedCardIndex + 1} selected</Text>
          )}
        </Box>
        {handDisplay}
        {layout.showHandHints && (
          <Box marginTop={1}>
            <Text color="gray">Use ← → to select cards</Text>
          </Box>
        )}
      </Box>,
      {
        title: "Your Hand",
        borderStyle: 'single',
        borderColor: 'green',
        padding: 1,
        minHeight: layout.handAreaHeight,
      }
    );
  } catch (error) {
    return (
      <Box>
        <Text color="red">Error rendering hand</Text>
        <Text color="gray">{error instanceof Error ? error.message : 'Unknown error'}</Text>
      </Box>
    );
  }
};

interface GameFooterProps {
  availableActions: ActionDefinition[];
  uiAdapter: UIAdapter;
  terminalWidth: number;
}

const GameFooter: React.FC<GameFooterProps> = ({
  availableActions,
  uiAdapter,
  terminalWidth,
}) => {
  const showFullActions = terminalWidth > 80;
  const actionsToShow = showFullActions ? availableActions : availableActions.slice(0, 3);
  
  return uiAdapter.createBox(
    <Box flexDirection="column">
      {actionsToShow.length > 0 ? (
        <Box flexDirection={showFullActions ? 'row' : 'column'}>
          {actionsToShow.map(action => (
            <Box key={action.id} marginRight={showFullActions ? 2 : 0}>
              <Text>
                <Text color="cyan">[{action.keyBinding}]</Text>
                <Text> {action.label}</Text>
              </Text>
            </Box>
          ))}
          {!showFullActions && availableActions.length > 3 && (
            <Text color="gray">... and {availableActions.length - 3} more actions</Text>
          )}
        </Box>
      ) : (
        <Text color="gray">No actions available</Text>
      )}
    </Box>,
    {
      borderStyle: 'single',
      borderColor: 'gray',
      padding: 1,
    }
  );
};

interface GameLayout {
  direction: 'row' | 'column';
  gameAreaHeight: number;
  handAreaHeight: number;
  showPlayerHand: boolean;
  showHandHints: boolean;
}

function calculateGameLayout(terminalSize: { width: number; height: number }): GameLayout {
  const { width, height } = terminalSize;
  
  // Reserve space for header (3 lines) and footer (4 lines)
  const availableHeight = height - 7;
  
  if (width < 60) {
    // Narrow terminal - stack vertically
    return {
      direction: 'column',
      gameAreaHeight: Math.max(8, Math.floor(availableHeight * 0.6)),
      handAreaHeight: Math.max(4, Math.floor(availableHeight * 0.4)),
      showPlayerHand: availableHeight > 12,
      showHandHints: false,
    };
  } else if (width < 100) {
    // Medium terminal - side by side
    return {
      direction: 'row',
      gameAreaHeight: availableHeight,
      handAreaHeight: availableHeight,
      showPlayerHand: true,
      showHandHints: width > 80,
    };
  } else {
    // Wide terminal - side by side with full features
    return {
      direction: 'row',
      gameAreaHeight: availableHeight,
      handAreaHeight: availableHeight,
      showPlayerHand: true,
      showHandHints: true,
    };
  }
}