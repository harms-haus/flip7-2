import React from 'react';
import { Box, Text } from 'ink';
import { Card } from 'big-deck-energy';
import { CardRenderOptions, CardBackOptions, SlotOptions } from '../types/ui-adapter';

/**
 * Enhanced card rendering component with support for different states,
 * sizes, orientations, and highlighting.
 */
export const CardRenderer: React.FC<{
  card?: Card;
  options: CardRenderOptions;
}> = ({ card, options }) => {
  if (!card) {
    return <EmptyCardSlot options={{ size: options.size }} />;
  }

  if (!options.showFace) {
    return <CardBack options={{ size: options.size, highlight: options.highlight }} />;
  }

  return <CardFace card={card} options={options} />;
};

/**
 * Renders the face of a card with full details.
 */
const CardFace: React.FC<{
  card: Card;
  options: CardRenderOptions;
}> = ({ card, options }) => {
  const {
    highlight,
    selectable,
    size = 'medium',
    orientation = 'up',
  } = options;

  const dimensions = getCardDimensions(size);
  const content = formatCardContent(card, size, orientation);
  const colors = getCardColors(card, highlight, selectable);

  return (
    <Box
      width={dimensions.width}
      height={dimensions.height}
      borderStyle="single"
      borderColor={colors.border}
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      {content.map((line, index) => (
        <Text key={index} color={colors.text} backgroundColor={colors.background}>
          {line}
        </Text>
      ))}
    </Box>
  );
};

/**
 * Renders the back of a card.
 */
export const CardBack: React.FC<{
  options: CardBackOptions;
}> = ({ options }) => {
  const {
    size = 'medium',
    highlight = false,
    design = '###',
  } = options;

  const dimensions = getCardDimensions(size);
  const borderColor = highlight ? 'yellow' : 'gray';
  const pattern = generateCardBackPattern(design, dimensions);

  return (
    <Box
      width={dimensions.width}
      height={dimensions.height}
      borderStyle="single"
      borderColor={borderColor}
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      {pattern.map((line, index) => (
        <Text key={index} color="gray">
          {line}
        </Text>
      ))}
    </Box>
  );
};

/**
 * Renders an empty card slot.
 */
export const EmptyCardSlot: React.FC<{
  options: SlotOptions;
}> = ({ options }) => {
  const {
    size = 'medium',
    highlight = false,
    placeholder = '...',
  } = options;

  const dimensions = getCardDimensions(size);
  const borderColor = highlight ? 'yellow' : 'gray';

  return (
    <Box
      width={dimensions.width}
      height={dimensions.height}
      borderStyle="single"
      borderColor={borderColor}
      justifyContent="center"
      alignItems="center"
    >
      <Text color="gray">{placeholder}</Text>
    </Box>
  );
};

/**
 * Renders multiple cards in a hand layout.
 */
