import { CardDefinition } from '../../core/interfaces/card';
import { BaseDeckType } from '../base/base-deck-type';

/**
 * Standard 52-card playing deck with traditional suits and ranks
 */
export class StandardPlayingDeck extends BaseDeckType {
  public static readonly SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  public static readonly RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
  public static readonly NUMERIC_VALUES = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
  } as const;

  constructor() {
    const faces = StandardPlayingDeck.createFaceMap();
    const tails = StandardPlayingDeck.createTailMap();
    const cards = StandardPlayingDeck.createCardDefinitions();

    super('standard-playing-deck', faces, tails, cards);
  }

  /**
   * Creates the face image map for standard playing cards
   * @returns Map of face IDs to image paths
   */
  private static createFaceMap(): Map<string, string> {
    const faces = new Map<string, string>();

    for (const suit of StandardPlayingDeck.SUITS) {
      for (const rank of StandardPlayingDeck.RANKS) {
        const faceId = `${rank}_${suit}`;
        faces.set(faceId, `/cards/faces/${faceId}.png`);
      }
    }

    return faces;
  }

  /**
   * Creates the tail image map for standard playing cards
   * @returns Map of tail IDs to image paths
   */
  private static createTailMap(): Map<string, string> {
    const tails = new Map<string, string>();
    tails.set('standard_back', '/cards/backs/standard_back.png');
    return tails;
  }

  /**
   * Creates card definitions for all 52 standard playing cards
   * @returns Array of card definitions
   */
  private static createCardDefinitions(): CardDefinition[] {
    const cards: CardDefinition[] = [];

    for (const suit of StandardPlayingDeck.SUITS) {
      for (const rank of StandardPlayingDeck.RANKS) {
        const cardId = `${rank}_${suit}`;
        const faceId = cardId;
        const tailId = 'standard_back';

        cards.push({
          id: cardId,
          faceId,
          tailId,
          properties: {
            suit,
            rank,
            numericValue: StandardPlayingDeck.NUMERIC_VALUES[rank],
            color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'
          }
        });
      }
    }

    return cards;
  }

  /**
   * Gets the capabilities supported by this deck type
   * @returns Array of capability names
   */
  public getCapabilities(): string[] {
    return ['SUITS', 'RANKS', 'NUMERIC_VALUES'];
  }

  /**
   * Gets all suits in this deck
   * @returns Array of suit names
   */
  public getSuits(): readonly string[] {
    return StandardPlayingDeck.SUITS;
  }

  /**
   * Gets all ranks in this deck
   * @returns Array of rank names
   */
  public getRanks(): readonly string[] {
    return StandardPlayingDeck.RANKS;
  }

  /**
   * Gets the numeric value for a rank
   * @param rank Rank to get value for
   * @returns Numeric value or undefined if rank not found
   */
  public getNumericValue(rank: string): number | undefined {
    return StandardPlayingDeck.NUMERIC_VALUES[rank as keyof typeof StandardPlayingDeck.NUMERIC_VALUES];
  }
}