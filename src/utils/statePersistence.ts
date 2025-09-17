// State persistence utilities for maintaining app state across page refreshes

import { toast } from 'sonner';

// Storage keys
export const STORAGE_KEYS = {
  APP_STATE: 'cryptotracker_app_state',
  USER_PREFERENCES: 'cryptotracker_user_preferences',
  TAB_STATE: 'cryptotracker_tab_state',
  PORTFOLIO_STATE: 'cryptotracker_portfolio_state',
  CACHE_STATE: 'cryptotracker_cache_state'
} as const;

// State persistence configuration
interface PersistenceConfig {
  key: string;
  version: number;
  expiry?: number; // Time in milliseconds
  compress?: boolean;
}

interface StoredState<T> {
  data: T;
  timestamp: number;
  version: number;
  expires?: number;
}

/**
 * Generic state persistence utility
 */
export class StatePersistence<T = any> {
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;
  }

  /**
   * Save state to localStorage
   */
  save(data: T): boolean {
    try {
      const now = Date.now();
      const storedState: StoredState<T> = {
        data,
        timestamp: now,
        version: this.config.version,
        expires: this.config.expiry ? now + this.config.expiry : undefined
      };

      const serialized = JSON.stringify(storedState);
      localStorage.setItem(this.config.key, serialized);
      
      return true;
    } catch (error) {
      console.warn(`Failed to save state for ${this.config.key}:`, error);
      return false;
    }
  }

  /**
   * Load state from localStorage
   */
  load(): T | null {
    try {
      const stored = localStorage.getItem(this.config.key);
      if (!stored) return null;

      const parsedState: StoredState<T> = JSON.parse(stored);
      
      // Check version compatibility
      if (parsedState.version !== this.config.version) {
        console.warn(`Version mismatch for ${this.config.key}. Expected ${this.config.version}, got ${parsedState.version}`);
        this.clear();
        return null;
      }

      // Check expiry
      if (parsedState.expires && Date.now() > parsedState.expires) {
        console.warn(`Expired state for ${this.config.key}`);
        this.clear();
        return null;
      }

      return parsedState.data;
    } catch (error) {
      console.warn(`Failed to load state for ${this.config.key}:`, error);
      return null;
    }
  }

  /**
   * Clear stored state
   */
  clear(): void {
    try {
      localStorage.removeItem(this.config.key);
    } catch (error) {
      console.warn(`Failed to clear state for ${this.config.key}:`, error);
    }
  }

  /**
   * Check if state exists and is valid
   */
  exists(): boolean {
    return this.load() !== null;
  }

  /**
   * Get state age in milliseconds
   */
  getAge(): number | null {
    try {
      const stored = localStorage.getItem(this.config.key);
      if (!stored) return null;

      const parsedState: StoredState<T> = JSON.parse(stored);
      return Date.now() - parsedState.timestamp;
    } catch (error) {
      return null;
    }
  }
}

// Pre-configured persistence instances
export const appStatePersistence = new StatePersistence({
  key: STORAGE_KEYS.APP_STATE,
  version: 1,
  expiry: 24 * 60 * 60 * 1000 // 24 hours
});

export const userPreferencesPersistence = new StatePersistence({
  key: STORAGE_KEYS.USER_PREFERENCES,
  version: 1
  // No expiry for user preferences
});

export const tabStatePersistence = new StatePersistence({
  key: STORAGE_KEYS.TAB_STATE,
  version: 1,
  expiry: 60 * 60 * 1000 // 1 hour
});

export const portfolioStatePersistence = new StatePersistence({
  key: STORAGE_KEYS.PORTFOLIO_STATE,
  version: 1,
  expiry: 30 * 60 * 1000 // 30 minutes
});

// Tab state management
export interface TabState {
  activeTab: string;
  tabHistory: string[];
  tabData: Record<string, any>;
  lastUpdated: number;
}

/**
 * Tab state manager for persistent tab navigation
 */
export class TabStateManager {
  private persistence = tabStatePersistence;
  private currentState: TabState = {
    activeTab: '',
    tabHistory: [],
    tabData: {},
    lastUpdated: Date.now()
  };

  constructor() {
    this.loadState();
  }

  /**
   * Load tab state from storage
   */
  private loadState(): void {
    const stored = this.persistence.load();
    if (stored) {
      this.currentState = { ...this.currentState, ...stored };
    }
  }

  /**
   * Save current tab state
   */
  private saveState(): void {
    this.currentState.lastUpdated = Date.now();
    this.persistence.save(this.currentState);
  }

  /**
   * Set active tab
   */
  setActiveTab(tabId: string, data?: any): void {
    if (this.currentState.activeTab !== tabId) {
      // Add to history if it's a new tab
      if (!this.currentState.tabHistory.includes(tabId)) {
        this.currentState.tabHistory.push(tabId);
        
        // Limit history to 10 items
        if (this.currentState.tabHistory.length > 10) {
          this.currentState.tabHistory.shift();
        }
      }
    }

    this.currentState.activeTab = tabId;
    
    if (data) {
      this.currentState.tabData[tabId] = data;
    }

    this.saveState();
  }

  /**
   * Get active tab
   */
  getActiveTab(): string {
    return this.currentState.activeTab;
  }

  /**
   * Get tab data
   */
  getTabData(tabId: string): any {
    return this.currentState.tabData[tabId];
  }

  /**
   * Set tab data
   */
  setTabData(tabId: string, data: any): void {
    this.currentState.tabData[tabId] = data;
    this.saveState();
  }

  /**
   * Get tab history
   */
  getTabHistory(): string[] {
    return [...this.currentState.tabHistory];
  }

  /**
   * Clear tab state
   */
  clear(): void {
    this.currentState = {
      activeTab: '',
      tabHistory: [],
      tabData: {},
      lastUpdated: Date.now()
    };
    this.persistence.clear();
  }

