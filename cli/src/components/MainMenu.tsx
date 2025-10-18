import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { GameConfiguration } from '../types';
import { ApplicationSettings } from '../types/application-state';

interface MainMenuProps {
  games: GameConfiguration[];
  settings: ApplicationSettings;
  terminalSize: { width: number; height: number };
  onGameSelect: (game: GameConfiguration) => void;
  onLoadGame: () => void;
  onSettings: () => void;
  onExit: () => void;
  onError: (message: string) => void;
}

type MenuSection = 'games' | 'recent' | 'options';

interface MenuState {
  currentSection: MenuSection;
  selectedGameIndex: number;
  selectedRecentIndex: number;
  selectedOptionIndex: number;
  searchFilter: string;
  showHelp: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  games,
  settings,
  terminalSize,
  onGameSelect,
  onLoadGame,
  onSettings,
  onExit,
  onError,
}) => {
  const [menuState, setMenuState] = useState<MenuState>({
    currentSection: 'games',
    selectedGameIndex: 0,
    selectedRecentIndex: 0,
    selectedOptionIndex: 0,
    searchFilter: '',
    showHelp: false,
  });

  // Filter games based on search
  const filteredGames = games.filter(game => 
    game.displayName.toLowerCase().includes(menuState.searchFilter.toLowerCase()) ||
    game.description.toLowerCase().includes(menuState.searchFilter.toLowerCase()) ||
    game.gameId.toLowerCase().includes(menuState.searchFilter.toLowerCase())
  );

  // Menu options
  const menuOptions = [
    { label: 'Load Saved Game', action: onLoadGame },
    { label: 'Settings', action: onSettings },
    { label: 'Exit', action: onExit },
  ];

  // Reset selected indices when switching sections or filtering
  useEffect(() => {
    setMenuState(prev => ({
      ...prev,
      selectedGameIndex: Math.min(prev.selectedGameIndex, Math.max(0, filteredGames.length - 1)),
      selectedRecentIndex: Math.min(prev.selectedRecentIndex, Math.max(0, settings.recentGames.length - 1)),
      selectedOptionIndex: Math.min(prev.selectedOptionIndex, Math.max(0, menuOptions.length - 1)),
    }));
  }, [filteredGames.length, settings.recentGames.length, menuOptions.length]);

  // Handle keyboard input
  useInput((input, key) => {
    if (menuState.showHelp) {
      if (key.escape || input === 'h' || input === '?') {
        setMenuState(prev => ({ ...prev, showHelp: false }));
      }
      return;
    }

    // Global shortcuts
    if (key.escape || input === 'q') {
      onExit();
      return;
    }

    if (input === 'h' || input === '?') {
      setMenuState(prev => ({ ...prev, showHelp: true }));
      return;
    }

    // Section switching
    if (key.tab) {
      setMenuState(prev => {
        const sections: MenuSection[] = ['games', 'recent', 'options'];
        const currentIndex = sections.indexOf(prev.currentSection);
        const nextIndex = (currentIndex + 1) % sections.length;
        return { ...prev, currentSection: sections[nextIndex] };
      });
      return;
    }

    // Navigation within current section
    if (key.upArrow) {
      setMenuState(prev => {
        switch (prev.currentSection) {
          case 'games':
            return {
              ...prev,
              selectedGameIndex: Math.max(0, prev.selectedGameIndex - 1),
            };
          case 'recent':
            return {
              ...prev,
              selectedRecentIndex: Math.max(0, prev.selectedRecentIndex - 1),
            };
          case 'options':
            return {
              ...prev,
              selectedOptionIndex: Math.max(0, prev.selectedOptionIndex - 1),
            };
          default:
            return prev;
        }
      });
      return;
    }

    if (key.downArrow) {
      setMenuState(prev => {
        switch (prev.currentSection) {
          case 'games':
            return {
              ...prev,
              selectedGameIndex: Math.min(filteredGames.length - 1, prev.selectedGameIndex + 1),
            };
          case 'recent':
            return {
              ...prev,
              selectedRecentIndex: Math.min(settings.recentGames.length - 1, prev.selectedRecentIndex + 1),
            };
          case 'options':
            return {
              ...prev,
              selectedOptionIndex: Math.min(menuOptions.length - 1, prev.selectedOptionIndex + 1),
            };
          default:
            return prev;
        }
      });
      return;
    }

    // Selection
    if (key.return) {
      switch (menuState.currentSection) {
        case 'games':
          if (filteredGames[menuState.selectedGameIndex]) {
            onGameSelect(filteredGames[menuState.selectedGameIndex]);
          }
          break;
        case 'recent':
          if (settings.recentGames[menuState.selectedRecentIndex]) {
            const gameId = settings.recentGames[menuState.selectedRecentIndex];
            const game = games.find(g => g.gameId === gameId);
            if (game) {
              onGameSelect(game);
            } else {
              onError(`Recent game "${gameId}" is no longer available`);
            }
          }
          break;
        case 'options':
          if (menuOptions[menuState.selectedOptionIndex]) {
            menuOptions[menuState.selectedOptionIndex].action();
          }
          break;
      }
      return;
    }

    // Search functionality (only in games section)
    if (menuState.currentSection === 'games') {
      if (key.backspace || key.delete) {
        setMenuState(prev => ({
          ...prev,
          searchFilter: prev.searchFilter.slice(0, -1),
          selectedGameIndex: 0,
        }));
        return;
      }

      if (input && input.length === 1 && /[a-zA-Z0-9\s]/.test(input)) {
        setMenuState(prev => ({
          ...prev,
          searchFilter: prev.searchFilter + input,
          selectedGameIndex: 0,
        }));
        return;
      }

      if (key.ctrl && input === 'c') {
        setMenuState(prev => ({
          ...prev,
          searchFilter: '',
          selectedGameIndex: 0,
        }));
        return;
      }
    }
  });

  // Calculate layout based on terminal size
  const isCompact = terminalSize.width < 80 || terminalSize.height < 20;
  const maxGameListHeight = Math.max(5, terminalSize.height - 12);

  if (menuState.showHelp) {
    return <HelpScreen onClose={() => setMenuState(prev => ({ ...prev, showHelp: false }))} />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={settings.useColors ? 'blue' : undefined}>
          {settings.useUnicode ? '🎴' : '[*]'} DeckInABox - Card Game Terminal
        </Text>
      </Box>

      {/* Status line */}
      <Box marginBottom={1}>
        <Text dimColor>
          {games.length} games available | {settings.recentGames.length} recent | 
          Terminal: {terminalSize.width}x{terminalSize.height}
          {menuState.searchFilter && ` | Filter: "${menuState.searchFilter}"`}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection={isCompact ? 'column' : 'row'} gap={2}>
        {/* Games section */}
        <Box flexDirection="column" flexGrow={1} minWidth={isCompact ? undefined : 40}>
          <Box marginBottom={1}>
            <Text 
              bold={menuState.currentSection === 'games'}
              color={settings.useColors && menuState.currentSection === 'games' ? 'green' : undefined}
            >
              Available Games {menuState.currentSection === 'games' ? '◄' : ''}
            </Text>
          </Box>

          {filteredGames.length === 0 ? (
            <Box flexDirection="column">
              <Text color={settings.useColors ? 'yellow' : undefined}>
                {menuState.searchFilter ? 'No games match your search.' : 'No games found.'}
              </Text>
              {!menuState.searchFilter && (
                <Text dimColor>
                  Make sure game configurations are installed in the games directory.
                </Text>
              )}
            </Box>
          ) : (
            <Box flexDirection="column" height={Math.min(maxGameListHeight, filteredGames.length + 2)}>
              {filteredGames.slice(0, maxGameListHeight).map((game, index) => (
                <GameListItem
                  key={game.gameId}
                  game={game}
                  isSelected={menuState.currentSection === 'games' && index === menuState.selectedGameIndex}
                  isCompact={isCompact}
                  useColors={settings.useColors}
                  useUnicode={settings.useUnicode}
                />
              ))}
              {filteredGames.length > maxGameListHeight && (
                <Text dimColor>
                  ... and {filteredGames.length - maxGameListHeight} more
                </Text>
              )}
            </Box>
          )}

          {menuState.currentSection === 'games' && (
            <Box marginTop={1}>
              <Text dimColor>
                Type to search • ↑↓ navigate • Enter to select • Ctrl+C clear search
              </Text>
            </Box>
          )}
        </Box>

        {/* Recent games and options */}
        <Box flexDirection="column" minWidth={isCompact ? undefined : 30}>
          {/* Recent games */}
          {settings.recentGames.length > 0 && (
            <Box flexDirection="column" marginBottom={2}>
              <Box marginBottom={1}>
                <Text 
                  bold={menuState.currentSection === 'recent'}
                  color={settings.useColors && menuState.currentSection === 'recent' ? 'green' : undefined}
                >
                  Recent Games {menuState.currentSection === 'recent' ? '◄' : ''}
                </Text>
              </Box>
              
              <Box flexDirection="column">
                {settings.recentGames.slice(0, 5).map((gameId, index) => {
                  const game = games.find(g => g.gameId === gameId);
                  const isSelected = menuState.currentSection === 'recent' && index === menuState.selectedRecentIndex;
                  
                  return (
                    <Box key={gameId}>
                      <Text 
                        color={isSelected && settings.useColors ? 'cyan' : undefined}
                        backgroundColor={isSelected ? 'gray' : undefined}
                      >
                        {isSelected ? '► ' : '  '}
                        {game ? game.displayName : `${gameId} (missing)`}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Menu options */}
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text 
                bold={menuState.currentSection === 'options'}
                color={settings.useColors && menuState.currentSection === 'options' ? 'green' : undefined}
              >
                Options {menuState.currentSection === 'options' ? '◄' : ''}
              </Text>
            </Box>
            
            <Box flexDirection="column">
              {menuOptions.map((option, index) => {
                const isSelected = menuState.currentSection === 'options' && index === menuState.selectedOptionIndex;
                
                return (
                  <Box key={option.label}>
                    <Text 
                      color={isSelected && settings.useColors ? 'cyan' : undefined}
                      backgroundColor={isSelected ? 'gray' : undefined}
                    >
                      {isSelected ? '► ' : '  '}
                      {option.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>
          Tab: switch sections • ↑↓: navigate • Enter: select • h/?: help • q/Esc: exit
        </Text>
      </Box>
    </Box>
  );
};

// Game list item component
interface GameListItemProps {
  game: GameConfiguration;
  isSelected: boolean;
  isCompact: boolean;
  useColors: boolean;
  useUnicode: boolean;
}

const GameListItem: React.FC<GameListItemProps> = ({
  game,
  isSelected,
  isCompact,
  useColors,
  useUnicode,
}) => {
  const playerCount = game.getDefaultPlayerCount();
  const playerText = playerCount === 1 ? '1 player' : `${playerCount} players`;

  return (
    <Box flexDirection="column" marginBottom={isCompact ? 0 : 1}>
      <Box>
        <Text 
          color={isSelected && useColors ? 'cyan' : undefined}
          backgroundColor={isSelected ? 'gray' : undefined}
          bold={isSelected}
        >
          {isSelected ? '► ' : '  '}
          {game.displayName}
        </Text>
        <Text dimColor> ({playerText})</Text>
      </Box>
      
      {!isCompact && (
        <Box paddingLeft={4}>
          <Text dimColor>{game.description}</Text>
        </Box>
      )}
      
      {!isCompact && (
        <Box paddingLeft={4}>
          <Text dimColor>
            {useUnicode ? '🃏' : '[D]'} {game.deckType} • 
            {useUnicode ? '📋' : '[R]'} {game.rulesetType}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Help screen component
interface HelpScreenProps {
  onClose: () => void;
}

const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'h' || input === '?' || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" padding={2} borderStyle="double" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="blue">🎴 DeckInABox Help</Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>Navigation:</Text>
          <Text>  Tab                Switch between sections (Games/Recent/Options)</Text>
          <Text>  ↑↓ Arrow Keys      Navigate within current section</Text>
          <Text>  Enter              Select highlighted item</Text>
          <Text>  q / Escape         Exit application</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>Game Selection:</Text>
          <Text>  Type letters       Search/filter games by name or description</Text>
          <Text>  Backspace          Remove last search character</Text>
          <Text>  Ctrl+C             Clear search filter</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>Sections:</Text>
          <Text>  Games              Browse and select available games</Text>
          <Text>  Recent             Quick access to recently played games</Text>
          <Text>  Options            Load saved games, settings, and exit</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>Game Information:</Text>
          <Text>  Each game shows its name, player count, description,</Text>
          <Text>  deck type, and ruleset type to help you choose.</Text>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Press any key to close help</Text>
      </Box>
    </Box>
  );
};