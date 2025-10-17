import { GameState } from '../models/game-state';
import { Participant } from '../models/participant';
import { Gameboard, CardPile, CardPlacement } from '../models/gameboard';
import { Hand } from '../models/hand';
import { Card } from '../models/card';
import { GameEvent } from '../core/interfaces/events';
import { CardInPile, CardInPlacement } from '../core/interfaces/gameboard';
import { GamePhase, CardOrientation } from '../core/types';
import { SerializationVersionManager, MigrationError } from './serialization-migration';

/**
 * Current serialization format version
 */
export const SERIALIZATION_VERSION = '1.0.0';

/**
 * Serialized game state format
 */
export interface SerializedGameState {
  /** Serialization format version */
  version: string;
  
  /** Serialized game data */
  data: {
    gameId: string;
    phase: GamePhase;
    gameboard: SerializedGameboard;
    participants: SerializedParticipant[];
    hands: SerializedHand[];
    events: GameEvent[];
    metadata: Record<string, any>;
  };
  
  /** Timestamp when serialized */
  timestamp: number;
}

/**
 * Serialized participant format
 */
export interface SerializedParticipant {
  id: string;
  name: string;
  isNPC: boolean;
  handIds: string[];
  status: Record<string, any>;
}

/**
 * Serialized gameboard format
 */
export interface SerializedGameboard {
  piles: SerializedCardPile[];
  placements: SerializedCardPlacement[];
  status: Record<string, any>;
}

/**
 * Serialized hand format
 */
export interface SerializedHand {
  id: string;
  name: string;
  participantId: string;
  piles: SerializedCardPile[];
  placements: SerializedCardPlacement[];
  status: Record<string, any>;
}

/**
 * Serialized card pile format
 */
export interface SerializedCardPile {
  name: string;
  cards: SerializedCardInPile[];
  isOrdered: boolean;
  orientation: CardOrientation;
  status: Record<string, any>;
}

/**
 * Serialized card placement format
 */
export interface SerializedCardPlacement {
  name: string;
  card: SerializedCardInPlacement | null;
  orientation: CardOrientation;
  status: Record<string, any>;
}

/**
 * Serialized card in pile format
 */
export interface SerializedCardInPile {
  card: SerializedCard;
  faceUp: boolean;
  orientation: CardOrientation;
  owner: string | null;
  status: Record<string, any>;
}

/**
 * Serialized card in placement format
 */
export interface SerializedCardInPlacement {
  card: SerializedCard;
  faceUp: boolean;
  orientation: CardOrientation;
  owner: string | null;
  status: Record<string, any>;
}

/**
 * Serialized card format
 */
export interface SerializedCard {
  id: string;
  faceId: string;
  tailId: string;
  deckType: string;
  properties: Record<string, any>;
}

/**
 * Serialization engine for game state persistence
 */
export class SerializationEngine {
  private static readonly CURRENT_VERSION = SERIALIZATION_VERSION;

  /**
   * Serialize a game state to JSON string
   */
  public static serialize(gameState: GameState): string {
    const serialized = this.serializeGameState(gameState);
    return JSON.stringify(serialized, null, 2);
  }

  /**
   * Deserialize a JSON string to game state
   */
  public static deserialize(json: string): GameState {
    const parsed = JSON.parse(json) as SerializedGameState;
    return this.deserializeGameState(parsed);
  }

  /**
   * Deserialize with automatic migration to current version
   */
  public static deserializeWithMigration(json: string): GameState {
    const parsed = JSON.parse(json) as SerializedGameState;
    
    // Check if migration is needed
    if (parsed.version !== this.CURRENT_VERSION) {
      const migrated = SerializationVersionManager.migrate(parsed, this.CURRENT_VERSION);
      return this.deserializeGameState(migrated);
    }
    
    return this.deserializeGameState(parsed);
  }

