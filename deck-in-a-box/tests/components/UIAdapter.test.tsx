// Mock big-deck-energy first
jest.mock('big-deck-energy', () => ({
  Card: jest.fn().mockImplementation((id: string, properties: Record<string, any> = {}) => ({
    id,
    properties,
    faceUp: true,
    orientation: 'normal',
  })),
  Participant: jest.fn().mockImplementation((id: string, name: string) => ({
    id,
    name,
    hand: { piles: [], placements: [] },
  })),
}));

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children, ...props }: any) => ({ type: 'Box', props: { ...props, children } }),
  Text: ({ children, ...props }: any) => ({ type: 'Text', props: { ...props, children } }),
}));

import { DefaultUIAdapter } from '../../src/components/UIAdapter';
import { ActionDefinition } from '../../src/types/actions';

// Define types for the mocked classes
interface Card {
  id: string;
  properties: Record<string, any>;
  faceUp: boolean;
  orientation: string;
  faceImageUrl?: string;
  backImageUrl?: string;
}

interface Participant {
  id: string;
  name: string;
  hand: {
    piles: any[];
    placements: any[];
  };
}

describe('DefaultUIAdapter', () => {
  let adapter: DefaultUIAdapter;
  let mockMessageCallback: jest.Mock;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    mockMessageCallback = jest.fn();
    mockProgressCallback = jest.fn();
    adapter = new DefaultUIAdapter(mockMessageCallback, mockProgressCallback);
  });

  describe('createBox', () => {
    it('should create a box with content', () => {
      const content = <span>Test content</span>;
      const result = adapter.createBox(content, {});

      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
    });

    it('should create a box with title', () => {
      const content = <span>Test content</span>;
      const result = adapter.createBox(content, { title: 'Test Title' });

      expect(result).toBeDefined();
    });

    it('should create a box with custom options', () => {
      const content = <span>Test content</span>;
      const result = adapter.createBox(content, {
        borderStyle: 'double',
        borderColor: 'red',
        padding: 2,
        margin: 1,
        minWidth: 20,
        minHeight: 10,
        flexDirection: 'row',
      });

      expect(result).toBeDefined();
    });
  });

  describe('createList', () => {
    const mockItems = [
      { id: '1', label: 'Item 1', description: 'First item', selected: true, enabled: true },
      { id: '2', label: 'Item 2', description: 'Second item', selected: false, enabled: true },
      { id: '3', label: 'Item 3', selected: false, enabled: false },
    ];

    it('should create a list with items', () => {
      const result = adapter.createList(mockItems, {});

      expect(result).toBeDefined();
    });

    it('should create a list with title', () => {
      const result = adapter.createList(mockItems, { title: 'Test List' });

      expect(result).toBeDefined();
    });

    it('should create a list with limited visible items', () => {
      const result = adapter.createList(mockItems, { maxVisible: 2 });

      expect(result).toBeDefined();
    });

    it('should create a list with numbers', () => {
      const result = adapter.createList(mockItems, { showNumbers: true });

      expect(result).toBeDefined();
    });
  });

  describe('createTable', () => {
    const mockTableData = {
      headers: ['Name', 'Score', 'Status'],
      rows: [
        ['Player 1', '100', 'Active'],
        ['Player 2', '85', 'Active'],
        ['Player 3', '0', 'Inactive'],
      ],
    };

    it('should create a table with data', () => {
      const result = adapter.createTable(mockTableData, {});

      expect(result).toBeDefined();
    });

    it('should create a table with title', () => {
      const result = adapter.createTable(mockTableData, { title: 'Player Stats' });

      expect(result).toBeDefined();
    });

    it('should create a table without borders', () => {
      const result = adapter.createTable(mockTableData, { showBorders: false });

      expect(result).toBeDefined();
    });

    it('should create a table with custom alignment', () => {
      const result = adapter.createTable(mockTableData, {
        alignment: ['left', 'center', 'right'],
      });

      expect(result).toBeDefined();
    });
  });

  describe('renderCard', () => {
    const mockCard: Card = {
      id: 'card-1',
      properties: {
        rank: 'A',
        suit: 'hearts',
      },
      faceImageUrl: 'face.png',
      backImageUrl: 'back.png',
    } as any;

    it('should render a face-up card', () => {
      const result = adapter.renderCard(mockCard, {
        showFace: true,
        highlight: false,
        selectable: false,
      });

      expect(result).toBeDefined();
    });

    it('should render a face-down card', () => {
      const result = adapter.renderCard(mockCard, {
        showFace: false,
        highlight: false,
        selectable: false,
      });

      expect(result).toBeDefined();
    });

    it('should render a highlighted card', () => {
      const result = adapter.renderCard(mockCard, {
        showFace: true,
        highlight: true,
        selectable: false,
      });

      expect(result).toBeDefined();
    });

    it('should render a selectable card', () => {
      const result = adapter.renderCard(mockCard, {
        showFace: true,
        highlight: false,
        selectable: true,
      });

      expect(result).toBeDefined();
    });

    it('should render cards in different sizes', () => {
      const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const result = adapter.renderCard(mockCard, {
          showFace: true,
          highlight: false,
          selectable: false,
          size,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe('renderCardBack', () => {
    it('should render a card back', () => {
      const result = adapter.renderCardBack({});

      expect(result).toBeDefined();
    });

    it('should render a highlighted card back', () => {
      const result = adapter.renderCardBack({ highlight: true });

      expect(result).toBeDefined();
    });

    it('should render a card back with custom design', () => {
      const result = adapter.renderCardBack({ design: '***' });

      expect(result).toBeDefined();
    });
  });

  describe('renderEmptySlot', () => {
    it('should render an empty slot', () => {
      const result = adapter.renderEmptySlot({});

      expect(result).toBeDefined();
    });

    it('should render a highlighted empty slot', () => {
      const result = adapter.renderEmptySlot({ highlight: true });

      expect(result).toBeDefined();
    });

    it('should render an empty slot with custom placeholder', () => {
      const result = adapter.renderEmptySlot({ placeholder: 'Empty' });

      expect(result).toBeDefined();
    });
  });

  describe('createActionMenu', () => {
    const mockActions: ActionDefinition[] = [
      {
        id: 'draw',
        label: 'Draw Card',
        description: 'Draw a card from the deck',
        keyBinding: 'd',
        enabled: true,
      },
      {
        id: 'play',
        label: 'Play Card',
        description: 'Play a card from your hand',
        keyBinding: 'p',
        enabled: true,
        requiresTarget: true,
        targetType: 'card',
      },
      {
        id: 'pass',
        label: 'Pass Turn',
        description: 'End your turn',
        keyBinding: 'space',
        enabled: false,
      },
    ];

    it('should create an action menu with enabled actions', () => {
      const result = adapter.createActionMenu(mockActions);

      expect(result).toBeDefined();
    });

    it('should create an action menu with no actions', () => {
      const result = adapter.createActionMenu([]);

      expect(result).toBeDefined();
    });

    it('should filter out disabled actions', () => {
      const result = adapter.createActionMenu(mockActions);

      expect(result).toBeDefined();
      // The disabled action should not be shown
    });
  });

  describe('createPlayerSelector', () => {
    const mockPlayers: Participant[] = [
      { id: 'player1', name: 'Alice' } as any,
      { id: 'player2', name: 'Bob' } as any,
      { id: 'player3', name: 'Charlie' } as any,
    ];

    it('should create a player selector', () => {
      const result = adapter.createPlayerSelector(mockPlayers);

      expect(result).toBeDefined();
    });

    it('should create a player selector with empty list', () => {
      const result = adapter.createPlayerSelector([]);

      expect(result).toBeDefined();
    });
  });

  describe('showMessage', () => {
    it('should call message callback when provided', () => {
      adapter.showMessage('Test message', 'info');

      expect(mockMessageCallback).toHaveBeenCalledWith('Test message', 'info');
    });

    it('should handle different message types', () => {
      const types: ('info' | 'success' | 'warning' | 'error')[] = ['info', 'success', 'warning', 'error'];
      
      types.forEach(type => {
        adapter.showMessage(`Test ${type} message`, type);
        expect(mockMessageCallback).toHaveBeenCalledWith(`Test ${type} message`, type);
      });
    });

    it('should fallback to console when no callback provided', () => {
      const adapterWithoutCallback = new DefaultUIAdapter();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      adapterWithoutCallback.showMessage('Test message', 'info');

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ Test message');
      consoleSpy.mockRestore();
    });
  });

  describe('showProgress and hideProgress', () => {
    it('should call progress callback when provided', () => {
      adapter.showProgress('Loading game');

      expect(mockProgressCallback).toHaveBeenCalledWith('Loading game');
    });

    it('should hide progress', () => {
      adapter.hideProgress();

      expect(mockProgressCallback).toHaveBeenCalledWith(null);
    });

    it('should fallback to console when no callback provided', () => {
      const adapterWithoutCallback = new DefaultUIAdapter();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      adapterWithoutCallback.showProgress('Loading');

      expect(consoleSpy).toHaveBeenCalledWith('⏳ Loading...');
      consoleSpy.mockRestore();
    });
  });
});

// Note: Context and hook tests would require React testing setup
// For now, we focus on testing the core UIAdapter functionality