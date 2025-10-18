#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

async function fixImports(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await fixImports(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const content = await readFile(fullPath, 'utf8');
      
      // Fix relative imports by adding .js extension
      const fixedContent = content.replace(
        /from\s+['"](\.[^'"]*?)['"];?/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js') && !importPath.includes('.')) {
            return match.replace(importPath, importPath + '.js');
          }
          return match;
        }
      );
      
      // Also fix import statements
      const finalContent = fixedContent.replace(
        /import\s+.*?\s+from\s+['"](\.[^'"]*?)['"];?/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js') && !importPath.includes('.')) {
            return match.replace(importPath, importPath + '.js');
          }
          return match;
        }
      );
      
      if (finalContent !== content) {
        await writeFile(fullPath, finalContent);
        console.log(`Fixed imports in ${fullPath}`);
      }
    }
  }
}

fixImports(distDir).catch(console.error);