import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { GameConfiguration } from '../types';
import { ApplicationSettings } from '../types/application-state';
import { GameSetupResult } from '../types/actions';
import { Participant } from 'big-deck-energy';

interface GameSetupProps {
  game: GameConfiguration;
  settings: ApplicationSettings;
  terminalSize: { width: number; height: number };
  onSetupComplete: (setupResult: GameSetupResult) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

type SetupStep = 'playerCount' | 'playerNames' | 'gameOptions' | 'confirm';

interface SetupState {
  currentStep: SetupStep;
  playerCount: number;
  playerNames: string[];
  currentPlayerIndex: number;
  currentInput: string;
  gameOptions: Record<string, any>;
  validationError: string | null;
  isProcessing: boolean;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  game,
  settings,
  terminalSize,
  onSetupComplete,
  onCancel,
  onError,
}) => {
  const [setupState, setSetupState] = useState<SetupState>({
    currentStep: 'playerCount',
    playerCount: game.getDefaultPlayerCount(),
    playerNames: [],
    currentPlayerIndex: 0,
    currentInput: '',
    gameOptions: {},
    validationError: null,
    isProcessing: false,
  });

  // Initialize player names array when player count changes
  useEffect(() => {
    setSetupState(prev => ({
      ...prev,
      playerNames: Array(prev.playerCount).fill('').map((_, index) => 
        prev.playerNames[index] || `Player ${index + 1}`
      ),
    }));
  }, [setupState.playerCount]);

  // Validate current step
  const validateCurrentStep = useCallback((): string | null => {
    switch (setupState.currentStep) {
      case 'playerCount':
        if (!game.validatePlayerCount(setupState.playerCount)) {
          return `This game does not support ${setupState.playerCount} players`;
        }
        return null;

      case 'playerNames':
        const currentName = setupState.currentInput.trim();
        if (!currentName) {
          return 'Player name cannot be empty';
        }
        if (currentName.length > 20) {
          return 'Player name must be 20 characters or less';
        }
        if (setupState.playerNames.some((name, index) => 
          index !== setupState.currentPlayerIndex && name.toLowerCase() === currentName.toLowerCase()
        )) {
          return 'Player names must be unique';
        }
        return null;

      case 'gameOptions':
        // Game-specific validation would go here
        return null;

      case 'confirm':
        return null;

      default:
        return null;
    }
  }, [setupState, game]);

  // Handle input
  useInput((input, key) => {
    if (setupState.isProcessing) {
      return;
    }

    // Global shortcuts
    if (key.escape) {
      onCancel();
      return;
    }

    // Clear validation error on new input
    if (setupState.validationError) {
      setSetupState(prev => ({ ...prev, validationError: null }));
    }

    switch (setupState.currentStep) {
      case 'playerCount':
        handlePlayerCountInput(input, key);
        break;
      case 'playerNames':
        handlePlayerNameInput(input, key);
        break;
      case 'gameOptions':
        handleGameOptionsInput(input, key);
        break;
      case 'confirm':
        handleConfirmInput(input, key);
        break;
    }
  });

  const handlePlayerCountInput = (input: string, key: any) => {
    if (key.upArrow) {
      setSetupState(prev => ({
        ...prev,
        playerCount: Math.min(8, prev.playerCount + 1),
      }));
    } else if (key.downArrow) {
      setSetupState(prev => ({
        ...prev,
        playerCount: Math.max(1, prev.playerCount - 1),
      }));
    } else if (key.return) {
      const error = validateCurrentStep();
      if (error) {
        setSetupState(prev => ({ ...prev, validationError: error }));
      } else {
        setSetupState(prev => ({
          ...prev,
          currentStep: 'playerNames',
          currentPlayerIndex: 0,
          currentInput: prev.playerNames[0] || `Player 1`,
        }));
      }
    } else if (input && /^[1-8]$/.test(input)) {
      const count = parseInt(input, 10);
      setSetupState(prev => ({ ...prev, playerCount: count }));
    }
  };

  const handlePlayerNameInput = (input: string, key: any) => {
    if (key.return) {
      const error = validateCurrentStep();
      if (error) {
        setSetupState(prev => ({ ...prev, validationError: error }));
        return;
      }

      // Save current player name
      const newPlayerNames = [...setupState.playerNames];
      newPlayerNames[setupState.currentPlayerIndex] = setupState.currentInput.trim();

      if (setupState.currentPlayerIndex < setupState.playerCount - 1) {
        // Move to next player
        setSetupState(prev => ({
          ...prev,
          playerNames: newPlayerNames,
          currentPlayerIndex: prev.currentPlayerIndex + 1,
          currentInput: newPlayerNames[prev.currentPlayerIndex + 1] || `Player ${prev.currentPlayerIndex + 2}`,
        }));
      } else {
        // All players named, move to game options
        setSetupState(prev => ({
          ...prev,
          playerNames: newPlayerNames,
          currentStep: 'gameOptions',
          currentInput: '',
        }));
      }
    } else if (key.backspace || key.delete) {
      setSetupState(prev => ({
        ...prev,
        currentInput: prev.currentInput.slice(0, -1),
      }));
    } else if (key.upArrow && setupState.currentPlayerIndex > 0) {
      // Save current input and move to previous player
      const newPlayerNames = [...setupState.playerNames];
      newPlayerNames[setupState.currentPlayerIndex] = setupState.currentInput.trim();
      
      setSetupState(prev => ({
        ...prev,
        playerNames: newPlayerNames,
        currentPlayerIndex: prev.currentPlayerIndex - 1,
        currentInput: newPlayerNames[prev.currentPlayerIndex - 1],
      }));
    } else if (key.downArrow && setupState.currentPlayerIndex < setupState.playerCount - 1) {
      // Save current input and move to next player
      const newPlayerNames = [...setupState.playerNames];
      newPlayerNames[setupState.currentPlayerIndex] = setupState.currentInput.trim();
      
      setSetupState(prev => ({
        ...prev,
        playerNames: newPlayerNames,
        currentPlayerIndex: prev.currentPlayerIndex + 1,
        currentInput: newPlayerNames[prev.currentPlayerIndex + 1],
      }));
    } else if (input && input.length === 1 && /[a-zA-Z0-9\s\-_]/.test(input)) {
      setSetupState(prev => ({
        ...prev,
        currentInput: prev.currentInput + input,
      }));
    }
  };

  const handleGameOptionsInput = (_input: string, key: any) => {
    if (key.return) {
      // For now, skip game options and go to confirm
      // In a real implementation, this would handle game-specific options
      setSetupState(prev => ({
        ...prev,
        currentStep: 'confirm',
      }));
    }
  };

  const handleConfirmInput = (input: string, key: any) => {
    if (key.return || input === 'y') {
      startGame();
    } else if (input === 'n') {
      onCancel();
    } else if (input === 'b') {
      setSetupState(prev => ({
        ...prev,
        currentStep: 'gameOptions',
      }));
    }
  };

  const startGame = async () => {
    setSetupState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Create participants
      const participants: Participant[] = setupState.playerNames.map((name, index) => 
        new Participant(`player_${index + 1}`, name.trim(), false, [], {})
      );

      // Call the game's setup method
      const gameSetupResult = await game.setupGame();

      // Combine with our setup data
      const finalSetupResult: GameSetupResult = {
        players: participants,
        gameOptions: {
          ...gameSetupResult.gameOptions,
          ...setupState.gameOptions,
        },
        deckConfiguration: gameSetupResult.deckConfiguration,
        rulesetConfiguration: gameSetupResult.rulesetConfiguration,
      };

      onSetupComplete(finalSetupResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to setup game';
      onError(`Game setup failed: ${message}`);
      setSetupState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Calculate layout
  const isCompact = terminalSize.width < 60 || terminalSize.height < 15;

  if (setupState.isProcessing) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
        <Text>🎮 Setting up game...</Text>
        <Text dimColor>Initializing {game.displayName}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={settings.useColors ? 'blue' : undefined}>
          {settings.useUnicode ? '🎮' : '[G]'} Game Setup: {game.displayName}
        </Text>
      </Box>

      {/* Progress indicator */}
      <Box marginBottom={1}>
        <Text dimColor>
          Step {getStepNumber(setupState.currentStep)} of 4: {getStepTitle(setupState.currentStep)}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="column" minHeight={8}>
        {renderCurrentStep()}
      </Box>

      {/* Validation error */}
      {setupState.validationError && (
        <Box marginTop={1} marginBottom={1}>
          <Text color={settings.useColors ? 'red' : undefined}>
            ❌ {setupState.validationError}
          </Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>
          {getStepInstructions(setupState.currentStep)} • Esc: cancel
        </Text>
      </Box>
    </Box>
  );

  function renderCurrentStep() {
    switch (setupState.currentStep) {
      case 'playerCount':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text>How many players will be playing?</Text>
            </Box>
            
            <Box marginBottom={1}>
              <Text bold color={settings.useColors ? 'green' : undefined}>
                {setupState.playerCount} players
              </Text>
            </Box>

            <Box marginBottom={1}>
              <Text dimColor>
                Default for {game.displayName}: {game.getDefaultPlayerCount()} players
              </Text>
            </Box>

            {!isCompact && (
              <Box flexDirection="column">
                <Text dimColor>Game supports:</Text>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(count => (
                  <Text key={count} dimColor>
                    {game.validatePlayerCount(count) ? '✓' : '✗'} {count} player{count !== 1 ? 's' : ''}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        );

      case 'playerNames':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text>
                Enter name for Player {setupState.currentPlayerIndex + 1} of {setupState.playerCount}:
              </Text>
            </Box>
            
            <Box marginBottom={1}>
              <Text bold color={settings.useColors ? 'green' : undefined}>
                {setupState.currentInput}
                <Text color={settings.useColors ? 'cyan' : undefined}>_</Text>
              </Text>
            </Box>

            {!isCompact && setupState.playerNames.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>Players so far:</Text>
                {setupState.playerNames.slice(0, setupState.currentPlayerIndex).map((name, index) => (
                  <Text key={index} dimColor>
                    {index + 1}. {name}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        );

      case 'gameOptions':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text>Game Options</Text>
            </Box>
            
            <Box marginBottom={1}>
              <Text dimColor>
                {game.displayName} uses default settings.
              </Text>
            </Box>

            <Box marginBottom={1}>
              <Text dimColor>
                Advanced game options will be available in future versions.
              </Text>
            </Box>
          </Box>
        );

      case 'confirm':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text bold>Ready to start the game?</Text>
            </Box>
            
            <Box flexDirection="column" marginBottom={1}>
              <Text>Game: <Text bold>{game.displayName}</Text></Text>
              <Text>Players: <Text bold>{setupState.playerCount}</Text></Text>
              <Text>Deck: <Text bold>{game.deckType}</Text></Text>
              <Text>Rules: <Text bold>{game.rulesetType}</Text></Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
              <Text dimColor>Player list:</Text>
              {setupState.playerNames.map((name, index) => (
                <Text key={index} dimColor>
                  {index + 1}. {name}
                </Text>
              ))}
            </Box>

            <Box marginTop={1}>
              <Text>
                Press <Text bold>Enter</Text> or <Text bold>y</Text> to start, 
                <Text bold> n</Text> to cancel, 
                <Text bold> b</Text> to go back
              </Text>
            </Box>
          </Box>
        );

      default:
        return <Text color="red">Unknown setup step</Text>;
    }
  }
};

function getStepNumber(step: SetupStep): number {
  switch (step) {
    case 'playerCount': return 1;
    case 'playerNames': return 2;
    case 'gameOptions': return 3;
    case 'confirm': return 4;
    default: return 0;
  }
}

function getStepTitle(step: SetupStep): string {
  switch (step) {
    case 'playerCount': return 'Player Count';
    case 'playerNames': return 'Player Names';
    case 'gameOptions': return 'Game Options';
    case 'confirm': return 'Confirm Setup';
    default: return 'Unknown';
  }
}

function getStepInstructions(step: SetupStep): string {
  switch (step) {
    case 'playerCount': return '↑↓: change count • 1-8: set directly • Enter: continue';
    case 'playerNames': return 'Type name • ↑↓: previous/next player • Enter: continue';
    case 'gameOptions': return 'Enter: continue to confirmation';
    case 'confirm': return 'Enter/y: start game • n: cancel • b: back';
    default: return '';
  }
}