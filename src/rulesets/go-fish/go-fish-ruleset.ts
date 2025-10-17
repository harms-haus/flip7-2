import { BaseRuleset } from '../base/base-ruleset';
import { GameState, DeckType, GameLoopResult, WinResult, ValidationError, ParticipantAction } from '../../core/interfaces';
import { GamePhase } from '../../core/types';
import { StandardPlayingDeck } from '../../deck-types/standard/standard-playing-deck';
import { GameStateAPIImpl } from '../../api/game-state-api';

/**
 * Go Fish card game ruleset implementation
 * 
 * Rules:
 * - 2-6 players each get 7 cards (5 if more than 4 players)
 * - Players ask each other for cards of specific ranks
 * - If asked player has cards of that rank, they give all to asking player
 * - If not, they say "Go Fish" and asking player draws from deck
 * - When player collects all 4 cards of a rank, they place them as a "book"
 * - Game ends when all books are collected or deck runs out
 * - Winner has the most books
 */
export class GoFishRuleset extends BaseRuleset {
  public readonly name = 'go-fish';
  public readonly minPlayers = 2;
  public readonly maxPlayers = 6;
  public readonly compatibleDeckTypes = ['standard-playing-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    const api = this.createGameStateAPI(gameState) as GameStateAPIImpl;

    // Create deck and shuffle it
    const deck = deckType.createDeck();

    // Create gameboard pile for the deck
    api.createGameboardPile('deck', true);

    // Add all cards to deck pile face down
    for (const card of deck) {
      api.addCardToGameboardPile('deck', card, false);
    }

    // Shuffle the deck
    api.shufflePile('gameboard', 'deck');

    // Create books pile for completed sets
    api.createGameboardPile('books', true);

    // Deal cards to players
    const participants = Array.from(gameState.participants.keys());
    const cardsPerPlayer = participants.length > 4 ? 5 : 7;

    for (let i = 0; i < participants.length; i++) {
      const participantId = participants[i];
      if (!participantId) continue;

      const handId = `${participantId}_hand`;

      // Create hand for participant
      api.createHand(handId, `${participantId}'s Hand`, participantId);
      api.addHandToParticipant(participantId, handId);

      // Create pile for participant's cards
      api.createHandPile(handId, 'cards', true);

      // Create pile for participant's books
      api.createHandPile(handId, 'books', true);

      // Deal cards to participant
      for (let j = 0; j < cardsPerPlayer; j++) {
        const card = api.removeCardFromGameboardPile('deck');
        if (card) {
          api.addCardToHandPile(handId, 'cards', card.card, true, participantId);
        }
      }

      // Initialize participant status
      api.updateParticipantStatus(participantId, 'books', 0);
      api.updateParticipantStatus(participantId, 'turn', i === 0);
    }

    // Check for initial books in each player's hand
    for (const participantId of participants) {
      if (participantId) {
        this.checkAndCollectBooks(api, participantId);
      }
    }

    // Set game phase to playing
    const updatedState = this.transitionToPhase(api.getGameState(), GamePhase.PLAYING);
    api.updateGameState(updatedState);

    return api.getGameState();
  }

  public gameloop(gameState: GameState): GameLoopResult {

    // Check if game should end
    const winResult = this.wincondition(gameState);
    if (winResult.gameEnded) {
      const finalState = this.transitionToPhase(gameState, GamePhase.FINISHED);
      return this.createGameLoopResult(false, finalState, false);
    }

    // Go Fish requires participant interaction for asking for cards
    // The game loop just maintains state and processes actions
    return this.createGameLoopResult(true, gameState, true);
  }

