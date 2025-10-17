import { Card } from './card';
import { CardInPile, CardInPlacement } from './gameboard';
import { Participant } from './participant';
import { GameEvent, EventFilter } from './events';
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
  getParticipant(participantId: string): Participant | null;
  
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
  updateCardInPileStatus(location: 'gameboard' | string, pileName: string, cardIndex: number, key: string, value: any): void;
  updateCardInPlacementStatus(location: 'gameboard' | string, placementName: string, key: string, value: any): void;
  updateCardOwnership(location: 'gameboard' | string, pileName: string, cardIndex: number, newOwner: string | null): void;
  flipCard(location: 'gameboard' | string, pileName: string, cardIndex: number, faceUp: boolean): void;
  
  // Utility Functions
  shufflePile(location: 'gameboard' | string, pileName: string): void;
  moveCard(fromLocation: 'gameboard' | string, fromPile: string, fromIndex: number, toLocation: 'gameboard' | string, toPile: string): void;
  
  // Visibility and Access Control
  canAccessPile(participantId: string, location: 'gameboard' | string, pileName: string): boolean;
  canAccessPlacement(participantId: string, location: 'gameboard' | string, placementName: string): boolean;
  getVisibleCards(participantId: string, location: 'gameboard' | string, pileName: string): CardInPile[];
  
  // Event Management
  addEvent(event: GameEvent): void;
  getEvents(filter?: EventFilter): GameEvent[];
}