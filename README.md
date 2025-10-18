# BigDeckEnergy Monorepo

This repository contains the BigDeckEnergy card game ecosystem, consisting of a core library and CLI tool.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Projects

### 📚 [big-deck-energy/](./big-deck-energy/)
The core TypeScript library for creating flexible card games by combining different rulesets with different deck types.

- **Package**: `big-deck-energy`
- **Type**: Library/API
- **Language**: TypeScript
- **Distribution**: npm package (CommonJS + ES Modules)

### 🎮 [deck-in-a-box/](./deck-in-a-box/)
A command-line interface for playing BigDeckEnergy card games in the terminal.

- **Package**: `deck-in-a-box`
- **Type**: CLI Tool
- **Language**: TypeScript + React (Ink)
- **Distribution**: npm package with binary

## Quick Start

### Library Usage
```bash
cd big-deck-energy
npm install
npm run build
```

### CLI Usage
```bash
cd deck-in-a-box
npm install
npm run build
npm start
```

## Development

Each project has its own development environment and can be worked on independently:

```bash
# Work on the library
cd big-deck-energy
npm run dev

# Work on the CLI (in another terminal)
cd deck-in-a-box
npm run dev
```

## Architecture

The CLI depends on the library for game logic and state management, while the library is completely independent and can be used in any TypeScript/JavaScript project.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by the BigDeckEnergy team