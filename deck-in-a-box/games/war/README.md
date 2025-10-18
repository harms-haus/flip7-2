# War Card Game Configuration

This directory contains the War card game configuration for DeckInABox CLI.

## Game Rules

War is a simple card game for 2 players:

1. **Setup**: Each player gets half the deck (26 cards) face down
2. **Battle**: Players simultaneously play their top card
3. **Winner**: Higher card wins both cards (Ace = 1, King = 13)
4. **War**: When cards are equal, each player plays 3 cards face down + 1 face up
5. **Victory**: Game ends when one player has all 52 cards

## Controls

- **SPACE** or **ENTER**: Play battle round
- **H**: Show hand information
- **S**: Show game status

## Features

- Real-time battle visualization
- War situation handling (when cards are equal)
- Army status display showing card counts
- Battle statistics tracking
- Detailed win screen with game statistics

## Implementation

The `WarGameConfiguration` class extends the base `GameConfiguration` class and provides:

- War-specific UI rendering for game state and battles
- Input handling for battle actions
- Win screen with battle statistics
- Integration with BigDeckEnergy War ruleset