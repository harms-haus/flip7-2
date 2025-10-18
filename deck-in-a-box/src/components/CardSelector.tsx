import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Card } from 'big-deck-energy';
import { CardRenderer } from './CardRenderer';

/**
 * Card selection mode.
 */
export type CardSelectionMode = 'single' | 'multiple' | 'range';

/**
 * Card selection result.
 */
export interface CardSelectionResult {
  /** Selected cards */
  selectedCards: Card[];
  
  /** Indices of selected cards */
  selectedIndices: number[];
  
  /** Selection mode used */
  mode: CardSelectionMode;
}

/**
 * Props for CardSelector component.
 */
export interface CardSelectorProps {
  /** Cards to display for selection */
  cards: Card[];
  
  /** Selection mode */
  selectionMode?: CardSelectionMode;
  
  /** Maximum number of cards that can be selected */
  maxSelections?: number;
  
  /** Currently selected card indices */
  selectedIndices?: number[];
  
  /** Currently focused card index */
  focusedIndex?: number;
  
  /** Whether the selector is active */
  isActive?: boolean;
  
  /** Title for the selector */
  title?: string;
  
  /** Whether to show card faces or backs */
  showFaces?: boolean;
  
  /** Card display size */
  cardSize?: 'small' | 'medium' | 'large';
  
  /** Maximum cards per row */
  cardsPerRow?: number;
  
  /** Whether to show selection indicators */
  showSelectionIndicators?: boolean;
  
  /** Whether to show card indices */
  showIndices?: boolean;
  
  /** Callback when selection changes */
  onSelectionChange?: (result: CardSelectionResult) => void;
  
  /** Callback when navigation occurs */
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right', newIndex: number) => void;
  
  /** Callback when selection is confirmed */
  onConfirm?: (result: CardSelectionResult) => void;
  
  /** Custom styling */
  style?: {
    selectedColor?: string;
    focusedColor?: string;
    borderColor?: string;
  };
}

/**
 * Card selection interface with keyboard navigation.
 * Supports single, multiple, and range selection modes.
 */