  /**
   * Get last tab or default
   */
  getLastTabOrDefault(defaultTab: string): string {
    const history = this.getTabHistory();
    return history.length > 0 ? history[history.length - 1] : defaultTab;
  }
}

// User preferences management
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
  notifications: {
    push: boolean;
    email: boolean;
    sound: boolean;
  };
  display: {
    reducedMotion: boolean;
    highContrast: boolean;
    compactMode: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
}

/**
 * User preferences manager
 */
export class UserPreferencesManager {
  private persistence = userPreferencesPersistence;
  private defaultPreferences: UserPreferences = {
    theme: 'system',
    currency: 'usd',
    language: 'en',
    notifications: {
      push: true,
      email: false,
      sound: true
    },
    display: {
      reducedMotion: false,
      highContrast: false,
      compactMode: false
    },
    privacy: {
      analytics: true,
      crashReporting: true
    }
  };

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    const stored = this.persistence.load();
    return { ...this.defaultPreferences, ...stored };
  }

  /**
   * Update user preferences
   */
  updatePreferences(updates: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...updates };
    
    if (this.persistence.save(updated)) {
      toast.success('Preferences saved');
    } else {
      toast.error('Failed to save preferences');
    }
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.persistence.clear();
    toast.success('Preferences reset to defaults');
  }
}

// App state recovery
export interface AppRecoveryState {
  route: string;
  scrollPosition: number;
  formData: Record<string, any>;
  timestamp: number;
}

/**
 * App state recovery manager for handling crashes/refreshes
 */
export class AppRecoveryManager {
  private persistence = new StatePersistence<AppRecoveryState>({
    key: STORAGE_KEYS.APP_STATE,
    version: 1,
    expiry: 60 * 60 * 1000 // 1 hour
  });

  /**
   * Save current app state for recovery
   */
  saveRecoveryState(state: Partial<AppRecoveryState>): void {
    const currentState: AppRecoveryState = {
      route: window.location.pathname,
      scrollPosition: window.scrollY,
      formData: {},
      timestamp: Date.now(),
      ...state
    };

    this.persistence.save(currentState);
  }

  /**
   * Get recovery state
   */
  getRecoveryState(): AppRecoveryState | null {
    return this.persistence.load();
  }

  /**
   * Clear recovery state
   */
  clearRecoveryState(): void {
    this.persistence.clear();
  }

  /**
   * Check if recovery is needed
   */
  needsRecovery(): boolean {
    const state = this.getRecoveryState();
    if (!state) return false;

    // Only suggest recovery if it's recent (within 10 minutes)
    const age = Date.now() - state.timestamp;
    return age < 10 * 60 * 1000;
  }

  /**
   * Perform app recovery
   */
  performRecovery(): AppRecoveryState | null {
    const state = this.getRecoveryState();
    if (!state || !this.needsRecovery()) {
      return null;
    }

    try {
      // Navigate to the previous route if different
      if (state.route && state.route !== window.location.pathname) {
        window.history.pushState(null, '', state.route);
      }

      // Restore scroll position
      if (state.scrollPosition > 0) {
        setTimeout(() => {
          window.scrollTo(0, state.scrollPosition);
        }, 100);
      }

      toast.success('Previous session restored', {
        description: 'Your previous activity has been recovered.'
      });

      return state;
    } catch (error) {
      console.error('Failed to perform recovery:', error);
      toast.error('Failed to restore previous session');
      return null;
    } finally {
      this.clearRecoveryState();
    }
  }
}

// Global instances
export const tabStateManager = new TabStateManager();
export const userPreferencesManager = new UserPreferencesManager();
export const appRecoveryManager = new AppRecoveryManager();

// React hooks for state persistence
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for persistent state that survives page refreshes
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  expiry?: number
): [T, (value: T) => void] {
  const [persistence] = useState(() => new StatePersistence<T>({
    key: `${STORAGE_KEYS.APP_STATE}_${key}`,
    version: 1,
    expiry
  }));

  const [state, setState] = useState<T>(() => {
    const stored = persistence.load();
    return stored !== null ? stored : defaultValue;
  });

  const setPersistentState = useCallback((value: T) => {
    setState(value);
    persistence.save(value);
  }, [persistence]);

  return [state, setPersistentState];
}

/**
 * Hook for tab state management
 */
export function useTabState(defaultTab: string) {
  const [activeTab, setActiveTab] = useState(() => {
    return tabStateManager.getActiveTab() || defaultTab;
  });

  const changeTab = useCallback((tabId: string, data?: any) => {
    setActiveTab(tabId);
    tabStateManager.setActiveTab(tabId, data);
  }, []);

  const getTabData = useCallback((tabId: string) => {
    return tabStateManager.getTabData(tabId);
  }, []);

  const setTabData = useCallback((tabId: string, data: any) => {
    tabStateManager.setTabData(tabId, data);
  }, []);

  return {
    activeTab,
    changeTab,
    getTabData,
    setTabData,
    history: tabStateManager.getTabHistory()
  };
}

/**
 * Hook for user preferences
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState(() => {
    return userPreferencesManager.getPreferences();
  });

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    userPreferencesManager.updatePreferences(updates);
  }, [preferences]);

  const resetPreferences = useCallback(() => {
    const defaults = userPreferencesManager.getPreferences();
    setPreferences(defaults);
    userPreferencesManager.reset();
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences
  };
}

// Cleanup function for expired storage
export function cleanupExpiredStorage(): void {
  const now = Date.now();
  
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expires && now > parsed.expires) {
          localStorage.removeItem(key);
          console.log(`Cleaned up expired storage: ${key}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup storage key ${key}:`, error);
    }
  });
}
