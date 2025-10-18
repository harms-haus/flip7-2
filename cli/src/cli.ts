#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './components/App';
import { version } from '../package.json';

const program = new Command();

program
  .name('deck-in-a-box')
  .description('A command-line interface for playing BigDeckEnergy card games')
  .version(version)
  .option('-d, --debug', 'enable debug mode')
  .option('-g, --game <game>', 'start specific game directly')
  .option('--no-color', 'disable colors')
  .option('--no-unicode', 'disable Unicode characters')
  .parse();

const options = program.opts();

// Check if terminal is interactive
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

if (!isInteractive) {
  console.error('DeckInABox requires an interactive terminal.');
  process.exit(1);
}

// Render the main application
const { unmount } = render(
  React.createElement(App, {
    debugMode: options['debug'] || false,
    initialGame: options['game'] || null,
    useColors: options['color'] !== false,
    useUnicode: options['unicode'] !== false,
  })
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  unmount();
  process.exit(0);
});

process.on('SIGTERM', () => {
  unmount();
  process.exit(0);
});