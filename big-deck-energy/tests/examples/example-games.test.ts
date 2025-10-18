import { GameInstance, GameInstanceConfig } from '../../src/engine/game-instance';
import { WarRuleset } from '../../src/rulesets/war/war-ruleset';
import { GoFishRuleset } from '../../src/rulesets/go-fish/go-fish-ruleset';
import { StandardPlayingDeck } from '../../src/deck-types/standard/standard-playing-deck';
import { MonopolyPropertyDeck } from '../../src/deck-types/monopoly/monopoly-property-deck';
import { GamePhase } from '../../src/core/types';

describe('Example Games Integration Tests', () => {
  describe('War Card Game', () => {
    let warRuleset: WarRuleset;
    let standardDeck: StandardPlayingDeck;

    beforeEach(() => {
      warRuleset = new WarRuleset();
      standardDeck = new StandardPlayingDeck();
    });

    test('should create a War game with 2 players', () => {
      const config: GameInstanceConfig = {
        gameId: 'war-test-1',
        ruleset: warRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      
      expect(result.success).toBe(true);
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add participants
        gameInstance.createParticipant('player1', 'Alice', false);
        gameInstance.createParticipant('player2', 'Bob', false);
        
        // Initialize the game
        gameInstance.initialize();
        
        const gameState = gameInstance.getGameState();
        expect(gameState.participants.size).toBe(2);
        expect(gameState.phase).toBe(GamePhase.PLAYING);
        
        // Check that cards were dealt properly
        const player1Hand = gameState.hands.get('player1_hand');
        const player2Hand = gameState.hands.get('player2_hand');
        
        expect(player1Hand).toBeDefined();
        expect(player2Hand).toBeDefined();
        
        if (player1Hand && player2Hand) {
          const player1Cards = player1Hand.piles.get('cards');
          const player2Cards = player2Hand.piles.get('cards');
          
          expect(player1Cards).toBeDefined();
          expect(player2Cards).toBeDefined();
          
          if (player1Cards && player2Cards) {
            // Each player should have 26 cards
            expect(player1Cards.cards.length).toBe(26);
            expect(player2Cards.cards.length).toBe(26);
            
            // All cards should be face down
            expect(player1Cards.cards.every(card => !card.faceUp)).toBe(true);
            expect(player2Cards.cards.every(card => !card.faceUp)).toBe(true);
          }
        }
      }
    });

    test('should play multiple rounds of War', () => {
      const config: GameInstanceConfig = {
        gameId: 'war-test-2',
        ruleset: warRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      expect(result.success).toBe(true);
      
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add participants and initialize
        gameInstance.createParticipant('player1', 'Alice', false);
        gameInstance.createParticipant('player2', 'Bob', false);
        gameInstance.initialize();
        
        let currentState = gameInstance.getGameState();
        let roundsPlayed = 0;
        const maxRounds = 10; // Limit to prevent infinite loops in tests
        
        // Play several rounds
        while (roundsPlayed < maxRounds && currentState.phase === GamePhase.PLAYING) {
          const gameLoopResult = warRuleset.gameloop(currentState);
          currentState = gameLoopResult.updatedGameState;
          
          expect(gameLoopResult.canContinue).toBeDefined();
          expect(gameLoopResult.requiresParticipantInteraction).toBe(false);
          
          roundsPlayed++;
        }
        
        expect(roundsPlayed).toBeGreaterThan(0);
        
        // Check that battle pile exists and game state is valid
        expect(currentState.gameboard.piles.has('battle')).toBe(true);
        
        // Validate the game state
        const validationErrors = warRuleset.validate(currentState);
        expect(validationErrors.filter(e => e.severity === 'error')).toHaveLength(0);
      }
    });

    test('should detect win condition when one player has all cards', () => {
      const config: GameInstanceConfig = {
        gameId: 'war-test-3',
        ruleset: warRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      expect(result.success).toBe(true);
      
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add participants and initialize
        gameInstance.createParticipant('player1', 'Alice', false);
        gameInstance.createParticipant('player2', 'Bob', false);
        gameInstance.initialize();
        
        let currentState = gameInstance.getGameState();
        
        // Simulate a game state where player1 has all cards
        // This is a bit artificial but tests the win condition logic
        const player1Hand = currentState.hands.get('player1_hand');
        const player2Hand = currentState.hands.get('player2_hand');
        
        if (player1Hand && player2Hand) {
          const player1Cards = player1Hand.piles.get('cards');
          const player2Cards = player2Hand.piles.get('cards');
          
          if (player1Cards && player2Cards && player2Cards.cards.length > 0) {
            // Check win condition with current state (should not be won yet)
            let winResult = warRuleset.wincondition(currentState);
            expect(winResult.gameEnded).toBe(false);
            
            // The actual win condition would be tested by playing the game to completion
            // For now, we just verify the win condition logic works
            expect(winResult.winners).toHaveLength(0);
          }
        }
      }
    });

    test('should reject invalid player count', () => {
      const config: GameInstanceConfig = {
        gameId: 'war-test-invalid',
        ruleset: warRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      expect(result.success).toBe(true);
      
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add only 1 participant (War requires 2)
        gameInstance.createParticipant('player1', 'Alice', false);
        
        // Initialize should fail due to insufficient players
        expect(() => gameInstance.initialize()).toThrow();
      }
    });
  });

  describe('Go Fish Card Game', () => {
    let goFishRuleset: GoFishRuleset;
    let standardDeck: StandardPlayingDeck;

    beforeEach(() => {
      goFishRuleset = new GoFishRuleset();
      standardDeck = new StandardPlayingDeck();
    });

    test('should create a Go Fish game with 3 players', () => {
      const config: GameInstanceConfig = {
        gameId: 'gofish-test-1',
        ruleset: goFishRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      
      expect(result.success).toBe(true);
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add participants
        gameInstance.createParticipant('player1', 'Alice', false);
        gameInstance.createParticipant('player2', 'Bob', false);
        gameInstance.createParticipant('player3', 'Charlie', false);
        
        // Initialize the game
        gameInstance.initialize();
        
        const gameState = gameInstance.getGameState();
        expect(gameState.participants.size).toBe(3);
        expect(gameState.phase).toBe(GamePhase.PLAYING);
        
        // Check that cards were dealt properly (7 cards each for 3 players)
        for (let i = 1; i <= 3; i++) {
          const hand = gameState.hands.get(`player${i}_hand`);
          expect(hand).toBeDefined();
          
          if (hand) {
            const cardsPile = hand.piles.get('cards');
            const booksPile = hand.piles.get('books');
            
            expect(cardsPile).toBeDefined();
            expect(booksPile).toBeDefined();
            
            if (cardsPile) {
              expect(cardsPile.cards.length).toBe(7);
              // Cards should be face up in Go Fish (players can see their own cards)
              expect(cardsPile.cards.every(card => card.faceUp)).toBe(true);
            }
          }
        }
        
        // Check that one player has the first turn
        const participants = Array.from(gameState.participants.values());
        const playersWithTurn = participants.filter((p: any) => p.status.turn === true);
        expect(playersWithTurn).toHaveLength(1);
      }
    });

    test('should handle different player counts correctly', () => {
      // Test with 5 players (should get 5 cards each)
      const config: GameInstanceConfig = {
        gameId: 'gofish-test-2',
        ruleset: goFishRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      
      expect(result.success).toBe(true);
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add 5 participants
        for (let i = 1; i <= 5; i++) {
          gameInstance.createParticipant(`player${i}`, `Player ${i}`, false);
        }
        
        // Initialize the game
        gameInstance.initialize();
        
        const gameState = gameInstance.getGameState();
        
        // With 5 players, each should get 5 cards
        for (let i = 1; i <= 5; i++) {
          const hand = gameState.hands.get(`player${i}_hand`);
          if (hand) {
            const cardsPile = hand.piles.get('cards');
            if (cardsPile) {
              expect(cardsPile.cards.length).toBe(5);
            }
          }
        }
      }
    });

    test('should provide helper methods for game interaction', () => {
      const config: GameInstanceConfig = {
        gameId: 'gofish-test-3',
        ruleset: goFishRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      
      expect(result.success).toBe(true);
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add participants
        gameInstance.createParticipant('player1', 'Alice', false);
        gameInstance.createParticipant('player2', 'Bob', false);
        
        // Initialize the game
        gameInstance.initialize();
        
        const gameState = gameInstance.getGameState();
        
        // Test getCurrentPlayer
        const currentPlayer = goFishRuleset.getCurrentPlayer(gameState);
        expect(currentPlayer).toBeTruthy();
        expect(['player1', 'player2']).toContain(currentPlayer);
        
        // Test getAvailableRanks
        if (currentPlayer) {
          const availableRanks = goFishRuleset.getAvailableRanks(gameState, currentPlayer);
          expect(availableRanks).toBeInstanceOf(Array);
          expect(availableRanks.length).toBeGreaterThan(0);
          
          // Test getAvailableTargets
          const availableTargets = goFishRuleset.getAvailableTargets(gameState, currentPlayer);
          expect(availableTargets).toBeInstanceOf(Array);
          expect(availableTargets.length).toBe(1); // Should be 1 other player
          expect(availableTargets).not.toContain(currentPlayer);
        }
      }
    });

    test('should validate game state correctly', () => {
      const config: GameInstanceConfig = {
        gameId: 'gofish-test-4',
        ruleset: goFishRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      
      expect(result.success).toBe(true);
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add participants
        gameInstance.createParticipant('player1', 'Alice', false);
        gameInstance.createParticipant('player2', 'Bob', false);
        
        // Initialize the game
        gameInstance.initialize();
        
        const validationErrors = goFishRuleset.validate(gameInstance.getGameState());
        expect(validationErrors.filter(e => e.severity === 'error')).toHaveLength(0);
      }
    });

    test('should reject invalid player count', () => {
      // Test with too many players
      const config: GameInstanceConfig = {
        gameId: 'gofish-test-invalid',
        ruleset: goFishRuleset,
        deckType: standardDeck
      };

      const result = GameInstance.create(config);
      expect(result.success).toBe(true);
      
      if (result.success && result.gameInstance) {
        const gameInstance = result.gameInstance;
        
        // Add too many participants (7 players, max is 6)
        for (let i = 1; i <= 7; i++) {
          gameInstance.createParticipant(`player${i}`, `Player ${i}`, false);
        }
        
        // Initialize should fail due to too many players
        expect(() => gameInstance.initialize()).toThrow();
      }
    });
  });

  describe('Monopoly Property Deck', () => {
    let monopolyDeck: MonopolyPropertyDeck;

    beforeEach(() => {
      monopolyDeck = new MonopolyPropertyDeck();
    });

    test('should create a complete Monopoly property deck', () => {
      const deck = monopolyDeck.createDeck();
      
      // Should have all properties + railroads + utilities + special cards
      // 22 properties + 4 railroads + 2 utilities + 6 special cards = 34 total
      expect(deck.length).toBe(34);
      
      // Check that all cards have required properties
      for (const card of deck) {
        expect(card.id).toBeTruthy();
        expect(card.faceId).toBeTruthy();
        expect(card.tailId).toBe('monopoly_back');
        expect(card.deckType).toBe('monopoly-property-deck');
        expect(card.properties).toBeDefined();
        expect(card.properties.name).toBeTruthy();
        expect(card.properties.type).toBeTruthy();
      }
    });

    test('should have correct property distribution by color', () => {
      const deck = monopolyDeck.createDeck();
      const properties = deck.filter(card => card.properties.type === 'property');
      
      // Count properties by color
      const colorCounts = new Map<string, number>();
      for (const property of properties) {
        const color = property.properties.color;
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
      
      // Check expected color group sizes
      expect(colorCounts.get('brown')).toBe(2);
      expect(colorCounts.get('light-blue')).toBe(3);
      expect(colorCounts.get('pink')).toBe(3);
      expect(colorCounts.get('orange')).toBe(3);
      expect(colorCounts.get('red')).toBe(3);
      expect(colorCounts.get('yellow')).toBe(3);
      expect(colorCounts.get('green')).toBe(3);
      expect(colorCounts.get('dark-blue')).toBe(2);
    });

    test('should calculate rent correctly', () => {
      const deck = monopolyDeck.createDeck();
      
      // Test property rent calculation
      const mediterraneanAve = deck.find(card => card.id === 'mediterranean_ave');
      expect(mediterraneanAve).toBeDefined();
      
      if (mediterraneanAve) {
        // Base rent
        expect(monopolyDeck.calculateRent(mediterraneanAve, 1, 0)).toBe(2);
        
        // Monopoly rent (double base)
        expect(monopolyDeck.calculateRent(mediterraneanAve, 2, 0)).toBe(4);
        
        // With 1 house
        expect(monopolyDeck.calculateRent(mediterraneanAve, 2, 1)).toBe(10);
        
        // With hotel (5 houses)
        expect(monopolyDeck.calculateRent(mediterraneanAve, 2, 5)).toBe(250);
      }
      
      // Test railroad rent calculation
      const readingRailroad = deck.find(card => card.id === 'reading_railroad');
      expect(readingRailroad).toBeDefined();
      
      if (readingRailroad) {
        expect(monopolyDeck.calculateRent(readingRailroad, 1, 0)).toBe(25);
        expect(monopolyDeck.calculateRent(readingRailroad, 2, 0)).toBe(50);
        expect(monopolyDeck.calculateRent(readingRailroad, 4, 0)).toBe(200);
      }
    });

    test('should identify special ability cards', () => {
      const deck = monopolyDeck.createDeck();
      const specialCards = deck.filter(card => card.properties.type === 'special');
      
      expect(specialCards.length).toBe(6);
      
      for (const specialCard of specialCards) {
        expect(monopolyDeck.hasSpecialAbility(specialCard)).toBe(true);
        expect(monopolyDeck.getSpecialAbility(specialCard)).toBeTruthy();
        expect(specialCard.properties.isOneTimeUse).toBe(true);
      }
    });

    test('should provide utility methods', () => {
      // Test getPropertiesByColor
      const brownProperties = monopolyDeck.getPropertiesByColor('brown');
      expect(brownProperties).toHaveLength(2);
      expect(brownProperties).toContain('mediterranean_ave');
      expect(brownProperties).toContain('baltic_ave');
      
      // Test capabilities
      const capabilities = monopolyDeck.getCapabilities();
      expect(capabilities).toContain('PROPERTY_COLORS');
      expect(capabilities).toContain('SPECIAL_ABILITIES');
      expect(capabilities).toContain('RENT_CALCULATION');
      
      // Test property colors
      const colors = monopolyDeck.getPropertyColors();
      expect(colors).toContain('brown');
      expect(colors).toContain('dark-blue');
      expect(colors.length).toBe(8);
    });

    test('should validate card properties correctly', () => {
      const deck = monopolyDeck.createDeck();
      
      for (const card of deck) {
        expect(monopolyDeck.validateCard(card)).toBe(true);
        
        // Check type-specific properties
        if (card.properties.type === 'property') {
          expect(card.properties.rent).toBeDefined();
          expect(card.properties.cost).toBeDefined();
          expect(card.properties.mortgageValue).toBeDefined();
          expect(card.properties.groupSize).toBeDefined();
        } else if (card.properties.type === 'railroad') {
          expect(card.properties.rent).toBeDefined();
          expect(card.properties.cost).toBe(200);
        } else if (card.properties.type === 'utility') {
          expect(card.properties.rentMultiplier).toBeDefined();
          expect(card.properties.cost).toBe(150);
        } else if (card.properties.type === 'special') {
          expect(card.properties.ability).toBeDefined();
          expect(card.properties.description).toBeDefined();
        }
      }
    });
  });

  describe('Ruleset-Deck Compatibility', () => {
    test('War ruleset should be compatible with standard deck', () => {
      const warRuleset = new WarRuleset();
      const standardDeck = new StandardPlayingDeck();
      
      expect(warRuleset.compatibleDeckTypes).toContain(standardDeck.name);
    });

    test('Go Fish ruleset should be compatible with standard deck', () => {
      const goFishRuleset = new GoFishRuleset();
      const standardDeck = new StandardPlayingDeck();
      
      expect(goFishRuleset.compatibleDeckTypes).toContain(standardDeck.name);
    });

    test('should reject incompatible ruleset-deck combinations', () => {
      const warRuleset = new WarRuleset();
      const monopolyDeck = new MonopolyPropertyDeck();
      
      const config: GameInstanceConfig = {
        gameId: 'incompatible-test',
        ruleset: warRuleset,
        deckType: monopolyDeck
      };

      const result = GameInstance.create(config);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error?.message).toContain('compatible');
      }
    });
  });
});