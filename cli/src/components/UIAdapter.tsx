import React from 'react';
import { Box, Text } from 'ink';
import { Card } from 'big-deck-energy';
import { Participant } from '../../../src/models/participant.js';
import {
  UIAdapter,
  BoxOptions,
  ListItem,
  ListOptions,
  TableData,
  TableOptions,
  CardRenderOptions,
  CardBackOptions,
  SlotOptions,
  MessageType,
} from '../types/ui-adapter';
import { ActionDefinition } from '../types/actions';

/**
 * Default implementation of UIAdapter interface.
 * Provides consistent UI components for game configurations.
 */
export class DefaultUIAdapter implements UIAdapter {
  private messageCallback?: (message: string, type: MessageType) => void;
  private progressCallback?: (operation: string | null) => void;

  constructor(
    messageCallback?: (message: string, type: MessageType) => void,
    progressCallback?: (operation: string | null) => void
  ) {
    this.messageCallback = messageCallback;
    this.progressCallback = progressCallback;
  }

  // Layout utilities

  createBox(content: React.ReactElement, options: BoxOptions): React.ReactElement {
    const {
      title,
      borderStyle = 'single',
      borderColor,
      padding = 1,
      margin = 0,
      minWidth,
      minHeight,
      flexDirection = 'column',
    } = options;

    const boxProps: any = {
      borderStyle: borderStyle === 'none' ? undefined : borderStyle,
      borderColor,
      padding,
      margin,
      minWidth,
      minHeight,
      flexDirection,
    };

    return (
      <Box {...boxProps}>
        {title && (
          <Box marginBottom={1}>
            <Text bold>{title}</Text>
          </Box>
        )}
        {content}
      </Box>
    );
  }

