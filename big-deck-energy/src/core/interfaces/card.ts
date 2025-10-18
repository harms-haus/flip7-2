/**
 * Represents an immutable card with visual properties and metadata
 */
export interface Card {
  /** Unique identifier for this card instance */
  readonly id: string;
  
  /** Face image identifier for visual representation */
  readonly faceId: string;
  
  /** Back/tail image identifier for visual representation */
  readonly tailId: string;
  
  /** The deck type this card belongs to */
  readonly deckType: string;
  
  /** Custom properties defined by the deck type */
  readonly properties: Record<string, any>;
}

/**
 * Card definition used by deck types to specify card properties
 */
export interface CardDefinition {
  /** Unique identifier for this card definition */
  readonly id: string;
  
  /** Face image identifier */
  readonly faceId: string;
  
  /** Back/tail image identifier */
  readonly tailId: string;
  
  /** Custom properties for this card */
  readonly properties: Record<string, any>;
}