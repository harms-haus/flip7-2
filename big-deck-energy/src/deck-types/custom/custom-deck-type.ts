import { Card, CardDefinition } from '../../core/interfaces/card';
import { BaseDeckType } from '../base/base-deck-type';

/**
 * Configuration for custom deck type creation
 */
export interface CustomDeckConfig {
  /** Unique name for the deck type */
  name: string;
  
  /** Map of face IDs to image URLs/paths */
  faces: Map<string, string>;
  
  /** Map of tail IDs to image URLs/paths */
  tails: Map<string, string>;
  
  /** Card definitions for the deck */
  cards: CardDefinition[];
  
  /** Optional property validation rules */
  propertyValidators?: Map<string, PropertyValidator>;
  
  /** Optional special abilities for cards */
  specialAbilities?: Map<string, SpecialAbility>;
}

/**
 * Property validator function type
 */
export type PropertyValidator = (value: any) => boolean;

/**
 * Special ability definition for cards
 */
export interface SpecialAbility {
  /** Unique identifier for the ability */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what the ability does */
  description: string;
  
  /** Function that executes the ability */
  execute: (card: Card, context: any) => any;
}

/**
 * Custom deck type that allows developer-defined cards with validation and special abilities
 */
export class CustomDeckType extends BaseDeckType {
  private readonly propertyValidators: Map<string, PropertyValidator>;
  private readonly specialAbilities: Map<string, SpecialAbility>;

  constructor(config: CustomDeckConfig) {
    super(config.name, config.faces, config.tails, config.cards);
    
    this.propertyValidators = new Map(config.propertyValidators || []);
    this.specialAbilities = new Map(config.specialAbilities || []);
    
    this.validateCustomConfiguration();
  }

  /**
   * Validates a card with custom property validation rules
   * @param card Card to validate
   * @returns True if card is valid
   */
  public validateCard(card: Card): boolean {
    // First run base validation
    if (!super.validateCard(card)) {
      return false;
    }

    // Then run custom property validation
    return this.validateCustomProperties(card);
  }

  /**
   * Gets special abilities available for a card
   * @param card Card to get abilities for
   * @returns Array of special abilities
   */
  public getCardAbilities(card: Card): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];
    
    // Check if card has ability properties
    for (const [key, value] of Object.entries(card.properties)) {
      if (key.startsWith('ability_') && value === true) {
        const abilityId = key.substring(8); // Remove 'ability_' prefix
        const ability = this.specialAbilities.get(abilityId);
        if (ability) {
          abilities.push(ability);
        }
      }
    }
    
    return abilities;
  }

  /**
   * Executes a special ability for a card
   * @param card Card to execute ability for
   * @param abilityId ID of ability to execute
   * @param context Execution context
   * @returns Result of ability execution
   */
  public executeAbility(card: Card, abilityId: string, context: any): any {
    const ability = this.specialAbilities.get(abilityId);
    if (!ability) {
      throw new Error(`Unknown ability: ${abilityId}`);
    }

    // Check if card has this ability
    const hasAbility = card.properties[`ability_${abilityId}`] === true;
    if (!hasAbility) {
      throw new Error(`Card ${card.id} does not have ability ${abilityId}`);
    }

    return ability.execute(card, context);
  }

  /**
   * Gets all available special abilities in this deck type
   * @returns Array of all special abilities
   */
  public getAllAbilities(): SpecialAbility[] {
    return Array.from(this.specialAbilities.values());
  }

  /**
   * Adds a property validator for runtime validation
   * @param propertyName Name of property to validate
   * @param validator Validation function
   */
  public addPropertyValidator(propertyName: string, validator: PropertyValidator): void {
    this.propertyValidators.set(propertyName, validator);
  }

  /**
   * Adds a special ability to the deck type
   * @param ability Special ability to add
   */
  public addSpecialAbility(ability: SpecialAbility): void {
    this.specialAbilities.set(ability.id, ability);
  }

  /**
   * Validates custom properties using registered validators
   * @param card Card to validate
   * @returns True if all custom properties are valid
   */
  private validateCustomProperties(card: Card): boolean {
    for (const [propertyName, value] of Object.entries(card.properties)) {
      const validator = this.propertyValidators.get(propertyName);
      if (validator && !validator(value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validates the custom deck configuration
   * @throws Error if configuration is invalid
   */
  private validateCustomConfiguration(): void {
    // Validate special abilities
    for (const ability of this.specialAbilities.values()) {
      if (!ability.id || ability.id.trim().length === 0) {
        throw new Error('Special ability must have a non-empty ID');
      }
      if (!ability.name || ability.name.trim().length === 0) {
        throw new Error('Special ability must have a non-empty name');
      }
      if (typeof ability.execute !== 'function') {
        throw new Error('Special ability must have an execute function');
      }
    }

    // Validate property validators
    for (const [propertyName, validator] of this.propertyValidators.entries()) {
      if (!propertyName || propertyName.trim().length === 0) {
        throw new Error('Property validator must have a non-empty property name');
      }
      if (typeof validator !== 'function') {
        throw new Error('Property validator must be a function');
      }
    }

    // Validate that cards with abilities reference existing abilities
    for (const cardDef of this.cards) {
      for (const [key, value] of Object.entries(cardDef.properties)) {
        if (key.startsWith('ability_') && value === true) {
          const abilityId = key.substring(8);
          if (!this.specialAbilities.has(abilityId)) {
            throw new Error(`Card ${cardDef.id} references unknown ability: ${abilityId}`);
          }
        }
      }
    }
  }
}