import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { GameLoop, GameAction } from '../engine/game-loop';
import { ActionDefinition } from '../types/actions';
import { InputHandler } from './InputHandler';
import { ActionMenu } from './ActionMenu';
import { ConfirmationDialog, useConfirmationDialog } from './ConfirmationDialog';

/**
 * Input queue entry for managing rapid key presses.
 */
interface InputQueueEntry {
  /** The game action to process */
  action: GameAction;
  
  /** Timestamp when the action was queued */
  queuedAt: number;
  
  /** Priority of the action (higher = more important) */
  priority: number;
  
  /** Whether this action requires confirmation */
  requiresConfirmation: boolean;
}

/**
 * Input debounce configuration.
 */
interface DebounceConfig {
  /** Minimum time between actions in milliseconds */
  minInterval: number;
  
  /** Actions that should be debounced */
  debouncedActions: string[];
  
  /** Maximum queue size before dropping actions */
  maxQueueSize: number;
}

/**
 * Props for GameInputManager component.
 */
export interface GameInputManagerProps {
  /** Game loop instance */
  gameLoop: GameLoop;
  
  /** Available actions for the current game state */
  availableActions: ActionDefinition[];
  
  /** Current player ID */
  currentPlayer: string;
  
  /** Whether input is enabled */
  enabled?: boolean;
  
  /** Input context */
  context?: string;
  
  /** Debounce configuration */
  debounceConfig?: DebounceConfig;
  
  /** Whether to show action menu */
  showActionMenu?: boolean;
  
  /** Whether to show input feedback */
  showFeedback?: boolean;
  
  /** Callback when action is processed */
  onActionProcessed?: (action: GameAction) => void;
  
  /** Callback when action is rejected */
  onActionRejected?: (action: GameAction, reason: string) => void;
  
  /** Callback when input error occurs */
  onInputError?: (error: string) => void;
}

/**
 * Game input manager that integrates input handling with the game loop.
 * Handles input queuing, debouncing, and confirmation dialogs.
 */
