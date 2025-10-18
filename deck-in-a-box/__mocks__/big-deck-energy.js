// Mock BigDeckEnergy library for testing
class GameInstance {
  constructor() {
    this.gameState = new GameState();
    this.isGameOver = jest.fn(() => false);
    this.getCurrentParticipant = jest.fn(() => 'player1');
    this.endTurn = jest.fn();
  }
}

class GameState {
  constructor() {
    this.participants = new Map();
    this.gameboard = new Gameboard();
    this.phase = 'setup';
  }
}

class Participant {
  constructor(id, name, isNPC = false, handIds = [], status = {}) {
    this.id = id;
    this.name = name;
    this.isNPC = isNPC;
    this.handIds = handIds;
    this.status = status;
    this.partyId = null;
    
    // Add required methods
    this.hasHands = jest.fn(() => handIds.length > 0);
    this.ownsHand = jest.fn(() => false);
    this.getStatus = jest.fn(() => status);
    this.setStatus = jest.fn();
    this.addHand = jest.fn();
    this.removeHand = jest.fn();
    this.getHands = jest.fn(() => []);
    this.clearHands = jest.fn();
    this.toJSON = jest.fn(() => ({ id, name, isNPC, handIds, status }));
  }
}

class Hand {
  constructor(id = 'hand1', name = 'Hand', participantId = 'player1') {
    this.id = id;
    this.name = name;
    this.participantId = participantId;
    this.piles = new Map();
    this.placements = new Map();
    this.status = {};
    
    // Add required methods
    this.getPile = jest.fn();
    this.getPlacement = jest.fn();
    this.hasPile = jest.fn(() => false);
    this.hasPlacement = jest.fn(() => false);
    this.addPile = jest.fn();
    this.removePile = jest.fn();
    this.addPlacement = jest.fn();
    this.removeePlacement = jest.fn();
    this.clearPiles = jest.fn();
    this.clearPlacements = jest.fn();
    this.toJSON = jest.fn(() => ({ id, name, participantId, piles: [], placements: [], status }));
  }
}

class Gameboard {
  constructor() {
    this.piles = new Map();
    this.placements = new Map();
    this.status = {};
  }
}

class Card {
  constructor(id, properties = {}) {
    this.id = id;
    this.properties = properties;
    this.faceUp = true;
    this.orientation = 'normal';
  }
}

class CardPile {
  constructor(id = 'pile1', name = 'Pile', cards = []) {
    this.id = id;
    this.name = name;
    this.cards = cards.map(card => ({
      card,
      faceUp: true,
      orientation: 'normal',
      owner: null,
      status: {}
    }));
    this.count = cards.length;
    this.maxSize = null;
    this.status = {};
  }
}

const GamePhase = {
  SETUP: 'setup',
  PLAYING: 'playing',
  ENDED: 'ended'
};

// Mock rulesets and deck types
const WarRuleset = class {
  static gameId = 'war';
  static displayName = 'War';
};

const StandardPlayingDeck = class {
  static deckType = 'standard';
  static displayName = 'Standard Playing Cards';
};

module.exports = {
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