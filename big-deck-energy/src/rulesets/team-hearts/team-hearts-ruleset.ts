import { BaseRuleset } from '../base/base-ruleset';
import { GameState, DeckType, GameLoopResult, WinResult, ValidationError, ParticipantAction } from '../../core/interfaces';
import { GamePhase } from '../../core/types';
import { StandardPlayingDeck } from '../../deck-types/standard/standard-playing-deck';
import { GameStateAPIImpl } from '../../api/game-state-api';

/**
 * Team Hearts card game ruleset implementation
 * 
 * A team-based variant of Hearts where players work in pairs.
 * 
 * Rules:
 * - 4 players in 2 teams (North/South vs East/West)
 * - Each player gets 13 cards
 * - Teams share a common score pile
 * - Goal is to have the lowest team score
 * - Hearts are worth 1 point each, Queen of Spades is worth 13 points
 * - Teams can share information about their cards
 * - Game ends when a team reaches 100 points, lowest score wins
 */
export class TeamHeartsRuleset extends BaseRuleset {
  public readonly name = 'team-hearts';
  public readonly minPlayers = 4;
  public readonly maxPlayers = 4;
  public readonly compatibleDeckTypes = ['standard-playing-deck'];

  public setup(gameState: GameState, deckType: DeckType): GameState {
    const api = this.createGameStateAPI(gameState) as GameStateAPIImpl;
    
    // Disable automatic snapshots during setup to avoid validation issues
    api.setAutoCreateSnapshots(false);
    
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
    
    // Create trick pile for current trick
    api.createGameboardPile('current_trick', true);
    
    // Create completed tricks pile
    api.createGameboardPile('completed_tricks', true);
    
    // Get participants and create teams
    const participants = Array.from(gameState.participants.keys());
    if (participants.length !== 4) {
      throw new Error('Team Hearts requires exactly 4 players');
    }
    
    // Create two teams
    api.createParty('team_north_south', 'North/South Team');
    api.createParty('team_east_west', 'East/West Team');
    
    // Create team score piles
    api.createPartyPile('team_north_south', 'score_cards', true);
    api.createPartyPile('team_east_west', 'score_cards', true);
    
    // Assign players to teams
    api.addParticipantToParty(participants[0]!, 'team_north_south'); // North
    api.addParticipantToParty(participants[1]!, 'team_east_west');   // East
    api.addParticipantToParty(participants[2]!, 'team_north_south'); // South
    api.addParticipantToParty(participants[3]!, 'team_east_west');   // West
    
    // Initialize team scores
    api.updatePartyStatus('team_north_south', 'score', 0);
    api.updatePartyStatus('team_north_south', 'tricks_won', 0);
    api.updatePartyStatus('team_east_west', 'score', 0);
    api.updatePartyStatus('team_east_west', 'tricks_won', 0);
    
    // Deal cards to players
    for (let i = 0; i < participants.length; i++) {
      const participantId = participants[i]!;
      const handId = `${participantId}_hand`;
      
      // Create hand for participant and add to participant
      api.createHand(handId, `${participantId}'s Hand`, participantId);
      api.addHandToParticipant(participantId, handId);
      
      // Create pile for participant's cards
      api.createHandPile(handId, 'cards', true);
      
      // Deal 13 cards to participant
      for (let j = 0; j < 13; j++) {
        const card = api.removeCardFromGameboardPile('deck');
        if (card) {
          api.addCardToHandPile(handId, 'cards', card.card, true, participantId);
        }
      }
      
      // Initialize participant status
      api.updateParticipantStatus(participantId, 'has_played_card', false);
      api.updateParticipantStatus(participantId, 'position', ['North', 'East', 'South', 'West'][i]);
    }
    
    // Set first player (North starts) and others to false
    for (let i = 0; i < participants.length; i++) {
      api.updateParticipantStatus(participants[i]!, 'is_turn', i === 0);
    }
    
    // Initialize game status
    api.updateGameboardStatus('current_round', 1);
    api.updateGameboardStatus('trick_number', 1);
    api.updateGameboardStatus('hearts_broken', false);
    api.updateGameboardStatus('leader', participants[0]!);
    
    // Set game phase to playing
    const updatedState = this.transitionToPhase(api.getGameState(), GamePhase.PLAYING);
    api.updateGameState(updatedState);
    
    // Re-enable automatic snapshots
    api.setAutoCreateSnapshots(true);
    
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
    
    // Check if trick is complete (all 4 players have played)
    const currentTrick = gameState.gameboard.piles.get('current_trick');
    if (currentTrick && currentTrick.cards.length === 4) {
      this.completeTrick(api);
      
      // Check if round is complete (all 13 tricks played)
      const trickNumber = gameState.gameboard.status.trick_number as number;
      if (trickNumber > 13) {
        this.completeRound(api);
      }
    }
    
    // Team Hearts requires participant interaction for card play
    return this.createGameLoopResult(true, api.getGameState(), true);
  }

