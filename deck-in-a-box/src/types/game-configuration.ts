import React from 'react';
import { GameState, GameInstance, Hand, Gameboard } from 'big-deck-energy';
import { ActionDefinition, GameSetupResult, GameStats, GameResult } from './actions';

/**
 * Abstract base class that defines how a specific game should be displayed and played in the TUI.
 * Game developers extend this class to create custom TUI implementations for their BigDeckEnergy games.
 */
export abstract class GameConfiguration {
  /** Unique identifier for this game configuration */
  abstract readonly gameId: string;
  
  /** Display name shown in the game selection menu */
  abstract readonly displayName: string;
  
  /** Description shown in the game selection menu */
  abstract readonly description: string;
  
  /** BigDeckEnergy deck type this configuration uses */
  abstract readonly deckType: string;
  
  /** BigDeckEnergy ruleset this configuration uses */
  abstract readonly rulesetType: string;

  // Game initialization methods
  
  /**
   * Set up the game with player configuration and options.
   * Called when user selects this game from the menu.
   */
  abstract setupGame(): Promise<GameSetupResult>;
  
  /**
   * Validate if the given player count is supported by this game.
   */
  abstract validatePlayerCount(count: number): boolean;
  
  /**
   * Get the default/recommended number of players for this game.
   */
  abstract getDefaultPlayerCount(): number;

  // UI rendering methods
  
  /**
   * Render the main game state display.
   * This is the primary view players see during gameplay.
   */
  abstract renderGameState(
    state: GameState, 
    currentPlayer: string
  ): React.ReactElement;
  
  /**
   * Render a player's hand of cards.
   * Should handle both current player (detailed) and other players (limited info).
   */
  abstract renderPlayerHand(
    hand: Hand, 
    isCurrentPlayer: boolean
  ): React.ReactElement;
  
  /**
   * Render the game board/table area.
   * Shows cards in play, discard piles, etc.
   */
  abstract renderGameBoard(board: Gameboard): React.ReactElement;
  
  /**
   * Render the win screen when the game ends.
   * Should show winner, final scores, and game statistics.
   */
  abstract renderWinScreen(
    winner: string, 
    gameStats: GameStats
  ): React.ReactElement;

  // Input handling methods
  
  /**
   * Get the list of actions available to the current player.
   * Used to build action menus and keyboard shortcuts.
   */
  abstract getAvailableActions(
    state: GameState, 
    player: string
  ): ActionDefinition[];
  
  /**
   * Process keyboard input and convert to game action.
   * Returns null if the input doesn't map to a valid action.
   */
  abstract handlePlayerInput(
    input: string, 
    state: GameState
  ): Promise<any | null>;

  // Game flow event handlers
  
  /**
   * Called when the game starts.
   * Use for initialization, welcome messages, etc.
   */
  abstract onGameStart(gameInstance: GameInstance): void;
  
  /**
   * Called when the game ends.
   * Use for cleanup, final statistics, etc.
   */
  abstract onGameEnd(gameInstance: GameInstance, result: GameResult): void;
  
  /**
   * Called when the turn changes to a new player.
   * Use for turn-specific UI updates or notifications.
   */
  abstract onTurnChange(gameInstance: GameInstance, newPlayer: string): void;
}