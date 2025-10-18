import { GameStateAPI } from '../core/interfaces/api';
import { GameState } from '../core/interfaces/game-state';
import { GameEvent, EventFilter } from '../core/interfaces/events';
import { GameStateSnapshot, ActionDescriptor, GameHistory } from '../core/interfaces/history';
import { Participant } from '../core/interfaces/participant';
import { Party } from '../core/interfaces/party';
import { Card } from '../core/interfaces/card';
import { CardInPile, CardInPlacement } from '../core/interfaces/gameboard';
import { CardOrientation } from '../core/types';
import { AccessDeniedError } from '../core/errors';
import {
  createCardInPile,
  createCardInPlacement,
  updateCardInPile,
  updateCardInPlacement
} from '../utils/card-helpers';
import { shuffleCards } from '../utils/shuffling';
import {
  canParticipantAccessPile,
  canParticipantAccessPlacement,
  getVisibleCardsInPile,
  canParticipantAccessHand
} from '../utils/access-control';
import { Participant as ParticipantModel } from '../models/participant';
import { Party as PartyModel } from '../models/party';
import { Hand } from '../models/hand';
import { Gameboard, CardPile, CardPlacement } from '../models/gameboard';
import { HistoryManager } from '../engine/history-manager';

/**
 * Comprehensive Game State API implementation with access control and event tracking
 */
export class GameStateAPIImpl implements GameStateAPI {
  private gameState: GameState;
  private eventIdCounter: number = 0;
  private historyManager: HistoryManager;

  private autoCreateSnapshots: boolean = true;

  constructor(gameState: GameState, historyManager?: HistoryManager) {
    this.gameState = gameState;
    this.historyManager = historyManager || new HistoryManager(gameState.gameId, gameState);
  }

  /**
   * Enable or disable automatic snapshot creation
   */
  public setAutoCreateSnapshots(enabled: boolean): void {
    this.autoCreateSnapshots = enabled;
  }

  /**
   * Get the current game state (read-only)
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Update the internal game state
   */
  public updateGameState(newState: GameState): void {
    this.gameState = newState;
  }

  // ===== PARTICIPANT MANAGEMENT =====

  public createParticipant(id: string, name: string, isNPC: boolean): void {
    if (this.gameState.participants.has(id)) {
      throw new Error(`Participant with ID '${id}' already exists`);
    }

    const participant = new ParticipantModel(id, name, isNPC);
    const newParticipants = new Map(this.gameState.participants);
    newParticipants.set(id, participant);

    this.gameState = {
      ...this.gameState,
      participants: newParticipants
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'participant_created',
      timestamp: Date.now(),
      participantId: id,
      data: { name, isNPC }
    });

