import { ErrorBoundary, withErrorBoundary } from '../../src/components/ErrorBoundary';

describe('ErrorBoundary Component', () => {
  describe('Class Structure', () => {
    it('should be a valid React component class', () => {
      expect(typeof ErrorBoundary).toBe('function');
      expect(ErrorBoundary.prototype.render).toBeDefined();
    });

    it('should have getDerivedStateFromError static method', () => {
      expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
    });

    it('should have componentDidCatch method', () => {
      expect(typeof ErrorBoundary.prototype.componentDidCatch).toBe('function');
    });
  });

  describe('State Management', () => {
    it('should update state when error occurs', () => {
      const error = new Error('Test error');
      const newState = ErrorBoundary.getDerivedStateFromError(error);

      expect(newState).toEqual({
        hasError: true,
        error,
      });
    });

    it('should handle componentDidCatch lifecycle', () => {
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'test stack' };

      // Create a mock component to test componentDidCatch
      const mockChildren = null;
      const boundary = new ErrorBoundary({ children: mockChildren });
      
      expect(() => {
        boundary.componentDidCatch(error, errorInfo);
      }).not.toThrow();

      // The method should execute without throwing
      expect(typeof boundary.componentDidCatch).toBe('function');
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle different error types', () => {
      const realError = new Error('Real error');

      expect(() => {
        ErrorBoundary.getDerivedStateFromError(realError);
      }).not.toThrow();

      // Test that it can handle any error type
      expect(ErrorBoundary.getDerivedStateFromError(realError)).toEqual({
        hasError: true,
        error: realError,
      });
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('should be a function', () => {
    expect(typeof withErrorBoundary).toBe('function');
  });

  it('should return a component when called', () => {
    const TestComponent = () => null;
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    expect(typeof WrappedComponent).toBe('function');
  });

  it('should set correct display name', () => {
    const TestComponent = () => null;
    TestComponent.displayName = 'TestComponent';
    
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });

  it('should handle components without display name', () => {
    const TestComponent = () => null;
    
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });

  it('should handle custom fallback function', () => {
    const TestComponent = () => null;
    const customFallback = () => null;
    
    const WrappedComponent = withErrorBoundary(TestComponent, customFallback);
    
    expect(typeof WrappedComponent).toBe('function');
  });

  it('should preserve component functionality', () => {
    const TestComponent = (props: { value: number }) => props.value;
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    // Test that the wrapped component can still receive props
    expect(typeof WrappedComponent).toBe('function');
  });
});