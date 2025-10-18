// Mock BigDeckEnergy library for testing
export class GameInstance {
  constructor() {
    this.gameState = new GameState();
    this.isGameOver = jest.fn(() => false);
    this.getCurrentParticipant = jest.fn(() => 'player1');
    this.endTurn = jest.fn();
  }
}

export class GameState {
  constructor() {
    this.participants = new Map();
    this.gameboard = new Gameboard();
    this.phase = 'setup';
  }
}

export class Participant {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = new Hand();
  }
}

export class Hand {
  constructor() {
    this.piles = [];
    this.placements = [];
  }
}

export class Gameboard {
  constructor() {
    this.piles = [];
    this.placements = [];
  }
}

export class Card {
  constructor(id, properties = {}) {
    this.id = id;
    this.properties = properties;
    this.faceUp = true;
    this.orientation = 'normal';
  }
}

export class CardPile {
  constructor(cards = []) {
    this.cards = cards;
    this.count = cards.length;
  }
}

export const GamePhase = {
  SETUP: 'setup',
  PLAYING: 'playing',
  ENDED: 'ended'
};

// Mock rulesets and deck types
export const WarRuleset = class {
  static gameId = 'war';
  static displayName = 'War';
};

export const StandardPlayingDeck = class {
  static deckType = 'standard';
  static displayName = 'Standard Playing Cards';
};

export default {
  GameInstance,
  GameState,
  Participant,
  Hand,
  Gameboard,
  Card,
  CardPile,
  GamePhase,
  WarRuleset,
  StandardPlayingDeck
};