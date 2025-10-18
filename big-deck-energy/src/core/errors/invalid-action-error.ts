import { ParticipantAction } from '../interfaces';

/**
 * Error thrown when a participant action is invalid
 */
export class InvalidActionError extends Error {
  constructor(
    public readonly action: ParticipantAction,
    public readonly reason: string
  ) {
    super(`Invalid action: ${reason}`);
    this.name = 'InvalidActionError';
  }
}