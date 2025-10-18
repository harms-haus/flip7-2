import { Participant } from '../../src/models/participant';

describe('Participant Model', () => {
  describe('Participant Creation', () => {
    it('should create a participant with basic properties', () => {
      const participant = new Participant('player1', 'Alice');
      
      expect(participant.id).toBe('player1');
      expect(participant.name).toBe('Alice');
      expect(participant.isNPC).toBe(false);
      expect(participant.handIds).toEqual([]);
      expect(participant.status).toEqual({});
    });

    it('should create an NPC participant', () => {
      const npc = new Participant('npc1', 'Bot Alice', true);
      
      expect(npc.id).toBe('npc1');
      expect(npc.name).toBe('Bot Alice');
      expect(npc.isNPC).toBe(true);
    });

    it('should create a participant with hand IDs', () => {
      const participant = new Participant('player1', 'Alice', false, ['hand1', 'hand2']);
      
      expect(participant.handIds).toEqual(['hand1', 'hand2']);
    });

    it('should create a participant with status', () => {
      const status = { score: 100, level: 5 };
      const participant = new Participant('player1', 'Alice', false, [], null, status);
      
      expect(participant.status).toEqual(status);
    });
  });

  describe('Participant Immutability', () => {
    it('should create an immutable participant instance', () => {
      const participant = new Participant('player1', 'Alice');
      
      expect(() => {
        (participant as any).id = 'modified-id';
      }).toThrow();
      
      expect(() => {
        (participant as any).name = 'Modified Name';
      }).toThrow();
    });

    it('should freeze hand IDs array', () => {
      const participant = new Participant('player1', 'Alice', false, ['hand1']);
      
      expect(Object.isFrozen(participant.handIds)).toBe(true);
      expect(() => {
        (participant.handIds as any).push('hand2');
      }).toThrow();
    });

    it('should freeze status object', () => {
      const participant = new Participant('player1', 'Alice', false, [], null, { score: 100 });
      
      expect(Object.isFrozen(participant.status)).toBe(true);
      expect(() => {
        (participant.status as any).score = 200;
      }).toThrow();
    });

    it('should create copies of input arrays and objects', () => {
      const handIds = ['hand1', 'hand2'];
      const status = { score: 100 };
      
      const participant = new Participant('player1', 'Alice', false, handIds, null, status);
      
      // Modify original arrays/objects
      handIds.push('hand3');
      status.score = 200;
      
      // Participant should retain original values
      expect(participant.handIds).toEqual(['hand1', 'hand2']);
      expect(participant.status.score).toBe(100);
    });
  });

  describe('Hand Management', () => {
    let participant: Participant;

    beforeEach(() => {
      participant = new Participant('player1', 'Alice', false, ['hand1', 'hand2']);
    });

    it('should check if participant has hands', () => {
      expect(participant.hasHands()).toBe(true);
      
      const noHandsParticipant = new Participant('player2', 'Bob');
      expect(noHandsParticipant.hasHands()).toBe(false);
    });

    it('should check hand ownership', () => {
      expect(participant.ownsHand('hand1')).toBe(true);
      expect(participant.ownsHand('hand2')).toBe(true);
      expect(participant.ownsHand('hand3')).toBe(false);
    });

    it('should create new participant with updated hand IDs', () => {
      const updatedParticipant = participant.withHandIds(['hand3', 'hand4']);
      
      expect(updatedParticipant.handIds).toEqual(['hand3', 'hand4']);
      expect(updatedParticipant.id).toBe(participant.id);
      expect(updatedParticipant.name).toBe(participant.name);
      
      // Original should be unchanged
      expect(participant.handIds).toEqual(['hand1', 'hand2']);
    });
  });

  describe('Status Management', () => {
    let participant: Participant;

    beforeEach(() => {
      participant = new Participant('player1', 'Alice', false, [], null, { score: 100, level: 5 });
    });

    it('should get status values', () => {
      expect(participant.getStatus('score')).toBe(100);
      expect(participant.getStatus('level')).toBe(5);
      expect(participant.getStatus('nonexistent')).toBeUndefined();
    });

    it('should check status existence', () => {
      expect(participant.hasStatus('score')).toBe(true);
      expect(participant.hasStatus('level')).toBe(true);
      expect(participant.hasStatus('nonexistent')).toBe(false);
    });

    it('should create new participant with updated status', () => {
      const newStatus = { score: 200, level: 6, newField: 'value' };
      const updatedParticipant = participant.withStatus(newStatus);
      
      expect(updatedParticipant.status).toEqual(newStatus);
      expect(updatedParticipant.id).toBe(participant.id);
      expect(updatedParticipant.name).toBe(participant.name);
      
      // Original should be unchanged
      expect(participant.status).toEqual({ score: 100, level: 5 });
    });

    it('should support typed status access', () => {
      const score: number | undefined = participant.getStatus<number>('score');
      const level: number | undefined = participant.getStatus<number>('level');
      
      expect(score).toBe(100);
      expect(level).toBe(5);
    });
  });

  describe('String Representation', () => {
    it('should provide string representation for player', () => {
      const participant = new Participant('player1', 'Alice', false, ['hand1', 'hand2']);
      const str = participant.toString();
      
      expect(str).toBe('Player(player1: Alice, hands: 2)');
    });

    it('should provide string representation for NPC', () => {
      const npc = new Participant('npc1', 'Bot Alice', true, ['hand1']);
      const str = npc.toString();
      
      expect(str).toBe('NPC(npc1: Bot Alice, hands: 1)');
    });
  });
});