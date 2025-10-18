import React from 'react';
import { Box, Text } from 'ink';
import { GameState, GameInstance, Hand, Gameboard } from 'big-deck-energy';
import { Participant } from 'big-deck-energy';
import { GameConfiguration } from '../../src/types/game-configuration';
import { ActionDefinition, GameSetupResult, GameStats, GameResult } from '../../src/types/actions';
// import { HandRenderer } from '../../src/components/CardRenderer';
// import { ActionMenu } from '../../src/components/ActionMenu';

/**
 * Go Fish game configuration for the terminal UI.
 * Implements the classic Go Fish card game with asking for cards and collecting books.
 */
export class GoFishGameConfiguration extends GameConfiguration {
  readonly gameId = 'go-fish';
  readonly displayName = 'Go Fish';
  readonly description = 'Classic Go Fish card game - collect books by asking other players for cards';
  readonly deckType = 'standard';
  readonly rulesetType = 'go-fish';

  // Game initialization methods

  async setupGame(): Promise<GameSetupResult> {
    // For Go Fish, we need 2-6 players
    const players: Participant[] = [];

    // Default to 3 players for Go Fish
    const playerCount = 3;

    for (let i = 0; i < playerCount; i++) {
      players.push(new Participant(
        `player_${i + 1}`,
        `Player ${i + 1}`,
        false,
        [],
        {}
      ));
    }

    return {
      players,
      gameOptions: {
        cardsPerPlayer: playerCount > 4 ? 5 : 7,
        maxBooks: 13,
      },
      deckConfiguration: {
        shuffled: true,
      },
      rulesetConfiguration: {
        minPlayers: 2,
        maxPlayers: 6,
      },
    };
  }

  validatePlayerCount(count: number): boolean {
    return count >= 2 && count <= 6;
  }

  getDefaultPlayerCount(): number {
    return 3;
  }

  // UI rendering methods

