import { 
  detectTerminalCapabilities, 
  createAdaptiveUIConfig, 
  validateTerminalRequirements
} from '../../src/utils/terminal-detection';

describe('Terminal Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    
    // Mock stdout properties
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'columns', { value: 80, configurable: true });
    Object.defineProperty(process.stdout, 'rows', { value: 24, configurable: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectTerminalCapabilities', () => {
    test('should detect basic terminal capabilities', () => {
      process.env.TERM = 'xterm-256color';
      process.env.COLORTERM = 'truecolor';
      process.env.LANG = 'en_US.UTF-8';

      const capabilities = detectTerminalCapabilities();

      expect(capabilities.width).toBe(80);
      expect(capabilities.height).toBe(24);
      expect(capabilities.hasColors).toBe(true);
      expect(capabilities.hasUnicode).toBe(true);
      expect(capabilities.isInteractive).toBe(true);
      expect(capabilities.colorDepth).toBe(24);
      expect(capabilities.terminalType).toBe('xterm-256color');
    });

    test('should detect limited terminal capabilities', () => {
      process.env.TERM = 'dumb';
      delete process.env.COLORTERM;
      delete process.env.LANG;
      
      Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });

      const capabilities = detectTerminalCapabilities();

      expect(capabilities.hasColors).toBe(false);
      expect(capabilities.hasUnicode).toBe(false);
      expect(capabilities.isInteractive).toBe(false);
      expect(capabilities.colorDepth).toBe(1);
      expect(capabilities.terminalType).toBe('dumb');
    });

    test('should handle missing terminal dimensions', () => {
      Object.defineProperty(process.stdout, 'columns', { value: undefined, configurable: true });
      Object.defineProperty(process.stdout, 'rows', { value: undefined, configurable: true });

      const capabilities = detectTerminalCapabilities();

      expect(capabilities.width).toBe(80); // fallback
      expect(capabilities.height).toBe(24); // fallback
    });
  });

  describe('createAdaptiveUIConfig', () => {
    test('should create config for wide terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        width: 120,
        height: 30,
      };

      const config = createAdaptiveUIConfig(capabilities);

      expect(config.layoutStyle).toBe('wide');
      expect(config.cardStyle).toBe('detailed');
      expect(config.useAbbreviations).toBe(false);
      expect(config.maxPlayers).toBe(3); // Math.min(4, Math.floor(30 / 8))
    });

    test('should create config for narrow terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        width: 50,
        height: 15,
        hasColors: false,
        hasUnicode: false,
      };

      const config = createAdaptiveUIConfig(capabilities);

      expect(config.layoutStyle).toBe('narrow');
      expect(config.cardStyle).toBe('minimal');
      expect(config.useColors).toBe(false);
      expect(config.useUnicode).toBe(false);
      expect(config.useAbbreviations).toBe(true);
      expect(config.maxPlayers).toBe(1); // Math.min(4, Math.floor(15 / 8))
    });

    test('should create config for medium terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        width: 80,
        height: 24,
      };

      const config = createAdaptiveUIConfig(capabilities);

      expect(config.layoutStyle).toBe('medium');
      expect(config.cardStyle).toBe('compact');
      expect(config.useAbbreviations).toBe(false);
      expect(config.maxPlayers).toBe(3); // Math.min(4, Math.floor(24 / 8))
    });
  });

  describe('validateTerminalRequirements', () => {
    test('should validate good terminal', () => {
      const capabilities = global.mockTerminalCapabilities;
      const result = validateTerminalRequirements(capabilities);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('should warn about narrow terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        width: 35,
      };
      const result = validateTerminalRequirements(capabilities);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Terminal width is very narrow. Some features may not display properly.');
    });

    test('should reject extremely narrow terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        width: 15,
      };
      const result = validateTerminalRequirements(capabilities);

      expect(result.valid).toBe(false);
    });

    test('should warn about short terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        height: 8,
      };
      const result = validateTerminalRequirements(capabilities);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Terminal height is very short. Some features may not display properly.');
    });

    test('should reject non-interactive terminal', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        isInteractive: false,
      };
      const result = validateTerminalRequirements(capabilities);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Terminal is not interactive. Input handling may not work properly.');
    });

    test('should warn about missing features', () => {
      const capabilities = {
        ...global.mockTerminalCapabilities,
        hasColors: false,
        hasUnicode: false,
      };
      const result = validateTerminalRequirements(capabilities);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Terminal does not support colors. Display will be monochrome.');
      expect(result.warnings).toContain('Terminal does not support Unicode. Card symbols will be simplified.');
    });
  });

  describe('React Hooks Integration', () => {
    test('should have React hooks available for integration', () => {
      // Test that the hooks are exported and can be imported
      const { useTerminalCapabilities, useAdaptiveUIConfig, useTerminalValidation } = require('../../src/utils/terminal-detection');
      
      expect(typeof useTerminalCapabilities).toBe('function');
      expect(typeof useAdaptiveUIConfig).toBe('function');
      expect(typeof useTerminalValidation).toBe('function');
    });
  });
});