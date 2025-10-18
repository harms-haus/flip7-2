import { build } from 'esbuild';
import { readFileSync } from 'fs';

// Read package.json to get version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const config = {
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
  // Don't add shebang for ES modules - we'll handle this differently
  loader: {
    '.json': 'json'
  }
};

try {
  await build(config);
  console.log('✅ CLI built successfully with esbuild');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}