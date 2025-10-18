# Game Configurations

This directory contains game configuration classes that define how BigDeckEnergy games are displayed and played in the terminal.

## Structure

Each game should be in its own subdirectory with the following structure:

```
games/
├── war/
│   ├── index.js          # Main export (required)
│   ├── war-config.js     # Game configuration class
│   └── README.md         # Game-specific documentation
└── go-fish/
    ├── index.js
    ├── go-fish-config.js
    └── README.md
```

## Creating a Game Configuration

1. Create a new directory for your game
2. Extend the `GameConfiguration` abstract class
3. Implement all required methods
4. Export your class from `index.js`

Example:

```javascript
const { GameConfiguration } = require('deck-in-a-box');

class MyGameConfiguration extends GameConfiguration {
  get gameId() { return 'my-game'; }
  get displayName() { return 'My Game'; }
  get description() { return 'A custom card game'; }
  get deckType() { return 'standard'; }
  get rulesetType() { return 'my-rules'; }
  
  // Implement all required methods...
}

module.exports = MyGameConfiguration;
```

## Game Discovery

The application automatically discovers games by:

1. Scanning all subdirectories in this folder
2. Looking for `index.js` or common configuration file names
3. Loading and validating the exported GameConfiguration class
4. Adding valid configurations to the game menu

Games that fail to load will show warnings in debug mode but won't prevent the application from starting.