  public wincondition(gameState: GameState): WinResult {
    // Check if all books have been collected (13 possible books in a standard deck)
    let totalBooks = 0;
    const participants = Array.from(gameState.participants.keys());

    for (const participantId of participants) {
      if (!participantId) continue;

      const participant = gameState.participants.get(participantId);
      if (participant) {
        const books = participant.status.books || 0;
        totalBooks += books;
      }
    }

    // Game ends when all 13 books are collected or deck is empty and no one can make moves
    if (totalBooks >= 13) {
      const winner = this.findWinner(gameState);
      return this.createWinResult(true, winner ? [winner] : [], 'All books have been collected');
    }

    // Check if deck is empty and no player has cards
    const deckPile = gameState.gameboard.piles.get('deck');
    const deckEmpty = !deckPile || deckPile.cards.length === 0;

    if (deckEmpty) {
      let anyPlayerHasCards = false;
      for (const participantId of participants) {
        if (!participantId) continue;

        const hand = gameState.hands.get(`${participantId}_hand`);
        if (hand) {
          const cardsPile = hand.piles.get('cards');
          if (cardsPile && cardsPile.cards.length > 0) {
            anyPlayerHasCards = true;
            break;
          }
        }
      }

      if (!anyPlayerHasCards) {
        const winner = this.findWinner(gameState);
        return this.createWinResult(true, winner ? [winner] : [], 'No more cards to play');
      }
    }

    return this.createWinResult(false);
  }

  public validate(gameState: GameState): ValidationError[] {
    const errors = super.validate(gameState);

    // Validate player count
    if (gameState.participants.size < 2 || gameState.participants.size > 6) {
      errors.push(this.createValidationError(
        'INVALID_PLAYER_COUNT',
        `Go Fish requires 2-6 players, but ${gameState.participants.size} are present`
      ));
    }

    return errors;
  }

  /**
   * Process a participant action (asking for cards)
   */
  public processAction(gameState: GameState, action: ParticipantAction): GameState {
    const api = this.createGameStateAPI(gameState) as GameStateAPIImpl;

    if (action.type === 'ask_for_cards') {
      return this.processAskForCards(api, action);
    }

    return gameState;
  }

  /**
   * Process an "ask for cards" action
   */
  private processAskForCards(api: GameStateAPIImpl, action: ParticipantAction): GameState {
    const askingPlayerId = action.participantId;
    const targetPlayerId = action.data.targetPlayer as string;
    const requestedRank = action.data.rank as string;

    if (!askingPlayerId || !targetPlayerId || !requestedRank) {
      return api.getGameState();
    }

    // Check if it's the asking player's turn
    const askingPlayer = api.getGameState().participants.get(askingPlayerId);
    if (!askingPlayer || !askingPlayer.status.turn) {
      return api.getGameState();
    }

    // Get target player's cards
    const targetHand = api.getGameState().hands.get(`${targetPlayerId}_hand`);
    if (!targetHand) {
      return api.getGameState();
    }

    const targetCardsPile = targetHand.piles.get('cards');
    if (!targetCardsPile) {
      return api.getGameState();
    }

    // Find cards of the requested rank
    const matchingCards = targetCardsPile.cards.filter(cardInPile =>
      cardInPile.card.properties.rank === requestedRank
    );

    if (matchingCards.length > 0) {
      // Transfer all matching cards to asking player
      for (const cardInPile of matchingCards) {
        // Remove from target player
        const cardIndex = targetCardsPile.cards.indexOf(cardInPile);
        api.removeCardFromHandPile(`${targetPlayerId}_hand`, 'cards', cardIndex);

        // Add to asking player
        api.addCardToHandPile(`${askingPlayerId}_hand`, 'cards', cardInPile.card, true, askingPlayerId);
      }

      // Asking player gets another turn
      // Check for books after receiving cards
      this.checkAndCollectBooks(api, askingPlayerId);
    } else {
      // Go Fish! Draw a card from deck
      const drawnCard = api.removeCardFromGameboardPile('deck');
      if (drawnCard) {
        api.addCardToHandPile(`${askingPlayerId}_hand`, 'cards', drawnCard.card, true, askingPlayerId);

        // Check if drawn card completes a book
        this.checkAndCollectBooks(api, askingPlayerId);
      }

      // End asking player's turn
      this.endTurn(api, askingPlayerId);
    }

    return api.getGameState();
  }

