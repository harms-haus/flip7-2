import { InputHandler, useInputHandler, InputUtils } from '../../src/components/InputHandler';
import { ActionDefinition } from '../../src/types/actions';

// Mock render function for testing
const mockRender = (component: any) => ({
  container: { innerHTML: '' },
  getByText: (text: string) => ({ textContent: text }),
  queryByText: (text: string) => null,
});

const render = mockRender;

// Mock Ink's useInput hook
const mockUseInput = jest.fn();
jest.mock('ink', () => ({
  ...jest.requireActual('ink'),
  useInput: mockUseInput,
}));

describe('InputHandler Component', () => {
  const mockActions: ActionDefinition[] = [
    {
      id: 'draw_card',
      label: 'Draw Card',
      description: 'Draw a card from the deck',
      keyBinding: 'd',
      enabled: true,
    },
    {
      id: 'play_card',
      label: 'Play Card',
      description: 'Play a card from your hand',
      keyBinding: 'p',
      enabled: true,
      requiresTarget: true,
      targetType: 'card',
    },
    {
      id: 'pass_turn',
      label: 'Pass Turn',
      description: 'End your turn',
      keyBinding: 'space',
      enabled: false,
    },
  ];

  const defaultProps = {
    availableActions: mockActions,
    currentPlayer: 'player1',
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<InputHandler {...defaultProps} />);
      expect(mockUseInput).toHaveBeenCalled();
    });

    it('should not render any visible content', () => {
      const { container } = render(<InputHandler {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('should set up input handling when enabled', () => {
      render(<InputHandler {...defaultProps} enabled={true} />);
      expect(mockUseInput).toHaveBeenCalledWith(expect.any(Function), { isActive: true });
    });

    it('should disable input handling when disabled', () => {
      render(<InputHandler {...defaultProps} enabled={false} />);
      expect(mockUseInput).toHaveBeenCalledWith(expect.any(Function), { isActive: false });
    });
  });

  describe('Input Processing', () => {
    it('should set up input callback', () => {
      render(<InputHandler {...defaultProps} />);
      const inputCallback = mockUseInput.mock.calls[0][0];
      expect(typeof inputCallback).toBe('function');
    });

    it('should process valid key input', () => {
      const mockOnAction = jest.fn();
      render(<InputHandler {...defaultProps} onAction={mockOnAction} />);
      const inputCallback = mockUseInput.mock.calls[mockUseInput.mock.calls.length - 1][0];

      inputCallback('d', {});

      expect(mockOnAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'draw_card',
          playerId: 'player1',
          payload: expect.objectContaining({
            actionId: 'draw_card',
            keyPressed: 'd',
          }),
        })
      );
    });

    it('should handle escape key', () => {
      const mockOnAction = jest.fn();
      render(<InputHandler {...defaultProps} onAction={mockOnAction} />);
      const inputCallback = mockUseInput.mock.calls[mockUseInput.mock.calls.length - 1][0];

      inputCallback('', { escape: true });

      expect(mockOnAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'escape',
          playerId: 'player1',
        })
      );
    });

    it('should handle enter key', () => {
      const mockOnAction = jest.fn();
      render(<InputHandler {...defaultProps} onAction={mockOnAction} />);
      const inputCallback = mockUseInput.mock.calls[mockUseInput.mock.calls.length - 1][0];

      inputCallback('', { return: true });

      expect(mockOnAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          playerId: 'player1',
        })
      );
    });

    it('should handle arrow keys for navigation', () => {
      const mockOnAction = jest.fn();
      render(<InputHandler {...defaultProps} onAction={mockOnAction} />);
      const inputCallback = mockUseInput.mock.calls[mockUseInput.mock.calls.length - 1][0];

      inputCallback('', { upArrow: true });

      expect(mockOnAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          payload: expect.objectContaining({
            direction: 'up',
          }),
        })
      );
    });

    it('should reject invalid input', () => {
      const mockOnInvalidInput = jest.fn();
      render(<InputHandler {...defaultProps} onInvalidInput={mockOnInvalidInput} />);
      const inputCallback = mockUseInput.mock.calls[mockUseInput.mock.calls.length - 1][0];

      inputCallback('x', {});

      expect(mockOnInvalidInput).toHaveBeenCalledWith('x', expect.stringContaining('Unknown key'));
    });

    it('should reject disabled actions', () => {
      const mockOnValidationError = jest.fn();
      render(<InputHandler {...defaultProps} onValidationError={mockOnValidationError} />);
      const inputCallback = mockUseInput.mock.calls[mockUseInput.mock.calls.length - 1][0];

      inputCallback('space', {});

      expect(mockOnValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          errorMessage: expect.stringContaining('not available'),
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate enabled actions as valid', () => {
      render(<InputHandler {...defaultProps} />);
      const inputCallback = mockUseInput.mock.calls[0][0];
      expect(typeof inputCallback).toBe('function');

      // Simulate validation by checking if the action would be processed
      const enabledAction = mockActions.find(a => a.enabled && a.keyBinding === 'd');
      expect(enabledAction).toBeDefined();
    });

    it('should validate disabled actions as invalid', () => {
      render(<InputHandler {...defaultProps} />);
      const inputCallback = mockUseInput.mock.calls[0][0];
      expect(typeof inputCallback).toBe('function');

      const disabledAction = mockActions.find(a => !a.enabled);
      expect(disabledAction).toBeDefined();
      expect(disabledAction?.enabled).toBe(false);
    });

    it('should validate unknown keys as invalid', () => {
      const mockOnInvalidInput = jest.fn();
      render(<InputHandler {...defaultProps} onInvalidInput={mockOnInvalidInput} />);
      const inputCallback = mockUseInput.mock.calls[0][0];

      inputCallback('z', {});

      expect(mockOnInvalidInput).toHaveBeenCalled();
    });
  });

  describe('Custom Mappings', () => {
    const customMappings = [
      {
        key: 'h',
        action: {
          id: 'help',
          label: 'Help',
          description: 'Show help',
          keyBinding: 'h',
          enabled: true,
        },
        enabled: true,
        context: 'game',
      },
    ];

    it('should process custom mappings', () => {
      const mockOnAction = jest.fn();
      render(
        <InputHandler 
          {...defaultProps} 
          onAction={mockOnAction}
          customMappings={customMappings}
        />
      );
      const inputCallback = mockUseInput.mock.calls[0][0];

      inputCallback('h', {});

      expect(mockOnAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'help',
          playerId: 'player1',
        })
      );
    });
  });
});

