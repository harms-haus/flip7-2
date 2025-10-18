/**
 * Responsive area definition for different terminal sizes.
 */
export interface ResponsiveAreaDefinition {
  /** Layout for narrow terminals (< 60 columns) */
  small: AreaDefinition;
  
  /** Layout for medium terminals (60-100 columns) */
  medium: AreaDefinition;
  
  /** Layout for wide terminals (> 100 columns) */
  large: AreaDefinition;
  
  /** Flex direction for this area */
  flexDirection: 'row' | 'column';
  
  /** Priority for space allocation (higher = more important) */
  priority: number;
  
  /** Minimum size requirements */
  minWidth?: number;
  minHeight?: number;
}

/**
 * Definition of a layout area.
 */
export interface AreaDefinition {
  /** Width as percentage or fixed columns */
  width: number | string;
  
  /** Height as percentage or fixed rows */
  height: number | string;
  
  /** Padding inside the area */
  padding?: number;
  
  /** Margin around the area */
  margin?: number;
  
  /** Whether this area is visible at this size */
  visible: boolean;
  
  /** Flex grow factor */
  flexGrow?: number;
  
  /** Flex shrink factor */
  flexShrink?: number;
}

/**
 * Complete layout configuration for the application.
 */
export interface LayoutConfiguration {
  /** Current terminal width */
  terminalWidth: number;
  
  /** Current terminal height */
  terminalHeight: number;
  
  /** Minimum required terminal width */
  minWidth: number;
  
  /** Minimum required terminal height */
  minHeight: number;
  
  /** Responsive breakpoints */
  breakpoints: {
    /** Small terminal threshold */
    small: number;
    
    /** Medium terminal threshold */
    medium: number;
    
    /** Large terminal threshold */
    large: number;
  };
  
  /** Layout areas for different parts of the interface */
  areas: {
    /** Player's hand display area */
    playerHandArea: ResponsiveAreaDefinition;
    
    /** Game board/table area */
    gameBoardArea: ResponsiveAreaDefinition;
    
    /** Other players' information area */
    opponentArea: ResponsiveAreaDefinition;
    
    /** Status and information area */
    statusArea: ResponsiveAreaDefinition;
    
    /** Action menu and controls area */
    actionArea: ResponsiveAreaDefinition;
    
    /** Help and hints area */
    helpArea: ResponsiveAreaDefinition;
  };
}

/**
 * Current layout state calculated from terminal size.
 */
export interface LayoutState {
  /** Current size category */
  sizeCategory: 'small' | 'medium' | 'large';
  
  /** Available areas and their calculated dimensions */
  calculatedAreas: Record<string, CalculatedArea>;
  
  /** Whether the terminal is too small for optimal display */
  isTooSmall: boolean;
  
  /** Warnings about layout constraints */
  warnings: string[];
}

/**
 * Calculated dimensions for a layout area.
 */
export interface CalculatedArea {
  /** Actual width in columns */
  width: number;
  
  /** Actual height in rows */
  height: number;
  
  /** X position (left offset) */
  x: number;
  
  /** Y position (top offset) */
  y: number;
  
  /** Whether this area is currently visible */
  visible: boolean;
  
  /** Available content area (excluding padding/margins) */
  contentArea: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}