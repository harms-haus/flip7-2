/**
 * Error thrown when a participant cannot access a resource due to visibility rules
 */
export class AccessDeniedError extends Error {
  constructor(
    public readonly participantId: string,
    public readonly resource: string
  ) {
    super(
      `Participant '${participantId}' cannot access '${resource}' - ` +
      'insufficient permissions or face-down cards'
    );
    this.name = 'AccessDeniedError';
  }
}