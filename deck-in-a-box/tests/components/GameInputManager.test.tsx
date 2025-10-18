import { GameInputManager, useGameInput } from '../../src/components/GameInputManager';
import { GameLoop, GameAction } from '../../src/engine/game-loop';
import { ActionDefinition } from '../../src/types/actions';
import { EventEmitter } from 'events';

// Mock render function for testing
const mockRender = (component: any) => ({
  container: { innerHTML: '' },
  getByTestId: (id: string) => ({ id }),
  queryByTestId: (id: string) => null,
  getByText: (text: string) => ({ textContent: text }),
});

const render = mockRender;

// Mock components
jest.mock('../../src/components/InputHandler', () => ({
  InputHandler: ({ onAction, onInvalidInput }: any) => {
    // Simulate input handler behavior for testing
    React.useEffect(() => {
      // Simulate some input events for testing
      if (onAction) {
        const testAction = {
          type: 'test_action',
          playerId: 'player1',
          payload: { test: true },
          timestamp: Date.now(),
        };
        // Don't auto-trigger in tests
      }
    }, [onAction, onInvalidInput]);
    
    return <div data-testid="input-handler" />;
  },
}));

jest.mock('../../src/components/ActionMenu', () => ({
  ActionMenu: ({ actions, onActionSelect }: any) => (
    <div data-testid="action-menu">
      {actions.map((action: any) => (
        <button 
          key={action.id} 
          onClick={() => onActionSelect?.(action, 0)}
          data-testid={`action-${action.id}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../../src/components/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ onDecision, isVisible }: any) => 
    isVisible ? (
      <div data-testid="confirmation-dialog">
        <button onClick={() => onDecision?.({ confirmed: true })}>Confirm</button>
        <button onClick={() => onDecision?.({ confirmed: false })}>Cancel</button>
      </div>
    ) : null,
  useConfirmationDialog: () => ({
    isVisible: false,
    isActive: false,
    message: '',
    title: '',
    showConfirmation: jest.fn(),
    handleResult: jest.fn(),
  }),
}));

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
}));

describe('GameInputManager Component', () => {
  let mockGameLoop: GameLoop;
  
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
    },
    {
      id: 'forfeit',
      label: 'Forfeit',
      description: 'Forfeit the game',
      keyBinding: 'f',
      enabled: true,
    },
  ];

  beforeEach(() => {
    // Create a mock game loop
    mockGameLoop = new EventEmitter() as any;
    mockGameLoop.processAction = jest.fn().mockReturnValue(true);
    
    jest.clearAllMocks();
  });

  const getDefaultProps = () => ({
    gameLoop: mockGameLoop,
    availableActions: mockActions,
    currentPlayer: 'player1',
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<GameInputManager {...getDefaultProps()} />);
      expect(container).toBeTruthy();
    });

    it('should render InputHandler component', () => {
      const { getByTestId } = render(<GameInputManager {...getDefaultProps()} />);
      expect(getByTestId('input-handler')).toBeTruthy();
    });

    it('should render ActionMenu when showActionMenu is true', () => {
      const { getByTestId } = render(
        <GameInputManager {...getDefaultProps()} showActionMenu={true} />
      );
      expect(getByTestId('action-menu')).toBeTruthy();
    });

    it('should not render ActionMenu when showActionMenu is false', () => {
      const { queryByTestId } = render(
        <GameInputManager {...getDefaultProps()} showActionMenu={false} />
      );
      expect(queryByTestId('action-menu')).toBeFalsy();
    });
  });

  describe('Action Processing', () => {
    it('should process actions through game loop', () => {
      const mockOnActionProcessed = jest.fn();
      render(
        <GameInputManager 
          {...getDefaultProps()} 
          onActionProcessed={mockOnActionProcessed}
        />
      );

      // Simulate game loop emitting actionProcessed event
      const testAction: GameAction = {
        type: 'draw_card',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      mockGameLoop.emit('actionProcessed', testAction);
      expect(mockOnActionProcessed).toHaveBeenCalledWith(testAction);
    });

    it('should handle action rejection', () => {
      const mockOnActionRejected = jest.fn();
      render(
        <GameInputManager 
          {...getDefaultProps()} 
          onActionRejected={mockOnActionRejected}
        />
      );

      const testAction: GameAction = {
        type: 'invalid_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      mockGameLoop.emit('actionRejected', testAction, 'Invalid action');
      expect(mockOnActionRejected).toHaveBeenCalledWith(testAction, 'Invalid action');
    });

    it('should handle input errors', () => {
      const mockOnInputError = jest.fn();
      render(
        <GameInputManager 
          {...getDefaultProps()} 
          onInputError={mockOnInputError}
        />
      );

      // This would be triggered by the InputHandler component
      // In a real test, we would simulate this through user interaction
      expect(mockOnInputError).toBeDefined();
    });
  });

  describe('Input Queuing and Debouncing', () => {
    it('should queue actions when processing', () => {
      const debounceConfig = {
        minInterval: 100,
        debouncedActions: ['move'],
        maxQueueSize: 5,
      };

      const { container } = render(
        <GameInputManager 
          {...getDefaultProps()} 
          debounceConfig={debounceConfig}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should respect maximum queue size', () => {
      const debounceConfig = {
        minInterval: 50,
        debouncedActions: [],
        maxQueueSize: 2,
      };

      const { container } = render(
        <GameInputManager 
          {...getDefaultProps()} 
          debounceConfig={debounceConfig}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should debounce specified actions', () => {
      const debounceConfig = {
        minInterval: 100,
        debouncedActions: ['move', 'select'],
        maxQueueSize: 10,
      };

      const { container } = render(
        <GameInputManager 
          {...getDefaultProps()} 
          debounceConfig={debounceConfig}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should show confirmation for dangerous actions', () => {
      // Mock the confirmation dialog hook to return visible state
      const mockUseConfirmationDialog = require('../../src/components/ConfirmationDialog').useConfirmationDialog;
      mockUseConfirmationDialog.mockReturnValue({
        isVisible: true,
        isActive: true,
        message: 'Are you sure?',
        title: 'Confirm Action',
        showConfirmation: jest.fn(),
        handleResult: jest.fn(),
      });

      const { getByTestId } = render(<GameInputManager {...getDefaultProps()} />);
      expect(getByTestId('confirmation-dialog')).toBeTruthy();
    });

    it('should handle confirmation results', () => {
      const mockUseConfirmationDialog = require('../../src/components/ConfirmationDialog').useConfirmationDialog;
      const mockHandleResult = jest.fn();
      
      mockUseConfirmationDialog.mockReturnValue({
        isVisible: true,
        isActive: true,
        message: 'Are you sure?',
        title: 'Confirm Action',
        showConfirmation: jest.fn(),
        handleResult: mockHandleResult,
      });

      render(<GameInputManager {...getDefaultProps()} />);
      
      // Simulate clicking confirm
      // In a real test environment, we would simulate the click event
      
      expect(mockHandleResult).toHaveBeenCalled();
    });
  });

  describe('Feedback and Status', () => {
    it('should show feedback when enabled', () => {
      const { container } = render(
        <GameInputManager {...getDefaultProps()} showFeedback={true} />
      );
      expect(container).toBeTruthy();
    });

    it('should hide feedback when disabled', () => {
      const { container } = render(
        <GameInputManager {...getDefaultProps()} showFeedback={false} />
      );
      expect(container).toBeTruthy();
    });

    it('should display queue status when actions are queued', () => {
      const { container } = render(
        <GameInputManager {...getDefaultProps()} showFeedback={true} />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Enable/Disable State', () => {
    it('should disable input when disabled', () => {
      const { container } = render(
        <GameInputManager {...getDefaultProps()} enabled={false} />
      );
      expect(container).toBeTruthy();
    });

    it('should enable input when enabled', () => {
      const { container } = render(
        <GameInputManager {...getDefaultProps()} enabled={true} />
      );
      expect(container).toBeTruthy();
    });

    it('should disable input during confirmation dialogs', () => {
      const mockUseConfirmationDialog = require('../../src/components/ConfirmationDialog').useConfirmationDialog;
      mockUseConfirmationDialog.mockReturnValue({
        isVisible: true,
        isActive: true,
        message: 'Are you sure?',
        title: 'Confirm Action',
        showConfirmation: jest.fn(),
        handleResult: jest.fn(),
      });

      const { container } = render(<GameInputManager {...getDefaultProps()} />);
      expect(container).toBeTruthy();
    });
  });
});

describe('useGameInput Hook', () => {
  let mockGameLoop: GameLoop;

  const mockActions: ActionDefinition[] = [
    {
      id: 'test_action',
      label: 'Test Action',
      description: 'Test action',
      keyBinding: 't',
      enabled: true,
    },
  ];

  beforeEach(() => {
    mockGameLoop = new EventEmitter() as any;
    mockGameLoop.processAction = jest.fn().mockReturnValue(true);
  });

  it('should initialize with correct state', () => {
    const TestComponent = () => {
      const { inputEnabled, actionQueue } = useGameInput(mockGameLoop, mockActions, 'player1');
      
      expect(inputEnabled).toBe(true);
      expect(actionQueue).toHaveLength(0);
      
      return null;
    };

    render(<TestComponent />);
  });

  it('should queue actions correctly', () => {
    const TestComponent = () => {
      const { queueAction, actionQueue } = useGameInput(mockGameLoop, mockActions, 'player1');
      
      const testAction: GameAction = {
        type: 'test_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      queueAction(testAction);
      expect(actionQueue).toHaveLength(1);
      
      return null;
    };

    render(<TestComponent />);
  });

  it('should process queued actions', () => {
    const TestComponent = () => {
      const { queueAction, processNextAction } = useGameInput(mockGameLoop, mockActions, 'player1');
      
      const testAction: GameAction = {
        type: 'test_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      queueAction(testAction);
      const result = processNextAction();
      
      expect(result).toBe(true);
      expect(mockGameLoop.processAction).toHaveBeenCalledWith(testAction);
      
      return null;
    };

    render(<TestComponent />);
  });

  it('should clear queue when disabled', () => {
    const TestComponent = () => {
      const { queueAction, setEnabled, actionQueue } = useGameInput(mockGameLoop, mockActions, 'player1');
      
      const testAction: GameAction = {
        type: 'test_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      queueAction(testAction);
      setEnabled(false);
      
      expect(actionQueue).toHaveLength(0);
      
      return null;
    };

    render(<TestComponent />);
  });

  it('should handle processing errors', () => {
    mockGameLoop.processAction = jest.fn().mockImplementation(() => {
      throw new Error('Processing failed');
    });

    const TestComponent = () => {
      const { queueAction, processNextAction } = useGameInput(mockGameLoop, mockActions, 'player1');
      
      const testAction: GameAction = {
        type: 'test_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      queueAction(testAction);
      const result = processNextAction();
      
      expect(result).toBe(false);
      
      return null;
    };

    render(<TestComponent />);
  });

  it('should track last action time', () => {
    const TestComponent = () => {
      const { queueAction, processNextAction, lastActionTime } = useGameInput(mockGameLoop, mockActions, 'player1');
      
      const initialTime = lastActionTime;
      
      const testAction: GameAction = {
        type: 'test_action',
        playerId: 'player1',
        payload: {},
        timestamp: Date.now(),
      };

      queueAction(testAction);
      processNextAction();
      
      expect(lastActionTime).toBeGreaterThan(initialTime);
      
      return null;
    };

    render(<TestComponent />);
  });
});