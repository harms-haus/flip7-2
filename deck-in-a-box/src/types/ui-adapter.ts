import React from 'react';
import { Card, Participant } from 'big-deck-energy';
import { ActionDefinition } from './actions';

/**
 * Options for creating a box component.
 */
export interface BoxOptions {
  /** Box title */
  title?: string;
  
  /** Border style */
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  
  /** Border color */
  borderColor?: string;
  
  /** Padding inside the box */
  padding?: number;
  
  /** Margin around the box */
  margin?: number;
  
  /** Minimum width */
  minWidth?: number;
  
  /** Minimum height */
  minHeight?: number;
  
  /** Flex direction for content */
  flexDirection?: 'row' | 'column';
}

/**
 * Item in a list component.
 */
export interface ListItem {
  /** Unique identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Optional description */
  description?: string;
  
  /** Whether this item is selected */
  selected?: boolean;
  
  /** Whether this item is enabled */
  enabled?: boolean;
}

/**
 * Options for creating a list component.
 */
export interface ListOptions {
  /** List title */
  title?: string;
  
  /** Whether to show selection indicator */
  showSelection?: boolean;
  
  /** Maximum number of visible items */
  maxVisible?: number;
  
  /** Whether to show item numbers */
  showNumbers?: boolean;
}

/**
 * Data for table component.
 */
export interface TableData {
  /** Column headers */
  headers: string[];
  
  /** Table rows */
  rows: string[][];
}

/**
 * Options for creating a table component.
 */
export interface TableOptions {
  /** Table title */
  title?: string;
  
  /** Whether to show borders */
  showBorders?: boolean;
  
  /** Column alignment */
  alignment?: ('left' | 'center' | 'right')[];
}

/**
 * Options for rendering a card.
 */
export interface CardRenderOptions {
  /** Whether to show the card face (true) or back (false) */
  showFace: boolean;
  
  /** Whether to highlight this card */
  highlight: boolean;
  
  /** Whether this card can be selected */
  selectable: boolean;
  
  /** Context where the card is being displayed */
  position?: 'hand' | 'board' | 'deck';
  
  /** Card orientation */
  orientation?: 'up' | 'down' | 'left' | 'right';
  
  /** Card display size */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Options for rendering a card back.
 */
export interface CardBackOptions {
  /** Card display size */
  size?: 'small' | 'medium' | 'large';
  
  /** Whether to highlight */
  highlight?: boolean;
  
  /** Custom back design */
  design?: string;
}

/**
 * Options for rendering an empty card slot.
 */
export interface SlotOptions {
  /** Slot display size */
  size?: 'small' | 'medium' | 'large';
  
  /** Whether this slot is highlighted */
  highlight?: boolean;
  
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Message types for user feedback.
 */
export type MessageType = 'info' | 'success' | 'warning' | 'error';

/**
 * UI Adapter interface provides utility methods for Game Configuration Classes
 * to create consistent UI elements throughout the application.
 */
export interface UIAdapter {
  // Layout utilities
  
  /**
   * Create a bordered box container.
   */
  createBox(
    content: React.ReactElement, 
    options: BoxOptions
  ): React.ReactElement;
  
  /**
   * Create a selectable list component.
   */
  createList(
    items: ListItem[], 
    options: ListOptions
  ): React.ReactElement;
  
  /**
   * Create a data table component.
   */
  createTable(
    data: TableData, 
    options: TableOptions
  ): React.ReactElement;

  // Card rendering utilities
  
  /**
   * Render a card with specified options.
   */
  renderCard(
    card: Card, 
    options: CardRenderOptions
  ): React.ReactElement;
  
  /**
   * Render a card back.
   */
  renderCardBack(options: CardBackOptions): React.ReactElement;
  
  /**
   * Render an empty card slot.
   */
  renderEmptySlot(options: SlotOptions): React.ReactElement;

  // Interactive elements
  
  /**
   * Create an action menu from available actions.
   */
  createActionMenu(actions: ActionDefinition[]): React.ReactElement;
  
  /**
   * Create a player selection interface.
   */
  createPlayerSelector(players: Participant[]): React.ReactElement;

  // Status and feedback
  
  /**
   * Show a temporary message to the user.
   */
  showMessage(message: string, type: MessageType): void;
  
  /**
   * Show a progress indicator for long operations.
   */
  showProgress(operation: string): void;
  
  /**
   * Hide the progress indicator.
   */
  hideProgress(): void;
}