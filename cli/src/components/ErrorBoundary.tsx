import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary component for graceful error handling in the CLI application.
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    this.setState({
      error,
      errorInfo,
    });

    // Log to console for development
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Default fallback UI
      return (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text color="red" bold>
              ❌ Application Error
            </Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text>
              Something went wrong in DeckInABox. The application has encountered an unexpected error.
            </Text>
          </Box>

          {this.state.error && (
            <Box marginBottom={1} borderStyle="single" borderColor="red" padding={1}>
              <Text color="red">
                {this.state.error.message}
              </Text>
            </Box>
          )}

          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>Troubleshooting steps:</Text>
            <Text dimColor>• Try restarting the application</Text>
            <Text dimColor>• Check that all game configurations are valid</Text>
            <Text dimColor>• Ensure your terminal supports the required features</Text>
            <Text dimColor>• Run with --debug flag for more information</Text>
          </Box>

          <Box>
            <Text dimColor>Press Ctrl+C to exit</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a component with error boundary.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}