  public wincondition(gameState: GameState): WinResult {
    const northSouthTeam = gameState.parties.get('team_north_south');
    const eastWestTeam = gameState.parties.get('team_east_west');
    
    if (!northSouthTeam || !eastWestTeam) {
      return this.createWinResult(false);
    }
    
    const northSouthScore = northSouthTeam.status.score as number || 0;
    const eastWestScore = eastWestTeam.status.score as number || 0;
    
    // Game ends when a team reaches 100 points
    if (northSouthScore >= 100 || eastWestScore >= 100) {
      if (northSouthScore < eastWestScore) {
        return this.createWinResult(true, ['team_north_south'], `North/South team wins with ${northSouthScore} points`);
      } else if (eastWestScore < northSouthScore) {
        return this.createWinResult(true, ['team_east_west'], `East/West team wins with ${eastWestScore} points`);
      } else {
        return this.createWinResult(true, [], `Game ends in a tie with both teams at ${northSouthScore} points`);
      }
    }
    
    return this.createWinResult(false);
  }

  public validate(gameState: GameState): ValidationError[] {
    const errors = super.validate(gameState);
    
    // Validate that we have exactly 4 players
    if (gameState.participants.size !== 4) {
      errors.push(this.createValidationError(
        'INVALID_PLAYER_COUNT',
        `Team Hearts requires exactly 4 players, but ${gameState.participants.size} are present`
      ));
    }
    
    // Validate that we have exactly 2 teams
    if (gameState.parties.size !== 2) {
      errors.push(this.createValidationError(
        'INVALID_TEAM_COUNT',
        `Team Hearts requires exactly 2 teams, but ${gameState.parties.size} are present`
      ));
    }
    
    // Validate team membership
    for (const party of gameState.parties.values()) {
      if (party.participantIds.length !== 2) {
        errors.push(this.createValidationError(
          'INVALID_TEAM_SIZE',
          `Each team should have exactly 2 players, but team '${party.name}' has ${party.participantIds.length}`
        ));
      }
    }
    
    return errors;
  }

  /**
   * Process a participant action (playing a card)
   */
  public processAction(gameState: GameState, action: ParticipantAction): GameState {
    const api = this.createGameStateAPI(gameState) as GameStateAPIImpl;

    if (action.type === 'play_card') {
      return this.processPlayCard(api, action);
    } else if (action.type === 'share_team_info') {
      return this.processShareTeamInfo(api, action);
    }

    return gameState;
  }

  /**
   * Process a "play card" action
   */
  private processPlayCard(api: GameStateAPIImpl, action: ParticipantAction): GameState {
    const playerId = action.participantId;
    const cardId = action.data.cardId as string;

    if (!playerId || !cardId) {
      return api.getGameState();
    }

    // Check if it's the player's turn
    const player = api.getGameState().participants.get(playerId);
    if (!player || !player.status.is_turn) {
      return api.getGameState();
    }

    // Find and remove the card from player's hand
    const hand = api.getGameState().hands.get(`${playerId}_hand`);
    if (!hand) {
      return api.getGameState();
    }

    const cardsPile = hand.piles.get('cards');
    if (!cardsPile) {
      return api.getGameState();
    }

    const cardIndex = cardsPile.cards.findIndex(cardInPile => cardInPile.card.id === cardId);
    if (cardIndex === -1) {
      return api.getGameState();
    }

    const playedCard = api.removeCardFromHandPile(`${playerId}_hand`, 'cards', cardIndex);
    if (!playedCard) {
      return api.getGameState();
    }

    // Add card to current trick
    api.addCardToGameboardPile('current_trick', playedCard.card, true, playerId);

    // Mark player as having played
    api.updateParticipantStatus(playerId, 'has_played_card', true);
    api.updateParticipantStatus(playerId, 'is_turn', false);

    // Check if hearts are broken
    if (playedCard.card.properties.suit === 'Hearts') {
      api.updateGameboardStatus('hearts_broken', true);
    }

    // Set next player's turn
    this.setNextPlayerTurn(api, playerId);

    return api.getGameState();
  }

