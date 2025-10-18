import React, { useCallback, useEffect, useState } from 'react';
import { useInput } from 'ink';
import { ActionDefinition } from '../types/actions';
import { GameAction } from '../engine/game-loop';

/**
 * Input validation result.
 */
export interface InputValidationResult {
  /** Whether the input is valid */
  isValid: boolean;
  
  /** Error message if invalid */
  errorMessage?: string;
  
  /** Suggested action if available */
  suggestedAction?: ActionDefinition;
}

/**
 * Input mapping configuration.
 */
export interface InputMapping {
  /** Key combination that triggers this mapping */
  key: string;
  
  /** Action to execute when key is pressed */
  action: ActionDefinition;
  
  /** Whether this mapping is currently active */
  enabled: boolean;
  
  /** Context where this mapping is active */
  context?: string;
}

/**
 * Props for InputHandler component.
 */
export interface InputHandlerProps {
  /** Available actions for the current context */
  availableActions: ActionDefinition[];
  
  /** Current player ID */
  currentPlayer: string;
  
  /** Whether input handling is enabled */
  enabled?: boolean;
  
  /** Input context (e.g., 'game', 'menu', 'dialog') */
  context?: string;
  
  /** Callback when a valid action is triggered */
  onAction: (action: GameAction) => void;
  
  /** Callback when invalid input is detected */
  onInvalidInput?: (input: string, error: string) => void;
  
  /** Callback when input validation fails */
  onValidationError?: (result: InputValidationResult) => void;
  
  /** Custom input mappings */
  customMappings?: InputMapping[];
  
  /** Whether to show input feedback */
  showFeedback?: boolean;
}

/**
 * Input handler component that processes keyboard input and maps it to game actions.
 * Uses Ink's useInput hook for keyboard input processing.
 */
