import { useEffect, useRef, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

// Enhanced Cache Management
export class PerformanceCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, data: any, ttl = 300000) { // 5 minutes default TTL
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  private cleanup() {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach(key => this.cache.delete(key));

    // If still over limit, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2)); // Remove 20%
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global performance cache instance
export const performanceCache = new PerformanceCache(2000);

// WebSocket Connection Manager
export class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url: string, onMessage: (data: any) => void, onError?: (error: Event) => void): string {
    const id = this.generateId();
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log(`WebSocket connected: ${id}`);
        this.reconnectAttempts.set(id, 0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error: ${id}`, error);
        if (onError) onError(error);
      };

      ws.onclose = () => {
        console.log(`WebSocket closed: ${id}`);
        this.connections.delete(id);
        this.handleReconnection(id, url, onMessage, onError);
      };

      this.connections.set(id, ws);
      return id;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  disconnect(id: string) {
    const ws = this.connections.get(id);
    if (ws) {
      ws.close();
      this.connections.delete(id);
      this.reconnectAttempts.delete(id);
    }
  }

  disconnectAll() {
    for (const [id, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
    this.reconnectAttempts.clear();
  }

  send(id: string, data: any) {
    const ws = this.connections.get(id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private handleReconnection(
    id: string, 
    url: string, 
    onMessage: (data: any) => void, 
    onError?: (error: Event) => void
  ) {
    const attempts = this.reconnectAttempts.get(id) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket ${id} (attempt ${attempts + 1})`);
        this.reconnectAttempts.set(id, attempts + 1);
        this.connect(url, onMessage, onError);
      }, this.reconnectDelay * Math.pow(2, attempts)); // Exponential backoff
    }
  }

  private generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionStats() {
    return {
      activeConnections: this.connections.size,
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts)
    };
  }
}

// Global WebSocket manager
export const wsManager = new WebSocketManager();

// Virtual Scrolling Hook
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + overscan, items.length);

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleItems: items.slice(Math.max(0, startIndex - overscan), endIndex)
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems: visibleRange.visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex
  };
}

// Intersection Observer Hook for Lazy Loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = { threshold: 0.1 }
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}

// Debounced API Call Hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay]
  );
}

// Memory Management Utilities
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryUsage: number = 0;
  private threshold: number = 50 * 1024 * 1024; // 50MB threshold

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  checkMemoryUsage(): boolean {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.memoryUsage = memory.usedJSHeapSize;
      return this.memoryUsage > this.threshold;
    }
    return false;
  }

  forceGarbageCollection(): void {
    // Clear various caches
    performanceCache.clear();
    
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  getMemoryStats() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        threshold: this.threshold
      };
    }
    return null;
  }
}

// Image Lazy Loading Component
export function LazyImage({ 
  src, 
  alt, 
  placeholder, 
  className = '',
  ...props 
}: {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  [key: string]: any;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const isVisible = useIntersectionObserver(imgRef);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : placeholder}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        opacity: loaded ? 1 : 0.5,
        transition: 'opacity 0.3s ease-in-out'
      }}
      {...props}
    />
  );
}

// Performance Monitoring Hook
export function usePerformanceMonitoring(componentName: string) {
  const renderStartTime = useRef<number>(Date.now());
  const mountTime = useRef<number>(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
    
    return () => {
      const totalTime = Date.now() - mountTime.current;
      console.log(`Component ${componentName} lifetime: ${totalTime}ms`);
    };
  }, [componentName]);

  const measureRender = useCallback(() => {
    const renderTime = Date.now() - renderStartTime.current;
    console.log(`${componentName} render time: ${renderTime}ms`);
    renderStartTime.current = Date.now();
  }, [componentName]);

  useEffect(() => {
    renderStartTime.current = Date.now();
  });

  return { measureRender };
}

// Bundle Analyzer (Development Only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    console.group('Bundle Analysis');
    console.log('Script files:', scripts.length);
    console.log('Stylesheet files:', styles.length);
    
    scripts.forEach((script: any) => {
      console.log(`Script: ${script.src}`);
    });
    
    styles.forEach((style: any) => {
      console.log(`Stylesheet: ${style.href}`);
    });
    console.groupEnd();
  }
}

// Export all utilities
export const performanceUtils = {
  cache: performanceCache,
  wsManager,
  memoryManager: MemoryManager.getInstance(),
  analyzeBundleSize
};