export const GameInputManager: React.FC<GameInputManagerProps> = ({
  gameLoop,
  availableActions,
  currentPlayer,
  enabled = true,
  context = 'game',
  debounceConfig = {
    minInterval: 100,
    debouncedActions: ['move', 'select'],
    maxQueueSize: 10,
  },
  showActionMenu = true,
  showFeedback = true,
  onActionProcessed,
  onActionRejected,
  onInputError,
}) => {
  const [inputQueue, setInputQueue] = useState<InputQueueEntry[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  
  const processingRef = useRef(false);
  const queueTimeoutRef = useRef<NodeJS.Timeout>();
  
  const {
    isVisible: showConfirmation,
    isActive: confirmationActive,
    message: confirmationMessage,
    title: confirmationTitle,
    showConfirmation: displayConfirmation,
    handleResult: handleConfirmationResult,
  } = useConfirmationDialog('game-action');

  // Set up game loop event listeners
  useEffect(() => {
    const handleActionProcessed = (action: GameAction) => {
      if (onActionProcessed) {
        onActionProcessed(action);
      }
      setFeedbackMessage(`Action processed: ${action.type}`);
      setTimeout(() => setFeedbackMessage(''), 2000);
    };

    const handleActionRejected = (action: GameAction, reason: string) => {
      if (onActionRejected) {
        onActionRejected(action, reason);
      }
      setFeedbackMessage(`Action rejected: ${reason}`);
      setTimeout(() => setFeedbackMessage(''), 3000);
    };

    gameLoop.on('actionProcessed', handleActionProcessed);
    gameLoop.on('actionRejected', handleActionRejected);

    return () => {
      gameLoop.off('actionProcessed', handleActionProcessed);
      gameLoop.off('actionRejected', handleActionRejected);
    };
  }, [gameLoop, onActionProcessed, onActionRejected]);

  // Process input queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || inputQueue.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessingQueue(true);

    try {
      // Sort queue by priority and timestamp
      const sortedQueue = [...inputQueue].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.queuedAt - b.queuedAt; // Earlier timestamp first
      });

      const entry = sortedQueue[0];
      
      // Remove from queue
      setInputQueue(current => current.filter(item => item !== entry));

      // Check debouncing
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTime;
      
      if (debounceConfig.debouncedActions.includes(entry.action.type) &&
          timeSinceLastAction < debounceConfig.minInterval) {
        // Skip this action due to debouncing
        return;
      }

      // Handle confirmation if required
      if (entry.requiresConfirmation) {
        const actionDef = availableActions.find(a => a.id === entry.action.type);
        const message = `Are you sure you want to ${actionDef?.label || entry.action.type}?`;
        
        displayConfirmation(message, 'Confirm Action', (confirmed) => {
          if (confirmed) {
            processGameAction(entry.action);
          }
        });
        return;
      }

      // Process the action
      processGameAction(entry.action);
      
    } finally {
      processingRef.current = false;
      setIsProcessingQueue(false);
      
      // Schedule next queue processing if there are more items
      if (inputQueue.length > 0) {
        queueTimeoutRef.current = setTimeout(processQueue, 50);
      }
    }
  }, [inputQueue, lastActionTime, debounceConfig, availableActions, displayConfirmation]);

  // Process a game action through the game loop
  const processGameAction = useCallback((action: GameAction) => {
    try {
      const success = gameLoop.processAction(action);
      
      if (success) {
        setLastActionTime(Date.now());
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (onInputError) {
        onInputError(errorMessage);
      }
      setFeedbackMessage(`Error: ${errorMessage}`);
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  }, [gameLoop, onInputError]);

  // Queue an action for processing
  const queueAction = useCallback((action: GameAction, priority: number = 1, requiresConfirmation: boolean = false) => {
    if (inputQueue.length >= debounceConfig.maxQueueSize) {
      // Remove oldest low-priority action
      setInputQueue(current => {
        const sorted = [...current].sort((a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt);
        return sorted.slice(1);
      });
    }

    const entry: InputQueueEntry = {
      action,
      queuedAt: Date.now(),
      priority,
      requiresConfirmation,
    };

    setInputQueue(current => [...current, entry]);
  }, [inputQueue.length, debounceConfig.maxQueueSize]);

  // Handle input from InputHandler
  const handleInputAction = useCallback((action: GameAction) => {
    if (!enabled) return;

    // Determine if this action requires confirmation
    const actionDef = availableActions.find(a => a.id === action.type);
    const requiresConfirmation = actionDef?.id === 'forfeit' || 
                                actionDef?.id === 'quit' || 
                                actionDef?.id === 'restart';

    // Determine priority based on action type
    let priority = 1;
    if (action.type === 'escape' || action.type === 'quit') {
      priority = 10; // High priority for exit actions
    } else if (action.type === 'confirm' || action.type === 'select') {
      priority = 5; // Medium priority for selection actions
    }

    queueAction(action, priority, requiresConfirmation);
  }, [enabled, availableActions, queueAction]);

  // Handle invalid input
  const handleInvalidInput = useCallback((input: string, error: string) => {
    setFeedbackMessage(`Invalid input '${input}': ${error}`);
    setTimeout(() => setFeedbackMessage(''), 2000);
  }, []);

  // Handle action menu selection
  const handleActionMenuSelect = useCallback((action: ActionDefinition, index: number) => {
    setSelectedActionIndex(index);
    
    const gameAction: GameAction = {
      type: action.id,
      playerId: currentPlayer,
      payload: {
        actionId: action.id,
        selectedFromMenu: true,
        menuIndex: index,
      },
      timestamp: Date.now(),
    };

    handleInputAction(gameAction);
  }, [currentPlayer, handleInputAction]);

  // Process queue when it changes
  useEffect(() => {
    if (inputQueue.length > 0 && !isProcessingQueue) {
      queueTimeoutRef.current = setTimeout(processQueue, 10);
    }

    return () => {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
    };
  }, [inputQueue, isProcessingQueue, processQueue]);

  // Clear queue timeout on unmount
  useEffect(() => {
    return () => {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box flexDirection="column">
      {/* Input Handler */}
      <InputHandler
        availableActions={availableActions}
        currentPlayer={currentPlayer}
        enabled={enabled && !showConfirmation}
        context={context}
        onAction={handleInputAction}
        onInvalidInput={handleInvalidInput}
        showFeedback={showFeedback}
      />

      {/* Action Menu */}
      {showActionMenu && availableActions.length > 0 && (
        <Box marginBottom={1}>
          <ActionMenu
            actions={availableActions}
            selectedIndex={selectedActionIndex}
            title="Available Actions"
            isActive={enabled && !showConfirmation}
            showKeyBindings={true}
            showDescriptions={false}
            onActionSelect={handleActionMenuSelect}
            onNavigate={(_direction, newIndex) => setSelectedActionIndex(newIndex)}
          />
        </Box>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Box marginBottom={1}>
          <ConfirmationDialog
            message={confirmationMessage}
            title={confirmationTitle}
            isVisible={showConfirmation}
            isActive={confirmationActive}
            onDecision={handleConfirmationResult}
          />
        </Box>
      )}

      {/* Feedback and Status */}
      {showFeedback && (
        <Box flexDirection="column">
          {/* Input feedback */}
          {feedbackMessage && (
            <Box marginBottom={1}>
              <Text color="yellow">{feedbackMessage}</Text>
            </Box>
          )}

          {/* Queue status */}
          {inputQueue.length > 0 && (
            <Box>
              <Text dimColor>
                Actions queued: {inputQueue.length}
                {isProcessingQueue && ' (processing...)'}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing game input state.
 */
export const useGameInput = (
  gameLoop: GameLoop,
  _availableActions: ActionDefinition[],
  _currentPlayer: string
) => {
  const [inputEnabled, setInputEnabled] = useState(true);
  const [actionQueue, setActionQueue] = useState<GameAction[]>([]);
  const [lastActionTime, setLastActionTime] = useState(0);

  // Queue an action
  const queueAction = useCallback((action: GameAction) => {
    setActionQueue(current => [...current, action]);
  }, []);

  // Process next action in queue
  const processNextAction = useCallback(() => {
    if (actionQueue.length === 0) return null;

    const action = actionQueue[0];
    setActionQueue(current => current.slice(1));
    
    try {
      const success = gameLoop.processAction(action);
      if (success) {
        setLastActionTime(Date.now());
      }
      return success;
    } catch (error) {
      console.error('Failed to process action:', error);
      return false;
    }
  }, [actionQueue, gameLoop]);

  // Clear action queue
  const clearQueue = useCallback(() => {
    setActionQueue([]);
  }, []);

  // Enable/disable input
  const setEnabled = useCallback((enabled: boolean) => {
    setInputEnabled(enabled);
    if (!enabled) {
      clearQueue();
    }
  }, [clearQueue]);

  return {
    inputEnabled,
    setEnabled,
    actionQueue,
    queueAction,
    processNextAction,
    clearQueue,
    lastActionTime,
  };
};