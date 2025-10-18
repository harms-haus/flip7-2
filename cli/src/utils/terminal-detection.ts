import { TerminalCapabilities, AdaptiveUIConfig } from '../types';

/**
 * Detect terminal capabilities at runtime.
 * Used to adapt the UI to different terminal environments.
 */
export function detectTerminalCapabilities(): TerminalCapabilities {
  const { stdout, env } = process;
  
  // Detect terminal dimensions
  const width = stdout.columns || 80;
  const height = stdout.rows || 24;
  
  // Detect color support
  const hasColors = !!(
    stdout.isTTY &&
    (env['COLORTERM'] ||
     env['TERM'] === 'xterm-256color' ||
     env['TERM'] === 'screen-256color' ||
     env['TERM']?.includes('color'))
  );
  
  // Detect color depth
  let colorDepth: 1 | 4 | 8 | 24 = 1;
  if (hasColors) {
    if (env['COLORTERM'] === 'truecolor' || env['TERM']?.includes('24bit')) {
      colorDepth = 24;
    } else if (env['TERM']?.includes('256')) {
      colorDepth = 8;
    } else {
      colorDepth = 4;
    }
  }
  
  // Detect Unicode support
  const hasUnicode = !!(
    env['LANG']?.includes('UTF-8') ||
    env['LC_ALL']?.includes('UTF-8') ||
    env['LC_CTYPE']?.includes('UTF-8')
  );
  
  // Detect interactivity
  const isInteractive = !!(stdout.isTTY && process.stdin.isTTY);
  
  // Detect mouse support (basic heuristic)
  const hasMouse = !!(
    env['TERM']?.includes('xterm') ||
    env['TERM']?.includes('screen') ||
    env['TERM']?.includes('tmux')
  );
  
  // Get terminal type
  const terminalType = env['TERM'] || 'unknown';
  
  // Detect cursor and screen capabilities
  const supportsCursorPositioning = isInteractive && stdout.isTTY;
  const supportsScreenClear = isInteractive && stdout.isTTY;
  
  return {
    hasColors,
    hasUnicode,
    hasMouse,
    isInteractive,
    colorDepth,
    width,
    height,
    terminalType,
    supportsCursorPositioning,
    supportsScreenClear,
  };
}

/**
 * Create adaptive UI configuration based on terminal capabilities.
 */
export function createAdaptiveUIConfig(
  capabilities: TerminalCapabilities
): AdaptiveUIConfig {
  const { width, height, hasColors, hasUnicode, isInteractive } = capabilities;
  
  // Determine layout style based on width
  let layoutStyle: 'narrow' | 'medium' | 'wide';
  if (width < 60) {
    layoutStyle = 'narrow';
  } else if (width < 100) {
    layoutStyle = 'medium';
  } else {
    layoutStyle = 'wide';
  }
  
  // Determine card style based on width
  let cardStyle: 'minimal' | 'compact' | 'detailed';
  if (width < 60) {
    cardStyle = 'minimal';
  } else if (width < 100) {
    cardStyle = 'compact';
  } else {
    cardStyle = 'detailed';
  }
  
  // Calculate maximum players based on height
  const maxPlayers = Math.min(4, Math.floor(height / 8));
  
  return {
    useColors: hasColors,
    useUnicode: hasUnicode,
    cardStyle,
    showHelp: isInteractive,
    maxPlayers,
    layoutStyle,
    useAbbreviations: width < 80,
  };
}

/**
 * Check if terminal meets minimum requirements for the application.
 */
export function validateTerminalRequirements(
  capabilities: TerminalCapabilities
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let valid = true;
  
  // Check minimum dimensions
  if (capabilities.width < 40) {
    warnings.push('Terminal width is very narrow. Some features may not display properly.');
    if (capabilities.width < 20) {
      valid = false;
    }
  }
  
  if (capabilities.height < 10) {
    warnings.push('Terminal height is very short. Some features may not display properly.');
    if (capabilities.height < 5) {
      valid = false;
    }
  }
  
  // Check interactivity
  if (!capabilities.isInteractive) {
    warnings.push('Terminal is not interactive. Input handling may not work properly.');
    valid = false;
  }
  
  // Warn about missing features
  if (!capabilities.hasColors) {
    warnings.push('Terminal does not support colors. Display will be monochrome.');
  }
  
  if (!capabilities.hasUnicode) {
    warnings.push('Terminal does not support Unicode. Card symbols will be simplified.');
  }
  
  return { valid, warnings };
}