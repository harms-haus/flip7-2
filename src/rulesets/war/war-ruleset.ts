import { BaseRuleset } from '../base/base-ruleset';
import { GameState, DeckType, GameLoopResult, WinResult, ValidationError } from '../../core/interfaces';
import { GamePhase } from '../../core/types';
import { StandardPlayingDeck } from '../../deck-types/standard/standard-playing-deck';
import { GameStateAPIImpl } from '../../api/game-state-api';

/**
 * War card game ruleset implementation
 * 
 * Rules:
 * - 2 players each get half the deck face down
 * - Players simultaneously play top card from their pile
 * - Higher card wins both cards (Ace low, King high)
 * - On tie, each player plays 3 cards face down + 1 face up, winner takes all
 * - Game ends when one player has all cards
 */
export class WarRuleset extends BaseRuleset {
  public readonly name = 'war';
  public readonly minPlayers = 2;
  public readonly maxPlayers = 2;
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
    
    // Create battle pile for played cards
    api.createGameboardPile('battle', true);
    
    // Deal cards to players
    const participants = Array.from(gameState.participants.keys());
    const halfDeck = Math.floor(deck.length / 2);
    
    for (let i = 0; i < participants.length; i++) {
      const participantId = participants[i];
      if (!participantId) continue;
      
      const handId = `${participantId}_hand`;
      
      // Create hand for participant
      api.createHand(handId, `${participantId}'s Hand`, participantId);
      api.addHandToParticipant(participantId, handId);
      
      // Create pile for participant's cards
      api.createHandPile(handId, 'cards', true);
      
      // Deal cards to participant
      const cardsToTake = i === 0 ? halfDeck : deck.length - halfDeck;
      for (let j = 0; j < cardsToTake; j++) {
        const card = api.removeCardFromGameboardPile('deck');
        if (card) {
          api.addCardToHandPile(handId, 'cards', card.card, false, participantId);
        }
      }
    }
    
    // Set game phase to playing
    const updatedState = this.transitionToPhase(api.getGameState(), GamePhase.PLAYING);
    api.updateGameState(updatedState);
    