export const HandRenderer: React.FC<{
  cards: Card[];
  options: {
    showFaces: boolean[];
    selectedIndex?: number;
    maxVisible?: number;
    size?: 'small' | 'medium' | 'large';
    layout?: 'horizontal' | 'vertical' | 'fan';
  };
}> = ({ cards, options }) => {
  const {
    showFaces,
    selectedIndex,
    maxVisible,
    size = 'medium',
    layout = 'horizontal',
  } = options;

  const visibleCards = maxVisible ? cards.slice(0, maxVisible) : cards;
  const hasMore = maxVisible && cards.length > maxVisible;

  if (layout === 'fan') {
    return <FanLayout cards={visibleCards} showFaces={showFaces} selectedIndex={selectedIndex} size={size} />;
  }

  const flexDirection = layout === 'vertical' ? 'column' : 'row';

  return (
    <Box flexDirection="column">
      <Box flexDirection={flexDirection}>
        {visibleCards.map((card, index) => (
          <Box key={index} marginRight={layout === 'horizontal' ? 1 : 0} marginBottom={layout === 'vertical' ? 1 : 0}>
            <CardRenderer
              card={card}
              options={{
                showFace: showFaces[index] || false,
                highlight: selectedIndex === index,
                selectable: true,
                size,
              }}
            />
          </Box>
        ))}
      </Box>
      
      {hasMore && (
        <Box marginTop={1}>
          <Text color="gray">... and {cards.length - maxVisible!} more cards</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Renders cards in a fan layout (overlapping).
 */
const FanLayout: React.FC<{
  cards: Card[];
  showFaces: boolean[];
  selectedIndex?: number;
  size: 'small' | 'medium' | 'large';
}> = ({ cards, showFaces, selectedIndex, size }) => {
  // For terminal UI, we'll simulate a fan by showing cards with slight offsets
  return (
    <Box flexDirection="column">
      {cards.map((card, index) => (
        <Box key={index} marginLeft={index * 2} marginTop={index > 0 ? -2 : 0}>
          <CardRenderer
            card={card}
            options={{
              showFace: showFaces[index] || false,
              highlight: selectedIndex === index,
              selectable: true,
              size,
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

/**
 * Renders a game board area with positioned cards.
 */
export const GameBoardRenderer: React.FC<{
  areas: {
    id: string;
    title: string;
    cards: Card[];
    showFaces: boolean[];
    position: { x: number; y: number };
    highlight?: boolean;
  }[];
  terminalSize: { width: number; height: number };
}> = ({ areas, terminalSize }) => {
  // Calculate grid layout based on terminal size
  // Grid calculations would go here if needed for layout

  return (
    <Box flexDirection="column" width={terminalSize.width} height={terminalSize.height}>
      {areas.map(area => (
        <Box key={area.id} marginBottom={1}>
          <Box marginBottom={1}>
            <Text bold color={area.highlight ? 'yellow' : 'white'}>
              {area.title} ({area.cards.length} cards)
            </Text>
          </Box>
          
          <Box flexDirection="row">
            {area.cards.slice(0, Math.min(area.cards.length, 8)).map((card, index) => (
              <Box key={index} marginRight={1}>
                <CardRenderer
                  card={card}
                  options={{
                    showFace: area.showFaces[index] || false,
                    highlight: false,
                    selectable: false,
                    size: 'small',
                  }}
                />
              </Box>
            ))}
            
            {area.cards.length > 8 && (
              <Box justifyContent="center" alignItems="center">
                <Text color="gray">+{area.cards.length - 8}</Text>
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Helper functions

interface CardDimensions {
  width: number;
  height: number;
}

function getCardDimensions(size: 'small' | 'medium' | 'large'): CardDimensions {
  switch (size) {
    case 'small':
      return { width: 6, height: 3 };
    case 'large':
      return { width: 12, height: 6 };
    default:
      return { width: 8, height: 4 };
  }
}

interface CardColors {
  border: string;
  text: string;
  background?: string;
}

function getCardColors(card: Card, highlight: boolean, selectable: boolean): CardColors {
  let borderColor = 'white';
  let textColor = 'white';
  
  // Determine suit color for standard playing cards
  const suit = card.properties.suit;
  if (suit === 'hearts' || suit === 'diamonds') {
    textColor = 'red';
  }
  
  // Apply highlighting
  if (highlight) {
    borderColor = 'yellow';
  } else if (selectable) {
    borderColor = 'blue';
  }
  
  return {
    border: borderColor,
    text: textColor,
  };
}

function formatCardContent(
  card: Card, 
  size: 'small' | 'medium' | 'large', 
  orientation: 'up' | 'down' | 'left' | 'right'
): string[] {
  const rank = getCardRank(card);
  const suit = getCardSuit(card);
  
  if (orientation === 'down') {
    // Rotated 180 degrees - reverse the content
    if (size === 'small') {
      return [suit + rank];
    } else if (size === 'large') {
      return [rank, suit, rank].reverse();
    } else {
      return [suit + rank];
    }
  }
  
  if (size === 'small') {
    return [rank + suit];
  } else if (size === 'large') {
    return [
      rank,
      suit,
      rank,
    ];
  } else {
    // Medium size
    return [
      rank + suit,
    ];
  }
}

function getCardRank(card: Card): string {
  const rank = card.properties.rank || card.properties.value || '?';
  
  // Convert numeric ranks to display format
  if (rank === 1 || rank === '1') return 'A';
  if (rank === 11 || rank === '11') return 'J';
  if (rank === 12 || rank === '12') return 'Q';
  if (rank === 13 || rank === '13') return 'K';
  
  return String(rank);
}

function getCardSuit(card: Card): string {
  const suit = card.properties.suit;
  
  switch (suit) {
    case 'hearts':
    case 'heart':
      return '♥';
    case 'diamonds':
    case 'diamond':
      return '♦';
    case 'clubs':
    case 'club':
      return '♣';
    case 'spades':
    case 'spade':
      return '♠';
    default:
      return String(suit || '?');
  }
}

function generateCardBackPattern(design: string, dimensions: CardDimensions): string[] {
  const lines: string[] = [];
  const contentHeight = dimensions.height - 2; // Account for borders
  const contentWidth = dimensions.width - 2; // Account for borders
  
  for (let i = 0; i < contentHeight; i++) {
    if (i === Math.floor(contentHeight / 2)) {
      // Center line with design
      const padding = Math.max(0, Math.floor((contentWidth - design.length) / 2));
      lines.push(' '.repeat(padding) + design);
    } else {
      // Other lines with pattern
      const pattern = '·'.repeat(Math.min(contentWidth, 6));
      const padding = Math.max(0, Math.floor((contentWidth - pattern.length) / 2));
      lines.push(' '.repeat(padding) + pattern);
    }
  }
  
  return lines;
}