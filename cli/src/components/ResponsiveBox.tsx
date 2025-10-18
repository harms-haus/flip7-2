import React from 'react';
import { Box, BoxProps } from 'ink';
import { useResponsiveLayout, useAreaDimensions } from '../utils/layout-calculator';
import { LayoutConfiguration, CalculatedArea } from '../types';

/**
 * Props for ResponsiveBox component.
 */
export interface ResponsiveBoxProps extends Omit<BoxProps, 'width' | 'height'> {
  /** Area name to use for dimensions */
  area?: string;
  
  /** Custom layout configuration */
  layoutConfig?: LayoutConfiguration;
  
  /** Fallback width if area is not found */
  fallbackWidth?: number | string;
  
  /** Fallback height if area is not found */
  fallbackHeight?: number | string;
  
  /** Whether to hide when area is not visible */
  hideWhenInvisible?: boolean;
}

/**
 * Responsive Box component that adapts to terminal size and layout configuration.
 */
export const ResponsiveBox: React.FC<ResponsiveBoxProps> = ({
  area,
  layoutConfig,
  fallbackWidth,
  fallbackHeight,
  hideWhenInvisible = true,
  children,
  ...boxProps
}) => {
  const areaDimensions = useAreaDimensions(area || '', layoutConfig);
  
  // If area is specified but not found, use fallbacks or hide
  if (area && !areaDimensions) {
    if (hideWhenInvisible) {
      return null;
    }
    
    return (
      <Box
        width={fallbackWidth}
        height={fallbackHeight}
        {...boxProps}
      >
        {children}
      </Box>
    );
  }
  
  // If area is specified and found, use its dimensions
  if (area && areaDimensions) {
    if (!areaDimensions.visible && hideWhenInvisible) {
      return null;
    }
    
    return (
      <Box
        width={areaDimensions.width}
        height={areaDimensions.height}
        {...boxProps}
      >
        {children}
      </Box>
    );
  }
  
  // If no area specified, render as normal Box
  return (
    <Box
      width={fallbackWidth}
      height={fallbackHeight}
      {...boxProps}
    >
      {children}
    </Box>
  );
};

/**
 * Props for ResponsiveContainer component.
 */
export interface ResponsiveContainerProps extends BoxProps {
  /** Layout configuration to use */
  layoutConfig?: LayoutConfiguration;
  
  /** Whether to show layout warnings */
  showWarnings?: boolean;
}

/**
 * Container component that provides responsive layout context.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  layoutConfig,
  showWarnings = false,
  children,
  ...boxProps
}) => {
  const layoutState = useResponsiveLayout(layoutConfig);
  
  return (
    <Box flexDirection="column" {...boxProps}>
      {showWarnings && layoutState.warnings.length > 0 && (
        <Box marginBottom={1}>
          {layoutState.warnings.map((warning, index) => (
            <Box key={index}>
              ⚠️  {warning}
            </Box>
          ))}
        </Box>
      )}
      {children}
    </Box>
  );
};

/**
 * Hook to get responsive styling based on terminal size.
 */
export function useResponsiveStyles() {
  const layoutState = useResponsiveLayout();
  
  return {
    sizeCategory: layoutState.sizeCategory,
    isTooSmall: layoutState.isTooSmall,
    getAreaStyles: (areaName: string) => {
      const area = layoutState.calculatedAreas[areaName];
      if (!area || !area.visible) return null;
      
      return {
        width: area.width,
        height: area.height,
        paddingX: Math.floor(area.contentArea.x),
        paddingY: Math.floor(area.contentArea.y),
      };
    },
  };
}

/**
 * Responsive Text component that adapts content based on terminal size.
 */
export interface ResponsiveTextProps {
  /** Text for small terminals */
  small?: string;
  
  /** Text for medium terminals */
  medium?: string;
  
  /** Text for large terminals */
  large?: string;
  
  /** Fallback text if size-specific text is not provided */
  fallback?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  small,
  medium,
  large,
  fallback = '',
}) => {
  const { sizeCategory } = useResponsiveStyles();
  
  let text = fallback;
  
  switch (sizeCategory) {
    case 'small':
      text = small || medium || large || fallback;
      break;
    case 'medium':
      text = medium || large || small || fallback;
      break;
    case 'large':
      text = large || medium || small || fallback;
      break;
  }
  
  return <>{text}</>;
};