  /**
   * Process team information sharing
   */
  private processShareTeamInfo(api: GameStateAPIImpl, action: ParticipantAction): GameState {
    const playerId = action.participantId;
    const message = action.data.message as string;
    const targetTeammate = action.data.targetTeammate as string;

    if (!playerId || !message) {
      return api.getGameState();
    }

    // Get player's party
    const player = api.getGameState().participants.get(playerId);
    if (!player || !player.partyId) {
      return api.getGameState();
    }

    const party = api.getGameState().parties.get(player.partyId);
    if (!party) {
      return api.getGameState();
    }

    // Store team communication in party status
    const communications = party.status.communications || [];
    communications.push({
      from: playerId,
      to: targetTeammate || 'team',
      message,
      timestamp: Date.now()
    });

    api.updatePartyStatus(player.partyId, 'communications', communications);

    return api.getGameState();
  }

  /**
   * Complete the current trick and determine winner
   */
  private completeTrick(api: GameStateAPIImpl): void {
    const currentTrick = api.getGameState().gameboard.piles.get('current_trick');
    if (!currentTrick || currentTrick.cards.length !== 4) {
      return;
    }

    // Determine trick winner (highest card of led suit)
    const leadCard = currentTrick.cards[0];
    if (!leadCard) return;

    const leadSuit = leadCard.card.properties.suit as string;
    let winningCard = leadCard;
    let winningPlayer = leadCard.owner!;

    for (let i = 1; i < currentTrick.cards.length; i++) {
      const card = currentTrick.cards[i]!;
      const cardSuit = card.card.properties.suit as string;
      
      if (cardSuit === leadSuit) {
        const cardValue = this.getCardValue(card.card);
        const winningValue = this.getCardValue(winningCard.card);
        
        if (cardValue > winningValue) {
          winningCard = card;
          winningPlayer = card.owner!;
        }
      }
    }

    // Get winning player's team
    const winningPlayerData = api.getGameState().participants.get(winningPlayer);
    if (!winningPlayerData || !winningPlayerData.partyId) {
      return;
    }

    // Move all trick cards to winning team's score pile
    const trickCards = [...currentTrick.cards];
    
    // Clear current trick
    while (currentTrick.cards.length > 0) {
      api.removeCardFromGameboardPile('current_trick', 0);
    }

    // Add cards to winning team's score pile
    for (const cardInPile of trickCards) {
      api.addCardToPartyPile(winningPlayerData.partyId, 'score_cards', cardInPile.card, true, cardInPile.owner);
    }

    // Update team tricks won
    const party = api.getGameState().parties.get(winningPlayerData.partyId);
    if (party) {
      const tricksWon = (party.status.tricks_won as number || 0) + 1;
      api.updatePartyStatus(winningPlayerData.partyId, 'tricks_won', tricksWon);
    }

    // Set winner as leader for next trick
    api.updateGameboardStatus('leader', winningPlayer);
    api.updateParticipantStatus(winningPlayer, 'is_turn', true);

    // Reset all players' played status
    for (const participantId of api.getGameState().participants.keys()) {
      api.updateParticipantStatus(participantId, 'has_played_card', false);
    }

    // Increment trick number
    const trickNumber = api.getGameState().gameboard.status.trick_number as number;
    api.updateGameboardStatus('trick_number', trickNumber + 1);
  }

  /**
   * Complete the current round and calculate scores
   */
  private completeRound(api: GameStateAPIImpl): void {
    // Calculate points for each team
    for (const party of api.getGameState().parties.values()) {
      const scoreCards = party.piles.get('score_cards');
      if (!scoreCards) continue;

      let points = 0;
      for (const cardInPile of scoreCards.cards) {
        const card = cardInPile.card;
        
        // Hearts are worth 1 point each
        if (card.properties.suit === 'Hearts') {
          points += 1;
        }
        
        // Queen of Spades is worth 13 points
        if (card.properties.suit === 'Spades' && card.properties.rank === 'Q') {
          points += 13;
        }
      }

      // Add points to team's total score
      const currentScore = party.status.score as number || 0;
      api.updatePartyStatus(party.id, 'score', currentScore + points);
      api.updatePartyStatus(party.id, 'round_points', points);
    }

    // Start new round
    const currentRound = api.getGameState().gameboard.status.current_round as number;
    api.updateGameboardStatus('current_round', currentRound + 1);
    api.updateGameboardStatus('trick_number', 1);
    api.updateGameboardStatus('hearts_broken', false);

    // Clear team score piles for next round
    for (const party of api.getGameState().parties.values()) {
      const scoreCards = party.piles.get('score_cards');
      if (scoreCards) {
        while (scoreCards.cards.length > 0) {
          api.removeCardFromPartyPile(party.id, 'score_cards', 0);
        }
      }
      api.updatePartyStatus(party.id, 'tricks_won', 0);
    }

    // Deal new cards if game continues
    if (!this.wincondition(api.getGameState()).gameEnded) {
      this.dealNewRound(api);
    }
  }

