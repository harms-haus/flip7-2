import { Card } from '../core/interfaces/card';
import { CardInPile, CardInPlacement } from '../core/interfaces/gameboard';
import { CardOrientation } from '../core/types';

/**
 * Create a CardInPile instance with the specified properties
 */
export function createCardInPile(
  card: Card,
  faceUp: boolean = false,
  owner: string | null = null,
  orientation: CardOrientation = CardOrientation.NORMAL,
  status: Record<string, any> = {}
): CardInPile {
  return Object.freeze({
    card,
    faceUp,
    orientation,
    owner,
    status: Object.freeze({ ...status })
  });
}

/**
 * Create a CardInPlacement instance with the specified properties
 */
export function createCardInPlacement(
  card: Card,
  faceUp: boolean = false,
  owner: string | null = null,
  orientation: CardOrientation = CardOrientation.NORMAL,
  status: Record<string, any> = {}
): CardInPlacement {
  return Object.freeze({
    card,
    faceUp,
    orientation,
    owner,
    status: Object.freeze({ ...status })
  });
}

/**
 * Update a CardInPile with new properties
 */
export function updateCardInPile(
  cardInPile: CardInPile,
  updates: Partial<Omit<CardInPile, 'card'>>
): CardInPile {
  return createCardInPile(
    cardInPile.card,
    updates.faceUp ?? cardInPile.faceUp,
    updates.owner ?? cardInPile.owner,
    updates.orientation ?? cardInPile.orientation,
    updates.status ?? cardInPile.status
  );
}

/**
 * Update a CardInPlacement with new properties
 */
export function updateCardInPlacement(
  cardInPlacement: CardInPlacement,
  updates: Partial<Omit<CardInPlacement, 'card'>>
): CardInPlacement {
  return createCardInPlacement(
    cardInPlacement.card,
    updates.faceUp ?? cardInPlacement.faceUp,
    updates.owner ?? cardInPlacement.owner,
    updates.orientation ?? cardInPlacement.orientation,
    updates.status ?? cardInPlacement.status
  );
}