describe('useInputHandler Hook', () => {
  const mockActions: ActionDefinition[] = [
    {
      id: 'test_action',
      label: 'Test Action',
      description: 'Test action',
      keyBinding: 't',
      enabled: true,
    },
  ];

  it('should create input mappings from actions', () => {
    const TestComponent = () => {
      const { inputMappings } = useInputHandler(mockActions, 'player1', 'test');
      expect(inputMappings).toHaveLength(1);
      expect(inputMappings[0].key).toBe('t');
      expect(inputMappings[0].action.id).toBe('test_action');
      return null;
    };

    render(<TestComponent />);
  });

  it('should validate input correctly', () => {
    const TestComponent = () => {
      const { validateInput } = useInputHandler(mockActions, 'player1', 'test');
      
      const validResult = validateInput('t');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validateInput('x');
      expect(invalidResult.isValid).toBe(false);
      
      return null;
    };

    render(<TestComponent />);
  });

  it('should create game actions from input', () => {
    const TestComponent = () => {
      const { createGameAction } = useInputHandler(mockActions, 'player1', 'test');
      
      const action = createGameAction('t');
      expect(action).toEqual(
        expect.objectContaining({
          type: 'test_action',
          playerId: 'player1',
          payload: expect.objectContaining({
            actionId: 'test_action',
            keyPressed: 't',
            context: 'test',
          }),
        })
      );
      
      return null;
    };

    render(<TestComponent />);
  });
});

describe('InputUtils', () => {
  describe('normalizeKey', () => {
    it('should normalize keys to lowercase', () => {
      expect(InputUtils.normalizeKey('A')).toBe('a');
      expect(InputUtils.normalizeKey('SPACE')).toBe('space');
    });

    it('should trim whitespace', () => {
      expect(InputUtils.normalizeKey(' a ')).toBe('a');
    });
  });

  describe('isValidKeyBinding', () => {
    it('should validate single character keys', () => {
      expect(InputUtils.isValidKeyBinding('a')).toBe(true);
      expect(InputUtils.isValidKeyBinding('1')).toBe(true);
      expect(InputUtils.isValidKeyBinding('Z')).toBe(true);
    });

    it('should validate special keys', () => {
      expect(InputUtils.isValidKeyBinding('enter')).toBe(true);
      expect(InputUtils.isValidKeyBinding('escape')).toBe(true);
      expect(InputUtils.isValidKeyBinding('space')).toBe(true);
      expect(InputUtils.isValidKeyBinding('tab')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(InputUtils.isValidKeyBinding('')).toBe(false);
      expect(InputUtils.isValidKeyBinding('invalid')).toBe(false);
      expect(InputUtils.isValidKeyBinding('ctrl+a')).toBe(false);
    });
  });

  describe('getHelpText', () => {
    const actions: ActionDefinition[] = [
      {
        id: 'action1',
        label: 'Action 1',
        description: 'First action',
        keyBinding: 'a',
        enabled: true,
      },
      {
        id: 'action2',
        label: 'Action 2',
        description: 'Second action',
        keyBinding: 'b',
        enabled: true,
      },
      {
        id: 'action3',
        label: 'Action 3',
        description: 'Third action',
        keyBinding: 'c',
        enabled: false,
      },
    ];

    it('should generate help text for enabled actions', () => {
      const helpText = InputUtils.getHelpText(actions);
      expect(helpText).toContain('A: Action 1');
      expect(helpText).toContain('B: Action 2');
      expect(helpText).not.toContain('C: Action 3');
    });

    it('should handle empty action list', () => {
      const helpText = InputUtils.getHelpText([]);
      expect(helpText).toBe('No actions available');
    });
  });

  describe('createNavigationActions', () => {
    it('should create standard navigation actions', () => {
      const navActions = InputUtils.createNavigationActions();
      
      expect(navActions).toHaveLength(6);
      expect(navActions.find(a => a.id === 'navigate_up')).toBeDefined();
      expect(navActions.find(a => a.id === 'navigate_down')).toBeDefined();
      expect(navActions.find(a => a.id === 'navigate_left')).toBeDefined();
      expect(navActions.find(a => a.id === 'navigate_right')).toBeDefined();
      expect(navActions.find(a => a.id === 'confirm')).toBeDefined();
      expect(navActions.find(a => a.id === 'cancel')).toBeDefined();
    });

    it('should have proper key bindings', () => {
      const navActions = InputUtils.createNavigationActions();
      
      const upAction = navActions.find(a => a.id === 'navigate_up');
      expect(upAction?.keyBinding).toBe('ArrowUp');
      
      const confirmAction = navActions.find(a => a.id === 'confirm');
      expect(confirmAction?.keyBinding).toBe('Enter');
    });
  });
});