import { CardInPile, CardInPlacement } from '../core/interfaces/gameboard';
import { Participant } from '../core/interfaces/participant';
import { Hand } from '../core/interfaces/hand';

/**
 * Check if a participant can see a specific card based on ownership and face-up status
 */
export function canParticipantSeeCard(
  participantId: string,
  cardInPile: CardInPile,
  isOwnerOfContainer: boolean = false
): boolean {
  // Face-up cards are visible to everyone
  if (cardInPile.faceUp) {
    return true;
  }
  
  // Face-down cards are only visible to their owner or container owner
  return cardInPile.owner === participantId || isOwnerOfContainer;
}

/**
 * Check if a participant can see a card in a placement
 */
export function canParticipantSeeCardInPlacement(
  participantId: string,
  cardInPlacement: CardInPlacement,
  isOwnerOfContainer: boolean = false
): boolean {
  // Face-up cards are visible to everyone
  if (cardInPlacement.faceUp) {
    return true;
  }
  
  // Face-down cards are only visible to their owner or container owner
  return cardInPlacement.owner === participantId || isOwnerOfContainer;
}

/**
 * Filter cards in a pile to only show those visible to a participant
 */
export function getVisibleCardsInPile(
  participantId: string,
  cards: CardInPile[],
  isOwnerOfContainer: boolean = false
): CardInPile[] {
  return cards.filter(card => 
    canParticipantSeeCard(participantId, card, isOwnerOfContainer)
  );
}

/**
 * Check if a participant owns or can access a hand
 */
export function canParticipantAccessHand(
  participantId: string,
  hand: Hand,
  participant: Participant
): boolean {
  // Participant can access their own hands
  return hand.participantId === participantId || 
         participant.handIds.includes(hand.id);
}

/**
 * Check if a participant can access a pile in a specific location
 */
export function canParticipantAccessPile(
  participantId: string,
  location: 'gameboard' | string,
  pileName: string,
  hands: Map<string, Hand>
): boolean {
  // Gameboard piles are accessible to all participants
  if (location === 'gameboard') {
    return true;
  }
  
  // Hand piles are only accessible to the hand owner
  const hand = hands.get(location);
  if (!hand) {
    return false;
  }
  
  return hand.participantId === participantId;
}

/**
 * Check if a participant can access a placement in a specific location
 */
export function canParticipantAccessPlacement(
  participantId: string,
  location: 'gameboard' | string,
  placementName: string,
  hands: Map<string, Hand>
): boolean {
  // Gameboard placements are accessible to all participants
  if (location === 'gameboard') {
    return true;
  }
  
  // Hand placements are only accessible to the hand owner
  const hand = hands.get(location);
  if (!hand) {
    return false;
  }
  
  return hand.participantId === participantId;
}