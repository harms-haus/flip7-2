import { CardInPile } from '../core/interfaces/gameboard';

/**
 * Fisher-Yates shuffle algorithm for shuffling arrays in-place
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]; // Create a copy to avoid mutating the original
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  
  return shuffled;
}

/**
 * Shuffle a pile of cards using Fisher-Yates algorithm
 */
export function shuffleCards(cards: CardInPile[]): CardInPile[] {
  return fisherYatesShuffle(cards);
}

/**
 * Generate a cryptographically secure random number for shuffling
 * Falls back to Math.random() if crypto is not available
 */
export function secureRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] || 0) / (0xffffffff + 1);
  }
  return Math.random();
}

/**
 * Secure Fisher-Yates shuffle using cryptographically secure random numbers
 */
export function secureShuffleCards(cards: CardInPile[]): CardInPile[] {
  const shuffled = [...cards];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  
  return shuffled;
}