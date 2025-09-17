import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary Caught Error:', error);
    console.error('🚨 Error Info:', errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You could send this to Sentry, LogRocket, etc.
      this.logErrorToService(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real app, you'd send this to your error tracking service
    console.log('Logging error to service:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  We encountered an unexpected error. Our team has been notified and is working on a fix.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left bg-muted/50 border border-border rounded-lg p-4 mt-4">
                    <summary className="cursor-pointer font-medium text-sm">
                      🔧 Developer Debug Information
                    </summary>
                    <div className="mt-3 space-y-2">
                      <div>
                        <strong className="text-xs">Error:</strong>
                        <pre className="text-xs bg-destructive/10 p-2 rounded mt-1 overflow-auto">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      
                      {this.state.error.stack && (
                        <div>
                          <strong className="text-xs">Stack Trace:</strong>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong className="text-xs">Component Stack:</strong>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          <strong>Reproduction Steps:</strong><br />
                          1. Current URL: {window.location.href}<br />
                          2. User Agent: {navigator.userAgent.substring(0, 100)}...<br />
                          3. Timestamp: {new Date().toISOString()}
                        </p>
                      </div>
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome}>
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  If this problem persists, please contact support with the error details above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('🚨 Application Error:', error);
    if (errorInfo) {
      console.error('🚨 Error Info:', errorInfo);
    }
    
    // You could also trigger a toast notification here
    // toast.error(`Error: ${error.message}`);
  }, []);
};