export const InputHandler: React.FC<InputHandlerProps> = ({
  availableActions,
  currentPlayer,
  enabled = true,
  context = 'default',
  onAction,
  onInvalidInput,
  onValidationError,
  customMappings = [],
  showFeedback = false,
}) => {
  const [lastInput, setLastInput] = useState<string>('');
  const [inputFeedback, setInputFeedback] = useState<string>('');
  const [isProcessingInput, setIsProcessingInput] = useState(false);

  // Create input mappings from available actions
  const createInputMappings = useCallback((): InputMapping[] => {
    const mappings: InputMapping[] = [];
    
    // Add mappings from available actions
    availableActions.forEach(action => {
      if (action.enabled && action.keyBinding) {
        mappings.push({
          key: action.keyBinding.toLowerCase(),
          action,
          enabled: true,
          context,
        });
      }
    });
    
    // Add custom mappings
    customMappings.forEach(mapping => {
      if (mapping.enabled) {
        mappings.push(mapping);
      }
    });
    
    return mappings;
  }, [availableActions, customMappings, context]);

  // Validate input against available actions
  const validateInput = useCallback((input: string): InputValidationResult => {
    const mappings = createInputMappings();
    const normalizedInput = input.toLowerCase();
    
    // Find matching mapping
    const mapping = mappings.find(m => m.key === normalizedInput);
    
    if (!mapping) {
      return {
        isValid: false,
        errorMessage: `Unknown key '${input}'. Press 'h' for help.`,
      };
    }
    
    if (!mapping.enabled) {
      return {
        isValid: false,
        errorMessage: `Action '${mapping.action.label}' is not available right now.`,
        suggestedAction: mapping.action,
      };
    }
    
    if (!mapping.action.enabled) {
      return {
        isValid: false,
        errorMessage: `Action '${mapping.action.label}' is disabled.`,
        suggestedAction: mapping.action,
      };
    }
    
    return {
      isValid: true,
    };
  }, [createInputMappings]);

  // Convert input to game action
  const createGameAction = useCallback((input: string, actionDef: ActionDefinition): GameAction => {
    return {
      type: actionDef.id,
      playerId: currentPlayer,
      payload: {
        actionId: actionDef.id,
        keyPressed: input,
        timestamp: Date.now(),
        context,
      },
      timestamp: Date.now(),
    };
  }, [currentPlayer, context]);

  // Process keyboard input
  const processInput = useCallback((input: string, key: any) => {
    if (!enabled || isProcessingInput) {
      return;
    }

    setIsProcessingInput(true);
    setLastInput(input);

    try {
      // Handle special keys
      if (key.escape) {
        // Handle escape key - could be used for canceling actions
        const escapeAction: GameAction = {
          type: 'escape',
          playerId: currentPlayer,
          payload: { key: 'escape', context },
          timestamp: Date.now(),
        };
        onAction(escapeAction);
        setInputFeedback('Escape pressed');
        return;
      }

      if (key.return) {
        // Handle enter key - could be used for confirming actions
        const enterAction: GameAction = {
          type: 'confirm',
          playerId: currentPlayer,
          payload: { key: 'enter', context },
          timestamp: Date.now(),
        };
        onAction(enterAction);
        setInputFeedback('Enter pressed');
        return;
      }

      // Handle arrow keys for navigation
      if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
        const direction = key.upArrow ? 'up' : key.downArrow ? 'down' : 
                         key.leftArrow ? 'left' : 'right';
        
        const navigationAction: GameAction = {
          type: 'navigate',
          playerId: currentPlayer,
          payload: { direction, context },
          timestamp: Date.now(),
        };
        onAction(navigationAction);
        setInputFeedback(`Navigate ${direction}`);
        return;
      }

      // Validate the input
      const validation = validateInput(input);
      
      if (!validation.isValid) {
        if (onValidationError) {
          onValidationError(validation);
        }
        if (onInvalidInput) {
          onInvalidInput(input, validation.errorMessage || 'Invalid input');
        }
        setInputFeedback(validation.errorMessage || 'Invalid input');
        return;
      }

      // Find the corresponding action
      const mappings = createInputMappings();
      const mapping = mappings.find(m => m.key === input.toLowerCase());
      
      if (mapping) {
        const gameAction = createGameAction(input, mapping.action);
        onAction(gameAction);
        setInputFeedback(`Action: ${mapping.action.label}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Input processing error';
      if (onInvalidInput) {
        onInvalidInput(input, errorMessage);
      }
      setInputFeedback(`Error: ${errorMessage}`);
    } finally {
      setIsProcessingInput(false);
      
      // Clear feedback after a delay
      if (showFeedback) {
        setTimeout(() => setInputFeedback(''), 2000);
      }
    }
  }, [
    enabled,
    isProcessingInput,
    currentPlayer,
    context,
    validateInput,
    createInputMappings,
    createGameAction,
    onAction,
    onValidationError,
    onInvalidInput,
    showFeedback,
  ]);

  // Set up input handling
  useInput(processInput, { isActive: enabled });

  // Clear feedback when actions change
  useEffect(() => {
    setInputFeedback('');
  }, [availableActions]);

  // Don't render anything - this is a pure input handler
  return null;
};

/**
 * Hook for managing input mappings and validation.
 */
export const useInputHandler = (
  availableActions: ActionDefinition[],
  currentPlayer: string,
  context: string = 'default'
) => {
  const [inputMappings, setInputMappings] = useState<InputMapping[]>([]);
  const [lastValidation, setLastValidation] = useState<InputValidationResult | null>(null);

  // Update mappings when actions change
  useEffect(() => {
    const mappings: InputMapping[] = availableActions
      .filter(action => action.enabled && action.keyBinding)
      .map(action => ({
        key: action.keyBinding.toLowerCase(),
        action,
        enabled: true,
        context,
      }));
    
    setInputMappings(mappings);
  }, [availableActions, context]);

  // Validate input function
  const validateInput = useCallback((input: string): InputValidationResult => {
    const normalizedInput = input.toLowerCase();
    const mapping = inputMappings.find(m => m.key === normalizedInput);
    
    const result: InputValidationResult = {
      isValid: !!mapping && mapping.enabled && mapping.action.enabled,
      errorMessage: !mapping ? `Unknown key '${input}'` : 
                   !mapping.enabled ? `Mapping disabled` :
                   !mapping.action.enabled ? `Action '${mapping.action.label}' disabled` : undefined,
      suggestedAction: mapping?.action,
    };
    
    setLastValidation(result);
    return result;
  }, [inputMappings]);

  // Create game action from input
  const createGameAction = useCallback((input: string): GameAction | null => {
    const validation = validateInput(input);
    if (!validation.isValid || !validation.suggestedAction) {
      return null;
    }
    
    return {
      type: validation.suggestedAction.id,
      playerId: currentPlayer,
      payload: {
        actionId: validation.suggestedAction.id,
        keyPressed: input,
        context,
      },
      timestamp: Date.now(),
    };
  }, [validateInput, currentPlayer, context]);

  return {
    inputMappings,
    validateInput,
    createGameAction,
    lastValidation,
  };
};

/**
 * Utility functions for input handling.
 */
export const InputUtils = {
  /**
   * Normalize key input for consistent mapping.
   */
  normalizeKey: (input: string): string => {
    return input.toLowerCase().trim();
  },

  /**
   * Check if a key combination is valid.
   */
  isValidKeyBinding: (keyBinding: string): boolean => {
    // Basic validation for key bindings
    if (!keyBinding || keyBinding.length === 0) {
      return false;
    }
    
    // Allow single characters and some special keys
    const validPattern = /^[a-zA-Z0-9]$|^(enter|escape|space|tab)$/i;
    return validPattern.test(keyBinding);
  },

  /**
   * Get help text for available actions.
   */
  getHelpText: (actions: ActionDefinition[]): string => {
    const enabledActions = actions.filter(a => a.enabled && a.keyBinding);
    
    if (enabledActions.length === 0) {
      return 'No actions available';
    }
    
    const helpLines = enabledActions.map(action => 
      `${action.keyBinding.toUpperCase()}: ${action.label}`
    );
    
    return helpLines.join('\n');
  },

  /**
   * Create default navigation actions.
   */
  createNavigationActions: (): ActionDefinition[] => {
    return [
      {
        id: 'navigate_up',
        label: 'Move Up',
        description: 'Navigate up in menus or card selection',
        keyBinding: 'ArrowUp',
        enabled: true,
      },
      {
        id: 'navigate_down',
        label: 'Move Down',
        description: 'Navigate down in menus or card selection',
        keyBinding: 'ArrowDown',
        enabled: true,
      },
      {
        id: 'navigate_left',
        label: 'Move Left',
        description: 'Navigate left in card selection',
        keyBinding: 'ArrowLeft',
        enabled: true,
      },
      {
        id: 'navigate_right',
        label: 'Move Right',
        description: 'Navigate right in card selection',
        keyBinding: 'ArrowRight',
        enabled: true,
      },
      {
        id: 'confirm',
        label: 'Confirm',
        description: 'Confirm selection or action',
        keyBinding: 'Enter',
        enabled: true,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        description: 'Cancel current action or go back',
        keyBinding: 'Escape',
        enabled: true,
      },
    ];
  },
};