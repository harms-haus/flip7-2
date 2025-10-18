import { build } from 'esbuild';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Read package.json to get version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

// Function to find all game entry points
function findGameEntryPoints() {
  const gamesDir = './games';
  const entryPoints = [];
  
  try {
    const gameDirectories = readdirSync(gamesDir).filter(name => {
      const fullPath = join(gamesDir, name);
      return statSync(fullPath).isDirectory();
    });
    
    for (const gameDir of gameDirectories) {
      const gamePath = join(gamesDir, gameDir);
      
      // Look for index.ts or index.tsx
      const possibleEntries = ['index.ts', 'index.tsx'];
      for (const entry of possibleEntries) {
        const entryPath = join(gamePath, entry);
        try {
          statSync(entryPath);
          entryPoints.push({
            in: entryPath,
            out: `games/${gameDir}/index`
          });
          break;
        } catch {
          // File doesn't exist, continue
        }
      }
    }
  } catch (error) {
    console.warn('Could not scan games directory:', error.message);
  }
  
  return entryPoints;
}

const cliConfig = {
  entryPoints: ['src/cli.ts'],
  bundle: true,
  outfile: 'dist/cli.js',
  platform: 'node',
  target: 'node16',
  format: 'esm',
  sourcemap: true,
  external: [
    // External dependencies that should not be bundled
    'ink',
    'react',
    'commander',
    'chalk'
    // Bundle big-deck-energy to avoid ES module issues
  ],
  define: {
    // Replace the JSON import with the actual version
    '__VERSION__': JSON.stringify(packageJson.version)
  },
  loader: {
    '.json': 'json'
  }
};

const gameEntryPoints = findGameEntryPoints();
const gamesConfig = {
  entryPoints: gameEntryPoints,
  bundle: true, // Need to bundle to use external
  outdir: 'dist',
  platform: 'node',
  target: 'node16',
  format: 'esm',
  sourcemap: true,
  external: [
    'ink',
    'react',
    'commander',
    'chalk',
    'big-deck-energy'
  ],
  loader: {
    '.json': 'json'
  }
};

try {
  // Build CLI
  await build(cliConfig);
  console.log('✅ CLI built successfully with esbuild');
  
  // Build games if any exist
  if (gameEntryPoints.length > 0) {
    await build(gamesConfig);
    console.log(`✅ ${gameEntryPoints.length} game(s) built successfully`);
  } else {
    console.log('ℹ️ No games found to build');
  }
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}