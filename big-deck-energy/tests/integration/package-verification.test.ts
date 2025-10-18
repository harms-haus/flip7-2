/**
 * Package verification tests for BigDeckEnergy npm package
 * 
 * Tests that verify the package structure, exports, and build outputs
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Package Verification Tests', () => {
  describe('Build Output Structure', () => {
    test('should have CommonJS build output', () => {
      const cjsIndexPath = path.join(__dirname, '../../dist/cjs/index.js');
      const cjsBigDeckEnergyPath = path.join(__dirname, '../../dist/cjs/big-deck-energy.js');
      
      expect(fs.existsSync(cjsIndexPath)).toBe(true);
      expect(fs.existsSync(cjsBigDeckEnergyPath)).toBe(true);
    });

    test('should have ES Module build output', () => {
      const esmIndexPath = path.join(__dirname, '../../dist/esm/index.js');
      const esmBigDeckEnergyPath = path.join(__dirname, '../../dist/esm/big-deck-energy.js');
      
      expect(fs.existsSync(esmIndexPath)).toBe(true);
      expect(fs.existsSync(esmBigDeckEnergyPath)).toBe(true);
    });

    test('should have TypeScript declaration files', () => {
      const typesIndexPath = path.join(__dirname, '../../dist/types/index.d.ts');
      const typesBigDeckEnergyPath = path.join(__dirname, '../../dist/types/big-deck-energy.d.ts');
      const utilsTypesPath = path.join(__dirname, '../../dist/types/utils/developer-utilities.d.ts');
      
      expect(fs.existsSync(typesIndexPath)).toBe(true);
      expect(fs.existsSync(typesBigDeckEnergyPath)).toBe(true);
      expect(fs.existsSync(utilsTypesPath)).toBe(true);
    });
  });

  describe('Package Configuration', () => {
    test('should have correct package.json configuration', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.name).toBe('big-deck-energy');
      expect(packageJson.main).toBe('dist/cjs/index.js');
      expect(packageJson.module).toBe('dist/esm/index.js');
      expect(packageJson.types).toBe('dist/types/index.d.ts');
      
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();
      expect(packageJson.exports['.'].import).toBe('./dist/esm/index.js');
      expect(packageJson.exports['.'].require).toBe('./dist/cjs/index.js');
      expect(packageJson.exports['.'].types).toBe('./dist/types/index.d.ts');
    });

    test('should have appropriate keywords', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.keywords).toContain('card-games');
      expect(packageJson.keywords).toContain('typescript');
      expect(packageJson.keywords).toContain('game-library');
    });
  });

  describe('Module Exports', () => {
    test('should export main BigDeckEnergy class', async () => {
      // Test CommonJS import
      const cjsModule = require('../../dist/cjs/index.js');
      expect(cjsModule.BigDeckEnergy).toBeDefined();
      expect(typeof cjsModule.BigDeckEnergy).toBe('function');
      
      // Test that we can create an instance
      const instance = cjsModule.BigDeckEnergy.create();
      expect(instance).toBeDefined();
      expect(typeof instance.getLibraryInfo).toBe('function');
    });

    test('should export utility classes', async () => {
      const cjsModule = require('../../dist/cjs/index.js');
      expect(cjsModule.DeveloperUtilities).toBeDefined();
      expect(cjsModule.DebugUtilities).toBeDefined();
      expect(cjsModule.BigDeckEnergyUtils).toBeDefined();
    });

    test('should export core interfaces and types', async () => {
      const cjsModule = require('../../dist/cjs/index.js');
      
      // Check that key classes are exported
      expect(cjsModule.GameInstance).toBeDefined();
      expect(cjsModule.StandardPlayingDeck).toBeDefined();
      expect(cjsModule.WarRuleset).toBeDefined();
      expect(cjsModule.GoFishRuleset).toBeDefined();
    });
  });

  describe('TypeScript Declarations', () => {
    test('should have complete type definitions', () => {
      const typesIndexPath = path.join(__dirname, '../../dist/types/index.d.ts');
      const typesContent = fs.readFileSync(typesIndexPath, 'utf8');
      
      expect(typesContent).toContain('export { BigDeckEnergy');
      expect(typesContent).toContain('export * from');
      expect(typesContent).toContain('export * from \'./utils\'');
      expect(typesContent).toContain('BigDeckEnergyUtils');
    });

    test('should have enhanced declaration file', () => {
      const enhancedTypesPath = path.join(__dirname, '../../dist/types/big-deck-energy.d.ts');
      expect(fs.existsSync(enhancedTypesPath)).toBe(true);
      
      const enhancedTypesContent = fs.readFileSync(enhancedTypesPath, 'utf8');
      expect(enhancedTypesContent).toContain('BigDeckEnergy');
      expect(enhancedTypesContent).toContain('BigDeckEnergyUtils');
    });
  });
});