  createList(items: ListItem[], options: ListOptions): React.ReactElement {
    const {
      title,
      showSelection = true,
      maxVisible,
      showNumbers = false,
    } = options;

    const visibleItems = maxVisible ? items.slice(0, maxVisible) : items;

    return (
      <Box flexDirection="column">
        {title && (
          <Box marginBottom={1}>
            <Text bold>{title}</Text>
          </Box>
        )}
        {visibleItems.map((item, index) => (
          <Box key={item.id} marginBottom={0}>
            <Text
              color={item.enabled === false ? 'gray' : undefined}
              backgroundColor={item.selected && showSelection ? 'blue' : undefined}
            >
              {showNumbers && `${index + 1}. `}
              {item.selected && showSelection ? '> ' : '  '}
              {item.label}
              {item.description && ` - ${item.description}`}
            </Text>
          </Box>
        ))}
        {maxVisible && items.length > maxVisible && (
          <Box marginTop={1}>
            <Text color="gray">
              ... and {items.length - maxVisible} more
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  createTable(data: TableData, options: TableOptions): React.ReactElement {
    const {
      title,
      showBorders = true,
    } = options;

    // const getAlignment = (colIndex: number) => alignment[colIndex] || 'left';

    return (
      <Box flexDirection="column">
        {title && (
          <Box marginBottom={1}>
            <Text bold>{title}</Text>
          </Box>
        )}
        
        {/* Headers */}
        <Box>
          {data.headers.map((header, index) => (
            <Box key={index} minWidth={12} marginRight={2}>
              <Text bold>{header}</Text>
            </Box>
          ))}
        </Box>
        
        {showBorders && (
          <Box>
            {data.headers.map((_, index) => (
              <Box key={index} minWidth={12} marginRight={2}>
                <Text>{'─'.repeat(Math.min(12, data.headers[index].length))}</Text>
              </Box>
            ))}
          </Box>
        )}
        
        {/* Rows */}
        {data.rows.map((row, rowIndex) => (
          <Box key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <Box key={cellIndex} minWidth={12} marginRight={2}>
                <Text>{cell}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  }

  // Card rendering utilities

  renderCard(card: Card, options: CardRenderOptions): React.ReactElement {
    const {
      showFace,
      highlight,
      selectable,
      size = 'medium',
    } = options;

    const cardWidth = size === 'small' ? 6 : size === 'large' ? 10 : 8;
    const cardHeight = size === 'small' ? 3 : size === 'large' ? 5 : 4;

    if (!showFace) {
      return this.renderCardBack({ size, highlight });
    }

    const cardContent = this.formatCardContent(card, size);
    const borderColor = highlight ? 'yellow' : selectable ? 'blue' : undefined;

    return (
      <Box
        width={cardWidth}
        height={cardHeight}
        borderStyle="single"
        borderColor={borderColor}
        justifyContent="center"
        alignItems="center"
      >
        <Text>{cardContent}</Text>
      </Box>
    );
  }

  renderCardBack(options: CardBackOptions): React.ReactElement {
    const {
      size = 'medium',
      highlight = false,
      design = '###',
    } = options;

    const cardWidth = size === 'small' ? 6 : size === 'large' ? 10 : 8;
    const cardHeight = size === 'small' ? 3 : size === 'large' ? 5 : 4;
    const borderColor = highlight ? 'yellow' : 'gray';

    return (
      <Box
        width={cardWidth}
        height={cardHeight}
        borderStyle="single"
        borderColor={borderColor}
        justifyContent="center"
        alignItems="center"
      >
        <Text color="gray">{design}</Text>
      </Box>
    );
  }

  renderEmptySlot(options: SlotOptions): React.ReactElement {
    const {
      size = 'medium',
      highlight = false,
      placeholder = '...',
    } = options;

    const cardWidth = size === 'small' ? 6 : size === 'large' ? 10 : 8;
    const cardHeight = size === 'small' ? 3 : size === 'large' ? 5 : 4;
    const borderColor = highlight ? 'yellow' : 'gray';

    return (
      <Box
        width={cardWidth}
        height={cardHeight}
        borderStyle="single"
        borderColor={borderColor}
        justifyContent="center"
        alignItems="center"
      >
        <Text color="gray">{placeholder}</Text>
      </Box>
    );
  }

  // Interactive elements

  createActionMenu(actions: ActionDefinition[]): React.ReactElement {
    const enabledActions = actions.filter(action => action.enabled);

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Available Actions:</Text>
        </Box>
        {enabledActions.map(action => (
          <Box key={action.id}>
            <Text>
              <Text color="cyan">[{action.keyBinding}]</Text>
              {' '}
              {action.label}
              {action.description && (
                <Text color="gray"> - {action.description}</Text>
              )}
            </Text>
          </Box>
        ))}
        {enabledActions.length === 0 && (
          <Text color="gray">No actions available</Text>
        )}
      </Box>
    );
  }

  createPlayerSelector(players: Participant[]): React.ReactElement {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Players:</Text>
        </Box>
        {players.map((player, index) => (
          <Box key={player.id}>
            <Text>
              <Text color="cyan">[{index + 1}]</Text>
              {' '}
              {player.name}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  // Status and feedback

  showMessage(message: string, type: MessageType): void {
    if (this.messageCallback) {
      this.messageCallback(message, type);
    } else {
      // Fallback to console
      const prefix = type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 
                    type === 'success' ? '✅' : 'ℹ️';
      console.log(`${prefix} ${message}`);
    }
  }

  showProgress(operation: string): void {
    if (this.progressCallback) {
      this.progressCallback(operation);
    } else {
      console.log(`⏳ ${operation}...`);
    }
  }

  hideProgress(): void {
    if (this.progressCallback) {
      this.progressCallback(null);
    }
  }

  // Helper methods

  private formatCardContent(card: Card, size: 'small' | 'medium' | 'large'): string {
    // This is a basic implementation - games can override this
    // by implementing their own card rendering logic
    
    const rank = this.getCardRank(card);
    const suit = this.getCardSuit(card);
    
    if (size === 'small') {
      return `${rank}${suit}`;
    } else if (size === 'large') {
      return `${rank}\n${suit}\n${rank}`;
    } else {
      return `${rank}${suit}`;
    }
  }

  private getCardRank(card: Card): string {
    // Extract rank from card properties
    // This is a basic implementation that games can customize
    const rank = card.properties.rank || card.properties.value || '?';
    return String(rank);
  }

  private getCardSuit(card: Card): string {
    // Extract suit from card properties and convert to symbol
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
}

/**
 * React component that provides UIAdapter context to child components.
 */
export const UIAdapterContext = React.createContext<UIAdapter | null>(null);

/**
 * Hook to access the UIAdapter from React components.
 */
export function useUIAdapter(): UIAdapter {
  const adapter = React.useContext(UIAdapterContext);
  if (!adapter) {
    throw new Error('useUIAdapter must be used within a UIAdapterProvider');
  }
  return adapter;
}