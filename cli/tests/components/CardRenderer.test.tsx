
import { render } from 'ink-testing-library';
import { 
  CardRenderer, 
  CardBack, 
  EmptyCardSlot, 
  HandRenderer,
  GameBoardRenderer 
} from '../../src/components/CardRenderer';
import { Card } from 'big-deck-energy';

// Mock card data
const createMockCard = (rank: string, suit: string): Card => {
  const { Card: CardClass } = require('big-deck-energy');
  return new CardClass(
    {
      id: `${rank}-${suit}`,
      faceId: `face-${rank}-${suit}`,
      tailId: `back-standard`,
      properties: { rank, suit }
    },
    'standard'
  );
};

describe('CardRenderer', () => {
  const mockCard = createMockCard('A', 'hearts');

  test('renders card face with correct content', () => {
    const { lastFrame } = render(
      <CardRenderer 
        card={mockCard}
        options={{
          showFace: true,
          highlight: false,
          selectable: false,
          size: 'medium'
        }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('A');
    expect(output).toContain('♥');
  });

  test('renders card back when showFace is false', () => {
    const { lastFrame } = render(
      <CardRenderer 
        card={mockCard}
        options={{
          showFace: false,
          highlight: false,
          selectable: false,
          size: 'medium'
        }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('###');
  });

  test('renders empty slot when no card provided', () => {
    const { lastFrame } = render(
      <CardRenderer 
        options={{
          showFace: true,
          highlight: false,
          selectable: false,
          size: 'medium'
        }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('...');
  });

  test('handles different card sizes', () => {
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const { lastFrame } = render(
        <CardRenderer 
          card={mockCard}
          options={{
            showFace: true,
            highlight: false,
            selectable: false,
            size
          }}
        />
      );
      
      expect(lastFrame()).toBeTruthy();
    });
  });

  test('applies highlighting correctly', () => {
    const { lastFrame } = render(
      <CardRenderer 
        card={mockCard}
        options={{
          showFace: true,
          highlight: true,
          selectable: false,
          size: 'medium'
        }}
      />
    );
    
    // Should render without errors (highlighting is visual)
    expect(lastFrame()).toBeTruthy();
  });
});

describe('CardBack', () => {
  test('renders card back with default design', () => {
    const { lastFrame } = render(
      <CardBack options={{ size: 'medium' }} />
    );
    
    const output = lastFrame();
    expect(output).toContain('###');
  });

  test('renders card back with custom design', () => {
    const { lastFrame } = render(
      <CardBack options={{ size: 'medium', design: 'XXX' }} />
    );
    
    const output = lastFrame();
    expect(output).toContain('XXX');
  });

  test('handles different sizes', () => {
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const { lastFrame } = render(
        <CardBack options={{ size }} />
      );
      
      expect(lastFrame()).toBeTruthy();
    });
  });
});

describe('EmptyCardSlot', () => {
  test('renders empty slot with default placeholder', () => {
    const { lastFrame } = render(
      <EmptyCardSlot options={{ size: 'medium' }} />
    );
    
    const output = lastFrame();
    expect(output).toContain('...');
  });

  test('renders empty slot with custom placeholder', () => {
    const { lastFrame } = render(
      <EmptyCardSlot options={{ size: 'medium', placeholder: 'EMPTY' }} />
    );
    
    const output = lastFrame();
    expect(output).toContain('EMPTY');
  });
});

describe('HandRenderer', () => {
  const mockCards = [
    createMockCard('A', 'hearts'),
    createMockCard('K', 'spades'),
    createMockCard('Q', 'diamonds')
  ];

  test('renders multiple cards horizontally', () => {
    const { lastFrame } = render(
      <HandRenderer 
        cards={mockCards}
        options={{
          showFaces: [true, true, true],
          layout: 'horizontal',
          size: 'small'
        }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('A♥');
    expect(output).toContain('K♠');
    expect(output).toContain('Q♦');
  });

  test('renders cards vertically', () => {
    const { lastFrame } = render(
      <HandRenderer 
        cards={mockCards}
        options={{
          showFaces: [true, true, true],
          layout: 'vertical',
          size: 'small'
        }}
      />
    );
    
    expect(lastFrame()).toBeTruthy();
  });

  test('limits visible cards when maxVisible is set', () => {
    const { lastFrame } = render(
      <HandRenderer 
        cards={mockCards}
        options={{
          showFaces: [true, true, true],
          maxVisible: 2,
          layout: 'horizontal',
          size: 'small'
        }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('and 1 more');
  });

  test('highlights selected card', () => {
    const { lastFrame } = render(
      <HandRenderer 
        cards={mockCards}
        options={{
          showFaces: [true, true, true],
          selectedIndex: 1,
          layout: 'horizontal',
          size: 'small'
        }}
      />
    );
    
    expect(lastFrame()).toBeTruthy();
  });

  test('renders fan layout', () => {
    const { lastFrame } = render(
      <HandRenderer 
        cards={mockCards}
        options={{
          showFaces: [true, true, true],
          layout: 'fan',
          size: 'small'
        }}
      />
    );
    
    expect(lastFrame()).toBeTruthy();
  });
});

describe('GameBoardRenderer', () => {
  const mockAreas = [
    {
      id: 'deck',
      title: 'Deck',
      cards: [createMockCard('2', 'clubs')],
      showFaces: [false],
      position: { x: 0, y: 0 }
    },
    {
      id: 'discard',
      title: 'Discard Pile',
      cards: [createMockCard('3', 'hearts')],
      showFaces: [true],
      position: { x: 1, y: 0 }
    }
  ];

  test('renders game board areas', () => {
    const { lastFrame } = render(
      <GameBoardRenderer 
        areas={mockAreas}
        terminalSize={{ width: 80, height: 24 }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('Deck');
    expect(output).toContain('Discard Pile');
  });

  test('handles empty areas', () => {
    const { lastFrame } = render(
      <GameBoardRenderer 
        areas={[]}
        terminalSize={{ width: 80, height: 24 }}
      />
    );
    
    expect(lastFrame()).toBeTruthy();
  });

  test('adapts to different terminal sizes', () => {
    const smallTerminal = { width: 40, height: 12 };
    const { lastFrame: smallFrame } = render(
      <GameBoardRenderer 
        areas={mockAreas}
        terminalSize={smallTerminal}
      />
    );
    
    const largeTerminal = { width: 120, height: 30 };
    const { lastFrame: largeFrame } = render(
      <GameBoardRenderer 
        areas={mockAreas}
        terminalSize={largeTerminal}
      />
    );
    
    expect(smallFrame()).toBeTruthy();
    expect(largeFrame()).toBeTruthy();
  });

  test('shows card count for areas with many cards', () => {
    const manyCards = Array.from({ length: 10 }, (_, i) => 
      createMockCard(String(i + 1), 'hearts')
    );
    
    const areaWithManyCards = [{
      id: 'many',
      title: 'Many Cards',
      cards: manyCards,
      showFaces: new Array(10).fill(true),
      position: { x: 0, y: 0 }
    }];
    
    const { lastFrame } = render(
      <GameBoardRenderer 
        areas={areaWithManyCards}
        terminalSize={{ width: 80, height: 24 }}
      />
    );
    
    const output = lastFrame();
    expect(output).toContain('+2'); // Should show +2 for the extra cards beyond 8
  });
});