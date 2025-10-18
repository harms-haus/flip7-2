#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './components/App';
import { version } from '../package.json';
import { detectTerminalCapabilities } from './utils/terminal-detection';
import { discoverGames } from './utils/game-discovery';

const program = new Command();

// Configure main command
program
  .name('deck-in-a-box')
  .alias('dib')
  .description('A command-line interface for playing BigDeckEnergy card games in the terminal')
  .version(version, '-v, --version', 'display version number')
  .helpOption('-h, --help', 'display help for command');

// Game selection options
program
  .option('-g, --game <gameId>', 'start specific game directly by game ID')
  .option('-l, --list', 'list available games and exit')
  .option('-i, --info <gameId>', 'show information about a specific game and exit');

// Display options
program
  .option('--no-color', 'disable colors in terminal output')
  .option('--no-unicode', 'disable Unicode characters (use ASCII fallbacks)')
  .option('--theme <theme>', 'set color theme (default, dark, light)', 'default');

// Behavior options
program
  .option('-d, --debug', 'enable debug mode with additional logging')
  .option('--non-interactive', 'force non-interactive mode (for scripting)')
  .option('--save-dir <path>', 'specify custom save directory', './saves')
  .option('--no-hints', 'disable help hints during gameplay');

// Parse command line arguments
program.parse();

const options = program.opts();

// Handle list games option
if (options.list) {
  handleListGames().then(() => process.exit(0)).catch((error) => {
    console.error('❌ Error listing games:', error.message);
    process.exit(1);
  });
}

// Handle game info option
if (options.info) {
  handleGameInfo(options.info).then(() => process.exit(0)).catch((error) => {
    console.error('❌ Error getting game info:', error.message);
    process.exit(1);
  });
}

// Check terminal capabilities and interactive mode
const capabilities = detectTerminalCapabilities();
const isInteractive = !options.nonInteractive && capabilities.isInteractive;

if (!isInteractive) {
  console.error('❌ DeckInABox requires an interactive terminal.');
  console.error('   Run with --help for available options.');
  process.exit(1);
}

// Validate terminal requirements
if (capabilities.width < 60 || capabilities.height < 20) {
  console.error('❌ Terminal too small. Minimum size: 60x20 characters.');
  console.error(`   Current size: ${capabilities.width}x${capabilities.height}`);
  process.exit(1);
}

// Render the main application
let unmount: (() => void) | null = null;

try {
  const result = render(
    React.createElement(App, {
      debugMode: options.debug || false,
      initialGame: options.game || null,
      useColors: options.color !== false,
      useUnicode: options.unicode !== false,
      theme: options.theme,
      saveDirectory: options.saveDir,
      showHints: options.hints !== false,
      terminalCapabilities: capabilities,
    })
  );
  unmount = result.unmount;
} catch (error) {
  console.error('❌ Failed to start DeckInABox:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

// Handle graceful shutdown
const shutdown = (signal: string) => {
  if (options.debug) {
    console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
  }
  if (unmount) {
    unmount();
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  if (options.debug) {
    console.error(error.stack);
  }
  if (unmount) {
    unmount();
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  if (unmount) {
    unmount();
  }
  process.exit(1);
});

/**
 * Handle --list option to show available games
 */
async function handleListGames(): Promise<void> {
  try {
    console.log('🎴 Available Games:\n');
    const games = await discoverGames();
    
    if (games.length === 0) {
      console.log('   No games found. Make sure game configurations are installed.');
      return;
    }

    games.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.displayName} (${game.gameId})`);
      console.log(`      ${game.description}`);
      console.log(`      Deck: ${game.deckType} | Ruleset: ${game.rulesetType}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to discover games:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Handle --info option to show game information
 */
async function handleGameInfo(gameId: string): Promise<void> {
  try {
    const games = await discoverGames();
    const game = games.find(g => g.gameId === gameId);
    
    if (!game) {
      console.error(`❌ Game '${gameId}' not found.`);
      console.log('\n🎴 Available games:');
      games.forEach(g => console.log(`   - ${g.gameId}`));
      return;
    }

    console.log(`🎴 Game Information: ${game.displayName}\n`);
    console.log(`   ID: ${game.gameId}`);
    console.log(`   Description: ${game.description}`);
    console.log(`   Deck Type: ${game.deckType}`);
    console.log(`   Ruleset: ${game.rulesetType}`);
    console.log(`   Players: ${game.getDefaultPlayerCount()} (default)`);
    
    // Show player count range if available
    const minPlayers = 1;
    const maxPlayers = 8;
    let validRange = '';
    for (let i = minPlayers; i <= maxPlayers; i++) {
      if (game.validatePlayerCount(i)) {
        if (!validRange) validRange = `${i}`;
        else if (!validRange.includes('-')) validRange += `-${i}`;
        else validRange = validRange.replace(/-\d+$/, `-${i}`);
      }
    }
    if (validRange) {
      console.log(`   Valid player range: ${validRange}`);
    }
  } catch (error) {
    console.error('❌ Failed to get game info:', error instanceof Error ? error.message : 'Unknown error');
  }
}