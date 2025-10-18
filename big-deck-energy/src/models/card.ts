import { Card as ICard, CardDefinition } from '../core/interfaces/card';
import { CardOrientation } from '../core/types';

/**
 * Immutable card implementation with visual properties
 */
export class Card implements ICard {
  public readonly id: string;
  public readonly faceId: string;
  public readonly tailId: string;
  public readonly deckType: string;
  public readonly properties: Record<string, any>;

  constructor(definition: CardDefinition, deckType: string) {
    this.id = definition.id;
    this.faceId = definition.faceId;
    this.tailId = definition.tailId;
    this.deckType = deckType;
    // Deep freeze properties to ensure immutability
    this.properties = Object.freeze({ ...definition.properties });
    
    // Freeze the entire card instance
    Object.freeze(this);
  }

  /**
   * Get a property value from this card
   */
  public getProperty<T = any>(key: string): T | undefined {
    return this.properties[key] as T;
  }

  /**
   * Check if this card has a specific property
   */
  public hasProperty(key: string): boolean {
    return key in this.properties;
  }

  /**
   * Get all property keys for this card
   */
  public getPropertyKeys(): string[] {
    return Object.keys(this.properties);
  }

  /**
   * Create a string representation of this card
   */
  public toString(): string {
    return `Card(${this.id}, deck: ${this.deckType})`;
  }
}

// Card state interfaces are defined in gameboard.ts to avoid circular dependencies