    this.createSnapshotForAction(
      'participant_created',
      `Created participant '${name}' (${isNPC ? 'NPC' : 'Human'})`,
      id,
      { name, isNPC }
    );
  }

  public updateParticipantStatus(participantId: string, key: string, value: any): void {
    const participant = this.gameState.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant '${participantId}' not found`);
    }

    const newStatus = { ...participant.status, [key]: value };
    const updatedParticipant = (participant as ParticipantModel).withStatus(newStatus);

    const newParticipants = new Map(this.gameState.participants);
    newParticipants.set(participantId, updatedParticipant);

    this.gameState = {
      ...this.gameState,
      participants: newParticipants
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'participant_status_updated',
      timestamp: Date.now(),
      participantId,
      data: { key, value }
    });

    this.createSnapshotForAction(
      'participant_status_updated',
      `Updated participant '${participantId}' status: ${key} = ${value}`,
      participantId,
      { key, value }
    );
  }

  public addHandToParticipant(participantId: string, handId: string): void {
    const participant = this.gameState.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant '${participantId}' not found`);
    }

    if (!this.gameState.hands.has(handId)) {
      throw new Error(`Hand '${handId}' not found`);
    }

    if (participant.handIds.includes(handId)) {
      return; // Already has this hand
    }

    const newHandIds = [...participant.handIds, handId];
    const updatedParticipant = (participant as ParticipantModel).withHandIds(newHandIds);

    const newParticipants = new Map(this.gameState.participants);
    newParticipants.set(participantId, updatedParticipant);

    this.gameState = {
      ...this.gameState,
      participants: newParticipants
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'hand_added_to_participant',
      timestamp: Date.now(),
      participantId,
      data: { handId }
    });
  }

  public removeHandFromParticipant(participantId: string, handId: string): void {
    const participant = this.gameState.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant '${participantId}' not found`);
    }

    const newHandIds = participant.handIds.filter(id => id !== handId);
    const updatedParticipant = (participant as ParticipantModel).withHandIds(newHandIds);

    const newParticipants = new Map(this.gameState.participants);
    newParticipants.set(participantId, updatedParticipant);

    this.gameState = {
      ...this.gameState,
      participants: newParticipants
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'hand_removed_from_participant',
      timestamp: Date.now(),
      participantId,
      data: { handId }
    });
  }

  public addParticipantToParty(participantId: string, partyId: string): void {
    const participant = this.gameState.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant '${participantId}' not found`);
    }

    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    // Remove participant from current party if they're in one
    if (participant.partyId) {
      this.removeParticipantFromParty(participantId);
    }

    // Update participant with new party ID
    const updatedParticipant = (participant as ParticipantModel).withPartyId(partyId);
    const newParticipants = new Map(this.gameState.participants);
    newParticipants.set(participantId, updatedParticipant);

    // Add participant to party
    const newParticipantIds = [...party.participantIds, participantId];
    const updatedParty = (party as PartyModel).withParticipantIds(newParticipantIds);
    const newParties = new Map(this.gameState.parties);
    newParties.set(partyId, updatedParty);

    this.gameState = {
      ...this.gameState,
      participants: newParticipants,
      parties: newParties
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'participant_added_to_party',
      timestamp: Date.now(),
      participantId,
      data: { partyId }
    });

    this.createSnapshotForAction(
      'participant_added_to_party',
      `Added participant '${participantId}' to party '${partyId}'`,
      participantId,
      { partyId }
    );
  }

  public removeParticipantFromParty(participantId: string): void {
    const participant = this.gameState.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant '${participantId}' not found`);
    }

    if (!participant.partyId) {
      return; // Participant is not in a party
    }

    const party = this.gameState.parties.get(participant.partyId);
    if (party) {
      // Remove participant from party
      const newParticipantIds = party.participantIds.filter(id => id !== participantId);
      const updatedParty = (party as PartyModel).withParticipantIds(newParticipantIds);
      const newParties = new Map(this.gameState.parties);
      newParties.set(participant.partyId, updatedParty);

      this.gameState = {
        ...this.gameState,
        parties: newParties
      };
    }

    // Update participant to remove party ID
    const updatedParticipant = (participant as ParticipantModel).withPartyId(null);
    const newParticipants = new Map(this.gameState.participants);
    newParticipants.set(participantId, updatedParticipant);

    this.gameState = {
      ...this.gameState,
      participants: newParticipants
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'participant_removed_from_party',
      timestamp: Date.now(),
      participantId,
      data: { partyId: participant.partyId }
    });

    this.createSnapshotForAction(
      'participant_removed_from_party',
      `Removed participant '${participantId}' from party '${participant.partyId}'`,
      participantId,
      { partyId: participant.partyId }
    );
  }

  public getParticipant(participantId: string): Participant | null {
    return this.gameState.participants.get(participantId) || null;
  }

  // ===== PARTY MANAGEMENT =====

  public createParty(id: string, name: string): void {
    if (this.gameState.parties.has(id)) {
      throw new Error(`Party with ID '${id}' already exists`);
    }

    const party = new PartyModel(id, name);
    const newParties = new Map(this.gameState.parties);
    newParties.set(id, party);

    this.gameState = {
      ...this.gameState,
      parties: newParties
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'party_created',
      timestamp: Date.now(),
      data: { partyId: id, name }
    });

    this.createSnapshotForAction(
      'party_created',
      `Created party '${name}' with ID '${id}'`,
      undefined,
      { partyId: id, name }
    );
  }

  public createPartyPile(partyId: string, pileName: string, isOrdered: boolean, orientation?: CardOrientation): void {
    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    if (party.piles.has(pileName)) {
      throw new Error(`Pile '${pileName}' already exists in party '${partyId}'`);
    }

    const pile = new CardPile(
      pileName,
      [],
      isOrdered,
      orientation || CardOrientation.NORMAL
    );

    const newPiles = new Map(party.piles as Map<string, CardPile>);
    newPiles.set(pileName, pile);
    const updatedParty = (party as PartyModel).withPiles(newPiles);

    const newParties = new Map(this.gameState.parties);
    newParties.set(partyId, updatedParty);

    this.gameState = {
      ...this.gameState,
      parties: newParties
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'party_pile_created',
      timestamp: Date.now(),
      data: { partyId, pileName, isOrdered, orientation }
    });
  }

  public addCardToPartyPile(
    partyId: string,
    pileName: string,
    card: Card,
    faceUp: boolean,
    owner?: string,
    orientation?: CardOrientation,
    status?: Record<string, any>
  ): void {
    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    const pile = party.piles.get(pileName) as CardPile;
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in party '${partyId}'`);
    }

    const cardInPile = createCardInPile(
      card,
      faceUp,
      owner || null,
      orientation || pile.orientation,
      status || {}
    );

    const newCards = [...pile.cards, cardInPile];
    const updatedPile = pile.withCards(newCards);

    const newPiles = new Map(party.piles as Map<string, CardPile>);
    newPiles.set(pileName, updatedPile);
    const updatedParty = (party as PartyModel).withPiles(newPiles);

    const newParties = new Map(this.gameState.parties);
    newParties.set(partyId, updatedParty);

    this.gameState = {
      ...this.gameState,
      parties: newParties
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_added_to_party_pile',
      timestamp: Date.now(),
      data: { partyId, pileName, cardId: card.id, faceUp, owner: cardInPile.owner }
    });

    this.createSnapshotForAction(
      'card_added_to_party_pile',
      `Added card ${card.id} to party pile ${pileName}`,
      undefined,
      { partyId, pileName, cardId: card.id, faceUp, owner: cardInPile.owner }
    );
  }

  public removeCardFromPartyPile(partyId: string, pileName: string, index?: number): CardInPile | null {
    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    const pile = party.piles.get(pileName) as CardPile;
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in party '${partyId}'`);
    }

    if (pile.isEmpty()) {
      return null;
    }

    const cardIndex = index !== undefined ? index : pile.cards.length - 1;
    if (cardIndex < 0 || cardIndex >= pile.cards.length) {
      throw new Error(`Invalid card index ${cardIndex} for pile '${pileName}'`);
    }

    const removedCard = pile.cards[cardIndex];
    if (!removedCard) {
      return null;
    }

    const newCards = pile.cards.filter((_, i) => i !== cardIndex);
    const updatedPile = pile.withCards(newCards);

    const newPiles = new Map(party.piles as Map<string, CardPile>);
    newPiles.set(pileName, updatedPile);
    const updatedParty = (party as PartyModel).withPiles(newPiles);

    const newParties = new Map(this.gameState.parties);
    newParties.set(partyId, updatedParty);

    this.gameState = {
      ...this.gameState,
      parties: newParties
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_removed_from_party_pile',
      timestamp: Date.now(),
      data: { partyId, pileName, cardId: removedCard.card.id, index: cardIndex }
    });

    return removedCard;
  }

  public setPartyPlacement(
    partyId: string,
    placementName: string,
    card: Card | null,
    faceUp?: boolean,
    owner?: string,
    orientation?: CardOrientation,
    status?: Record<string, any>
  ): void {
    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    const placement = party.placements.get(placementName) as CardPlacement;

    if (!placement) {
      // Create new placement if it doesn't exist
      const newPlacement = new CardPlacement(
        placementName,
        card ? createCardInPlacement(
          card,
          faceUp ?? true,
          owner || null,
          orientation || CardOrientation.NORMAL,
          status || {}
        ) : null
      );

      const newPlacements = new Map(party.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, newPlacement);
      const updatedParty = (party as PartyModel).withPlacements(newPlacements);

      const newParties = new Map(this.gameState.parties);
      newParties.set(partyId, updatedParty);

      this.gameState = {
        ...this.gameState,
        parties: newParties
      };
    } else {
      const cardInPlacement = card ? createCardInPlacement(
        card,
        faceUp ?? true,
        owner || null,
        orientation || placement.orientation,
        status || {}
      ) : null;

      const updatedPlacement = placement.withCard(cardInPlacement);

      const newPlacements = new Map(party.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, updatedPlacement);
      const updatedParty = (party as PartyModel).withPlacements(newPlacements);

      const newParties = new Map(this.gameState.parties);
      newParties.set(partyId, updatedParty);

      this.gameState = {
        ...this.gameState,
        parties: newParties
      };
    }

    this.addEvent({
      id: this.generateEventId(),
      type: 'party_placement_set',
      timestamp: Date.now(),
      data: { partyId, placementName, cardId: card?.id || null, faceUp }
    });
  }

  public getPartyPlacement(partyId: string, placementName: string): CardInPlacement | null {
    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    const placement = party.placements.get(placementName);
    return placement?.card || null;
  }

  public updatePartyStatus(partyId: string, key: string, value: any): void {
    const party = this.gameState.parties.get(partyId);
    if (!party) {
      throw new Error(`Party '${partyId}' not found`);
    }

    const newStatus = { ...party.status, [key]: value };
    const updatedParty = (party as PartyModel).withStatus(newStatus);

    const newParties = new Map(this.gameState.parties);
    newParties.set(partyId, updatedParty);

    this.gameState = {
      ...this.gameState,
      parties: newParties
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'party_status_updated',
      timestamp: Date.now(),
      data: { partyId, key, value }
    });

    this.createSnapshotForAction(
      'party_status_updated',
      `Updated party '${partyId}' status: ${key} = ${value}`,
      undefined,
      { partyId, key, value }
    );
  }

  public getParty(partyId: string): Party | null {
    return this.gameState.parties.get(partyId) || null;
  }

  // ===== HAND MANAGEMENT =====

  public createHand(handId: string, name: string, participantId: string): void {
    if (this.gameState.hands.has(handId)) {
      throw new Error(`Hand with ID '${handId}' already exists`);
    }

    if (!this.gameState.participants.has(participantId)) {
      throw new Error(`Participant '${participantId}' not found`);
    }

    const hand = new Hand(handId, name, participantId);
    const newHands = new Map(this.gameState.hands);
    newHands.set(handId, hand);

    this.gameState = {
      ...this.gameState,
      hands: newHands
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'hand_created',
      timestamp: Date.now(),
      participantId,
      data: { handId, name }
    });

    this.createSnapshotForAction(
      'hand_created',
      `Created hand '${name}' for participant '${participantId}'`,
      participantId,
      { handId, name }
    );
  }

  public createHandPile(handId: string, pileName: string, isOrdered: boolean, orientation?: CardOrientation): void {
    const hand = this.gameState.hands.get(handId);
    if (!hand) {
      throw new Error(`Hand '${handId}' not found`);
    }

    if (hand.piles.has(pileName)) {
      throw new Error(`Pile '${pileName}' already exists in hand '${handId}'`);
    }

    const pile = new CardPile(
      pileName,
      [],
      isOrdered,
      orientation || CardOrientation.NORMAL
    );

    const newPiles = new Map(hand.piles as Map<string, CardPile>);
    newPiles.set(pileName, pile);
    const updatedHand = (hand as Hand).withPiles(newPiles);

    const newHands = new Map(this.gameState.hands);
    newHands.set(handId, updatedHand);

    this.gameState = {
      ...this.gameState,
      hands: newHands
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'hand_pile_created',
      timestamp: Date.now(),
      participantId: hand.participantId,
      data: { handId, pileName, isOrdered, orientation }
    });
  }

  public addCardToHandPile(
    handId: string,
    pileName: string,
    card: Card,
    faceUp: boolean,
    owner?: string,
    orientation?: CardOrientation,
    status?: Record<string, any>
  ): void {
    const hand = this.gameState.hands.get(handId);
    if (!hand) {
      throw new Error(`Hand '${handId}' not found`);
    }

    const pile = hand.piles.get(pileName) as CardPile;
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in hand '${handId}'`);
    }

    const cardInPile = createCardInPile(
      card,
      faceUp,
      owner || hand.participantId,
      orientation || pile.orientation,
      status || {}
    );

    const newCards = [...pile.cards, cardInPile];
    const updatedPile = pile.withCards(newCards);

    const newPiles = new Map(hand.piles as Map<string, CardPile>);
    newPiles.set(pileName, updatedPile);
    const updatedHand = (hand as Hand).withPiles(newPiles);

    const newHands = new Map(this.gameState.hands);
    newHands.set(handId, updatedHand);

    this.gameState = {
      ...this.gameState,
      hands: newHands
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_added_to_hand_pile',
      timestamp: Date.now(),
      participantId: hand.participantId,
      data: { handId, pileName, cardId: card.id, faceUp, owner: cardInPile.owner }
    });

    // Create snapshot for this action
    this.createSnapshotForAction(
      'card_added_to_hand_pile',
      `Added card ${card.id} to hand pile ${pileName}`,
      hand.participantId,
      { handId, pileName, cardId: card.id, faceUp, owner: cardInPile.owner }
    );
  }

  public removeCardFromHandPile(handId: string, pileName: string, index?: number): CardInPile | null {
    const hand = this.gameState.hands.get(handId);
    if (!hand) {
      throw new Error(`Hand '${handId}' not found`);
    }

    const pile = hand.piles.get(pileName) as CardPile;
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in hand '${handId}'`);
    }

    if (pile.isEmpty()) {
      return null;
    }

    const cardIndex = index !== undefined ? index : pile.cards.length - 1;
    if (cardIndex < 0 || cardIndex >= pile.cards.length) {
      throw new Error(`Invalid card index ${cardIndex} for pile '${pileName}'`);
    }

    const removedCard = pile.cards[cardIndex];
    if (!removedCard) {
      return null;
    }

    const newCards = pile.cards.filter((_, i) => i !== cardIndex);
    const updatedPile = pile.withCards(newCards);

    const newPiles = new Map(hand.piles as Map<string, CardPile>);
    newPiles.set(pileName, updatedPile);
    const updatedHand = (hand as Hand).withPiles(newPiles);

    const newHands = new Map(this.gameState.hands);
    newHands.set(handId, updatedHand);

    this.gameState = {
      ...this.gameState,
      hands: newHands
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_removed_from_hand_pile',
      timestamp: Date.now(),
      participantId: hand.participantId,
      data: { handId, pileName, cardId: removedCard.card.id, index: cardIndex }
    });

    return removedCard;
  }

  public setHandPlacement(
    handId: string,
    placementName: string,
    card: Card | null,
    faceUp?: boolean,
    owner?: string,
    orientation?: CardOrientation,
    status?: Record<string, any>
  ): void {
    const hand = this.gameState.hands.get(handId);
    if (!hand) {
      throw new Error(`Hand '${handId}' not found`);
    }

    const placement = hand.placements.get(placementName) as CardPlacement;
    if (!placement) {
      // Create new placement if it doesn't exist
      const newPlacement = new CardPlacement(
        placementName,
        card ? createCardInPlacement(
          card,
          faceUp ?? true,
          owner || hand.participantId,
          orientation || CardOrientation.NORMAL,
          status || {}
        ) : null
      );

      const newPlacements = new Map(hand.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, newPlacement);
      const updatedHand = (hand as Hand).withPlacements(newPlacements);

      const newHands = new Map(this.gameState.hands);
      newHands.set(handId, updatedHand);

      this.gameState = {
        ...this.gameState,
        hands: newHands
      };
    } else {
      const cardInPlacement = card ? createCardInPlacement(
        card,
        faceUp ?? true,
        owner || hand.participantId,
        orientation || placement.orientation,
        status || {}
      ) : null;

      const updatedPlacement = placement.withCard(cardInPlacement);

      const newPlacements = new Map(hand.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, updatedPlacement);
      const updatedHand = (hand as Hand).withPlacements(newPlacements);

      const newHands = new Map(this.gameState.hands);
      newHands.set(handId, updatedHand);

      this.gameState = {
        ...this.gameState,
        hands: newHands
      };
    }

    this.addEvent({
      id: this.generateEventId(),
      type: 'hand_placement_set',
      timestamp: Date.now(),
      participantId: hand.participantId,
      data: { handId, placementName, cardId: card?.id || null, faceUp }
    });
  }

  public getHandPlacement(handId: string, placementName: string): CardInPlacement | null {
    const hand = this.gameState.hands.get(handId);
    if (!hand) {
      throw new Error(`Hand '${handId}' not found`);
    }

    const placement = hand.placements.get(placementName);
    return placement?.card || null;
  }

  public updateHandStatus(handId: string, key: string, value: any): void {
    const hand = this.gameState.hands.get(handId);
    if (!hand) {
      throw new Error(`Hand '${handId}' not found`);
    }

    const newStatus = { ...hand.status, [key]: value };
    const updatedHand = (hand as Hand).withStatus(newStatus);

    const newHands = new Map(this.gameState.hands);
    newHands.set(handId, updatedHand);

    this.gameState = {
      ...this.gameState,
      hands: newHands
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'hand_status_updated',
      timestamp: Date.now(),
      participantId: hand.participantId,
      data: { handId, key, value }
    });
  }

  // ===== GAMEBOARD MANAGEMENT =====

  public createGameboardPile(name: string, isOrdered: boolean, orientation?: CardOrientation): void {
    if (this.gameState.gameboard.piles.has(name)) {
      throw new Error(`Gameboard pile '${name}' already exists`);
    }

    const pile = new CardPile(
      name,
      [],
      isOrdered,
      orientation || CardOrientation.NORMAL
    );

    const newPiles = new Map(this.gameState.gameboard.piles as Map<string, CardPile>);
    newPiles.set(name, pile);
    const updatedGameboard = (this.gameState.gameboard as Gameboard).withPiles(newPiles);

    this.gameState = {
      ...this.gameState,
      gameboard: updatedGameboard
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'gameboard_pile_created',
      timestamp: Date.now(),
      data: { pileName: name, isOrdered, orientation }
    });
  }

  public addCardToGameboardPile(
    pileName: string,
    card: Card,
    faceUp: boolean,
    owner?: string,
    orientation?: CardOrientation,
    status?: Record<string, any>
  ): void {
    const pile = this.gameState.gameboard.piles.get(pileName) as CardPile;
    if (!pile) {
      throw new Error(`Gameboard pile '${pileName}' not found`);
    }

    const cardInPile = createCardInPile(
      card,
      faceUp,
      owner || null,
      orientation || pile.orientation,
      status || {}
    );

    const newCards = [...pile.cards, cardInPile];
    const updatedPile = pile.withCards(newCards);

    const newPiles = new Map(this.gameState.gameboard.piles as Map<string, CardPile>);
    newPiles.set(pileName, updatedPile);
    const updatedGameboard = (this.gameState.gameboard as Gameboard).withPiles(newPiles);

    this.gameState = {
      ...this.gameState,
      gameboard: updatedGameboard
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_added_to_gameboard_pile',
      timestamp: Date.now(),
      data: { pileName, cardId: card.id, faceUp, owner: cardInPile.owner }
    });
  }

  public removeCardFromGameboardPile(pileName: string, index?: number): CardInPile | null {
    const pile = this.gameState.gameboard.piles.get(pileName) as CardPile;
    if (!pile) {
      throw new Error(`Gameboard pile '${pileName}' not found`);
    }

    if (pile.isEmpty()) {
      return null;
    }

    const cardIndex = index !== undefined ? index : pile.cards.length - 1;
    if (cardIndex < 0 || cardIndex >= pile.cards.length) {
      throw new Error(`Invalid card index ${cardIndex} for pile '${pileName}'`);
    }

    const removedCard = pile.cards[cardIndex];
    if (!removedCard) {
      return null;
    }

    const newCards = pile.cards.filter((_, i) => i !== cardIndex);
    const updatedPile = pile.withCards(newCards);

    const newPiles = new Map(this.gameState.gameboard.piles as Map<string, CardPile>);
    newPiles.set(pileName, updatedPile);
    const updatedGameboard = (this.gameState.gameboard as Gameboard).withPiles(newPiles);

    this.gameState = {
      ...this.gameState,
      gameboard: updatedGameboard
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_removed_from_gameboard_pile',
      timestamp: Date.now(),
      data: { pileName, cardId: removedCard.card.id, index: cardIndex }
    });

    return removedCard;
  }

  public setGameboardPlacement(
    placementName: string,
    card: Card | null,
    faceUp?: boolean,
    owner?: string,
    orientation?: CardOrientation,
    status?: Record<string, any>
  ): void {
    const placement = this.gameState.gameboard.placements.get(placementName) as CardPlacement;

    if (!placement) {
      // Create new placement if it doesn't exist
      const newPlacement = new CardPlacement(
        placementName,
        card ? createCardInPlacement(
          card,
          faceUp ?? true,
          owner || null,
          orientation || CardOrientation.NORMAL,
          status || {}
        ) : null
      );

      const newPlacements = new Map(this.gameState.gameboard.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, newPlacement);
      const updatedGameboard = (this.gameState.gameboard as Gameboard).withPlacements(newPlacements);

      this.gameState = {
        ...this.gameState,
        gameboard: updatedGameboard
      };
    } else {
      const cardInPlacement = card ? createCardInPlacement(
        card,
        faceUp ?? true,
        owner || null,
        orientation || placement.orientation,
        status || {}
      ) : null;

      const updatedPlacement = placement.withCard(cardInPlacement);

      const newPlacements = new Map(this.gameState.gameboard.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, updatedPlacement);
      const updatedGameboard = (this.gameState.gameboard as Gameboard).withPlacements(newPlacements);

      this.gameState = {
        ...this.gameState,
        gameboard: updatedGameboard
      };
    }

    this.addEvent({
      id: this.generateEventId(),
      type: 'gameboard_placement_set',
      timestamp: Date.now(),
      data: { placementName, cardId: card?.id || null, faceUp }
    });
  }

  public getGameboardPlacement(placementName: string): CardInPlacement | null {
    const placement = this.gameState.gameboard.placements.get(placementName);
    return placement?.card || null;
  }

  public updateGameboardStatus(key: string, value: any): void {
    const newStatus = { ...this.gameState.gameboard.status, [key]: value };
    const updatedGameboard = (this.gameState.gameboard as Gameboard).withStatus(newStatus);

    this.gameState = {
      ...this.gameState,
      gameboard: updatedGameboard
    };

    this.addEvent({
      id: this.generateEventId(),
      type: 'gameboard_status_updated',
      timestamp: Date.now(),
      data: { key, value }
    });
  }

  // ===== CARD STATE MANAGEMENT =====

  public updateCardInPileStatus(location: 'gameboard' | 'party' | string, pileName: string, cardIndex: number, key: string, value: any, locationId?: string): void {
    const pile = this.getPileFromLocation(location, pileName, locationId);
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in location '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    if (cardIndex < 0 || cardIndex >= pile.cards.length) {
      throw new Error(`Invalid card index ${cardIndex} for pile '${pileName}'`);
    }

    const cardInPile = pile.cards[cardIndex];
    if (!cardInPile) {
      throw new Error(`No card found at index ${cardIndex} in pile '${pileName}'`);
    }
    const newStatus = { ...cardInPile.status, [key]: value };
    const updatedCard = updateCardInPile(cardInPile, { status: newStatus });

    const newCards = [...pile.cards];
    newCards[cardIndex] = updatedCard;
    const updatedPile = pile.withCards(newCards);

    this.updatePileInLocation(location, pileName, updatedPile, locationId);

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_status_updated',
      timestamp: Date.now(),
      data: { location, pileName, cardIndex, cardId: cardInPile.card.id, key, value }
    });
  }

  public updateCardInPlacementStatus(location: 'gameboard' | 'party' | string, placementName: string, key: string, value: any, locationId?: string): void {
    const placement = this.getPlacementFromLocation(location, placementName, locationId);
    if (!placement) {
      throw new Error(`Placement '${placementName}' not found in location '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    if (!placement.card) {
      throw new Error(`No card in placement '${placementName}'`);
    }

    const newStatus = { ...placement.card.status, [key]: value };
    const updatedCard = updateCardInPlacement(placement.card, { status: newStatus });
    const updatedPlacement = placement.withCard(updatedCard);

    this.updatePlacementInLocation(location, placementName, updatedPlacement, locationId);

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_placement_status_updated',
      timestamp: Date.now(),
      data: { location, placementName, cardId: placement.card.card.id, key, value }
    });
  }

  public updateCardOwnership(location: 'gameboard' | 'party' | string, pileName: string, cardIndex: number, newOwner: string | null, locationId?: string): void {
    const pile = this.getPileFromLocation(location, pileName, locationId);
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in location '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    if (cardIndex < 0 || cardIndex >= pile.cards.length) {
      throw new Error(`Invalid card index ${cardIndex} for pile '${pileName}'`);
    }

    const cardInPile = pile.cards[cardIndex];
    if (!cardInPile) {
      throw new Error(`No card found at index ${cardIndex} in pile '${pileName}'`);
    }
    const updatedCard = updateCardInPile(cardInPile, { owner: newOwner });

    const newCards = [...pile.cards];
    newCards[cardIndex] = updatedCard;
    const updatedPile = pile.withCards(newCards);

    this.updatePileInLocation(location, pileName, updatedPile, locationId);

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_ownership_updated',
      timestamp: Date.now(),
      data: {
        location,
        pileName,
        cardIndex,
        cardId: cardInPile.card.id,
        oldOwner: cardInPile.owner,
        newOwner
      }
    });
  }

  public flipCard(location: 'gameboard' | 'party' | string, pileName: string, cardIndex: number, faceUp: boolean, locationId?: string): void {
    const pile = this.getPileFromLocation(location, pileName, locationId);
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in location '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    if (cardIndex < 0 || cardIndex >= pile.cards.length) {
      throw new Error(`Invalid card index ${cardIndex} for pile '${pileName}'`);
    }

    const cardInPile = pile.cards[cardIndex];
    if (!cardInPile) {
      throw new Error(`No card found at index ${cardIndex} in pile '${pileName}'`);
    }
    const updatedCard = updateCardInPile(cardInPile, { faceUp });

    const newCards = [...pile.cards];
    newCards[cardIndex] = updatedCard;
    const updatedPile = pile.withCards(newCards);

    this.updatePileInLocation(location, pileName, updatedPile, locationId);

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_flipped',
      timestamp: Date.now(),
      data: { location, pileName, cardIndex, cardId: cardInPile.card.id, faceUp }
    });
  }

  // ===== UTILITY FUNCTIONS =====

  public shufflePile(location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): void {
    const pile = this.getPileFromLocation(location, pileName, locationId);
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in location '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    const shuffledCards = shuffleCards(pile.cards);
    const updatedPile = pile.withCards(shuffledCards);

    this.updatePileInLocation(location, pileName, updatedPile, locationId);

    this.addEvent({
      id: this.generateEventId(),
      type: 'pile_shuffled',
      timestamp: Date.now(),
      data: { location, pileName }
    });
  }

  public moveCard(
    fromLocation: 'gameboard' | 'party' | string,
    fromPile: string,
    fromIndex: number,
    toLocation: 'gameboard' | 'party' | string,
    toPile: string,
    fromLocationId?: string,
    toLocationId?: string
  ): void {
    // Remove card from source pile
    let removedCard: CardInPile | null = null;
    
    if (fromLocation === 'gameboard') {
      removedCard = this.removeCardFromGameboardPile(fromPile, fromIndex);
    } else if (fromLocation === 'party') {
      if (!fromLocationId) {
        throw new Error('Party ID (fromLocationId) is required when moving from party location');
      }
      removedCard = this.removeCardFromPartyPile(fromLocationId, fromPile, fromIndex);
    } else {
      removedCard = this.removeCardFromHandPile(fromLocation, fromPile, fromIndex);
    }

    if (!removedCard) {
      throw new Error(`No card found at index ${fromIndex} in pile '${fromPile}'`);
    }

    // Add card to destination pile
    if (toLocation === 'gameboard') {
      this.addCardToGameboardPile(
        toPile,
        removedCard.card,
        removedCard.faceUp,
        removedCard.owner || undefined,
        removedCard.orientation,
        removedCard.status
      );
    } else if (toLocation === 'party') {
      if (!toLocationId) {
        throw new Error('Party ID (toLocationId) is required when moving to party location');
      }
      this.addCardToPartyPile(
        toLocationId,
        toPile,
        removedCard.card,
        removedCard.faceUp,
        removedCard.owner || undefined,
        removedCard.orientation,
        removedCard.status
      );
    } else {
      this.addCardToHandPile(
        toLocation,
        toPile,
        removedCard.card,
        removedCard.faceUp,
        removedCard.owner || undefined,
        removedCard.orientation,
        removedCard.status
      );
    }

    this.addEvent({
      id: this.generateEventId(),
      type: 'card_moved',
      timestamp: Date.now(),
      data: {
        cardId: removedCard.card.id,
        fromLocation,
        fromPile,
        fromIndex,
        toLocation,
        toPile
      }
    });

    // Create snapshot for this action
    this.createSnapshotForAction(
      'card_moved',
      `Moved card ${removedCard.card.id} from ${fromLocation}:${fromPile} to ${toLocation}:${toPile}`,
      undefined,
      {
        cardId: removedCard.card.id,
        fromLocation,
        fromPile,
        fromIndex,
        toLocation,
        toPile
      }
    );
  }

  // ===== VISIBILITY AND ACCESS CONTROL =====

  public canAccessPile(participantId: string, location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): boolean {
    if (location === 'party') {
      if (!locationId) {
        return false; // Cannot access party without party ID
      }
      const participant = this.gameState.participants.get(participantId);
      const party = this.gameState.parties.get(locationId);
      return participant?.partyId === locationId && (party as PartyModel)?.hasParticipant(participantId) === true;
    }
    return canParticipantAccessPile(participantId, location, pileName, this.gameState.hands);
  }

  public canAccessPlacement(participantId: string, location: 'gameboard' | 'party' | string, placementName: string, locationId?: string): boolean {
    if (location === 'party') {
      if (!locationId) {
        return false; // Cannot access party without party ID
      }
      const participant = this.gameState.participants.get(participantId);
      const party = this.gameState.parties.get(locationId);
      return participant?.partyId === locationId && (party as PartyModel)?.hasParticipant(participantId) === true;
    }
    return canParticipantAccessPlacement(participantId, location, placementName, this.gameState.hands);
  }

  public getVisibleCards(participantId: string, location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): CardInPile[] {
    if (!this.canAccessPile(participantId, location, pileName, locationId)) {
      throw new AccessDeniedError(participantId, `pile '${pileName}' in '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    const pile = this.getPileFromLocation(location, pileName, locationId);
    if (!pile) {
      throw new Error(`Pile '${pileName}' not found in location '${location}'${locationId ? ` (${locationId})` : ''}`);
    }

    let isOwnerOfContainer = false;
    if (location === 'gameboard') {
      isOwnerOfContainer = false; // Gameboard is shared
    } else if (location === 'party') {
      // Party members have shared access to party resources
      const participant = this.gameState.participants.get(participantId);
      isOwnerOfContainer = participant?.partyId === locationId;
    } else {
      // Hand location
      isOwnerOfContainer = this.gameState.hands.get(location)?.participantId === participantId;
    }

    return getVisibleCardsInPile(participantId, pile.cards, isOwnerOfContainer);
  }

  // ===== EVENT MANAGEMENT =====

  public addEvent(event: GameEvent): void {
    const newEvents = [...this.gameState.events, event];
    this.gameState = {
      ...this.gameState,
      events: newEvents
    };
  }

  public getEvents(filter?: EventFilter): GameEvent[] {
    let events = this.gameState.events;

    if (filter) {
      if (filter.type) {
        events = events.filter(event => event.type === filter.type);
      }
      if (filter.participantId) {
        events = events.filter(event => event.participantId === filter.participantId);
      }
      if (filter.since) {
        events = events.filter(event => event.timestamp >= filter.since!);
      }
    }

    return events;
  }

  // ===== HISTORY MANAGEMENT =====

  public createSnapshot(action: ActionDescriptor): GameStateSnapshot {
    const snapshot = this.historyManager.createSnapshot(this.gameState, action);
    return snapshot;
  }

  public getCurrentSnapshot(): GameStateSnapshot {
    return this.historyManager.getCurrentSnapshot();
  }

  public getSnapshotById(snapshotId: string): GameStateSnapshot | null {
    return this.historyManager.getSnapshotById(snapshotId);
  }

  public getGameHistory(): GameHistory {
    return this.historyManager.getGameHistory();
  }

  public replayToSnapshot(snapshotId: string): GameState {
    const replayedState = this.historyManager.replayToSnapshot(snapshotId);
    this.gameState = replayedState;
    return replayedState;
  }

  public exportHistory(format: 'full' | 'compressed' = 'full'): string {
    return this.historyManager.exportHistory(format);
  }

  public importHistory(serializedHistory: string): GameHistory {
    const importedHistoryManager = HistoryManager.importHistory(serializedHistory);
    this.historyManager = importedHistoryManager;
    
    // Update current game state to match the imported history
    const currentSnapshot = this.historyManager.getCurrentSnapshot();
    this.gameState = currentSnapshot.gameState;
    
    return this.historyManager.getGameHistory();
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateEventId(): string {
    return `event_${this.gameState.gameId}_${++this.eventIdCounter}_${Date.now()}`;
  }

  /**
   * Create a snapshot after a state change with automatic action descriptor generation
   */
  private createSnapshotForAction(
    actionType: string,
    description: string,
    participantId?: string,
    details: Record<string, any> = {}
  ): void {
    if (!this.autoCreateSnapshots) {
      return; // Skip snapshot creation when disabled
    }

    const action: ActionDescriptor = {
      type: actionType,
      description,
      ...(participantId !== undefined && { participantId }),
      details,
      timestamp: Date.now()
    };

    this.historyManager.createSnapshot(this.gameState, action);
  }

  private getPileFromLocation(location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): CardPile | null {
    if (location === 'gameboard') {
      return this.gameState.gameboard.piles.get(pileName) as CardPile || null;
    } else if (location === 'party') {
      if (!locationId) return null;
      const party = this.gameState.parties.get(locationId);
      return party?.piles.get(pileName) as CardPile || null;
    } else {
      const hand = this.gameState.hands.get(location);
      return hand?.piles.get(pileName) as CardPile || null;
    }
  }

  private getPlacementFromLocation(location: 'gameboard' | 'party' | string, placementName: string, locationId?: string): CardPlacement | null {
    if (location === 'gameboard') {
      return this.gameState.gameboard.placements.get(placementName) as CardPlacement || null;
    } else if (location === 'party') {
      if (!locationId) return null;
      const party = this.gameState.parties.get(locationId);
      return party?.placements.get(placementName) as CardPlacement || null;
    } else {
      const hand = this.gameState.hands.get(location);
      return hand?.placements.get(placementName) as CardPlacement || null;
    }
  }

  private updatePileInLocation(location: 'gameboard' | 'party' | string, pileName: string, updatedPile: CardPile, locationId?: string): void {
    if (location === 'gameboard') {
      const newPiles = new Map(this.gameState.gameboard.piles as Map<string, CardPile>);
      newPiles.set(pileName, updatedPile);
      const updatedGameboard = (this.gameState.gameboard as Gameboard).withPiles(newPiles);

      this.gameState = {
        ...this.gameState,
        gameboard: updatedGameboard
      };
    } else if (location === 'party') {
      if (!locationId) return;
      const party = this.gameState.parties.get(locationId);
      if (party) {
        const newPiles = new Map(party.piles as Map<string, CardPile>);
        newPiles.set(pileName, updatedPile);
        const updatedParty = (party as PartyModel).withPiles(newPiles);

        const newParties = new Map(this.gameState.parties);
        newParties.set(locationId, updatedParty);

        this.gameState = {
          ...this.gameState,
          parties: newParties
        };
      }
    } else {
      const hand = this.gameState.hands.get(location);
      if (hand) {
        const newPiles = new Map(hand.piles as Map<string, CardPile>);
        newPiles.set(pileName, updatedPile);
        const updatedHand = (hand as Hand).withPiles(newPiles);

        const newHands = new Map(this.gameState.hands);
        newHands.set(location, updatedHand);

        this.gameState = {
          ...this.gameState,
          hands: newHands
        };
      }
    }
  }

  private updatePlacementInLocation(location: 'gameboard' | 'party' | string, placementName: string, updatedPlacement: CardPlacement, locationId?: string): void {
    if (location === 'gameboard') {
      const newPlacements = new Map(this.gameState.gameboard.placements as Map<string, CardPlacement>);
      newPlacements.set(placementName, updatedPlacement);
      const updatedGameboard = (this.gameState.gameboard as Gameboard).withPlacements(newPlacements);

      this.gameState = {
        ...this.gameState,
        gameboard: updatedGameboard
      };
    } else if (location === 'party') {
      if (!locationId) return;
      const party = this.gameState.parties.get(locationId);
      if (party) {
        const newPlacements = new Map(party.placements as Map<string, CardPlacement>);
        newPlacements.set(placementName, updatedPlacement);
        const updatedParty = (party as PartyModel).withPlacements(newPlacements);

        const newParties = new Map(this.gameState.parties);
        newParties.set(locationId, updatedParty);

        this.gameState = {
          ...this.gameState,
          parties: newParties
        };
      }
    } else {
      const hand = this.gameState.hands.get(location);
      if (hand) {
        const newPlacements = new Map(hand.placements as Map<string, CardPlacement>);
        newPlacements.set(placementName, updatedPlacement);
        const updatedHand = (hand as Hand).withPlacements(newPlacements);

        const newHands = new Map(this.gameState.hands);
        newHands.set(location, updatedHand);

        this.gameState = {
          ...this.gameState,
          hands: newHands
        };
      }
    }
  }
}