import React from 'react';
import { Box, Text } from 'ink';
import { GameState, GameInstance, Hand, Gameboard } from 'big-deck-energy';
import { Participant } from '../../../src/models/participant.js';
import { GameConfiguration } from '../../src/types/game-configuration';
import { ActionDefinition, GameSetupResult, GameStats, GameResult } from '../../src/types/actions';

/**
 * War game configuration for the terminal UI.
 * Implements the classic War card game where players battle with cards.
 */
export class WarGameConfiguration extends GameConfiguration {
  readonly gameId = 'war';
  readonly displayName = 'War';
  readonly description = 'Classic War card game - battle with cards, highest card wins!';
  readonly deckType = 'standard';
  readonly rulesetType = 'war';

  // Game initialization methods

  async setupGame(): Promise<GameSetupResult> {
    // War is always 2 players
    const players: Participant[] = [];

    for (let i = 0; i < 2; i++) {
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
        autoPlay: false, // Whether to auto-play rounds or require user input
      },
      deckConfiguration: {
        shuffled: true,
      },
      rulesetConfiguration: {
        minPlayers: 2,
        maxPlayers: 2,
      },
    };
  }

  validatePlayerCount(count: number): boolean {
    return count === 2;
  }

  getDefaultPlayerCount(): number {
    return 2;
  }

  // UI rendering methods

  renderGameState(state: GameState, currentPlayer: string): React.ReactElement {
    const isGameFinished = state.phase === 'finished';
    const battlePile = state.gameboard.piles.get('battle');
    const battleCards = battlePile ? battlePile.cards : [];

    return (
      <Box flexDirection="column" padding={1}>
        {/* Game title and phase */}
        <Box marginBottom={1}>
          <Text bold color="red">⚔️  War Card Game  ⚔️</Text>
          <Text> - Phase: {state.phase}</Text>
        </Box>

        {/* Player status */}
        {this.renderPlayerStatus(state)}

        {/* Battle area */}
        <Box marginBottom={2}>
          {this.renderBattleArea(state)}
        </Box>

        {/* Current battle cards */}
        {battleCards.length > 0 && (
          <Box marginBottom={2}>
            {this.renderCurrentBattle(state)}
          </Box>
        )}

        {/* Game instructions or actions */}
        {!isGameFinished && (
          <Box marginTop={1}>
            {this.renderGameInstructions(state, currentPlayer)}
          </Box>
        )}

        {/* Available actions */}
        {!isGameFinished && (
          <Box marginTop={1}>
            {this.renderAvailableActions(state, currentPlayer)}
          </Box>
        )}
      </Box>
    );
  }

  renderPlayerHand(hand: Hand, isCurrentPlayer: boolean): React.ReactElement {
    const cardsPile = hand.piles.get('cards');
    
    if (!cardsPile) {
      return <Text>No cards</Text>;
    }

    const cardCount = cardsPile.cards.length;

    return (
      <Box flexDirection="row" alignItems="center">
        <Text>{cardCount} cards</Text>
        {isCurrentPlayer && cardCount > 0 && (
          <Box marginLeft={2}>
            <Text dimColor>[Top card ready]</Text>
          </Box>
        )}
      </Box>
    );
  }

  renderGameBoard(board: Gameboard): React.ReactElement {
    const battlePile = board.piles.get('battle');
    const battleCardCount = battlePile ? battlePile.cards.length : 0;

    return (
      <Box flexDirection="column" alignItems="center">
        <Text bold>Battle Area</Text>
        <Box marginTop={1} padding={1} borderStyle="single" borderColor="yellow">
          <Text>Cards in battle: {battleCardCount}</Text>
        </Box>
      </Box>
    );
  }

  renderWinScreen(winner: string, gameStats: GameStats): React.ReactElement {
    const winnerName = gameStats.finalScores[winner] !== undefined ? winner : 'Unknown';
    const loser = Object.keys(gameStats.finalScores).find(p => p !== winner) || 'Unknown';
    const winnerCards = gameStats.finalScores[winner] || 0;
    const totalBattles = gameStats.customStats?.totalBattles || 0;
    const totalWars = gameStats.customStats?.totalWars || 0;

    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        {/* Title */}
        <Box marginBottom={2}>
          <Text bold color="red">⚔️  War - Battle Complete!  ⚔️</Text>
        </Box>

        {/* Winner announcement */}
        <Box marginBottom={2} padding={1} borderStyle="double" borderColor="yellow">
          <Text bold color="yellow">🏆 Victory: {winnerName}! 🏆</Text>
          <Text color="yellow">
            Conquered all {winnerCards} cards!
          </Text>
        </Box>

        {/* Battle summary */}
        <Box marginBottom={2}>
          <Text bold color="blue">⚔️  Battle Summary:</Text>
        </Box>

        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text color="green">🏆 Winner: {winnerName} ({winnerCards} cards)</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="red">💀 Defeated: {loser} (0 cards)</Text>
          </Box>
        </Box>

        {/* Game statistics */}
        <Box flexDirection="column" marginBottom={2} padding={1} borderStyle="single" borderColor="gray">
          <Text bold>📊 Battle Statistics:</Text>
          <Text>⏱️  Duration: {Math.round(gameStats.gameDuration / 1000)}s</Text>
          <Text>🔄 Total Battles: {totalBattles}</Text>
          <Text>⚔️  Wars Fought: {totalWars}</Text>
          <Text>⚡ Avg Battle Time: {totalBattles > 0 ? Math.round(gameStats.gameDuration / totalBattles / 1000) : 0}s</Text>
        </Box>

        {/* War-specific stats */}
        {totalWars > 0 && (
          <Box flexDirection="column" marginBottom={2} padding={1} borderStyle="single" borderColor="red">
            <Text bold color="red">⚔️  War Details:</Text>
            <Text>Wars declared: {totalWars}</Text>
            <Text>War intensity: {totalWars > 5 ? 'Epic!' : totalWars > 2 ? 'Intense' : 'Mild'}</Text>
            {gameStats.customStats?.longestWar && (
              <Text>Longest war: {gameStats.customStats.longestWar} rounds</Text>
            )}
          </Box>
        )}

        {/* Custom stats if available */}
        {gameStats.customStats && Object.keys(gameStats.customStats).length > 2 && (
          <Box flexDirection="column" marginBottom={2}>
            <Text bold>🎯 Additional Stats:</Text>
            {Object.entries(gameStats.customStats)
              .filter(([key]) => !['totalBattles', 'totalWars', 'longestWar'].includes(key))
              .map(([key, value]) => (
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
    
    if (state.phase === 'finished') {
      return actions;
    }

    // In War, the main action is to play the next battle
    const playerHand = state.hands.get(`${player}_hand`);
    const cardsPile = playerHand?.piles.get('cards');
    const hasCards = cardsPile && cardsPile.cards.length > 0;

    if (hasCards) {
      actions.push({
        id: 'play_battle',
        label: 'Play Battle',
        description: 'Play your top card in battle',
        keyBinding: 'space',
        enabled: true,
      });

      actions.push({
        id: 'play_battle_enter',
        label: 'Play Battle',
        description: 'Play your top card in battle',
        keyBinding: 'enter',
        enabled: true,
      });
    }

    // Show hand action
    actions.push({
      id: 'show_hand',
      label: 'Show Hand Info',
      description: 'Display information about your hand',
      keyBinding: 'h',
      enabled: true,
    });

    // Show game status
    actions.push({
      id: 'show_status',
      label: 'Game Status',
      description: 'Show detailed game status and statistics',
      keyBinding: 's',
      enabled: true,
    });

    return actions;
  }

  async handlePlayerInput(input: string, state: GameState): Promise<any | null> {
    if (state.phase === 'finished') {
      return null;
    }

    switch (input.toLowerCase()) {
      case ' ':
      case 'enter':
        return this.handlePlayBattle(state);
      case 'h':
        return this.handleShowHand(state);
      case 's':
        return this.handleShowStatus(state);
      default:
        return null;
    }
  }

  // Game flow event handlers

  onGameStart(_gameInstance: GameInstance): void {
    console.log('War game started! Prepare for battle!');
  }

  onGameEnd(_gameInstance: GameInstance, result: GameResult): void {
    console.log(`War game ended. Winner: ${result.winner}`);
  }

  onTurnChange(_gameInstance: GameInstance, newPlayer: string): void {
    console.log(`Turn changed to: ${newPlayer}`);
  }

  // Helper methods

  private renderPlayerStatus(state: GameState): React.ReactElement {
    const participants = Array.from(state.participants.entries());
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Army Status:</Text>
        {participants.map(([playerId, player]) => {
          const hand = state.hands.get(`${playerId}_hand`);
          const cardsPile = hand?.piles.get('cards');
          const cardCount = cardsPile ? cardsPile.cards.length : 0;
          const percentage = Math.round((cardCount / 52) * 100);

          return (
            <Box key={playerId} flexDirection="row" marginLeft={1}>
              <Text color={cardCount > 26 ? 'green' : cardCount > 10 ? 'yellow' : 'red'}>
                🛡️  {player.name}: {cardCount} cards ({percentage}% of deck)
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  private renderBattleArea(state: GameState): React.ReactElement {
    const battlePile = state.gameboard.piles.get('battle');
    const battleCards = battlePile ? battlePile.cards : [];
    
    if (battleCards.length === 0) {
      return (
        <Box flexDirection="column" alignItems="center" padding={1} borderStyle="single" borderColor="gray">
          <Text bold>⚔️  Battle Arena  ⚔️</Text>
          <Text dimColor>No battle in progress</Text>
          <Text dimColor>Press SPACE or ENTER to start battle!</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" alignItems="center" padding={1} borderStyle="double" borderColor="red">
        <Text bold color="red">⚔️  BATTLE IN PROGRESS  ⚔️</Text>
        <Text>Cards in battle: {battleCards.length}</Text>
      </Box>
    );
  }

  private renderCurrentBattle(state: GameState): React.ReactElement {
    const battlePile = state.gameboard.piles.get('battle');
    if (!battlePile || battlePile.cards.length === 0) {
      return <Box />;
    }

    // Get the last two face-up cards (the current battle cards)
    const faceUpCards = battlePile.cards.filter(cardInPile => cardInPile.faceUp);
    const lastTwoCards = faceUpCards.slice(-2);

    if (lastTwoCards.length < 2) {
      return (
        <Box flexDirection="column" alignItems="center">
          <Text bold>Current Battle:</Text>
          <Text dimColor>Waiting for both players to play cards...</Text>
        </Box>
      );
    }

    const [card1, card2] = lastTwoCards;
    const card1Value = this.getCardDisplayValue(card1.card);
    const card2Value = this.getCardDisplayValue(card2.card);
    const card1Owner = this.getPlayerName(state, card1.owner || undefined);
    const card2Owner = this.getPlayerName(state, card2.owner || undefined);

    // Determine winner
    const card1Numeric = this.getCardNumericValue(card1.card);
    const card2Numeric = this.getCardNumericValue(card2.card);
    let battleResult = '';
    
    if (card1Numeric > card2Numeric) {
      battleResult = `${card1Owner} wins!`;
    } else if (card2Numeric > card1Numeric) {
      battleResult = `${card2Owner} wins!`;
    } else {
      battleResult = 'WAR!';
    }

    return (
      <Box flexDirection="column" alignItems="center" padding={1} borderStyle="single" borderColor="yellow">
        <Text bold color="yellow">⚔️  Current Battle  ⚔️</Text>
        <Box flexDirection="row" marginTop={1} marginBottom={1}>
          <Box marginRight={4} alignItems="center">
            <Text bold>{card1Owner}</Text>
            <Text color="blue" bold>{card1Value}</Text>
          </Box>
          <Text bold color="red">VS</Text>
          <Box marginLeft={4} alignItems="center">
            <Text bold>{card2Owner}</Text>
            <Text color="blue" bold>{card2Value}</Text>
          </Box>
        </Box>
        <Text bold color={battleResult === 'WAR!' ? 'red' : 'green'}>
          {battleResult}
        </Text>
      </Box>
    );
  }

  private renderGameInstructions(state: GameState, currentPlayer: string): React.ReactElement {
    const playerHand = state.hands.get(`${currentPlayer}_hand`);
    const cardsPile = playerHand?.piles.get('cards');
    const hasCards = cardsPile && cardsPile.cards.length > 0;

    if (!hasCards) {
      return (
        <Box>
          <Text color="red">You have no cards left! You lose!</Text>
        </Box>
      );
    }

    const battlePile = state.gameboard.piles.get('battle');
    const battleInProgress = battlePile && battlePile.cards.length > 0;

    if (battleInProgress) {
      return (
        <Box>
          <Text dimColor>
            💡 Battle in progress! The winner will collect all {battlePile.cards.length} cards.
          </Text>
        </Box>
      );
    }

    return (
      <Box>
        <Text dimColor>
          💡 War Rules: Play your top card. Highest card wins both cards. Ace is low (1), King is high (13).
        </Text>
      </Box>
    );
  }

  private renderAvailableActions(state: GameState, currentPlayer: string): React.ReactElement {
    const actions = this.getAvailableActions(state, currentPlayer);

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
      </Box>
    );
  }

  private getCardDisplayValue(card: { properties: Record<string, any> }): string {
    const rank = card.properties.rank as string;
    const suit = card.properties.suit as string;
    
    const rankDisplay = this.formatRank(rank);
    const suitDisplay = this.formatSuit(suit);
    
    return `${rankDisplay}${suitDisplay}`;
  }

  private getCardNumericValue(card: { properties: Record<string, any> }): number {
    const rank = card.properties.rank as string;
    
    // War uses Ace low (1), so we need to convert
    switch (rank) {
      case 'A':
      case '1':
        return 1;
      case 'J':
      case '11':
        return 11;
      case 'Q':
      case '12':
        return 12;
      case 'K':
      case '13':
        return 13;
      default:
        return parseInt(rank) || 0;
    }
  }

  private formatRank(rank: string): string {
    switch (rank) {
      case '1':
        return 'A';
      case '11':
        return 'J';
      case '12':
        return 'Q';
      case '13':
        return 'K';
      default:
        return rank;
    }
  }

  private formatSuit(suit: string): string {
    switch (suit.toLowerCase()) {
      case 'hearts':
        return '♥';
      case 'diamonds':
        return '♦';
      case 'clubs':
        return '♣';
      case 'spades':
        return '♠';
      default:
        return suit.charAt(0).toUpperCase();
    }
  }

  private getPlayerName(state: GameState, playerId?: string): string {
    if (!playerId) return 'Unknown';
    
    const player = state.participants.get(playerId);
    return player?.name || playerId;
  }

  private async handlePlayBattle(_state: GameState): Promise<any> {
    // Return an action that triggers the game loop to process a battle round
    return {
      type: 'play_round',
      data: {},
    };
  }

  private async handleShowHand(state: GameState): Promise<any> {
    // This would show detailed hand information
    // For now, just return null (no game action needed)
    console.log('Hand info requested');
    return null;
  }

  private async handleShowStatus(state: GameState): Promise<any> {
    // This would show detailed game status
    // For now, just return null (no game action needed)
    console.log('Status info requested');
    return null;
  }
}