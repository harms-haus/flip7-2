# DeckInABox CLI

A command-line interface for playing BigDeckEnergy card games directly in your terminal.

## Installation

```bash
npm install -g deck-in-a-box
```

Or run directly with npx:

```bash
npx deck-in-a-box
```

## Usage

### Basic Usage

Start the application:

```bash
deck-in-a-box
```

Or use the short alias:

```bash
dib
```

### Command Line Options

- `--debug, -d`: Enable debug mode for development
- `--game <game>, -g <game>`: Start a specific game directly
- `--no-color`: Disable colors (for terminals without color support)
- `--no-unicode`: Disable Unicode characters (for terminals without Unicode support)
- `--help, -h`: Show help information
- `--version, -V`: Show version information

### Examples

```bash
# Start with debug mode
deck-in-a-box --debug

# Start a specific game directly
deck-in-a-box --game war

# Run without colors or Unicode (for basic terminals)
deck-in-a-box --no-color --no-unicode
```

## Features

- **Interactive Terminal UI**: Built with React and Ink for a modern CLI experience
- **Game Discovery**: Automatically finds and loads available game configurations
- **Responsive Layout**: Adapts to different terminal sizes and capabilities
- **Terminal Compatibility**: Works with various terminal emulators and capabilities
- **Save/Load Games**: Persist game state for later continuation (coming soon)
- **Extensible**: Plugin-based architecture for custom game implementations

## Game Configurations

DeckInABox uses game configuration classes to define how BigDeckEnergy games are displayed and played in the terminal. Each game configuration specifies:

- How the game state is rendered
- Available player actions and keyboard shortcuts
- Game setup and player configuration
- Win screens and statistics

### Available Games

Games are automatically discovered from the `games/` directory. Each game should be in its own subdirectory with an `index.js` file that exports a `GameConfiguration` class.

## Development

### Prerequisites

- Node.js 16.0.0 or higher
- npm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd cli

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm run tests

# Start in development mode
npm run dev
```

### Project Structure

```
cli/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions
│   ├── cli.ts              # CLI entry point
│   └── index.ts            # Library exports
├── games/                  # Game configurations
├── tests/                  # Test files
├── dist/                   # Built output
└── package.json            # Package configuration
```

### Creating Custom Games

To create a custom game configuration:

1. Create a new directory in `games/`
2. Extend the `GameConfiguration` abstract class
3. Implement all required methods
4. Export your class from `index.js`

Example:

```typescript
import { GameConfiguration } from 'deck-in-a-box';

export class MyGameConfiguration extends GameConfiguration {
  readonly gameId = 'my-game';
  readonly displayName = 'My Game';
  readonly description = 'A custom card game';
  readonly deckType = 'standard';
  readonly rulesetType = 'my-rules';

  // Implement all required methods...
}
```

## Terminal Requirements

### Minimum Requirements

- Width: 40 columns (20 minimum)
- Height: 10 rows (5 minimum)
- Interactive terminal (TTY)

### Recommended

- Width: 80+ columns
- Height: 24+ rows
- Color support (16+ colors)
- Unicode support

### Supported Terminals

- xterm and xterm-compatible terminals
- Terminal.app (macOS)
- Windows Terminal
- iTerm2
- GNOME Terminal
- Konsole
- tmux and screen

## Troubleshooting

### Terminal Too Small

If your terminal is too small, try:
- Increasing terminal window size
- Using a smaller font size
- Running with `--no-unicode` for more compact display

### No Colors

If colors aren't working:
- Check that your terminal supports colors
- Try setting `TERM=xterm-256color`
- Use `--no-color` flag as fallback

### Unicode Issues

If Unicode characters aren't displaying correctly:
- Check that your terminal supports UTF-8
- Set `LANG=en_US.UTF-8` or similar
- Use `--no-unicode` flag for ASCII-only display

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.