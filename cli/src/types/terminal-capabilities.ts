/**
 * Terminal capabilities detected at runtime.
 * Used to adapt the UI to different terminal environments.
 */
export interface TerminalCapabilities {
  /** Whether the terminal supports colors */
  hasColors: boolean;
  
  /** Whether the terminal supports Unicode characters */
  hasUnicode: boolean;
  
  /** Whether the terminal supports mouse input */
  hasMouse: boolean;
  
  /** Whether the terminal is interactive (not piped/redirected) */
  isInteractive: boolean;
  
  /** Color depth support (1=monochrome, 4=16colors, 8=256colors, 24=truecolor) */
  colorDepth: 1 | 4 | 8 | 24;
  
  /** Terminal width in columns */
  width: number;
  
  /** Terminal height in rows */
  height: number;
  
  /** Terminal type/emulator name */
  terminalType: string;
  
  /** Whether the terminal supports cursor positioning */
  supportsCursorPositioning: boolean;
  
  /** Whether the terminal supports clearing screen */
  supportsScreenClear: boolean;
}

/**
 * Adaptive UI configuration based on terminal capabilities.
 */
export interface AdaptiveUIConfig {
  /** Whether to use colors in the interface */
  useColors: boolean;
  
  /** Character set to use for UI elements */
  useUnicode: boolean;
  
  /** Card display style based on terminal width */
  cardStyle: 'minimal' | 'compact' | 'detailed';
  
  /** Whether to show help information */
  showHelp: boolean;
  
  /** Maximum number of players that can be displayed */
  maxPlayers: number;
  
  /** Layout style based on terminal size */
  layoutStyle: 'narrow' | 'medium' | 'wide';
  
  /** Whether to use abbreviated text */
  useAbbreviations: boolean;
}