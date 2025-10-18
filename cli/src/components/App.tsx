import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ApplicationState } from '../types';
import { detectTerminalCapabilities } from '../utils/terminal-detection';
import { discoverGames } from '../utils/game-discovery';

interface AppProps {
  debugMode: boolean;
  initialGame: string | null;
  useColors: boolean;
  useUnicode: boolean;
}

export const App: React.FC<AppProps> = ({
  debugMode,
  initialGame,
  useColors,
  useUnicode,
}) => {
  const [appState, setAppState] = useState<ApplicationState>({
    currentScreen: 'loading',
    availableGames: [],
    selectedGame: null,
    gameInstance: null,
    players: [],
    currentPlayer: null,
    gamePhase: 'setup',
    lastAction: null,
    errorMessage: null,
    terminalSize: { width: 80, height: 24 },
    isInteractive: true,
    debugMode,
    settings: {
      showHints: true,
      useColors,
      useUnicode,
      saveDirectory: './saves',
      autoSave: false,
      autoSaveInterval: 5,
      recentGames: [],
      maxRecentGames: 10,
    },
  });

  // Initialize application
  useEffect(() => {
    const initialize = async () => {
      try {
        // Detect terminal capabilities
        const capabilities = detectTerminalCapabilities();
        
        // Update terminal size
        setAppState(prev => ({
          ...prev,
          terminalSize: {
            width: capabilities.width,
            height: capabilities.height,
          },
          isInteractive: capabilities.isInteractive,
        }));

        // Discover available games
        const games = await discoverGames();
        
        setAppState(prev => ({
          ...prev,
          availableGames: games,
          currentScreen: 'menu',
        }));

        // If initial game specified, try to select it
        if (initialGame) {
          const selectedGame = games.find(g => g.gameId === initialGame);
          if (selectedGame) {
            setAppState(prev => ({
              ...prev,
              selectedGame,
              currentScreen: 'game',
            }));
          }
        }
      } catch (error) {
        setAppState(prev => ({
          ...prev,
          currentScreen: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
      }
    };

    initialize();
  }, [initialGame]);

  // Handle terminal resize
  useEffect(() => {
    const handleResize = () => {
      const capabilities = detectTerminalCapabilities();
      setAppState(prev => ({
        ...prev,
        terminalSize: {
          width: capabilities.width,
          height: capabilities.height,
        },
      }));
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // Render current screen
  const renderScreen = () => {
    switch (appState.currentScreen) {
      case 'loading':
        return (
          <Box flexDirection="column" alignItems="center" justifyContent="center">
            <Text>Loading DeckInABox...</Text>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column" alignItems="center" justifyContent="center">
            <Text color="red">Error: {appState.errorMessage}</Text>
            <Text dimColor>Press Ctrl+C to exit</Text>
          </Box>
        );

      case 'menu':
        return (
          <Box flexDirection="column">
            <Text bold>🎴 DeckInABox - Card Game Terminal</Text>
            <Text dimColor>Available games: {appState.availableGames.length}</Text>
            {appState.availableGames.length === 0 && (
              <Text color="yellow">No games found. Make sure game configurations are installed.</Text>
            )}
          </Box>
        );

      case 'game':
        return (
          <Box flexDirection="column">
            <Text bold>Game: {appState.selectedGame?.displayName || 'Unknown'}</Text>
            <Text dimColor>Game implementation coming in future tasks...</Text>
          </Box>
        );

      default:
        return (
          <Box>
            <Text color="red">Unknown screen: {appState.currentScreen}</Text>
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {renderScreen()}
      {debugMode && (
        <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text dimColor>
            Debug: {appState.terminalSize.width}x{appState.terminalSize.height} | 
            Screen: {appState.currentScreen} | 
            Games: {appState.availableGames.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};