    return api.getGameState();
  }

  public gameloop(gameState: GameState): GameLoopResult {
    const api = this.createGameStateAPI(gameState) as GameStateAPIImpl;
    
    // Check if game should end
    const winResult = this.wincondition(gameState);
    if (winResult.gameEnded) {
      const finalState = this.transitionToPhase(gameState, GamePhase.FINISHED);
      return this.createGameLoopResult(false, finalState, false);
    }
    
    // Get participants
    const participants = Array.from(gameState.participants.keys());
    const player1Id = participants[0];
    const player2Id = participants[1];
    
    if (!player1Id || !player2Id) {
      return this.createGameLoopResult(false, gameState, false);
    }
    
    const player1Hand = gameState.hands.get(`${player1Id}_hand`);
    const player2Hand = gameState.hands.get(`${player2Id}_hand`);
    
    if (!player1Hand || !player2Hand) {
      return this.createGameLoopResult(false, gameState, false);
    }
    
    const player1Pile = player1Hand.piles.get('cards');
    const player2Pile = player2Hand.piles.get('cards');
    
    if (!player1Pile || !player2Pile || player1Pile.cards.length === 0 || player2Pile.cards.length === 0) {
      return this.createGameLoopResult(false, gameState, false);
    }
    
    // Play one round of War
    this.playWarRound(api, player1Id, player2Id);
    
    return this.createGameLoopResult(true, api.getGameState(), false);
  }

  public wincondition(gameState: GameState): WinResult {
    const participants = Array.from(gameState.participants.keys());
    
    for (const participantId of participants) {
      const hand = gameState.hands.get(`${participantId}_hand`);
      if (hand) {
        const pile = hand.piles.get('cards');
        if (pile && pile.cards.length === 52) {
          return this.createWinResult(true, [participantId], `${participantId} has won all cards`);
        }
      }
    }
    
    // Check if any player has no cards left
    for (const participantId of participants) {
      const hand = gameState.hands.get(`${participantId}_hand`);
      if (hand) {
        const pile = hand.piles.get('cards');
        if (!pile || pile.cards.length === 0) {
          const otherPlayer = participants.find(id => id !== participantId);
          if (otherPlayer) {
            return this.createWinResult(true, [otherPlayer], `${participantId} ran out of cards`);
          }
        }
      }
    }
    
    return this.createWinResult(false);
  }

  public validate(gameState: GameState): ValidationError[] {
    const errors = super.validate(gameState);
    
    // Validate that we have exactly 2 players
    if (gameState.participants.size !== 2) {
      errors.push(this.createValidationError(
        'INVALID_PLAYER_COUNT',
        `War requires exactly 2 players, but ${gameState.participants.size} are present`
      ));
    }
    
    // Validate that all cards are accounted for
    let totalCards = 0;
    
    // Count cards in battle pile
    const battlePile = gameState.gameboard.piles.get('battle');
    if (battlePile) {
      totalCards += battlePile.cards.length;
    }
    
    // Count cards in player hands
    for (const hand of gameState.hands.values()) {
      const cardsPile = hand.piles.get('cards');
      if (cardsPile) {
        totalCards += cardsPile.cards.length;
      }
    }
    
    if (totalCards !== 52) {
      errors.push(this.createValidationError(
        'CARD_COUNT_MISMATCH',
        `Expected 52 cards total, but found ${totalCards}`,
        'warning'
      ));
    }
    
    return errors;
  }

  /**
   * Play one round of War between two players
   */
  private playWarRound(api: GameStateAPIImpl, player1Id: string, player2Id: string): void {
    const player1Hand = `${player1Id}_hand`;
    const player2Hand = `${player2Id}_hand`;
    
    // Draw cards from each player
    const player1Card = api.removeCardFromHandPile(player1Hand, 'cards', 0);
    const player2Card = api.removeCardFromHandPile(player2Hand, 'cards', 0);
    
    if (!player1Card || !player2Card) {
      return;
    }
    
    // Add cards to battle pile face up
    api.addCardToGameboardPile('battle', player1Card.card, true, player1Id);
    api.addCardToGameboardPile('battle', player2Card.card, true, player2Id);
    
    // Compare card values
    const player1Value = this.getCardValue(player1Card.card);
    const player2Value = this.getCardValue(player2Card.card);
    
    if (player1Value > player2Value) {
      // Player 1 wins - take all cards from battle pile
      this.collectBattleCards(api, player1Hand);
    } else if (player2Value > player1Value) {
      // Player 2 wins - take all cards from battle pile
      this.collectBattleCards(api, player2Hand);
    } else {
      // War! Each player plays 3 cards face down + 1 face up
      this.playWar(api, player1Id, player2Id);
    }
  }

  /**
   * Handle a "war" situation when cards are equal
   */
  private playWar(api: GameStateAPIImpl, player1Id: string, player2Id: string): void {
    const player1Hand = `${player1Id}_hand`;
    const player2Hand = `${player2Id}_hand`;
    
    // Each player plays 3 cards face down
    for (let i = 0; i < 3; i++) {
      const p1Card = api.removeCardFromHandPile(player1Hand, 'cards', 0);
      const p2Card = api.removeCardFromHandPile(player2Hand, 'cards', 0);
      
      if (p1Card) {
        api.addCardToGameboardPile('battle', p1Card.card, false, player1Id);
      }
      if (p2Card) {
        api.addCardToGameboardPile('battle', p2Card.card, false, player2Id);
      }
      
      // If either player runs out of cards, they lose
      if (!p1Card || !p2Card) {
        return;
      }
    }
    
    // Each player plays 1 card face up
    const player1FinalCard = api.removeCardFromHandPile(player1Hand, 'cards', 0);
    const player2FinalCard = api.removeCardFromHandPile(player2Hand, 'cards', 0);
    
    if (!player1FinalCard || !player2FinalCard) {
      return;
    }
    
    api.addCardToGameboardPile('battle', player1FinalCard.card, true, player1Id);
    api.addCardToGameboardPile('battle', player2FinalCard.card, true, player2Id);
    
    // Compare the final cards
    const player1Value = this.getCardValue(player1FinalCard.card);
    const player2Value = this.getCardValue(player2FinalCard.card);
    
    if (player1Value > player2Value) {
      this.collectBattleCards(api, player1Hand);
    } else if (player2Value > player1Value) {
      this.collectBattleCards(api, player2Hand);
    } else {
      // Another war! Recursively call playWar
      this.playWar(api, player1Id, player2Id);
    }
  }

  /**
   * Collect all cards from battle pile and add to winner's hand
   */
  private collectBattleCards(api: GameStateAPIImpl, winnerHandId: string): void {
    const battlePile = api.getGameState().gameboard.piles.get('battle');
    if (!battlePile) {
      return;
    }
    
    // Collect all cards from battle pile
    const cardsToCollect = [...battlePile.cards];
    
    // Remove all cards from battle pile
    while (battlePile.cards.length > 0) {
      api.removeCardFromGameboardPile('battle', 0);
    }
    
    // Add cards to winner's hand (at bottom of pile)
    for (const cardInPile of cardsToCollect) {
      const owner = cardInPile.owner || undefined;
      api.addCardToHandPile(winnerHandId, 'cards', cardInPile.card, false, owner);
    }
  }

  /**
   * Get numeric value of a card for comparison (Ace = 1, King = 13)
   */
  private getCardValue(card: { properties: Record<string, any> }): number {
    const rank = card.properties.rank as string;
    return StandardPlayingDeck.NUMERIC_VALUES[rank as keyof typeof StandardPlayingDeck.NUMERIC_VALUES] || 0;
  }
}