import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';

/**
 * Confirmation dialog result.
 */
export interface ConfirmationResult {
  /** Whether the action was confirmed */
  confirmed: boolean;
  
  /** The action that was confirmed or cancelled */
  action: string;
  
  /** Timestamp of the decision */
  timestamp: number;
}

/**
 * Props for ConfirmationDialog component.
 */
export interface ConfirmationDialogProps {
  /** Message to display in the dialog */
  message: string;
  
  /** Title for the dialog */
  title?: string;
  
  /** Text for the confirm button */
  confirmText?: string;
  
  /** Text for the cancel button */
  cancelText?: string;
  
  /** Whether the dialog is visible */
  isVisible?: boolean;
  
  /** Whether the dialog is active (can receive input) */
  isActive?: boolean;
  
  /** Default selection (true for confirm, false for cancel) */
  defaultSelection?: boolean;
  
  /** Whether to show key bindings */
  showKeyBindings?: boolean;
  
  /** Action identifier for tracking */
  actionId?: string;
  
  /** Callback when confirmation is made */
  onConfirm?: (result: ConfirmationResult) => void;
  
  /** Callback when cancelled */
  onCancel?: (result: ConfirmationResult) => void;
  
  /** Callback for any decision (confirm or cancel) */
  onDecision?: (result: ConfirmationResult) => void;
  
  /** Custom styling */
  style?: {
    borderColor?: string;
    confirmColor?: string;
    cancelColor?: string;
    selectedColor?: string;
  };
}

