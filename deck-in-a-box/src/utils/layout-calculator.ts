import { useEffect, useState } from 'react';
import { 
  LayoutConfiguration, 
  LayoutState, 
  CalculatedArea 
} from '../types';
import { useTerminalCapabilities } from './terminal-detection';

/**
 * Default layout configuration for the application.
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfiguration = {
  terminalWidth: 80,
  terminalHeight: 24,
  minWidth: 40,
  minHeight: 10,
  breakpoints: {
    small: 60,
    medium: 100,
    large: 140,
  },
  areas: {
    playerHandArea: {
      small: { width: '100%', height: 6, visible: true, flexGrow: 0 },
      medium: { width: '100%', height: 8, visible: true, flexGrow: 0 },
      large: { width: '100%', height: 10, visible: true, flexGrow: 0 },
      flexDirection: 'column',
      priority: 10,
      minHeight: 4,
    },
    gameBoardArea: {
      small: { width: '100%', height: '50%', visible: true, flexGrow: 1 },
      medium: { width: '70%', height: '60%', visible: true, flexGrow: 1 },
      large: { width: '60%', height: '70%', visible: true, flexGrow: 1 },
      flexDirection: 'column',
      priority: 9,
      minWidth: 20,
      minHeight: 8,
    },
    opponentArea: {
      small: { width: '100%', height: 4, visible: false },
      medium: { width: '30%', height: '60%', visible: true, flexGrow: 0 },
      large: { width: '40%', height: '70%', visible: true, flexGrow: 0 },
      flexDirection: 'column',
      priority: 7,
      minWidth: 15,
    },
    statusArea: {
      small: { width: '100%', height: 2, visible: true, flexGrow: 0 },
      medium: { width: '100%', height: 3, visible: true, flexGrow: 0 },
      large: { width: '100%', height: 4, visible: true, flexGrow: 0 },
      flexDirection: 'row',
      priority: 8,
      minHeight: 2,
    },
    actionArea: {
      small: { width: '100%', height: 4, visible: true, flexGrow: 0 },
      medium: { width: '100%', height: 5, visible: true, flexGrow: 0 },
      large: { width: '100%', height: 6, visible: true, flexGrow: 0 },
      flexDirection: 'column',
      priority: 9,
      minHeight: 3,
    },
    helpArea: {
      small: { width: '100%', height: 0, visible: false },
      medium: { width: '100%', height: 2, visible: true, flexGrow: 0 },
      large: { width: '100%', height: 3, visible: true, flexGrow: 0 },
      flexDirection: 'row',
      priority: 3,
    },
  },
};

/**
 * Calculate layout state based on terminal capabilities and configuration.
 */