  /**
   * Check compatibility of a serialized game state
   */
  public static checkCompatibility(json: string): SerializationCompatibilityResult {
    try {
      const parsed = JSON.parse(json) as SerializedGameState;
      const compatibility = SerializationVersionManager.getCompatibilityInfo(
        parsed.version, 
        this.CURRENT_VERSION
      );
      
      return {
        compatible: compatibility.compatible,
        canMigrate: compatibility.canMigrate,
        sourceVersion: parsed.version,
        targetVersion: this.CURRENT_VERSION,
        reason: compatibility.reason
      };
    } catch (error) {
      return {
        compatible: false,
        canMigrate: false,
        sourceVersion: 'unknown',
        targetVersion: this.CURRENT_VERSION,
        reason: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Serialize game state to serializable object
   */
  private static serializeGameState(gameState: GameState): SerializedGameState {
    return {
      version: this.CURRENT_VERSION,
      timestamp: Date.now(),
      data: {
        gameId: gameState.gameId,
        phase: gameState.phase,
        gameboard: this.serializeGameboard(gameState.gameboard),
        participants: Array.from(gameState.participants.values()).map(p => this.serializeParticipant(p)),
        hands: Array.from(gameState.hands.values()).map(h => this.serializeHand(h)),
        events: [...gameState.events],
        metadata: { ...gameState.metadata }
      }
    };
  }

  /**
   * Deserialize serialized game state
   */
  private static deserializeGameState(serialized: SerializedGameState): GameState {
    // Validate version compatibility
    this.validateVersion(serialized.version);

    const data = serialized.data;
    
    // Deserialize participants
    const participants = new Map<string, Participant>();
    for (const serializedParticipant of data.participants) {
      const participant = this.deserializeParticipant(serializedParticipant);
      participants.set(participant.id, participant);
    }

    // Deserialize hands
    const hands = new Map<string, Hand>();
    for (const serializedHand of data.hands) {
      const hand = this.deserializeHand(serializedHand);
      hands.set(hand.id, hand);
    }

    // Validate participant-hand relationships
    this.validateParticipantHandRelationships(participants, hands);

    return new GameState(
      data.gameId,
      data.phase,
      this.deserializeGameboard(data.gameboard),
      participants,
      hands,
      data.events,
      data.metadata
    );
  }

  /**
   * Serialize a participant
   */
  private static serializeParticipant(participant: Participant): SerializedParticipant {
    return {
      id: participant.id,
      name: participant.name,
      isNPC: participant.isNPC,
      handIds: [...participant.handIds],
      status: { ...participant.status }
    };
  }

  /**
   * Deserialize a participant
   */
  private static deserializeParticipant(serialized: SerializedParticipant): Participant {
    return new Participant(
      serialized.id,
      serialized.name,
      serialized.isNPC,
      serialized.handIds,
      serialized.status
    );
  }

  /**
   * Serialize a gameboard
   */
  private static serializeGameboard(gameboard: Gameboard): SerializedGameboard {
    return {
      piles: Array.from(gameboard.piles.values()).map(p => this.serializeCardPile(p)),
      placements: Array.from(gameboard.placements.values()).map(p => this.serializeCardPlacement(p)),
      status: { ...gameboard.status }
    };
  }

  /**
   * Deserialize a gameboard
   */
  private static deserializeGameboard(serialized: SerializedGameboard): Gameboard {
    const piles = new Map<string, CardPile>();
    for (const serializedPile of serialized.piles) {
      const pile = this.deserializeCardPile(serializedPile);
      piles.set(pile.name, pile);
    }

    const placements = new Map<string, CardPlacement>();
    for (const serializedPlacement of serialized.placements) {
      const placement = this.deserializeCardPlacement(serializedPlacement);
      placements.set(placement.name, placement);
    }

    return new Gameboard(piles, placements, serialized.status);
  }

  /**
   * Serialize a hand
   */
  private static serializeHand(hand: Hand): SerializedHand {
    return {
      id: hand.id,
      name: hand.name,
      participantId: hand.participantId,
      piles: Array.from(hand.piles.values()).map(p => this.serializeCardPile(p)),
      placements: Array.from(hand.placements.values()).map(p => this.serializeCardPlacement(p)),
      status: { ...hand.status }
    };
  }

  /**
   * Deserialize a hand
   */
  private static deserializeHand(serialized: SerializedHand): Hand {
    const piles = new Map<string, CardPile>();
    for (const serializedPile of serialized.piles) {
      const pile = this.deserializeCardPile(serializedPile);
      piles.set(pile.name, pile);
    }

    const placements = new Map<string, CardPlacement>();
    for (const serializedPlacement of serialized.placements) {
      const placement = this.deserializeCardPlacement(serializedPlacement);
      placements.set(placement.name, placement);
    }

    return new Hand(
      serialized.id,
      serialized.name,
      serialized.participantId,
      piles,
      placements,
      serialized.status
    );
  }  /**
  
 * Serialize a card pile
   */
  private static serializeCardPile(pile: CardPile): SerializedCardPile {
    return {
      name: pile.name,
      cards: pile.cards.map(c => this.serializeCardInPile(c)),
      isOrdered: pile.isOrdered,
      orientation: pile.orientation,
      status: { ...pile.status }
    };
  }

  /**
   * Deserialize a card pile
   */
  private static deserializeCardPile(serialized: SerializedCardPile): CardPile {
    const cards = serialized.cards.map(c => this.deserializeCardInPile(c));
    return new CardPile(
      serialized.name,
      cards,
      serialized.isOrdered,
      serialized.orientation,
      serialized.status
    );
  }

  /**
   * Serialize a card placement
   */
  private static serializeCardPlacement(placement: CardPlacement): SerializedCardPlacement {
    return {
      name: placement.name,
      card: placement.card ? this.serializeCardInPlacement(placement.card) : null,
      orientation: placement.orientation,
      status: { ...placement.status }
    };
  }

  /**
   * Deserialize a card placement
   */
  private static deserializeCardPlacement(serialized: SerializedCardPlacement): CardPlacement {
    const card = serialized.card ? this.deserializeCardInPlacement(serialized.card) : null;
    return new CardPlacement(
      serialized.name,
      card,
      serialized.orientation,
      serialized.status
    );
  }

  /**
   * Serialize a card in pile
   */
  private static serializeCardInPile(cardInPile: CardInPile): SerializedCardInPile {
    return {
      card: this.serializeCard(cardInPile.card as Card),
      faceUp: cardInPile.faceUp,
      orientation: cardInPile.orientation,
      owner: cardInPile.owner,
      status: { ...cardInPile.status }
    };
  }

  /**
   * Deserialize a card in pile
   */
  private static deserializeCardInPile(serialized: SerializedCardInPile): CardInPile {
    return {
      card: this.deserializeCard(serialized.card),
      faceUp: serialized.faceUp,
      orientation: serialized.orientation,
      owner: serialized.owner,
      status: serialized.status
    };
  }

  /**
   * Serialize a card in placement
   */
  private static serializeCardInPlacement(cardInPlacement: CardInPlacement): SerializedCardInPlacement {
    return {
      card: this.serializeCard(cardInPlacement.card as Card),
      faceUp: cardInPlacement.faceUp,
      orientation: cardInPlacement.orientation,
      owner: cardInPlacement.owner,
      status: { ...cardInPlacement.status }
    };
  }

  /**
   * Deserialize a card in placement
   */
  private static deserializeCardInPlacement(serialized: SerializedCardInPlacement): CardInPlacement {
    return {
      card: this.deserializeCard(serialized.card),
      faceUp: serialized.faceUp,
      orientation: serialized.orientation,
      owner: serialized.owner,
      status: serialized.status
    };
  }

  /**
   * Serialize a card
   */
  private static serializeCard(card: Card): SerializedCard {
    return {
      id: card.id,
      faceId: card.faceId,
      tailId: card.tailId,
      deckType: card.deckType,
      properties: { ...card.properties }
    };
  }

  /**
   * Deserialize a card
   */
  private static deserializeCard(serialized: SerializedCard): Card {
    return new Card({
      id: serialized.id,
      faceId: serialized.faceId,
      tailId: serialized.tailId,
      properties: serialized.properties
    }, serialized.deckType);
  }

  /**
   * Validate serialization version compatibility
   */
  private static validateVersion(version: string): void {
    if (!SerializationVersionManager.isVersionSupported(version)) {
      throw new SerializationError(
        `Unsupported serialization version: ${version}. Supported versions: ${
          SerializationVersionManager.getAllVersions().map(v => v.version).join(', ')
        }`
      );
    }

    if (version !== this.CURRENT_VERSION) {
      const compatibility = SerializationVersionManager.getCompatibilityInfo(version, this.CURRENT_VERSION);
      if (!compatibility.compatible && !compatibility.canMigrate) {
        throw new SerializationError(
          `Incompatible serialization version: ${version}. ${compatibility.reason}`
        );
      }
    }
  }

  /**
   * Validate participant-hand relationships after deserialization
   */
  private static validateParticipantHandRelationships(
    participants: Map<string, Participant>,
    hands: Map<string, Hand>
  ): void {
    // Check that all participant hand IDs reference existing hands
    for (const participant of participants.values()) {
      for (const handId of participant.handIds) {
        const hand = hands.get(handId);
        if (!hand) {
          throw new SerializationError(
            `Participant ${participant.id} references non-existent hand: ${handId}`
          );
        }
        
        // Check that the hand's participant ID matches
        if (hand.participantId !== participant.id) {
          throw new SerializationError(
            `Hand ${handId} has mismatched participant ID. Expected: ${participant.id}, Found: ${hand.participantId}`
          );
        }
      }
    }

    // Check that all hands reference existing participants
    for (const hand of hands.values()) {
      const participant = participants.get(hand.participantId);
      if (!participant) {
        throw new SerializationError(
          `Hand ${hand.id} references non-existent participant: ${hand.participantId}`
        );
      }
      
      // Check that the participant owns this hand
      if (!participant.handIds.includes(hand.id)) {
        throw new SerializationError(
          `Participant ${hand.participantId} does not own hand ${hand.id}`
        );
      }
    }
  }

  /**
   * Check if serialization operations are thread-safe
   * This is a no-op in JavaScript but documents the thread-safety guarantee
   */
  public static isThreadSafe(): boolean {
    // JavaScript is single-threaded, so serialization is inherently thread-safe
    // This method exists for documentation and future compatibility
    return true;
  }
}

/**
 * Result of serialization compatibility check
 */
export interface SerializationCompatibilityResult {
  /** Whether the versions are directly compatible */
  compatible: boolean;
  
  /** Whether migration is possible */
  canMigrate: boolean;
  
  /** Source version */
  sourceVersion: string;
  
  /** Target version */
  targetVersion: string;
  
  /** Reason for compatibility status */
  reason: string;
}

/**
 * Custom error for serialization issues
 */
export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}