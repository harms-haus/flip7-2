import { 
  calculateLayout, 
  DEFAULT_LAYOUT_CONFIG,
} from '../../src/utils/layout-calculator';
import { LayoutConfiguration } from '../../src/types';

describe('Layout Calculator', () => {
  describe('calculateLayout', () => {
    test('should calculate layout for large terminal', () => {
      const layout = calculateLayout(120, 30, DEFAULT_LAYOUT_CONFIG);

      expect(layout.sizeCategory).toBe('large');
      expect(layout.isTooSmall).toBe(false);
      expect(layout.warnings).toHaveLength(0);

      // Check that all major areas are visible
      expect(layout.calculatedAreas.playerHandArea.visible).toBe(true);
      expect(layout.calculatedAreas.gameBoardArea.visible).toBe(true);
      expect(layout.calculatedAreas.opponentArea.visible).toBe(true);
      expect(layout.calculatedAreas.statusArea.visible).toBe(true);
      expect(layout.calculatedAreas.actionArea.visible).toBe(true);
      expect(layout.calculatedAreas.helpArea.visible).toBe(true);

      // Check specific dimensions for large layout
      expect(layout.calculatedAreas.playerHandArea.height).toBe(10);
      expect(layout.calculatedAreas.gameBoardArea.width).toBe(72); // 60% of 120
      expect(layout.calculatedAreas.opponentArea.width).toBe(48); // 40% of 120
    });

    test('should calculate layout for medium terminal', () => {
      const layout = calculateLayout(80, 24, DEFAULT_LAYOUT_CONFIG);

      expect(layout.sizeCategory).toBe('medium');
      expect(layout.isTooSmall).toBe(false);

      // Check medium-specific configurations
      expect(layout.calculatedAreas.playerHandArea.height).toBe(8);
      expect(layout.calculatedAreas.gameBoardArea.width).toBe(56); // 70% of 80
      expect(layout.calculatedAreas.opponentArea.width).toBe(24); // 30% of 80
      expect(layout.calculatedAreas.helpArea.visible).toBe(true);
    });

    test('should calculate layout for small terminal', () => {
      const layout = calculateLayout(50, 20, DEFAULT_LAYOUT_CONFIG);

      expect(layout.sizeCategory).toBe('small');
      expect(layout.isTooSmall).toBe(false);

      // Check small-specific configurations
      expect(layout.calculatedAreas.playerHandArea.height).toBe(6);
      expect(layout.calculatedAreas.gameBoardArea.width).toBe(50); // 100% of 50
      expect(layout.calculatedAreas.opponentArea.visible).toBe(false); // Hidden on small
      expect(layout.calculatedAreas.helpArea.visible).toBe(false); // Hidden on small
    });

    test('should handle too small terminal', () => {
      const layout = calculateLayout(30, 8, DEFAULT_LAYOUT_CONFIG);

      expect(layout.isTooSmall).toBe(true);
      expect(layout.warnings).toContain(
        'Terminal size (30x8) is below minimum requirements (40x10)'
      );
    });

    test('should handle percentage-based dimensions', () => {
      const layout = calculateLayout(100, 20, DEFAULT_LAYOUT_CONFIG);

      // Game board area uses 60% width in large layout
      const gameBoardArea = layout.calculatedAreas.gameBoardArea;
      expect(gameBoardArea.width).toBe(60); // 60% of 100

      // Status area uses 100% width
      const statusArea = layout.calculatedAreas.statusArea;
      expect(statusArea.width).toBe(100); // 100% of 100
    });

    test('should respect minimum size requirements', () => {
      const customConfig: LayoutConfiguration = {
        ...DEFAULT_LAYOUT_CONFIG,
        areas: {
          ...DEFAULT_LAYOUT_CONFIG.areas,
          gameBoardArea: {
            ...DEFAULT_LAYOUT_CONFIG.areas.gameBoardArea,
            minWidth: 60,
            minHeight: 15,
          },
        },
      };

      // Terminal too narrow for game board minimum width
      const layout = calculateLayout(50, 20, customConfig);
      
      expect(layout.calculatedAreas.gameBoardArea.visible).toBe(false);
      expect(layout.warnings).toContain('gameBoardArea hidden due to insufficient width');
    });

    test('should calculate content areas with padding', () => {
      const customConfig: LayoutConfiguration = {
        ...DEFAULT_LAYOUT_CONFIG,
        areas: {
          ...DEFAULT_LAYOUT_CONFIG.areas,
          playerHandArea: {
            small: { width: 40, height: 10, visible: true, padding: 2 },
            medium: { width: 40, height: 10, visible: true, padding: 2 },
            large: { width: 40, height: 10, visible: true, padding: 2 },
            flexDirection: 'column',
            priority: 10,
          },
        },
      };

      const layout = calculateLayout(80, 24, customConfig);
      const playerHandArea = layout.calculatedAreas.playerHandArea;

      expect(playerHandArea.width).toBe(40);
      expect(playerHandArea.height).toBe(10);
      expect(playerHandArea.contentArea.width).toBe(36); // 40 - 2*2 padding
      expect(playerHandArea.contentArea.height).toBe(6); // 10 - 2*2 padding
      expect(playerHandArea.contentArea.x).toBe(2);
      expect(playerHandArea.contentArea.y).toBe(2);
    });

    test('should position areas vertically', () => {
      const layout = calculateLayout(80, 30, DEFAULT_LAYOUT_CONFIG);

      // Areas should be positioned sequentially
      let expectedY = 0;
      const areaOrder = ['playerHandArea', 'gameBoardArea', 'opponentArea', 'statusArea', 'actionArea', 'helpArea'];
      
      for (const areaName of areaOrder) {
        const area = layout.calculatedAreas[areaName];
        if (area && area.visible) {
          expect(area.y).toBe(expectedY);
          expectedY += area.height;
        }
      }
    });
  });

  describe('edge cases', () => {
    test('should handle zero dimensions gracefully', () => {
      const layout = calculateLayout(0, 0, DEFAULT_LAYOUT_CONFIG);

      expect(layout.isTooSmall).toBe(true);
      expect(layout.sizeCategory).toBe('small');
      
      // All areas should be invisible or have zero dimensions
      Object.values(layout.calculatedAreas).forEach(area => {
        if (area.visible) {
          expect(area.width).toBeGreaterThanOrEqual(0);
          expect(area.height).toBeGreaterThanOrEqual(0);
        }
      });
    });

    test('should handle invalid percentage strings', () => {
      const customConfig: LayoutConfiguration = {
        ...DEFAULT_LAYOUT_CONFIG,
        areas: {
          ...DEFAULT_LAYOUT_CONFIG.areas,
          playerHandArea: {
            small: { width: 'invalid%', height: 'also-invalid', visible: true },
            medium: { width: 'invalid%', height: 'also-invalid', visible: true },
            large: { width: 'invalid%', height: 'also-invalid', visible: true },
            flexDirection: 'column',
            priority: 10,
          },
        },
      };

      const layout = calculateLayout(80, 24, customConfig);
      const playerHandArea = layout.calculatedAreas.playerHandArea;

      expect(playerHandArea.width).toBe(0);
      expect(playerHandArea.height).toBe(0);
    });

    test('should handle missing area definitions', () => {
      const minimalConfig: LayoutConfiguration = {
        ...DEFAULT_LAYOUT_CONFIG,
        areas: {
          playerHandArea: DEFAULT_LAYOUT_CONFIG.areas.playerHandArea,
        } as any,
      };

      const layout = calculateLayout(80, 24, minimalConfig);

      expect(layout.calculatedAreas.playerHandArea).toBeDefined();
      expect(layout.calculatedAreas.gameBoardArea).toBeUndefined();
    });
  });

  describe('breakpoint behavior', () => {
    test('should use correct breakpoints', () => {
      const customBreakpoints = {
        ...DEFAULT_LAYOUT_CONFIG,
        breakpoints: { small: 50, medium: 90, large: 130 },
      };

      expect(calculateLayout(40, 20, customBreakpoints).sizeCategory).toBe('small');
      expect(calculateLayout(60, 20, customBreakpoints).sizeCategory).toBe('medium');
      expect(calculateLayout(100, 20, customBreakpoints).sizeCategory).toBe('large');
    });

    test('should handle edge case breakpoint values', () => {
      const customBreakpoints = {
        ...DEFAULT_LAYOUT_CONFIG,
        breakpoints: { small: 60, medium: 100, large: 140 },
      };

      expect(calculateLayout(59, 20, customBreakpoints).sizeCategory).toBe('small');
      expect(calculateLayout(60, 20, customBreakpoints).sizeCategory).toBe('medium');
      expect(calculateLayout(99, 20, customBreakpoints).sizeCategory).toBe('medium');
      expect(calculateLayout(100, 20, customBreakpoints).sizeCategory).toBe('large');
    });
  });
});