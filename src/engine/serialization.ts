import { GameState } from '../models/game-state';
import { Participant } from '../models/participant';
import { Gameboard, CardPile, CardPlacement } from '../models/gameboard';
import { Hand } from '../models/hand';
import { Card } from '../models/card';
import { GameEvent } from '../core/interfaces/events';
import { CardInPile, CardInPlacement } from '../core/interfaces/gameboard';
import { GamePhase, CardOrientation } from '../core/types';
import { SerializationVersionManager, MigrationError } from './serialization-migration';
import { 
  SerializedGameHistory, 
  SerializationMetadata,
  GameHistory,
  GameStateSnapshot
} from '../core/interfaces/history';
import { HistoryManager } from './history-manager';

/**
 * Current serialization format version
 */
export const SERIALIZATION_VERSION = '2.0.0';

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
 * Modern serialized game state format with metadata
 */
export interface ModernSerializedGameState {
  /** Serialization metadata */
  metadata: SerializationMetadata;
  
  /** The actual game state data */
  gameState: SerializedGameState;
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
 * Serialization engine for game state persistence with history support
 */
export class SerializationEngine {
  private static readonly CURRENT_VERSION = SERIALIZATION_VERSION;
  private static readonly LIBRARY_VERSION = '1.0.0'; // TODO: Get from package.json

  /**
   * Serialize a game state to JSON string with metadata
   */
  public static serialize(gameState: GameState, format: 'full' | 'compressed' = 'full'): string {
    const metadata: SerializationMetadata = {
      version: this.CURRENT_VERSION,
      timestamp: Date.now(),
      libraryVersion: this.LIBRARY_VERSION,
      format
    };
    
    const serialized = this.createModernGameState(gameState, metadata);
    return JSON.stringify(serialized, null, format === 'full' ? 2 : 0);
  }

  /**
   * Serialize game history with full backwards compatibility
   */
  public static serializeHistory(
    history: GameHistory, 
    format: 'full' | 'compressed' = 'full'
  ): string {
    const metadata: SerializationMetadata = {
      version: this.CURRENT_VERSION,
      timestamp: Date.now(),
      libraryVersion: this.LIBRARY_VERSION,
      format
    };
    
    const serializedHistory = this.createSerializedHistory(history, metadata);
    
    // Validate serialization integrity
    this.validateSerializedHistory(serializedHistory);
    
    return JSON.stringify(serializedHistory, null, format === 'full' ? 2 : 0);
  }

  /**
   * Deserialize a JSON string to game state with migration support
   */
  public static deserialize(json: string): GameState {
    const parsed = JSON.parse(json);
    
    // Detect format and migrate if necessary
    const migrated = this.migrateToCurrentVersion(parsed);
    
    // Extract game state from migrated data
    if (this.isModernFormat(migrated)) {
      return this.deserializeGameState(migrated.gameState);
    } else {
      return this.deserializeGameState(migrated);
    }
  }