export function calculateLayout(
  terminalWidth: number,
  terminalHeight: number,
  config: LayoutConfiguration = DEFAULT_LAYOUT_CONFIG
): LayoutState {
  // Determine size category
  const sizeCategory = getSizeCategory(terminalWidth, config.breakpoints);
  
  // Check if terminal is too small
  const isTooSmall = terminalWidth < config.minWidth || terminalHeight < config.minHeight;
  
  // Generate warnings
  const warnings: string[] = [];
  if (isTooSmall) {
    warnings.push(`Terminal size (${terminalWidth}x${terminalHeight}) is below minimum requirements (${config.minWidth}x${config.minHeight})`);
  }
  
  // Calculate areas
  const calculatedAreas: Record<string, CalculatedArea> = {};
  
  // Sort areas by priority for space allocation
  const areaEntries = Object.entries(config.areas).sort(
    ([, a], [, b]) => b.priority - a.priority
  );
  
  let remainingHeight = terminalHeight;
  let remainingWidth = terminalWidth;
  
  // First pass: calculate fixed-size areas
  for (const [areaName, areaDef] of areaEntries) {
    const areaConfig = areaDef[sizeCategory];
    
    if (!areaConfig.visible) {
      calculatedAreas[areaName] = createInvisibleArea();
      continue;
    }
    
    // Check minimum requirements
    if (areaDef.minWidth && remainingWidth < areaDef.minWidth) {
      calculatedAreas[areaName] = createInvisibleArea();
      warnings.push(`${areaName} hidden due to insufficient width`);
      continue;
    }
    
    if (areaDef.minHeight && remainingHeight < areaDef.minHeight) {
      calculatedAreas[areaName] = createInvisibleArea();
      warnings.push(`${areaName} hidden due to insufficient height`);
      continue;
    }
    
    const width = calculateDimension(areaConfig.width, terminalWidth);
    const height = calculateDimension(areaConfig.height, terminalHeight);
    
    calculatedAreas[areaName] = {
      width,
      height,
      x: 0, // Will be positioned in second pass
      y: 0, // Will be positioned in second pass
      visible: true,
      contentArea: {
        width: Math.max(0, width - (areaConfig.padding || 0) * 2),
        height: Math.max(0, height - (areaConfig.padding || 0) * 2),
        x: areaConfig.padding || 0,
        y: areaConfig.padding || 0,
      },
    };
    
    // Update remaining space (simplified calculation)
    if (typeof areaConfig.height === 'number') {
      remainingHeight = Math.max(0, remainingHeight - height);
    }
  }
  
  // Second pass: position areas (simplified vertical stacking)
  let currentY = 0;
  const orderedAreas = ['playerHandArea', 'gameBoardArea', 'opponentArea', 'statusArea', 'actionArea', 'helpArea'];
  
  for (const areaName of orderedAreas) {
    const area = calculatedAreas[areaName];
    if (area && area.visible) {
      area.y = currentY;
      area.contentArea.y = currentY + (area.contentArea.y - currentY);
      currentY += area.height;
    }
  }
  
  return {
    sizeCategory,
    calculatedAreas,
    isTooSmall,
    warnings,
  };
}

/**
 * Determine size category based on terminal width and breakpoints.
 */
function getSizeCategory(
  width: number,
  breakpoints: LayoutConfiguration['breakpoints']
): 'small' | 'medium' | 'large' {
  if (width < breakpoints.small) return 'small';
  if (width < breakpoints.medium) return 'medium';
  return 'large';
}

/**
 * Calculate actual dimension from percentage or fixed value.
 */
function calculateDimension(
  dimension: number | string,
  totalSize: number
): number {
  if (typeof dimension === 'number') {
    return dimension;
  }
  
  if (typeof dimension === 'string' && dimension.endsWith('%')) {
    const percentage = parseFloat(dimension);
    if (isNaN(percentage)) return 0;
    return Math.floor(totalSize * (percentage / 100));
  }
  
  const parsed = parseInt(dimension as string, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Create an invisible area placeholder.
 */
function createInvisibleArea(): CalculatedArea {
  return {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    visible: false,
    contentArea: { width: 0, height: 0, x: 0, y: 0 },
  };
}

/**
 * React hook for responsive layout calculation.
 */
export function useResponsiveLayout(
  config: LayoutConfiguration = DEFAULT_LAYOUT_CONFIG
): LayoutState {
  const capabilities = useTerminalCapabilities();
  const [layoutState, setLayoutState] = useState<LayoutState>(() =>
    calculateLayout(capabilities.width, capabilities.height, config)
  );

  useEffect(() => {
    const newLayout = calculateLayout(capabilities.width, capabilities.height, config);
    setLayoutState(newLayout);
  }, [capabilities.width, capabilities.height, config]);

  return layoutState;
}

/**
 * React hook for a specific area's calculated dimensions.
 */
export function useAreaDimensions(
  areaName: string,
  config?: LayoutConfiguration
): CalculatedArea | null {
  const layoutState = useResponsiveLayout(config);
  return layoutState.calculatedAreas[areaName] || null;
}