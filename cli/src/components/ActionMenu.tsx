import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { ActionDefinition } from '../types/actions';
import { GameAction } from '../engine/game-loop';

/**
 * Props for ActionMenu component.
 */
export interface ActionMenuProps {
  /** Available actions to display */
  actions: ActionDefinition[];
  
  /** Currently selected action index */
  selectedIndex?: number;
  
  /** Title for the action menu */
  title?: string;
  
  /** Whether the menu is currently active/focused */
  isActive?: boolean;
  
  /** Maximum number of visible actions */
  maxVisible?: number;
  
  /** Whether to show key bindings */
  showKeyBindings?: boolean;
  
  /** Whether to show action descriptions */
  showDescriptions?: boolean;
  
  /** Callback when an action is selected */
  onActionSelect?: (action: ActionDefinition, index: number) => void;
  
  /** Callback when navigation occurs */
  onNavigate?: (direction: 'up' | 'down', newIndex: number) => void;
  
  /** Custom styling options */
  style?: {
    selectedColor?: string;
    disabledColor?: string;
    keyBindingColor?: string;
    borderColor?: string;
  };
}

/**
 * Dynamic action menu component that displays available game actions
 * with keyboard navigation support.
 */
export const ActionMenu: React.FC<ActionMenuProps> = ({
  actions,
  selectedIndex = 0,
  title = 'Actions',
  isActive = true,
  maxVisible = 10,
  showKeyBindings = true,
  showDescriptions = false,
  onActionSelect,
  onNavigate,
  style = {},
}) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Filter enabled actions
  const enabledActions = actions.filter(action => action.enabled);
  const totalActions = enabledActions.length;

  // Update current index when selectedIndex prop changes
  useEffect(() => {
    setCurrentIndex(Math.max(0, Math.min(selectedIndex, totalActions - 1)));
  }, [selectedIndex, totalActions]);

  // Calculate visible actions based on scroll offset
  const visibleActions = enabledActions.slice(scrollOffset, scrollOffset + maxVisible);

  // Handle navigation
  const handleNavigation = useCallback((direction: 'up' | 'down') => {
    if (totalActions === 0) return;

    let newIndex = currentIndex;
    
    if (direction === 'up') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : totalActions - 1;
    } else {
      newIndex = currentIndex < totalActions - 1 ? currentIndex + 1 : 0;
    }

    setCurrentIndex(newIndex);

    // Update scroll offset if needed
    if (newIndex < scrollOffset) {
      setScrollOffset(newIndex);
    } else if (newIndex >= scrollOffset + maxVisible) {
      setScrollOffset(newIndex - maxVisible + 1);
    }

    if (onNavigate) {
      onNavigate(direction, newIndex);
    }
  }, [currentIndex, totalActions, scrollOffset, maxVisible, onNavigate]);

  // Handle action selection
  const handleSelection = useCallback(() => {
    if (totalActions > 0 && currentIndex >= 0 && currentIndex < totalActions) {
      const selectedAction = enabledActions[currentIndex];
      if (onActionSelect) {
        onActionSelect(selectedAction, currentIndex);
      }
    }
  }, [currentIndex, totalActions, enabledActions, onActionSelect]);

  // Render individual action item
  const renderActionItem = (action: ActionDefinition, index: number, isSelected: boolean) => {
    const itemStyle = {
      selectedColor: style.selectedColor || 'blue',
      disabledColor: style.disabledColor || 'gray',
      keyBindingColor: style.keyBindingColor || 'cyan',
    };

    const displayIndex = scrollOffset + index;
    const isCurrentlySelected = isSelected && isActive;

    return (
      <Box key={action.id} flexDirection="row" alignItems="center">
        {/* Selection indicator */}
        <Text color={isCurrentlySelected ? itemStyle.selectedColor : undefined}>
          {isCurrentlySelected ? '▶ ' : '  '}
        </Text>

        {/* Key binding */}
        {showKeyBindings && action.keyBinding && (
          <Box marginRight={1}>
            <Text color={itemStyle.keyBindingColor} bold>
              [{action.keyBinding.toUpperCase()}]
            </Text>
          </Box>
        )}

        {/* Action label */}
        <Box flexGrow={1}>
          <Text 
            color={isCurrentlySelected ? itemStyle.selectedColor : undefined}
            bold={isCurrentlySelected}
          >
            {action.label}
          </Text>
        </Box>

        {/* Description (if enabled) */}
        {showDescriptions && action.description && (
          <Box marginLeft={1}>
            <Text dimColor>{action.description}</Text>
          </Box>
        )}
      </Box>
    );
  };

  // Render scroll indicators
  const renderScrollIndicators = () => {
    if (totalActions <= maxVisible) return null;

    const canScrollUp = scrollOffset > 0;
    const canScrollDown = scrollOffset + maxVisible < totalActions;

    return (
      <Box flexDirection="column" alignItems="center">
        {canScrollUp && (
          <Text dimColor>↑ More actions above</Text>
        )}
        {canScrollDown && (
          <Text dimColor>↓ More actions below</Text>
        )}
      </Box>
    );
  };

  if (totalActions === 0) {
    return (
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor={style.borderColor || 'gray'}
        padding={1}
      >
        <Text bold>{title}</Text>
        <Text dimColor>No actions available</Text>
      </Box>
    );
  }

  return (
    <Box 
      flexDirection="column" 
      borderStyle="single" 
      borderColor={isActive ? (style.borderColor || 'blue') : 'gray'}
      padding={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={isActive ? 'blue' : undefined}>
          {title} ({totalActions} available)
        </Text>
      </Box>

      {/* Action list */}
      <Box flexDirection="column">
        {visibleActions.map((action, index) => 
          renderActionItem(action, index, currentIndex === scrollOffset + index)
        )}
      </Box>

      {/* Scroll indicators */}
      {renderScrollIndicators()}

      {/* Help text */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            Use ↑↓ to navigate, Enter to select{showKeyBindings ? ', or press the key directly' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing action menu state and navigation.
 */
export const useActionMenu = (actions: ActionDefinition[]) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const enabledActions = actions.filter(action => action.enabled);

  // Navigate in the menu
  const navigate = useCallback((direction: 'up' | 'down') => {
    if (enabledActions.length === 0) return;

    setSelectedIndex(current => {
      if (direction === 'up') {
        return current > 0 ? current - 1 : enabledActions.length - 1;
      } else {
        return current < enabledActions.length - 1 ? current + 1 : 0;
      }
    });
  }, [enabledActions.length]);

  // Select current action
  const selectCurrent = useCallback((): ActionDefinition | null => {
    if (selectedIndex >= 0 && selectedIndex < enabledActions.length) {
      return enabledActions[selectedIndex];
    }
    return null;
  }, [selectedIndex, enabledActions]);

  // Reset selection when actions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [actions]);

  return {
    selectedIndex,
    setSelectedIndex,
    isActive,
    setIsActive,
    navigate,
    selectCurrent,
    enabledActions,
  };
};