  /**
   * Deserialize game history with automatic migration
   */
  public static deserializeHistory(serializedData: string): GameHistory {
    const parsed = JSON.parse(serializedData);
    
    // Check if this is history format (has snapshots) or game state format
    if (this.hasHistoryData(parsed)) {
      // This is already history format - validate and import directly
      this.validateSerializedHistory(parsed);
      const historyManager = HistoryManager.importHistory(serializedData);
      return historyManager.getGameHistory();
    } else {
      // This is game state format - migrate if necessary
      const migratedData = this.migrateToCurrentVersion(parsed);
      
      // Convert single game state to history format
      // This would be for backwards compatibility with old single-state saves
      throw new SerializationError('Cannot convert single game state to history - history format required');
    }
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
   * Check compatibility of serialized data
   */
  public static checkCompatibility(json: string): CompatibilityResult {
    try {
      const parsed = JSON.parse(json);
      const detectedVersion = this.detectVersion(parsed);
      
      const compatibility = SerializationVersionManager.getCompatibilityInfo(
        detectedVersion,
        this.CURRENT_VERSION
      );
      
      return {
        compatible: compatibility.compatible,
        canMigrate: compatibility.canMigrate,
        sourceVersion: detectedVersion,
        targetVersion: this.CURRENT_VERSION,
        reason: compatibility.reason,
        isModernFormat: this.isModernFormat(parsed),
        hasHistory: this.hasHistoryData(parsed),
        estimatedMigrationComplexity: this.estimateMigrationComplexity(detectedVersion)
      };
    } catch (error) {
      return {
        compatible: false,
        canMigrate: false,
        sourceVersion: 'unknown',
        targetVersion: this.CURRENT_VERSION,
        reason: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isModernFormat: false,
        hasHistory: false,
        estimatedMigrationComplexity: 'impossible'
      };
    }
  }

  /**
   * Validate serialization format integrity
   */
  public static validateFormat(serializedData: string): FormatValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const parsed = JSON.parse(serializedData);
      
      // Check for required fields
      if (this.isModernFormat(parsed)) {
        if (!parsed.metadata) {
          errors.push('Missing metadata in modern format');
        } else {
          if (!parsed.metadata.version) errors.push('Missing version in metadata');
          if (!parsed.metadata.timestamp) warnings.push('Missing timestamp in metadata');
          if (!parsed.metadata.libraryVersion) warnings.push('Missing library version in metadata');
        }
        
        if (this.hasHistoryData(parsed)) {
          if (!parsed.gameId) errors.push('Missing gameId in history format');
          if (!parsed.snapshots) errors.push('Missing snapshots in history format');
          if (!Array.isArray(parsed.snapshots)) errors.push('Snapshots must be an array');
        }
      } else {
        // Older format validation
        if (!parsed.version) errors.push('Missing version in older format');
        if (!parsed.data) errors.push('Missing data in older format');
      }
      
      // Check for circular references
      try {
        JSON.stringify(parsed);
      } catch (circularError) {
        errors.push('Circular reference detected in serialized data');
      }
      
    } catch (parseError) {
      errors.push(`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create modern game state format
   */
  private static createModernGameState(
    gameState: GameState, 
    metadata: SerializationMetadata
  ): ModernSerializedGameState {
    const serializedGameState = this.serializeGameState(gameState);
    
    return {
      metadata,
      gameState: serializedGameState
    };
  }

  /**
   * Create serialized history with metadata
   */
  private static createSerializedHistory(
    history: GameHistory, 
    metadata: SerializationMetadata
  ): SerializedGameHistory {
    const snapshots = Array.from(history.snapshots.values());
    const snapshotIndex: Record<string, number> = {};
    
    // Sort snapshots chronologically
    const sortedSnapshots = snapshots.sort((a, b) => a.timestamp - b.timestamp);
    
    const serializedSnapshots = sortedSnapshots.map((snapshot, index) => {
      snapshotIndex[snapshot.id] = index;
      
      // Serialize the game state
      const serializedGameState = this.serializeGameState(snapshot.gameState);
      
      return {
        id: snapshot.id,
        gameState: serializedGameState,
        action: snapshot.action,
        previousSnapshotId: snapshot.previousSnapshotId,
        timestamp: snapshot.timestamp
      };
    });
    
    return {
      metadata,
      gameId: history.gameId,
      snapshots: serializedSnapshots,
      snapshotIndex
    };
  }

  /**
   * Detect version from serialized data
   */
  private static detectVersion(data: any): string {
    // Modern format
    if (data.metadata && data.metadata.version) {
      return data.metadata.version;
    }
    
    // Older format
    if (data.version) {
      return data.version;
    }
    
    // Very old format without version
    return '0.9.0'; // Assume oldest supported version
  }

  /**
   * Check if data is in modern format
   */
  private static isModernFormat(data: any): boolean {
    return data.metadata && typeof data.metadata === 'object';
  }

  /**
   * Check if data contains history information
   */
  private static hasHistoryData(data: any): boolean {
    return data.snapshots && Array.isArray(data.snapshots);
  }

  /**
   * Migrate data to current version with enhanced error handling
   */
  private static migrateToCurrentVersion(data: any): any {
    const currentVersion = this.detectVersion(data);
    
    if (currentVersion === this.CURRENT_VERSION) {
      return data;
    }
    
    // Check if migration is possible
    const compatibility = SerializationVersionManager.getCompatibilityInfo(
      currentVersion, 
      this.CURRENT_VERSION
    );
    
    if (!compatibility.canMigrate) {
      throw new SerializationError(
        `Cannot migrate from version ${currentVersion} to ${this.CURRENT_VERSION}: ${compatibility.reason}`
      );
    }
    
    // Perform migration with validation
    try {
      const migrated = SerializationVersionManager.migrate(data, this.CURRENT_VERSION);
      
      // Validate migrated data integrity
      this.validateMigratedData(migrated, currentVersion);
      
      return migrated;
    } catch (error) {
      if (error instanceof SerializationError) {
        throw error;
      }
      
      throw new SerializationError(
        `Migration failed from version ${currentVersion} to ${this.CURRENT_VERSION}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Validate serialized history integrity
   */
  private static validateSerializedHistory(data: SerializedGameHistory): void {
    if (!data.metadata) {
      throw new SerializationError('Missing metadata in serialized history');
    }
    
    if (!data.gameId) {
      throw new SerializationError('Missing gameId in serialized history');
    }
    
    if (!data.snapshots || !Array.isArray(data.snapshots)) {
      throw new SerializationError('Missing or invalid snapshots in serialized history');
    }
    
    if (data.snapshots.length === 0) {
      throw new SerializationError('History must contain at least one snapshot');
    }
    
    // Validate snapshot chain
    const snapshotIds = new Set(data.snapshots.map(s => s.id));
    let initialSnapshotCount = 0;
    
    for (const snapshot of data.snapshots) {
      if (!snapshot.id) {
        throw new SerializationError('Snapshot missing ID');
      }
      
      if (!snapshot.gameState) {
        throw new SerializationError(`Snapshot ${snapshot.id} missing game state`);
      }
      
      if (!snapshot.action) {
        throw new SerializationError(`Snapshot ${snapshot.id} missing action`);
      }
      
      if (snapshot.previousSnapshotId === null) {
        initialSnapshotCount++;
      } else if (!snapshotIds.has(snapshot.previousSnapshotId)) {
        throw new SerializationError(
          `Snapshot ${snapshot.id} references non-existent previous snapshot: ${snapshot.previousSnapshotId}`
        );
      }
    }
    
    if (initialSnapshotCount !== 1) {
      throw new SerializationError(
        `History must have exactly one initial snapshot, found ${initialSnapshotCount}`
      );
    }
  }

  /**
   * Estimate migration complexity
   */
  private static estimateMigrationComplexity(fromVersion: string): MigrationComplexity {
    const versionDiff = this.calculateVersionDistance(fromVersion, this.CURRENT_VERSION);
    
    if (versionDiff === 0) return 'none';
    if (versionDiff <= 1) return 'simple';
    if (versionDiff <= 3) return 'moderate';
    if (versionDiff <= 5) return 'complex';
    
    return 'impossible';
  }

  /**
   * Calculate distance between versions
   */
  private static calculateVersionDistance(from: string, to: string): number {
    try {
      const fromParts = from.split('.').map(Number);
      const toParts = to.split('.').map(Number);
      
      const majorDiff = Math.abs((toParts[0] || 0) - (fromParts[0] || 0));
      const minorDiff = Math.abs((toParts[1] || 0) - (fromParts[1] || 0));
      const patchDiff = Math.abs((toParts[2] || 0) - (fromParts[2] || 0));
      
      return majorDiff * 10 + minorDiff * 3 + patchDiff;
    } catch (error) {
      return 999; // Unknown version format
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
   * Validate migrated data integrity
   */
  private static validateMigratedData(migratedData: any, originalVersion: string): void {
    // Basic structure validation
    if (!migratedData) {
      throw new SerializationError('Migration resulted in null or undefined data');
    }
    
    // Check for required fields based on format
    if (this.isModernFormat(migratedData)) {
      if (!migratedData.metadata) {
        throw new SerializationError('Migrated modern format missing metadata');
      }
      
      if (!migratedData.gameState) {
        throw new SerializationError('Migrated modern format missing game state');
      }
      
      // Validate metadata
      const metadata = migratedData.metadata;
      if (!metadata.version || !metadata.timestamp || !metadata.libraryVersion) {
        throw new SerializationError('Migrated metadata is incomplete');
      }
      
      // Validate game state structure
      const gameState = migratedData.gameState;
      if (!gameState.data || !gameState.data.gameId) {
        throw new SerializationError('Migrated game state structure is invalid');
      }
      
    } else {
      // Older format validation
      if (!migratedData.version || !migratedData.data) {
        throw new SerializationError('Migrated older format is missing required fields');
      }
      
      if (!migratedData.data.gameId) {
        throw new SerializationError('Migrated game state missing game ID');
      }
    }
    
    // Version-specific validation
    if (originalVersion === '1.0.0' && migratedData.metadata?.version === '2.0.0') {
      // Validate 1.0.0 -> 2.0.0 migration
      if (!migratedData.metadata.format) {
        throw new SerializationError('Migration from 1.0.0 to 2.0.0 missing format specification');
      }
    }
  }

  /**
   * Get migration statistics for debugging
   */
  public static getMigrationStats(): MigrationStats {
    const allVersions = SerializationVersionManager.getAllVersions();
    const supportedVersions = allVersions.map(v => v.version);
    
    return {
      currentVersion: this.CURRENT_VERSION,
      supportedVersions,
      totalSupportedVersions: supportedVersions.length,
      oldestSupportedVersion: supportedVersions[0] || this.CURRENT_VERSION,
      newestSupportedVersion: supportedVersions[supportedVersions.length - 1] || this.CURRENT_VERSION
    };
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
 * Compatibility result with detailed information
 */
export interface CompatibilityResult {
  /** Whether versions are directly compatible */
  compatible: boolean;
  
  /** Whether migration is possible */
  canMigrate: boolean;
  
  /** Source version */
  sourceVersion: string;
  
  /** Target version */
  targetVersion: string;
  
  /** Reason for compatibility status */
  reason: string;
  
  /** Whether this is modern format */
  isModernFormat: boolean;
  
  /** Whether data contains history */
  hasHistory: boolean;
  
  /** Estimated complexity of migration */
  estimatedMigrationComplexity: MigrationComplexity;
}

/**
 * Format validation result
 */
export interface FormatValidationResult {
  /** Whether the format is valid */
  isValid: boolean;
  
  /** Critical errors */
  errors: string[];
  
  /** Non-critical warnings */
  warnings: string[];
}

/**
 * Migration complexity levels
 */
export type MigrationComplexity = 'none' | 'simple' | 'moderate' | 'complex' | 'impossible';

/**
 * Migration statistics for debugging and monitoring
 */
export interface MigrationStats {
  /** Current serialization version */
  currentVersion: string;
  
  /** All supported versions */
  supportedVersions: string[];
  
  /** Total number of supported versions */
  totalSupportedVersions: number;
  
  /** Oldest version that can be migrated */
  oldestSupportedVersion: string;
  
  /** Newest supported version */
  newestSupportedVersion: string;
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