import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { ApplicationState, ApplicationScreen } from '../types';
import { detectTerminalCapabilities } from '../utils/terminal-detection.js';
import { discoverGames } from '../utils/game-discovery.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { MainMenu } from './MainMenu.js';
import { GameSetup } from './GameSetup.js';
import { GameStateRenderer } from './GameStateRenderer.js';

interface AppProps {
  debugMode: boolean;
  initialGame: string | null;
  useColors: boolean;
  useUnicode: boolean;
  theme: string;
  saveDirectory: string;
  showHints: boolean;
  terminalCapabilities: {
    width: number;
    height: number;
    hasColors: boolean;
    hasUnicode: boolean;
    isInteractive: boolean;
    colorDepth: number;
  };
}

export const App: React.FC<AppProps> = ({
  debugMode,
  initialGame,
  useColors,
  useUnicode,
  theme,
  saveDirectory,
  showHints,
  terminalCapabilities,
}) => {
  const { exit } = useApp();
  
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
    terminalSize: { 
      width: terminalCapabilities.width, 
      height: terminalCapabilities.height 
    },
    isInteractive: terminalCapabilities.isInteractive,
    debugMode,
    settings: {
      showHints,
      useColors,
      useUnicode,
      theme,
      saveDirectory,
      autoSave: false,
      autoSaveInterval: 5,
      recentGames: [],
      maxRecentGames: 10,
    },
  });

  // Screen navigation functions
  const navigateToScreen = useCallback((screen: ApplicationScreen, options?: {
    errorMessage?: string;
    selectedGame?: any;
  }) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: screen,
      errorMessage: options?.errorMessage || null,
      selectedGame: options?.selectedGame || prev.selectedGame,
    }));
  }, []);

  const showError = useCallback((message: string) => {
    navigateToScreen('error', { errorMessage: message });
  }, [navigateToScreen]);

  const clearError = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      errorMessage: null,
    }));
  }, []);

  // Initialize application
  useEffect(() => {
    const initialize = async () => {
      try {
        // Show loading screen briefly for better UX
        await new Promise(resolve => setTimeout(resolve, 100));

        // Discover available games
        const games = await discoverGames();
        
        setAppState(prev => ({
          ...prev,
          availableGames: games,
        }));

        // If initial game specified, try to select it
        if (initialGame) {
          const selectedGame = games.find(g => g.gameId === initialGame);
          if (selectedGame) {
            navigateToScreen('game', { selectedGame });
          } else {
            showError(`Game '${initialGame}' not found. Available games: ${games.map(g => g.gameId).join(', ')}`);
            return;
          }
        } else {
          navigateToScreen('menu');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize application';
        showError(message);
      }
    };

    initialize();
  }, [initialGame, navigateToScreen, showError]);

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

  // Handle global keyboard shortcuts
  useEffect(() => {
    // Note: Global keyboard handling would be implemented in individual screen components
    // This effect is kept for future implementation
  }, [appState.currentScreen, exit, clearError, navigateToScreen]);

  // Render current screen
  const renderScreen = () => {
    switch (appState.currentScreen) {
      case 'loading':
        return <LoadingScreen />;

      case 'error':
        return (
          <ErrorScreen 
            message={appState.errorMessage || 'Unknown error occurred'}
            onRetry={() => {
              clearError();
              navigateToScreen('loading');
              // Re-initialize would be handled here
            }}
            onExit={() => exit()}
          />
        );

      case 'menu':
        return (
          <MainMenu 
            games={appState.availableGames}
            settings={appState.settings}
            terminalSize={appState.terminalSize}
            onGameSelect={(game) => navigateToScreen('setup', { selectedGame: game })}
            onLoadGame={() => {
              // TODO: Implement load game functionality in future tasks
              showError('Load game functionality will be implemented in future tasks');
            }}
            onSettings={() => {
              // TODO: Implement settings screen in future tasks
              showError('Settings functionality will be implemented in future tasks');
            }}
            onExit={() => exit()}
            onError={showError}
          />
        );

      case 'setup':
        return (
          <GameSetup
            game={appState.selectedGame!}
            settings={appState.settings}
            terminalSize={appState.terminalSize}
            onSetupComplete={(setupResult) => {
              // TODO: Initialize game instance with setup result
              // For now, just navigate to game screen
              setAppState(prev => ({
                ...prev,
                players: setupResult.players,
              }));
              navigateToScreen('game');
            }}
            onCancel={() => navigateToScreen('menu')}
            onError={showError}
          />
        );

      case 'game':
        return (
          <GameScreen 
            game={appState.selectedGame}
            gameInstance={appState.gameInstance}
            players={appState.players}
            currentPlayer={appState.currentPlayer}
            gamePhase={appState.gamePhase}
            settings={appState.settings}
            terminalSize={appState.terminalSize}
            onBackToMenu={() => navigateToScreen('menu')}
            onError={showError}
          />
        );

      default:
        return (
          <Box flexDirection="column" alignItems="center" justifyContent="center">
            <Text color="red">Unknown screen: {appState.currentScreen}</Text>
            <Text dimColor>Press Ctrl+C to exit</Text>
          </Box>
        );
    }
  };

  return (
    <ErrorBoundary>
      <Box flexDirection="column" padding={1} minHeight={appState.terminalSize.height - 2}>
        {renderScreen()}
        {debugMode && (
          <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
            <Text dimColor>
              Debug: {appState.terminalSize.width}x{appState.terminalSize.height} | 
              Screen: {appState.currentScreen} | 
              Games: {appState.availableGames.length} |
              Interactive: {appState.isInteractive ? 'Yes' : 'No'} |
              Colors: {appState.settings.useColors ? 'Yes' : 'No'} |
              Unicode: {appState.settings.useUnicode ? 'Yes' : 'No'}
            </Text>
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
};

// Screen Components

const LoadingScreen: React.FC = () => (
  <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
    <Text>🎴 Loading DeckInABox...</Text>
    <Text dimColor>Discovering available games...</Text>
  </Box>
);

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
  onExit: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ message }) => (
  <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
    <Box marginBottom={1}>
      <Text color="red" bold>❌ Error</Text>
    </Box>
    
    <Box marginBottom={2}>
      <Text>{message}</Text>
    </Box>
    
    <Box flexDirection="column" alignItems="center">
      <Text dimColor>Press 'r' to retry, 'q' to quit, or Ctrl+C to exit</Text>
    </Box>
  </Box>
);



interface GameScreenProps {
  game: any;
  gameInstance: any;
  players: any[];
  currentPlayer: string | null;
  gamePhase: string;
  settings: any;
  terminalSize: { width: number; height: number };
  onBackToMenu: () => void;
  onError: (message: string) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ 
  game, 
  gameInstance,
  players, 
  currentPlayer, 
  gamePhase,
  terminalSize,
  onBackToMenu,
  onError
}) => {
  // If we have a game instance with state, use the GameStateRenderer
  if (gameInstance && gameInstance.getState && game && currentPlayer) {
    try {
      const gameState = gameInstance.getState();
      const uiAdapter = new (require('./UIAdapter').DefaultUIAdapter)();
      
      return (
        <GameStateRenderer
          gameConfiguration={game}
          gameState={gameState}
          currentPlayer={currentPlayer}
          uiAdapter={uiAdapter}
          terminalSize={terminalSize}
          onPlayerAction={(action) => {
            try {
              // Process the action through the game instance
              gameInstance.processAction(action);
            } catch (error) {
              onError(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }}
          onBackToMenu={onBackToMenu}
          onError={onError}
        />
      );
    } catch (error) {
      onError(`Failed to render game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Fallback for when game is not fully initialized
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>🎮 Game: {game?.displayName || 'Unknown'}</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text dimColor>Phase: {gamePhase} | Players: {players.length}</Text>
        {currentPlayer && <Text dimColor>Current Player: {currentPlayer}</Text>}
      </Box>
      
      <Box flexDirection="column">
        <Text dimColor>Initializing game interface...</Text>
        <Text dimColor>Press 'q' to return to menu</Text>
      </Box>
    </Box>
  );
};