export const CardSelector: React.FC<CardSelectorProps> = ({
  cards,
  selectionMode = 'single',
  maxSelections,
  selectedIndices = [],
  focusedIndex = 0,
  isActive = true,
  title = 'Select Cards',
  showFaces = true,
  cardSize = 'medium',
  cardsPerRow = 5,
  showSelectionIndicators = true,
  showIndices = false,
  onSelectionChange,
  onNavigate,
  onConfirm,
  style = {},
}) => {
  const [currentFocus, setCurrentFocus] = useState(focusedIndex);
  const [currentSelection, setCurrentSelection] = useState<number[]>(selectedIndices);
  const [rangeStart, setRangeStart] = useState<number | null>(null);

  const totalCards = cards.length;

  // Update focus when prop changes
  useEffect(() => {
    setCurrentFocus(Math.max(0, Math.min(focusedIndex, totalCards - 1)));
  }, [focusedIndex, totalCards]);

  // Update selection when prop changes
  useEffect(() => {
    setCurrentSelection(selectedIndices);
  }, [selectedIndices]);

  // Calculate grid dimensions
  const rows = Math.ceil(totalCards / cardsPerRow);
  const getRowCol = (index: number) => ({
    row: Math.floor(index / cardsPerRow),
    col: index % cardsPerRow,
  });

  // Handle navigation
  const _handleNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (totalCards === 0) return;

    const { row, col } = getRowCol(currentFocus);
    let newIndex = currentFocus;

    switch (direction) {
      case 'up':
        if (row > 0) {
          newIndex = Math.max(0, currentFocus - cardsPerRow);
        } else {
          // Wrap to bottom row
          const bottomRowStart = (rows - 1) * cardsPerRow;
          newIndex = Math.min(bottomRowStart + col, totalCards - 1);
        }
        break;

      case 'down':
        if (row < rows - 1) {
          newIndex = Math.min(currentFocus + cardsPerRow, totalCards - 1);
        } else {
          // Wrap to top row
          newIndex = Math.min(col, totalCards - 1);
        }
        break;

      case 'left':
        if (col > 0) {
          newIndex = currentFocus - 1;
        } else {
          // Wrap to end of previous row or last card
          if (row > 0) {
            newIndex = Math.min((row * cardsPerRow) - 1, totalCards - 1);
          } else {
            newIndex = totalCards - 1;
          }
        }
        break;

      case 'right':
        if (col < cardsPerRow - 1 && currentFocus < totalCards - 1) {
          newIndex = currentFocus + 1;
        } else {
          // Wrap to start of next row or first card
          if (row < rows - 1) {
            newIndex = (row + 1) * cardsPerRow;
            if (newIndex >= totalCards) {
              newIndex = 0;
            }
          } else {
            newIndex = 0;
          }
        }
        break;
    }

    setCurrentFocus(newIndex);
    
    if (onNavigate) {
      onNavigate(direction, newIndex);
    }
  }, [currentFocus, totalCards, cardsPerRow, rows, onNavigate]);

  // Handle card selection
  const _handleSelection = useCallback((index: number) => {
    let newSelection = [...currentSelection];

    switch (selectionMode) {
      case 'single':
        newSelection = [index];
        break;

      case 'multiple':
        if (newSelection.includes(index)) {
          newSelection = newSelection.filter(i => i !== index);
        } else {
          if (!maxSelections || newSelection.length < maxSelections) {
            newSelection.push(index);
          }
        }
        break;

      case 'range':
        if (rangeStart === null) {
          setRangeStart(index);
          newSelection = [index];
        } else {
          const start = Math.min(rangeStart, index);
          const end = Math.max(rangeStart, index);
          newSelection = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          setRangeStart(null);
        }
        break;
    }

    setCurrentSelection(newSelection);

    const result: CardSelectionResult = {
      selectedCards: newSelection.map(i => cards[i]),
      selectedIndices: newSelection,
      mode: selectionMode,
    };

    if (onSelectionChange) {
      onSelectionChange(result);
    }
  }, [currentSelection, selectionMode, maxSelections, rangeStart, cards, onSelectionChange]);

  // Handle confirmation
  const _handleConfirm = useCallback(() => {
    const result: CardSelectionResult = {
      selectedCards: currentSelection.map(i => cards[i]),
      selectedIndices: currentSelection,
      mode: selectionMode,
    };

    if (onConfirm) {
      onConfirm(result);
    }
  }, [currentSelection, cards, selectionMode, onConfirm]);

  // Render individual card
  const renderCard = (card: Card, index: number) => {
    const isSelected = currentSelection.includes(index);
    const isFocused = currentFocus === index && isActive;
    const isRangeStart = rangeStart === index;

    const cardStyle = {
      selectedColor: style.selectedColor || 'green',
      focusedColor: style.focusedColor || 'blue',
    };

    return (
      <Box key={index} flexDirection="column" alignItems="center" marginRight={1} marginBottom={1}>
        {/* Card display */}
        <Box position="relative">
          <CardRenderer
            card={card}
            options={{
              showFace: showFaces,
              highlight: isFocused,
              size: cardSize,
              selectable: true
            }}
          />
          
          {/* Selection indicators */}
          {showSelectionIndicators && (
            <Box>
              {isSelected && (
                <Text color={cardStyle.selectedColor} bold>✓</Text>
              )}
              {isFocused && (
                <Text color={cardStyle.focusedColor}>▶</Text>
              )}
              {isRangeStart && (
                <Text color="yellow">●</Text>
              )}
            </Box>
          )}
        </Box>

        {/* Card index */}
        {showIndices && (
          <Text dimColor>{index + 1}</Text>
        )}
      </Box>
    );
  };

  // Render cards in grid layout
  const renderCardGrid = () => {
    const cardRows: Card[][] = [];
    
    for (let i = 0; i < totalCards; i += cardsPerRow) {
      cardRows.push(cards.slice(i, i + cardsPerRow));
    }

    return (
      <Box flexDirection="column">
        {cardRows.map((row, rowIndex) => (
          <Box key={rowIndex} flexDirection="row">
            {row.map((card, colIndex) => {
              const cardIndex = rowIndex * cardsPerRow + colIndex;
              return renderCard(card, cardIndex);
            })}
          </Box>
        ))}
      </Box>
    );
  };

  // Render selection info
  const renderSelectionInfo = () => {
    const selectionCount = currentSelection.length;
    const maxText = maxSelections ? ` (max ${maxSelections})` : '';
    
    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Text>
          Selected: {selectionCount}{maxText}
        </Text>
        
        {selectionMode === 'range' && rangeStart !== null && (
          <Text color="yellow">
            Range start: {rangeStart + 1}
          </Text>
        )}
      </Box>
    );
  };

  if (totalCards === 0) {
    return (
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor={style.borderColor || 'gray'}
        padding={1}
      >
        <Text bold>{title}</Text>
        <Text dimColor>No cards available</Text>
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
          {title}
        </Text>
      </Box>

      {/* Selection info */}
      <Box marginBottom={1}>
        {renderSelectionInfo()}
      </Box>

      {/* Card grid */}
      {renderCardGrid()}

      {/* Help text */}
      {isActive && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>
            Use arrow keys to navigate, Space to select, Enter to confirm
          </Text>
          {selectionMode === 'range' && (
            <Text dimColor>
              Range mode: Select start and end points
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing card selection state.
 */
export const useCardSelector = (
  cards: Card[], 
  selectionMode: CardSelectionMode = 'single',
  maxSelections?: number
) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Clear selection when cards change
  useEffect(() => {
    setSelectedIndices([]);
    setFocusedIndex(0);
  }, [cards]);

  // Get selected cards
  const getSelectedCards = useCallback((): Card[] => {
    return selectedIndices.map(index => cards[index]).filter(Boolean);
  }, [selectedIndices, cards]);

  // Select card by index
  const selectCard = useCallback((index: number) => {
    if (index < 0 || index >= cards.length) return;

    setSelectedIndices(current => {
      switch (selectionMode) {
        case 'single':
          return [index];
          
        case 'multiple':
          if (current.includes(index)) {
            return current.filter(i => i !== index);
          } else {
            if (!maxSelections || current.length < maxSelections) {
              return [...current, index];
            }
            return current;
          }
          
        default:
          return current;
      }
    });
  }, [cards.length, selectionMode, maxSelections]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIndices([]);
  }, []);

  // Navigate focus
  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right', cardsPerRow: number = 5) => {
    setFocusedIndex(current => {
      const totalCards = cards.length;
      const rows = Math.ceil(totalCards / cardsPerRow);
      const row = Math.floor(current / cardsPerRow);
      const col = current % cardsPerRow;

      switch (direction) {
        case 'up':
          return row > 0 ? current - cardsPerRow : current;
        case 'down':
          return row < rows - 1 ? Math.min(current + cardsPerRow, totalCards - 1) : current;
        case 'left':
          return current > 0 ? current - 1 : totalCards - 1;
        case 'right':
          return current < totalCards - 1 ? current + 1 : 0;
        default:
          return current;
      }
    });
  }, [cards.length]);

  return {
    selectedIndices,
    setSelectedIndices,
    focusedIndex,
    setFocusedIndex,
    isActive,
    setIsActive,
    getSelectedCards,
    selectCard,
    clearSelection,
    navigate,
  };
};