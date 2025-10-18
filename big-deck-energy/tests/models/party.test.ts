import { Party } from '../../src/models/party';
import { CardPile, CardPlacement } from '../../src/models/gameboard';
import { CardOrientation } from '../../src/core/types';

describe('Party Model', () => {
  describe('constructor', () => {
    it('should create a party with default values', () => {
      const party = new Party('party1', 'Team Alpha');
      
      expect(party.id).toBe('party1');
      expect(party.name).toBe('Team Alpha');
      expect(party.participantIds).toEqual([]);
      expect(party.piles.size).toBe(0);
      expect(party.placements.size).toBe(0);
      expect(party.status).toEqual({});
    });

    it('should create a party with provided values', () => {
      const participantIds = ['player1', 'player2'];
      const piles = new Map([['deck', new CardPile('deck', [], true, CardOrientation.NORMAL)]]);
      const placements = new Map([['discard', new CardPlacement('discard', null)]]);
      const status = { score: 100 };

      const party = new Party('party1', 'Team Alpha', participantIds, piles, placements, status);
      
      expect(party.id).toBe('party1');
      expect(party.name).toBe('Team Alpha');
      expect(party.participantIds).toEqual(['player1', 'player2']);
      expect(party.piles.size).toBe(1);
      expect(party.placements.size).toBe(1);
      expect(party.status).toEqual({ score: 100 });
    });

    it('should create immutable copies of arrays and maps', () => {
      const participantIds = ['player1'];
      const piles = new Map();
      const placements = new Map();
      const status = { score: 0 };

      const party = new Party('party1', 'Team Alpha', participantIds, piles, placements, status);
      
      // Modify original arrays/maps
      participantIds.push('player2');
      piles.set('test', new CardPile('test', [], true, CardOrientation.NORMAL));
      placements.set('test', new CardPlacement('test', null));
      status.score = 100;

      // Party should not be affected
      expect(party.participantIds).toEqual(['player1']);
      expect(party.piles.size).toBe(0);
      expect(party.placements.size).toBe(0);
      expect(party.status).toEqual({ score: 0 });
    });
  });

  describe('participant management', () => {
    let party: Party;

    beforeEach(() => {
      party = new Party('party1', 'Team Alpha', ['player1', 'player2']);
    });

    it('should check if party has participants', () => {
      expect(party.hasParticipants()).toBe(true);
      
      const emptyParty = new Party('party2', 'Empty Team');
      expect(emptyParty.hasParticipants()).toBe(false);
    });

    it('should check if party contains specific participant', () => {
      expect(party.hasParticipant('player1')).toBe(true);
      expect(party.hasParticipant('player2')).toBe(true);
      expect(party.hasParticipant('player3')).toBe(false);
    });

    it('should get participant count', () => {
      expect(party.getParticipantCount()).toBe(2);
      
      const emptyParty = new Party('party2', 'Empty Team');
      expect(emptyParty.getParticipantCount()).toBe(0);
    });
  });

  describe('pile and placement management', () => {
    let party: Party;

    beforeEach(() => {
      const piles = new Map([['deck', new CardPile('deck', [], true, CardOrientation.NORMAL)]]);
      const placements = new Map([['discard', new CardPlacement('discard', null)]]);
      party = new Party('party1', 'Team Alpha', [], piles, placements);
    });

    it('should check if party has specific pile', () => {
      expect(party.hasPile('deck')).toBe(true);
      expect(party.hasPile('nonexistent')).toBe(false);
    });

    it('should check if party has specific placement', () => {
      expect(party.hasPlacement('discard')).toBe(true);
      expect(party.hasPlacement('nonexistent')).toBe(false);
    });
  });

  describe('status management', () => {
    let party: Party;

    beforeEach(() => {
      party = new Party('party1', 'Team Alpha', [], new Map(), new Map(), { score: 100, level: 1 });
    });

    it('should get status values', () => {
      expect(party.getStatus('score')).toBe(100);
      expect(party.getStatus('level')).toBe(1);
      expect(party.getStatus('nonexistent')).toBeUndefined();
    });

    it('should check if party has specific status', () => {
      expect(party.hasStatus('score')).toBe(true);
      expect(party.hasStatus('level')).toBe(true);
      expect(party.hasStatus('nonexistent')).toBe(false);
    });
  });

  describe('immutable updates', () => {
    let party: Party;

    beforeEach(() => {
      party = new Party('party1', 'Team Alpha', ['player1'], new Map(), new Map(), { score: 100 });
    });

    it('should create new party with updated participant IDs', () => {
      const newParticipantIds = ['player1', 'player2'];
      const updatedParty = party.withParticipantIds(newParticipantIds);
      
      expect(updatedParty).not.toBe(party);
      expect(updatedParty.participantIds).toEqual(['player1', 'player2']);
      expect(party.participantIds).toEqual(['player1']); // Original unchanged
    });

    it('should create new party with updated piles', () => {
      const newPiles = new Map([['deck', new CardPile('deck', [], true, CardOrientation.NORMAL)]]);
      const updatedParty = party.withPiles(newPiles);
      
      expect(updatedParty).not.toBe(party);
      expect(updatedParty.piles.size).toBe(1);
      expect(party.piles.size).toBe(0); // Original unchanged
    });

    it('should create new party with updated placements', () => {
      const newPlacements = new Map([['discard', new CardPlacement('discard', null)]]);
      const updatedParty = party.withPlacements(newPlacements);
      
      expect(updatedParty).not.toBe(party);
      expect(updatedParty.placements.size).toBe(1);
      expect(party.placements.size).toBe(0); // Original unchanged
    });

    it('should create new party with updated status', () => {
      const newStatus = { score: 200, level: 2 };
      const updatedParty = party.withStatus(newStatus);
      
      expect(updatedParty).not.toBe(party);
      expect(updatedParty.status).toEqual({ score: 200, level: 2 });
      expect(party.status).toEqual({ score: 100 }); // Original unchanged
    });
  });

  describe('toString', () => {
    it('should create string representation', () => {
      const piles = new Map([['deck', new CardPile('deck', [], true, CardOrientation.NORMAL)]]);
      const placements = new Map([['discard', new CardPlacement('discard', null)]]);
      const party = new Party('party1', 'Team Alpha', ['player1', 'player2'], piles, placements);
      
      const str = party.toString();
      expect(str).toBe('Party(party1: Team Alpha, participants: 2, piles: 1, placements: 1)');
    });
  });
});