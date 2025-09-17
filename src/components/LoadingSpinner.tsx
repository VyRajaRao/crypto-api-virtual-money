import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full mb-4`}
      />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Activity className={`${iconSize[size]} text-primary`} />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

// Simple inline loading component
export function InlineLoader({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full`}
    />
  );
}

// Fast loading skeleton for cards
export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-gradient-card border-border/50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-full"></div>
          <div>
            <div className="w-20 h-4 bg-muted rounded mb-2"></div>
            <div className="w-12 h-3 bg-muted rounded"></div>
          </div>
        </div>
        <div className="w-16 h-8 bg-muted rounded"></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="w-16 h-3 bg-muted rounded mb-2"></div>
          <div className="w-20 h-4 bg-muted rounded"></div>
        </div>
        <div>
          <div className="w-16 h-3 bg-muted rounded mb-2"></div>
          <div className="w-20 h-4 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Fast table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-background/30 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full"></div>
            <div>
              <div className="w-24 h-4 bg-muted rounded mb-2"></div>
              <div className="w-16 h-3 bg-muted rounded"></div>
            </div>
          </div>
          <div className="w-20 h-4 bg-muted rounded"></div>
          <div className="w-16 h-4 bg-muted rounded"></div>
          <div className="w-24 h-4 bg-muted rounded"></div>
        </div>
      ))}
    </div>
  );
}
