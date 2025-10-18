import { MainMenu } from '../../src/components/MainMenu';
import { GameSetup } from '../../src/components/GameSetup';

describe('Menu Components', () => {
  describe('MainMenu', () => {
    it('should be importable', () => {
      expect(typeof MainMenu).toBe('function');
    });

    it('should be a React component', () => {
      expect(MainMenu.name).toBe('MainMenu');
    });
  });

  describe('GameSetup', () => {
    it('should be importable', () => {
      expect(typeof GameSetup).toBe('function');
    });

    it('should be a React component', () => {
      expect(GameSetup.name).toBe('GameSetup');
    });
  });

  describe('Component Integration', () => {
    it('should have all required components available', () => {
      const components = [MainMenu, GameSetup];
      
      components.forEach(component => {
        expect(typeof component).toBe('function');
        expect(component.name).toBeTruthy();
      });
    });
  });
});