  /**
   * Deal cards for a new round
   */
  private dealNewRound(api: GameStateAPIImpl): void {
    // Create and shuffle new deck
    const deckType = new StandardPlayingDeck();
    const deck = deckType.createDeck();

    // Clear and refill deck pile
    const deckPile = api.getGameState().gameboard.piles.get('deck');
    if (deckPile) {
      while (deckPile.cards.length > 0) {
        api.removeCardFromGameboardPile('deck', 0);
      }
    }

    for (const card of deck) {
      api.addCardToGameboardPile('deck', card, false);
    }
    api.shufflePile('gameboard', 'deck');

    // Deal 13 cards to each player
    const participants = Array.from(api.getGameState().participants.keys());
    for (const participantId of participants) {
      const hand = api.getGameState().hands.get(`${participantId}_hand`);
      if (hand) {
        const cardsPile = hand.piles.get('cards');
        if (cardsPile) {
          // Clear existing cards
          while (cardsPile.cards.length > 0) {
            api.removeCardFromHandPile(`${participantId}_hand`, 'cards', 0);
          }

          // Deal new cards
          for (let i = 0; i < 13; i++) {
            const card = api.removeCardFromGameboardPile('deck');
            if (card) {
              api.addCardToHandPile(`${participantId}_hand`, 'cards', card.card, true, participantId);
            }
          }
        }
      }
    }

    // Set first player for new round (rotate)
    const currentRound = api.getGameState().gameboard.status.current_round as number;
    const startingPlayerIndex = (currentRound - 1) % 4;
    const startingPlayer = participants[startingPlayerIndex];
    if (startingPlayer) {
      api.updateGameboardStatus('leader', startingPlayer);
      api.updateParticipantStatus(startingPlayer, 'is_turn', true);
    }
  }

  /**
   * Set the next player's turn
   */
  private setNextPlayerTurn(api: GameStateAPIImpl, currentPlayerId: string): void {
    const participants = Array.from(api.getGameState().participants.keys());
    const currentIndex = participants.indexOf(currentPlayerId);
    
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % participants.length;
    const nextPlayerId = participants[nextIndex];
    
    if (nextPlayerId) {
      api.updateParticipantStatus(nextPlayerId, 'is_turn', true);
    }
  }

  /**
   * Get numeric value of a card for comparison
   */
  private getCardValue(card: { properties: Record<string, any> }): number {
    const rank = card.properties.rank as string;
    return StandardPlayingDeck.NUMERIC_VALUES[rank as keyof typeof StandardPlayingDeck.NUMERIC_VALUES] || 0;
  }

  /**
   * Get team information for a player
   */
  public getTeamInfo(gameState: GameState, participantId: string): any {
    const participant = gameState.participants.get(participantId);
    if (!participant || !participant.partyId) {
      return null;
    }

    const party = gameState.parties.get(participant.partyId);
    if (!party) {
      return null;
    }

    return {
      teamId: party.id,
      teamName: party.name,
      teammates: party.participantIds.filter(id => id !== participantId),
      score: party.status.score || 0,
      tricksWon: party.status.tricks_won || 0,
      roundPoints: party.status.round_points || 0,
      communications: party.status.communications || []
    };
  }

  /**
   * Get current trick information
   */
  public getCurrentTrick(gameState: GameState): any {
    const currentTrick = gameState.gameboard.piles.get('current_trick');
    if (!currentTrick) {
      return null;
    }

    return {
      cards: currentTrick.cards.map(cardInPile => ({
        card: cardInPile.card,
        playedBy: cardInPile.owner
      })),
      leader: gameState.gameboard.status.leader,
      trickNumber: gameState.gameboard.status.trick_number
    };
  }
}