/**
 * Confirmation dialog component for important actions.
 * Provides keyboard navigation and clear visual feedback.
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  title = 'Confirm Action',
  confirmText = 'Yes',
  cancelText = 'No',
  isVisible = true,
  isActive = true,
  defaultSelection = false,
  showKeyBindings = true,
  actionId = 'unknown',
  onConfirm,
  onCancel,
  onDecision,
  style = {},
}) => {
  const [selectedOption, setSelectedOption] = useState(defaultSelection);

  const dialogStyle = {
    borderColor: style.borderColor || 'yellow',
    confirmColor: style.confirmColor || 'green',
    cancelColor: style.cancelColor || 'red',
    selectedColor: style.selectedColor || 'blue',
  };

  // Handle confirmation
  const handleConfirm = useCallback(() => {
    const result: ConfirmationResult = {
      confirmed: true,
      action: actionId,
      timestamp: Date.now(),
    };

    if (onConfirm) {
      onConfirm(result);
    }
    if (onDecision) {
      onDecision(result);
    }
  }, [actionId, onConfirm, onDecision]);

  // Handle cancellation
  const handleCancel = useCallback(() => {
    const result: ConfirmationResult = {
      confirmed: false,
      action: actionId,
      timestamp: Date.now(),
    };

    if (onCancel) {
      onCancel(result);
    }
    if (onDecision) {
      onDecision(result);
    }
  }, [actionId, onCancel, onDecision]);

  // Handle selection change
  const handleSelectionChange = useCallback((confirm: boolean) => {
    setSelectedOption(confirm);
  }, []);

  // Handle decision based on current selection
  const handleDecision = useCallback(() => {
    if (selectedOption) {
      handleConfirm();
    } else {
      handleCancel();
    }
  }, [selectedOption, handleConfirm, handleCancel]);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={dialogStyle.borderColor}
      padding={1}
      alignItems="center"
      justifyContent="center"
      minWidth={40}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={dialogStyle.borderColor}>
          {title}
        </Text>
      </Box>

      {/* Message */}
      <Box marginBottom={2} textWrap="wrap">
        <Text>{message}</Text>
      </Box>

      {/* Options */}
      <Box flexDirection="row" justifyContent="center" columnGap={4}>
        {/* Confirm option */}
        <Box flexDirection="row" alignItems="center">
          <Text 
            color={selectedOption ? dialogStyle.selectedColor : dialogStyle.confirmColor}
            bold={selectedOption}
          >
            {selectedOption ? '▶ ' : '  '}
            {confirmText}
          </Text>
          {showKeyBindings && (
            <Text dimColor> (Y/Enter)</Text>
          )}
        </Box>

        {/* Cancel option */}
        <Box flexDirection="row" alignItems="center">
          <Text 
            color={!selectedOption ? dialogStyle.selectedColor : dialogStyle.cancelColor}
            bold={!selectedOption}
          >
            {!selectedOption ? '▶ ' : '  '}
            {cancelText}
          </Text>
          {showKeyBindings && (
            <Text dimColor> (N/Esc)</Text>
          )}
        </Box>
      </Box>

      {/* Help text */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            {showKeyBindings 
              ? 'Use ←→ to navigate, Enter to confirm, Esc to cancel'
              : 'Use arrow keys to navigate, Enter to select'
            }
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing confirmation dialog state.
 */
export const useConfirmationDialog = (actionId: string = 'default') => {
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Confirm Action');
  const [pendingCallback, setPendingCallback] = useState<((confirmed: boolean) => void) | null>(null);

  // Show confirmation dialog
  const showConfirmation = useCallback((
    confirmationMessage: string,
    confirmationTitle?: string,
    callback?: (confirmed: boolean) => void
  ) => {
    setMessage(confirmationMessage);
    setTitle(confirmationTitle || 'Confirm Action');
    setPendingCallback(() => callback || null);
    setIsVisible(true);
    setIsActive(true);
  }, []);

  // Hide confirmation dialog
  const hideConfirmation = useCallback(() => {
    setIsVisible(false);
    setIsActive(false);
    setPendingCallback(null);
  }, []);

  // Handle confirmation result
  const handleResult = useCallback((result: ConfirmationResult) => {
    if (pendingCallback) {
      pendingCallback(result.confirmed);
    }
    hideConfirmation();
  }, [pendingCallback, hideConfirmation]);

  // Confirm current action
  const confirm = useCallback(() => {
    handleResult({
      confirmed: true,
      action: actionId,
      timestamp: Date.now(),
    });
  }, [actionId, handleResult]);

  // Cancel current action
  const cancel = useCallback(() => {
    handleResult({
      confirmed: false,
      action: actionId,
      timestamp: Date.now(),
    });
  }, [actionId, handleResult]);

  return {
    isVisible,
    isActive,
    message,
    title,
    showConfirmation,
    hideConfirmation,
    handleResult,
    confirm,
    cancel,
  };
};

/**
 * Utility functions for confirmation dialogs.
 */
export const ConfirmationUtils = {
  /**
   * Create a promise-based confirmation dialog.
   */
  createPromiseConfirmation: (
    message: string,
    title?: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      // This would typically be implemented with a global dialog manager
      // For now, we'll resolve immediately with false
      resolve(false);
    });
  },

  /**
   * Get confirmation message for common actions.
   */
  getActionMessage: (action: string, target?: string): string => {
    const messages: Record<string, string> = {
      delete: `Are you sure you want to delete${target ? ` ${target}` : ' this item'}?`,
      quit: 'Are you sure you want to quit the game?',
      restart: 'Are you sure you want to restart the game?',
      save: `Are you sure you want to save${target ? ` ${target}` : ' the game'}?`,
      load: `Are you sure you want to load${target ? ` ${target}` : ' this game'}? Current progress will be lost.`,
      forfeit: 'Are you sure you want to forfeit the game?',
      reset: 'Are you sure you want to reset all settings?',
    };

    return messages[action] || `Are you sure you want to ${action}?`;
  },

  /**
   * Check if an action requires confirmation.
   */
  requiresConfirmation: (action: string): boolean => {
    const confirmationRequired = [
      'delete',
      'quit',
      'restart',
      'forfeit',
      'reset',
      'load',
    ];

    return confirmationRequired.includes(action);
  },
};