  /**
   * Check if a player has any complete books (4 cards of same rank) and collect them
   */
  private checkAndCollectBooks(api: GameStateAPIImpl, participantId: string): void {
    const hand = api.getGameState().hands.get(`${participantId}_hand`);
    if (!hand) return;

    const cardsPile = hand.piles.get('cards');
    if (!cardsPile) return;

    // Group cards by rank
    const cardsByRank = new Map<string, typeof cardsPile.cards>();

    for (const cardInPile of cardsPile.cards) {
      const rank = cardInPile.card.properties.rank as string;
      if (!cardsByRank.has(rank)) {
        cardsByRank.set(rank, []);
      }
      cardsByRank.get(rank)!.push(cardInPile);
    }

    // Check for complete books (4 cards of same rank)
    for (const [rank, cards] of cardsByRank) {
      if (cards.length === 4) {
        // Remove all 4 cards from hand
        for (const cardInPile of cards) {
          const cardIndex = cardsPile.cards.indexOf(cardInPile);
          api.removeCardFromHandPile(`${participantId}_hand`, 'cards', cardIndex);
        }

        // Add to books pile
        for (const cardInPile of cards) {
          api.addCardToHandPile(`${participantId}_hand`, 'books', cardInPile.card, true, participantId);
        }

        // Update book count
        const participant = api.getGameState().participants.get(participantId);
        if (participant) {
          const currentBooks = participant.status.books || 0;
          api.updateParticipantStatus(participantId, 'books', currentBooks + 1);
        }
      }
    }
  }

  /**
   * End current player's turn and move to next player
   */
  private endTurn(api: GameStateAPIImpl, currentPlayerId: string): void {
    const participants = Array.from(api.getGameState().participants.keys());
    const currentIndex = participants.indexOf(currentPlayerId);

    if (currentIndex === -1) return;

    // Set current player's turn to false
    api.updateParticipantStatus(currentPlayerId, 'turn', false);

    // Find next player with cards
    let nextIndex = (currentIndex + 1) % participants.length;
    let attempts = 0;

    while (attempts < participants.length) {
      const nextPlayerId = participants[nextIndex];
      if (!nextPlayerId) {
        nextIndex = (nextIndex + 1) % participants.length;
        attempts++;
        continue;
      }

      const nextHand = api.getGameState().hands.get(`${nextPlayerId}_hand`);
      if (nextHand) {
        const cardsPile = nextHand.piles.get('cards');
        if (cardsPile && cardsPile.cards.length > 0) {
          // This player has cards, make it their turn
          api.updateParticipantStatus(nextPlayerId, 'turn', true);
          return;
        }
      }

      nextIndex = (nextIndex + 1) % participants.length;
      attempts++;
    }
  }

  /**
   * Find the winner (player with most books)
   */
  private findWinner(gameState: GameState): string | null {
    let maxBooks = -1;
    let winner: string | null = null;

    for (const [participantId, participant] of gameState.participants) {
      const books = participant.status.books || 0;
      if (books > maxBooks) {
        maxBooks = books;
        winner = participantId;
      }
    }

    return winner;
  }

  /**
   * Get the current player whose turn it is
   */
  public getCurrentPlayer(gameState: GameState): string | null {
    for (const [participantId, participant] of gameState.participants) {
      if (participant.status.turn) {
        return participantId;
      }
    }
    return null;
  }

  /**
   * Get available ranks that a player can ask for (ranks in their hand)
   */
  public getAvailableRanks(gameState: GameState, participantId: string): string[] {
    const hand = gameState.hands.get(`${participantId}_hand`);
    if (!hand) return [];

    const cardsPile = hand.piles.get('cards');
    if (!cardsPile) return [];

    const ranks = new Set<string>();
    for (const cardInPile of cardsPile.cards) {
      ranks.add(cardInPile.card.properties.rank as string);
    }

    return Array.from(ranks);
  }

  /**
   * Get other players that can be asked for cards
   */
  public getAvailableTargets(gameState: GameState, askingPlayerId: string): string[] {
    const targets: string[] = [];

    for (const [participantId, participant] of gameState.participants) {
      if (participantId === askingPlayerId) continue;

      // Check if target has cards
      const hand = gameState.hands.get(`${participantId}_hand`);
      if (hand) {
        const cardsPile = hand.piles.get('cards');
        if (cardsPile && cardsPile.cards.length > 0) {
          targets.push(participantId);
        }
      }
    }

    return targets;
  }
}