  renderGameState(state: GameState, currentPlayer: string): React.ReactElement {
    const currentPlayerData = state.participants.get(currentPlayer);
    const isCurrentPlayerTurn = currentPlayerData?.status.turn === true;

    return (
      <Box flexDirection="column" padding={1}>
        {/* Game title and phase */}
        <Box marginBottom={1}>
          <Text bold color="blue">🐟 Go Fish Game 🐟</Text>
          <Text> - Phase: {state.phase}</Text>
        </Box>

        {/* Current turn indicator */}
        <Box marginBottom={1}>
          <Text bold color={isCurrentPlayerTurn ? 'green' : 'yellow'}>
            {isCurrentPlayerTurn ? '🎯 Your Turn!' : `⏳ Waiting for ${this.getCurrentPlayerName(state)}...`}
          </Text>
        </Box>

        {/* Player status */}
        {this.renderPlayerStatus(state)}

        {/* Game board (deck and books) */}
        {this.renderGameBoard(state.gameboard)}

        {/* Current player's hand by ranks */}
        <Box marginTop={1}>
          {this.renderHandByRanks(state, currentPlayer)}
        </Box>

        {/* Visual hand display */}
        <Box marginTop={1}>
          <Text bold>Your Cards:</Text>
        </Box>
        {this.renderCurrentPlayerHand(state, currentPlayer)}

        {/* Available actions */}
        {isCurrentPlayerTurn && (
          <Box marginTop={1}>
            {this.renderAvailableActions(state, currentPlayer)}
          </Box>
        )}

        {/* Game instructions */}
        {!isCurrentPlayerTurn && (
          <Box marginTop={1}>
            <Text dimColor>
              💡 Tip: Collect 4 cards of the same rank to make a book. Ask other players for cards you have in your hand.
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  renderPlayerHand(hand: Hand, isCurrentPlayer: boolean): React.ReactElement {
    const cardsPile = hand.piles.get('cards');
    const booksPile = hand.piles.get('books');

    if (!cardsPile) {
      return <Text>No cards</Text>;
    }

    const cards = cardsPile.cards.map(cardInPile => cardInPile.card);
    const showFaces = cards.map(() => isCurrentPlayer);

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          {cards.slice(0, 10).map((card, index) => (
            <Box key={index} marginRight={1}>
              <Text>{showFaces[index] ? `${card.properties.rank}${card.properties.suit}` : '[?]'}</Text>
            </Box>
          ))}
          {cards.length > 10 && (
            <Text dimColor>... +{cards.length - 10} more</Text>
          )}
        </Box>

        {booksPile && booksPile.cards.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>Books: {Math.floor(booksPile.cards.length / 4)}</Text>
          </Box>
        )}
      </Box>
    );
  }

  renderGameBoard(board: Gameboard): React.ReactElement {
    const deckPile = board.piles.get('deck');
    const booksPile = board.piles.get('books');

    const deckCount = deckPile ? deckPile.cards.length : 0;
    const totalBooks = booksPile ? Math.floor(booksPile.cards.length / 4) : 0;

    return (
      <Box flexDirection="row" marginBottom={1}>
        <Box marginRight={4}>
          <Text bold>Deck: </Text>
          <Text>{deckCount} cards remaining</Text>
        </Box>

        <Box>
          <Text bold>Completed Books: </Text>
          <Text>{totalBooks} / 13</Text>
        </Box>
      </Box>
    );
  }

  renderWinScreen(winner: string, gameStats: GameStats): React.ReactElement {
    const winnerName = gameStats.finalScores[winner] !== undefined ? winner : 'Unknown';
    const sortedScores = Object.entries(gameStats.finalScores).sort(([, a], [, b]) => (b as number) - (a as number));
    const totalBooks = Object.values(gameStats.finalScores).reduce((sum, books) => (sum as number) + (books as number), 0);

    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        {/* Title */}
        <Box marginBottom={2}>
          <Text bold color="green">🏆 Go Fish - Game Complete! 🏆</Text>
        </Box>

        {/* Winner announcement */}
        <Box marginBottom={2} padding={1} borderStyle="double" borderColor="yellow">
          <Text bold color="yellow">🎉 Winner: {winnerName} 🎉</Text>
          <Text color="yellow">
            with {gameStats.finalScores[winner]} books!
          </Text>
        </Box>

        {/* Final standings */}
        <Box marginBottom={2}>
          <Text bold color="blue">📊 Final Standings:</Text>
        </Box>

        <Box flexDirection="column" marginBottom={2}>
          {sortedScores.map(([player, books], index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            const color = player === winner ? 'green' : index < 3 ? 'yellow' : 'white';

            return (
              <Box key={player} marginBottom={1}>
                <Text color={color}>
                  {medal} {index + 1}. {player}: {books} books
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Game statistics */}
        <Box flexDirection="column" marginBottom={2} padding={1} borderStyle="single" borderColor="gray">
          <Text bold>📈 Game Statistics:</Text>
          <Text>⏱️  Duration: {Math.round(gameStats.gameDuration / 1000)}s</Text>
          <Text>🔄 Total Turns: {gameStats.totalTurns}</Text>
          <Text>📚 Books Collected: {totalBooks} / 13</Text>
          <Text>⚡ Avg Turn Time: {Math.round(gameStats.gameDuration / gameStats.totalTurns / 1000)}s</Text>
        </Box>

        {/* Custom stats if available */}
        {gameStats.customStats && Object.keys(gameStats.customStats).length > 0 && (
          <Box flexDirection="column" marginBottom={2}>
            <Text bold>🎯 Additional Stats:</Text>
            {Object.entries(gameStats.customStats).map(([key, value]) => (
              <Text key={key}>
                {key}: {String(value)}
              </Text>
            ))}
          </Box>
        )}

        {/* Return instruction */}
        <Box marginTop={2} padding={1} borderStyle="single" borderColor="blue">
          <Text color="blue">Press any key to return to main menu</Text>
        </Box>
      </Box>
    );
  }

  // Input handling methods

  getAvailableActions(state: GameState, player: string): ActionDefinition[] {
    const actions: ActionDefinition[] = [];
    const playerData = state.participants.get(player);

    if (!playerData || !playerData.status.turn) {
      return actions;
    }

    // Get available ranks to ask for (ranks in player's hand)
    const availableRanks = this.getPlayerRanks(state, player);
    const availableTargets = this.getAvailableTargets(state, player);

    if (availableRanks.length > 0 && availableTargets.length > 0) {
      // Create actions for each available rank
      availableRanks.forEach((rank, index) => {
        actions.push({
          id: `ask_for_${rank}`,
          label: `Ask for ${this.formatRank(rank)}s`,
          description: `Ask another player for all their ${this.formatRank(rank)} cards`,
          keyBinding: (index + 1).toString(),
          enabled: true,
          requiresTarget: true,
          targetType: 'player',
        });
      });
    }

    // Show hand action
    actions.push({
      id: 'show_hand',
      label: 'Show Hand',
      description: 'Display your current hand in detail',
      keyBinding: 'h',
      enabled: true,
    });

    // Show game status
    actions.push({
      id: 'show_status',
      label: 'Game Status',
      description: 'Show all players\' book counts and remaining cards',
      keyBinding: 's',
      enabled: true,
    });

    return actions;
  }

  async handlePlayerInput(input: string, state: GameState): Promise<any | null> {
    const currentPlayer = this.getCurrentPlayer(state);
    if (!currentPlayer) return null;

    const availableRanks = this.getPlayerRanks(state, currentPlayer);

    // Handle numeric input for asking for specific ranks
    const rankIndex = parseInt(input) - 1;
    if (rankIndex >= 0 && rankIndex < availableRanks.length) {
      const rank = availableRanks[rankIndex];
      return this.handleAskForSpecificRank(state, currentPlayer, rank);
    }

    switch (input.toLowerCase()) {
      case 'h':
        return this.handleShowHand(state, currentPlayer);
      case 's':
        return this.handleShowStatus(state, currentPlayer);
      default:
        return null;
    }
  }

  // Game flow event handlers

  onGameStart(_gameInstance: GameInstance): void {
    console.log('Go Fish game started!');
  }

  onGameEnd(_gameInstance: GameInstance, result: GameResult): void {
    console.log(`Go Fish game ended. Winner: ${result.winner}`);
  }

  onTurnChange(_gameInstance: GameInstance, newPlayer: string): void {
    console.log(`Turn changed to: ${newPlayer}`);
  }

  // Helper methods

  private getCurrentPlayer(state: GameState): string | null {
    for (const [playerId, player] of state.participants) {
      if (player.status.turn) {
        return playerId;
      }
    }
    return null;
  }

  private getCurrentPlayerName(state: GameState): string {
    const currentPlayer = this.getCurrentPlayer(state);
    if (currentPlayer) {
      const player = state.participants.get(currentPlayer);
      return player?.name || currentPlayer;
    }
    return 'Unknown';
  }

  private getPlayerRanks(state: GameState, playerId: string): string[] {
    const hand = state.hands.get(`${playerId}_hand`);
    if (!hand) return [];

    const cardsPile = hand.piles.get('cards');
    if (!cardsPile) return [];

    const ranks = new Set<string>();
    for (const cardInPile of cardsPile.cards) {
      const rank = cardInPile.card.properties.rank as string;
      if (rank) {
        ranks.add(rank);
      }
    }

    return Array.from(ranks).sort();
  }

  private getAvailableTargets(state: GameState, askingPlayerId: string): string[] {
    const targets: string[] = [];

    for (const [playerId] of state.participants) {
      if (playerId === askingPlayerId) continue;

      // Check if target has cards
      const hand = state.hands.get(`${playerId}_hand`);
      if (hand) {
        const cardsPile = hand.piles.get('cards');
        if (cardsPile && cardsPile.cards.length > 0) {
          targets.push(playerId);
        }
      }
    }

    return targets;
  }

  private renderCurrentPlayerHand(state: GameState, currentPlayer: string): React.ReactElement {
    const hand = state.hands.get(`${currentPlayer}_hand`);
    if (!hand) {
      return <Text>No hand found</Text>;
    }

    return this.renderPlayerHand(hand, true);
  }

  private renderAvailableActions(state: GameState, currentPlayer: string): React.ReactElement {
    const actions = this.getAvailableActions(state, currentPlayer);
    const availableRanks = this.getPlayerRanks(state, currentPlayer);
    const availableTargets = this.getAvailableTargets(state, currentPlayer);

    return (
      <Box flexDirection="column">
        <Text bold>Available Actions:</Text>
        {actions.map((action) => (
          <Box key={action.id} marginLeft={1}>
            <Text>
              [{action.keyBinding}] {action.label} - {action.description}
            </Text>
          </Box>
        ))}

        {availableRanks.length > 0 && availableTargets.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              Available targets: {availableTargets.map(id => {
                const player = state.participants.get(id);
                return player?.name || id;
              }).join(', ')}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  private formatRank(rank: string): string {
    switch (rank) {
      case '1':
        return 'Ace';
      case '11':
        return 'Jack';
      case '12':
        return 'Queen';
      case '13':
        return 'King';
      default:
        return rank;
    }
  }

  private renderPlayerStatus(state: GameState): React.ReactElement {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Player Status:</Text>
        {Array.from(state.participants.entries()).map(([playerId, player]) => {
          const hand = state.hands.get(`${playerId}_hand`);
          const cardsPile = hand?.piles.get('cards');
          const cardCount = cardsPile ? cardsPile.cards.length : 0;
          const books = player.status.books || 0;
          const isCurrentTurn = player.status.turn === true;

          return (
            <Box key={playerId} flexDirection="row" marginLeft={1}>
              <Text color={isCurrentTurn ? 'green' : 'white'}>
                {isCurrentTurn ? '▶ ' : '  '}
                {player.name}: {books} books, {cardCount} cards
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  private renderHandByRanks(state: GameState, currentPlayer: string): React.ReactElement {
    const hand = state.hands.get(`${currentPlayer}_hand`);
    if (!hand) {
      return <Text>No hand found</Text>;
    }

    const cardsPile = hand.piles.get('cards');
    if (!cardsPile) {
      return <Text>No cards in hand</Text>;
    }

    // Group cards by rank
    const cardsByRank = new Map<string, typeof cardsPile.cards>();
    for (const cardInPile of cardsPile.cards) {
      const rank = cardInPile.card.properties.rank as string;
      if (!cardsByRank.has(rank)) {
        cardsByRank.set(rank, []);
      }
      cardsByRank.get(rank)!.push(cardInPile);
    }

    // Sort ranks
    const sortedRanks = Array.from(cardsByRank.keys()).sort((a, b) => {
      const numA = parseInt(a) || (a === 'A' ? 1 : 0);
      const numB = parseInt(b) || (b === 'A' ? 1 : 0);
      return numA - numB;
    });

    return (
      <Box flexDirection="column">
        <Text bold>Your Hand (by rank):</Text>
        {sortedRanks.map(rank => {
          const cards = cardsByRank.get(rank)!;
          const isComplete = cards.length === 4;

          return (
            <Box key={rank} flexDirection="row" marginLeft={1} marginBottom={1}>
              <Text color={isComplete ? 'green' : 'white'}>
                {this.formatRank(rank)}: {cards.length} card{cards.length !== 1 ? 's' : ''}
                {isComplete ? ' (Complete Book!)' : ''}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  private async handleAskForSpecificRank(state: GameState, currentPlayer: string, rank: string): Promise<any> {
    const availableTargets = this.getAvailableTargets(state, currentPlayer);

    if (availableTargets.length === 0) {
      return null;
    }

    // For now, ask the first available target
    // In a full implementation, this would show a player selection interface
    const targetPlayer = availableTargets[0];

    // Return an action that the game loop can process
    return {
      type: 'ask_for_cards',
      participantId: currentPlayer,
      data: {
        targetPlayer,
        rank,
      },
    };
  }

  private async handleShowHand(_state: GameState, _currentPlayer: string): Promise<any> {
    // This would show the hand in a detailed view
    // For now, just return null (no game action needed)
    return null;
  }

  private async handleShowStatus(_state: GameState, _currentPlayer: string): Promise<any> {
    // This would show detailed game status
    // For now, just return null (no game action needed)
    return null;
  }
}