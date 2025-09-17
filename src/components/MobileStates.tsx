import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, 
  WifiOff, 
  RefreshCw, 
  Search,
  TrendingUp,
  Activity,
  Clock,
  Zap
} from 'lucide-react';

interface MobileErrorStateProps {
  title: string;
  message: string;
  type?: 'error' | 'network' | 'api-busy' | 'empty';
  onRetry?: () => void;
  retryCount?: number;
  maxRetries?: number;
  isRetrying?: boolean;
  className?: string;
}

interface MobileEmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const getErrorIcon = (type: string) => {
  switch (type) {
    case 'network':
      return <WifiOff className="error-icon-mobile text-destructive" />;
    case 'api-busy':
      return <Clock className="error-icon-mobile text-yellow-500" />;
    case 'empty':
      return <Search className="error-icon-mobile text-muted-foreground" />;
    default:
      return <AlertCircle className="error-icon-mobile text-destructive" />;
  }
};

const getErrorEmoji = (type: string) => {
  switch (type) {
    case 'network':
      return '📡';
    case 'api-busy':
      return '⚠️';
    case 'empty':
      return '🔍';
    default:
      return '❌';
  }
};

export function MobileErrorState({
  title,
  message,
  type = 'error',
  onRetry,
  retryCount = 0,
  maxRetries = 5,
  isRetrying = false,
  className = ''
}: MobileErrorStateProps) {
  const icon = getErrorIcon(type);
  const emoji = getErrorEmoji(type);

  return (
    <div className={`container-mobile ${className}`}>
      <div className="error-state-mobile">
        <Card className="bg-gradient-card border-border/50 max-w-md w-full mobile-card-padded">
          <CardContent className="mobile-card-content">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {icon}
              
              <h3 className="error-title-mobile">
                {emoji} {title}
              </h3>
              
              <p className="error-message-mobile">{message}</p>
              
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="retry-button-mobile w-full bg-gradient-primary hover:opacity-90 touch-target"
                  disabled={isRetrying || retryCount >= maxRetries}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : retryCount >= maxRetries ? (
                    '❌ Max Retries Reached'
                  ) : (
                    <>🔄 Try Again</>
                  )}
                </Button>
              )}
              
              {retryCount > 0 && retryCount < maxRetries && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Attempt {retryCount}/{maxRetries}
                </p>
              )}
              
              {type === 'api-busy' && retryCount > 2 && (
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs mx-auto leading-relaxed">
                  ⏱️ High traffic detected. The service might be temporarily overloaded.
                </p>
              )}
              
              {type === 'network' && (
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs mx-auto leading-relaxed">
                  📶 Please check your internet connection and try again.
                </p>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function MobileEmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  className = ''
}: MobileEmptyStateProps) {
  const defaultIcon = <Search className="error-icon-mobile text-muted-foreground" />;

  return (
    <div className={`error-state-mobile ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        {icon || defaultIcon}
        
        <h3 className="error-title-mobile">{title}</h3>
        
        <p className="error-message-mobile">{message}</p>
        
        {onAction && actionLabel && (
          <Button
            onClick={onAction}
            className="retry-button-mobile"
            variant="outline"
          >
            {actionLabel}
          </Button>
        )}
      </motion.div>
    </div>
  );
}

// Preset configurations for common scenarios
export const MobileStates = {
  MarketScannerBusy: (props: { onRetry: () => void; retryCount?: number; isRetrying?: boolean }) => (
    <MobileErrorState
      type="api-busy"
      title="Market Scanner Busy"
      message="⚠️ Market Scanner is temporarily busy due to high demand. Please try again in a moment."
      {...props}
    />
  ),
  
  NetworkError: (props: { onRetry: () => void; retryCount?: number; isRetrying?: boolean }) => (
    <MobileErrorState
      type="network"
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection."
      {...props}
    />
  ),
  
  NoResults: (props: { onClear?: () => void }) => (
    <MobileEmptyState
      title="No Results Found"
      message="Try adjusting your filters or search criteria to find cryptocurrencies."
      actionLabel="🔄 Clear All Filters"
      onAction={props.onClear}
    />
  ),
  
  NoTrades: () => (
    <MobileEmptyState
      icon={<Activity className="error-icon-mobile text-muted-foreground" />}
      title="No Trades Yet"
      message="Start trading to see your history here."
    />
  ),
  
  LoadingState: (message: string = "Loading...") => (
    <div className="error-state-mobile">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-muted-foreground text-sm sm:text-base text-mobile-readable">{message}</p>
    </div>
  ),
  
  AuthRequired: () => (
    <MobileEmptyState
      icon={<Activity className="error-icon-mobile text-muted-foreground" />}
      title="Authentication Required"
      message="Please sign in to access this feature."
    />
  ),
  
  ComingSoon: (feature: string) => (
    <MobileEmptyState
      icon={<Zap className="error-icon-mobile text-primary" />}
      title="Coming Soon"
      message={`${feature} will be available in a future update. Stay tuned!`}
    />
  )
};

export default MobileStates;
