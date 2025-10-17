/**
 * Error thrown when a ruleset is not compatible with a deck type
 */
export class CompatibilityError extends Error {
  constructor(
    public readonly ruleset: string,
    public readonly deckType: string,
    public readonly compatibleTypes: string[]
  ) {
    super(
      `Ruleset '${ruleset}' is not compatible with deck type '${deckType}'. ` +
      `Compatible types: ${compatibleTypes.join(', ')}`
    );
    this.name = 'CompatibilityError';
  }
}