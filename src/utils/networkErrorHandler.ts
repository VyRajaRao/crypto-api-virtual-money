// Network error handling utilities for robust API communication

import * as React from 'react';
import { toast } from 'sonner';

export interface NetworkError extends Error {
  code?: string;
  status?: number;
  isNetworkError: boolean;
  isRetryable: boolean;
}

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  retryIf?: (error: NetworkError) => boolean;
}

// Default retry configuration
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: true,
  retryIf: (error: NetworkError) => error.isRetryable
};

// Network error types
export const NetworkErrorTypes = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  UNKNOWN: 'UNKNOWN'
} as const;

export type NetworkErrorType = typeof NetworkErrorTypes[keyof typeof NetworkErrorTypes];

/**
 * Create a structured network error
 */
export function createNetworkError(
  message: string,
  type: NetworkErrorType,
  status?: number,
  isRetryable: boolean = true
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.name = 'NetworkError';
  error.code = type;
  error.status = status;
  error.isNetworkError = true;
  error.isRetryable = isRetryable;
  return error;
}

/**
 * Determine error type from fetch response
 */
export function classifyNetworkError(error: any): NetworkError {
  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return createNetworkError(
      'Connection failed. Please check your internet connection.',
      NetworkErrorTypes.CONNECTION_ERROR,
      0,
      true
    );
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return createNetworkError(
      'Request timed out. Please try again.',
      NetworkErrorTypes.TIMEOUT,
      408,
      true
    );
  }

  // Handle HTTP status errors
  if (error.status) {
    switch (Math.floor(error.status / 100)) {
      case 4:
        if (error.status === 401) {
          return createNetworkError(
            'Authentication failed. Please sign in again.',
            NetworkErrorTypes.UNAUTHORIZED,
            401,
            false
          );
        }
        if (error.status === 404) {
          return createNetworkError(
            'Resource not found.',
            NetworkErrorTypes.NOT_FOUND,
            404,
            false
          );
        }
        if (error.status === 429) {
          return createNetworkError(
            'Too many requests. Please wait a moment and try again.',
            NetworkErrorTypes.RATE_LIMIT,
            429,
            true
          );
        }
        return createNetworkError(
          error.message || 'Bad request.',
          NetworkErrorTypes.BAD_REQUEST,
          error.status,
          false
        );
      
      case 5:
        return createNetworkError(
          'Server error. Please try again later.',
          NetworkErrorTypes.SERVER_ERROR,
          error.status,
          true
        );
    }
  }

  // Handle unknown errors
  return createNetworkError(
    error.message || 'An unknown error occurred.',
    NetworkErrorTypes.UNKNOWN,
    undefined,
    true
  );
}

/**
 * Sleep for a given amount of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: NetworkError;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = classifyNetworkError(error);
      
      // Don't retry if the error is not retryable
      if (!opts.retryIf(lastError)) {
        throw lastError;
      }

      // Don't retry on the last attempt
      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = opts.backoff 
        ? opts.delay * Math.pow(2, attempt - 1)
        : opts.delay;

      console.warn(
        `Request failed (attempt ${attempt}/${opts.maxAttempts}): ${lastError.message}. Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Enhanced fetch with retry and error handling
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await retryWithBackoff(async () => {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        throw createNetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status >= 500 ? NetworkErrorTypes.SERVER_ERROR : NetworkErrorTypes.BAD_REQUEST,
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      return response;
    }, retryOptions);

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Show user-friendly error toast
 */
export function showNetworkErrorToast(error: NetworkError) {
  const getToastConfig = (error: NetworkError) => {
    switch (error.code) {
      case NetworkErrorTypes.CONNECTION_ERROR:
        return {
          title: 'Connection Problem',
          description: 'Please check your internet connection and try again.',
          action: {
            label: 'Retry',
            onClick: () => window.location.reload()
          }
        };
      
      case NetworkErrorTypes.TIMEOUT:
        return {
          title: 'Request Timeout',
          description: 'The request is taking too long. Please try again.',
        };
      
      case NetworkErrorTypes.RATE_LIMIT:
        return {
          title: 'Too Many Requests',
          description: 'Please wait a moment before trying again.',
        };
      
      case NetworkErrorTypes.SERVER_ERROR:
        return {
          title: 'Server Error',
          description: 'Something went wrong on our end. Please try again later.',
        };
      
      case NetworkErrorTypes.UNAUTHORIZED:
        return {
          title: 'Authentication Error',
          description: 'Please sign in again to continue.',
          action: {
            label: 'Sign In',
            onClick: () => window.location.href = '/auth'
          }
        };
      
      default:
        return {
          title: 'Error',
          description: error.message,
        };
    }
  };

  const config = getToastConfig(error);
  
  toast.error(config.title, {
    description: config.description,
    action: config.action
  });
}

/**
 * Network status monitor
 */
export class NetworkStatusMonitor {
  private listeners: ((online: boolean) => void)[] = [];
  private _isOnline = navigator.onLine;

  constructor() {
    this.initialize();
  }

  private initialize() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this._isOnline = true;
    this.notifyListeners(true);
    toast.success('Connection restored', {
      description: 'You are back online!'
    });
  };

  private handleOffline = () => {
    this._isOnline = false;
    this.notifyListeners(false);
    toast.error('Connection lost', {
      description: 'Please check your internet connection.'
    });
  };

  private notifyListeners(online: boolean) {
    this.listeners.forEach(listener => listener(online));
  }

  public get isOnline(): boolean {
    return this._isOnline;
  }

  public addListener(callback: (online: boolean) => void) {
    this.listeners.push(callback);
  }

  public removeListener(callback: (online: boolean) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  public destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners = [];
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkStatusMonitor();

/**
 * React hook for network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(networkMonitor.isOnline);

  React.useEffect(() => {
    const handleStatusChange = (online: boolean) => {
      setIsOnline(online);
    };

    networkMonitor.addListener(handleStatusChange);
    return () => networkMonitor.removeListener(handleStatusChange);
  }, []);

  return isOnline;
}

