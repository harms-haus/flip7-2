import { Card } from './card';
import { CardInPile, CardInPlacement } from './gameboard';
import { Participant } from './participant';
import { Party } from './party';
import { GameEvent, EventFilter } from './events';
import { GameStateSnapshot, ActionDescriptor, GameHistory } from './history';
import { GameState } from './game-state';
import { CardOrientation } from '../types';

/**
 * Comprehensive API for manipulating game state
 */
export interface GameStateAPI {
  // Participant Management
  createParticipant(id: string, name: string, isNPC: boolean): void;
  updateParticipantStatus(participantId: string, key: string, value: any): void;
  addHandToParticipant(participantId: string, handId: string): void;
  removeHandFromParticipant(participantId: string, handId: string): void;
  addParticipantToParty(participantId: string, partyId: string): void;
  removeParticipantFromParty(participantId: string): void;
  getParticipant(participantId: string): Participant | null;
  
  // Party Management
  createParty(id: string, name: string): void;
  createPartyPile(partyId: string, pileName: string, isOrdered: boolean, orientation?: CardOrientation): void;
  addCardToPartyPile(partyId: string, pileName: string, card: Card, faceUp: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void;
  removeCardFromPartyPile(partyId: string, pileName: string, index?: number): CardInPile | null;
  setPartyPlacement(partyId: string, placementName: string, card: Card | null, faceUp?: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void;
  getPartyPlacement(partyId: string, placementName: string): CardInPlacement | null;
  updatePartyStatus(partyId: string, key: string, value: any): void;
  getParty(partyId: string): Party | null;
  
  // Hand Management
  createHand(handId: string, name: string, participantId: string): void;
  createHandPile(handId: string, pileName: string, isOrdered: boolean, orientation?: CardOrientation): void;
  addCardToHandPile(handId: string, pileName: string, card: Card, faceUp: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void;
  removeCardFromHandPile(handId: string, pileName: string, index?: number): CardInPile | null;
  setHandPlacement(handId: string, placementName: string, card: Card | null, faceUp?: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void;
  getHandPlacement(handId: string, placementName: string): CardInPlacement | null;
  updateHandStatus(handId: string, key: string, value: any): void;
  
  // Gameboard Management
  createGameboardPile(name: string, isOrdered: boolean, orientation?: CardOrientation): void;
  addCardToGameboardPile(pileName: string, card: Card, faceUp: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void;
  removeCardFromGameboardPile(pileName: string, index?: number): CardInPile | null;
  setGameboardPlacement(placementName: string, card: Card | null, faceUp?: boolean, owner?: string, orientation?: CardOrientation, status?: Record<string, any>): void;
  getGameboardPlacement(placementName: string): CardInPlacement | null;
  updateGameboardStatus(key: string, value: any): void;
  
  // Card State Management
  updateCardInPileStatus(location: 'gameboard' | 'party' | string, pileName: string, cardIndex: number, key: string, value: any, locationId?: string): void;
  updateCardInPlacementStatus(location: 'gameboard' | 'party' | string, placementName: string, key: string, value: any, locationId?: string): void;
  updateCardOwnership(location: 'gameboard' | 'party' | string, pileName: string, cardIndex: number, newOwner: string | null, locationId?: string): void;
  flipCard(location: 'gameboard' | 'party' | string, pileName: string, cardIndex: number, faceUp: boolean, locationId?: string): void;
  
  // Utility Functions
  shufflePile(location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): void;
  moveCard(fromLocation: 'gameboard' | 'party' | string, fromPile: string, fromIndex: number, toLocation: 'gameboard' | 'party' | string, toPile: string, fromLocationId?: string, toLocationId?: string): void;
  
  // Visibility and Access Control
  canAccessPile(participantId: string, location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): boolean;
  canAccessPlacement(participantId: string, location: 'gameboard' | 'party' | string, placementName: string, locationId?: string): boolean;
  getVisibleCards(participantId: string, location: 'gameboard' | 'party' | string, pileName: string, locationId?: string): CardInPile[];
  
  // Event Management
  addEvent(event: GameEvent): void;
  getEvents(filter?: EventFilter): GameEvent[];
  
  // History Management
  createSnapshot(action: ActionDescriptor): GameStateSnapshot;
  getCurrentSnapshot(): GameStateSnapshot;
  getSnapshotById(snapshotId: string): GameStateSnapshot | null;
  getGameHistory(): GameHistory;
  replayToSnapshot(snapshotId: string): GameState;
  exportHistory(format?: 'full' | 'compressed'): string;
  importHistory(serializedHistory: string): GameHistory;
}