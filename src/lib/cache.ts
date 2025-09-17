// Simple in-memory cache to reduce API calls
interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem>();

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default TTL
    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new SimpleCache();

// Auto-cleanup every 5 minutes
setInterval(() => {
  apiCache.cleanup();
}, 300000);
