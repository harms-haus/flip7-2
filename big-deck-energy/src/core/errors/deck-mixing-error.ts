/**
 * Error thrown when attempting to mix different deck types in a single game
 */
export class DeckMixingError extends Error {
  constructor(
    public readonly attemptedDeckType: string,
    public readonly existingDeckType: string
  ) {
    super(
      `Cannot mix deck types. Game already uses '${existingDeckType}', ` +
      `cannot add '${attemptedDeckType}'`
    );
    this.name = 'DeckMixingError';
  }
}