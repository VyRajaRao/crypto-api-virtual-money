import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { priceService } from '@/services/priceService';
import { tradingEngine } from '@/services/tradingEngine';
import { alertsService } from '@/services/alertsService';
import { appOrchestrator } from '@/services/appOrchestrator';

// Types
export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  total_invested: number;
  total_value: number;
  portfolio_value: number;
  total_pnl: number;
  daily_pnl: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  name?: string;
  image?: string;
  amount: number;
  avg_buy_price: number;
  total_invested: number;
  current_price: number;
  total_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total_usd: number;
  fees_usd: number;
  status: string;
  order_type: string;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  name?: string;
  image?: string;
  direction: 'above' | 'below';
  target_price: number;
  current_price: number;
  condition_type: 'price' | 'volume' | 'price_change' | 'market_cap';
  priority: 'low' | 'medium' | 'high';
  active: boolean;
  recurring: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly';
  notification_methods: string[];
  message?: string;
  created_at: string;
  triggered_at?: string;
  updated_at: string;
}

export interface PriceData {
  symbol: string;
  coingecko_id: string;
  name: string;
  image?: string;
  price_usd: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  payload?: any;
}

interface AppState {
  // Data
  user: any;
  wallet: Wallet | null;
  portfolio: Portfolio[];
  trades: Trade[];
  alerts: Alert[];
  notifications: Notification[];
  prices: Record<string, PriceData>;
  
  // Loading states
  isLoading: boolean;
  isLoadingWallet: boolean;
  isLoadingPortfolio: boolean;
  isLoadingTrades: boolean;
  isLoadingAlerts: boolean;
  
  // Error states
  error: string | null;
  
  // UI state
  lastUpdated: Date | null;
  
  // Actions
  setUser: (user: any) => void;
  initializeUser: (userId: string) => Promise<void>;
  
  // Wallet actions
  loadWallet: () => Promise<void>;
  updateWallet: (updates: Partial<Wallet>) => Promise<void>;
  
  // Portfolio actions
  loadPortfolio: () => Promise<void>;
  addToPortfolio: (symbol: string, amount: number, buyPrice: number) => Promise<void>;
  removeFromPortfolio: (id: string) => Promise<void>;
  updatePortfolioValues: () => Promise<void>;
  
  // Trading actions
  executeTrade: (trade: {
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price?: number;
    orderType?: string;
  }) => Promise<void>;
  loadTrades: () => Promise<void>;
  
  // Alert actions
  loadAlerts: () => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAlert: (id: string, updates: Partial<Alert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  
  // Price actions
  loadPrices: (symbols?: string[]) => Promise<void>;
  getCurrentPrice: (symbol: string) => number;
  
  // Notification actions
  loadNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  
  // Utility actions
  refreshAll: () => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    wallet: null,
    portfolio: [],
    trades: [],
    alerts: [],
    notifications: [],
    prices: {},
    
    isLoading: false,
    isLoadingWallet: false,
    isLoadingPortfolio: false,
    isLoadingTrades: false,
    isLoadingAlerts: false,
    
    error: null,
    lastUpdated: null,
    
    // Actions
    setUser: (user) => {
      set({ user });
      if (user?.id) {
        get().initializeUser(user.id);
      }
    },
    
  initializeUser: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Initialize app orchestrator
      await appOrchestrator.onAuthStateChange({ id: userId });
      
      // Load all data
      await Promise.all([
        get().loadWallet(),
        get().loadPortfolio(),
        get().loadTrades(),
        get().loadAlerts(),
        get().loadNotifications(),
        get().loadPrices()
      ]);
      
      set({ lastUpdated: new Date(), isLoading: false });
      
    } catch (error: any) {
      console.error('Error initializing user:', error);
      set({ error: error.message, isLoading: false });
    }
  },
    
    // Wallet actions
    loadWallet: async () => {
      const { user } = get();
      if (!user?.id) return;
      
      try {
        set({ isLoadingWallet: true });
        
        const { data, error } = await supabase
          .from('wallet')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        set({ wallet: data, isLoadingWallet: false });
        
      } catch (error: any) {
        console.error('Error loading wallet:', error);
        set({ error: error.message, isLoadingWallet: false });
      }
    },
    
    updateWallet: async (updates) => {
      const { user, wallet } = get();
      if (!user?.id || !wallet) return;
      
      try {
        const { data, error } = await supabase
          .from('wallet')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select()
          .single();
          
        if (error) throw error;
        
        set({ wallet: data });
        
      } catch (error: any) {
        console.error('Error updating wallet:', error);
        toast.error('Failed to update wallet');
      }
    },
    
    // Portfolio actions
    loadPortfolio: async () => {
      const { user } = get();
      if (!user?.id) return;
      
      try {
        set({ isLoadingPortfolio: true });
        
        const { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', user.id)
          .order('total_value', { ascending: false });
          
        if (error) throw error;
        
        set({ portfolio: data || [], isLoadingPortfolio: false });
        
      } catch (error: any) {
        console.error('Error loading portfolio:', error);
        set({ error: error.message, isLoadingPortfolio: false });
      }
    },
    
    addToPortfolio: async (symbol, amount, buyPrice) => {
      const { user } = get();
      if (!user?.id) return;
      
      try {
        const totalInvested = amount * buyPrice;
        
        const { data, error } = await supabase
          .from('portfolios')
          .upsert({
            user_id: user.id,
            symbol: symbol.toLowerCase(),
            coingecko_id: symbol.toLowerCase(),
            amount,
            avg_buy_price: buyPrice,
            total_invested: totalInvested,
            current_price: buyPrice, // Will be updated by price updates
            total_value: totalInvested
          }, { 
            onConflict: 'user_id,symbol',
            ignoreDuplicates: false 
          })
          .select();
          
        if (error) throw error;
        
        await get().loadPortfolio();
        toast.success('Added to portfolio successfully');
        
      } catch (error: any) {
        console.error('Error adding to portfolio:', error);
        toast.error('Failed to add to portfolio');
      }
    },
    
    removeFromPortfolio: async (id) => {
      try {
        const { error } = await supabase
          .from('portfolios')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        set(state => ({
          portfolio: state.portfolio.filter(item => item.id !== id)
        }));
        
        toast.success('Removed from portfolio');
        
      } catch (error: any) {
        console.error('Error removing from portfolio:', error);
        toast.error('Failed to remove from portfolio');
      }
    },
    
    updatePortfolioValues: async () => {
      const { portfolio, prices } = get();
      
      try {
        const updates = portfolio.map(item => {
          const priceData = prices[item.symbol];
          if (!priceData) return null;
          
          const currentPrice = priceData.price_usd;
          const totalValue = item.amount * currentPrice;
          const unrealizedPnl = totalValue - item.total_invested;
          
          return {
            id: item.id,
            current_price: currentPrice,
            total_value: totalValue,
            unrealized_pnl: unrealizedPnl,
            name: priceData.name,
            image: priceData.image,
            updated_at: new Date().toISOString()
          };
        }).filter(Boolean);
        
        if (updates.length > 0) {
          const { error } = await supabase
            .from('portfolios')
            .upsert(updates);
            
          if (error) throw error;
          
          await get().loadPortfolio();
        }
        
      } catch (error: any) {
        console.error('Error updating portfolio values:', error);
      }
    },
    
  // Trading actions
  executeTrade: async (trade) => {
    const { user } = get();
    if (!user?.id) return;
    
    try {
      const tradeRequest = {
        userId: user.id,
        symbol: trade.symbol.toLowerCase(),
        side: trade.side,
        amount: trade.amount,
        orderType: trade.orderType || 'market',
        price: trade.price
      };
      
      let result;
      if (tradeRequest.orderType === 'market') {
        result = await tradingEngine.executeMarketOrder(tradeRequest);
      } else if (tradeRequest.orderType === 'limit') {
        result = await tradingEngine.placeLimitOrder(tradeRequest);
      }
      
      if (!result?.success) {
        throw new Error(result?.error || 'Trade failed');
      }
      
      // Refresh data
      await Promise.all([
        get().loadWallet(),
        get().loadPortfolio(),
        get().loadTrades()
      ]);
      
      const orderType = tradeRequest.orderType === 'limit' ? 'Limit' : 'Market';
      const status = result.trade?.status === 'pending' ? ' (Pending)' : ' Executed!';
      
      toast.success(
        `${orderType} ${trade.side.toUpperCase()} order${status}`,
        {
          description: `${trade.amount} ${trade.symbol.toUpperCase()}${trade.price ? ` at $${trade.price.toLocaleString()}` : ''}`
        }
      );
      
    } catch (error: any) {
      console.error('Error executing trade:', error);
      toast.error(error.message || 'Trade failed');
      throw error;
    }
  },
    
    loadTrades: async () => {
      const { user } = get();
      if (!user?.id) return;
      
      try {
        set({ isLoadingTrades: true });
        
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
          
        if (error) throw error;
        
        set({ trades: data || [], isLoadingTrades: false });
        
      } catch (error: any) {
        console.error('Error loading trades:', error);
        set({ isLoadingTrades: false });
      }
    },
    
    // Alert actions
    loadAlerts: async () => {
      const { user } = get();
      if (!user?.id) return;
      
      try {
        set({ isLoadingAlerts: true });
        
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        set({ alerts: data || [], isLoadingAlerts: false });
        
      } catch (error: any) {
        console.error('Error loading alerts:', error);
        set({ isLoadingAlerts: false });
      }
    },
    
  createAlert: async (alert) => {
    try {
      const newAlert = await alertsService.createAlert(alert);
      
      if (newAlert) {
        set(state => ({
          alerts: [newAlert, ...state.alerts]
        }));
        
        toast.success('Alert created successfully');
      }
      
    } catch (error: any) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    }
  },
    
  updateAlert: async (id, updates) => {
    try {
      await alertsService.updateAlert(id, updates);
      
      // Reload alerts to get updated data
      await get().loadAlerts();
      
    } catch (error: any) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  },
    
  deleteAlert: async (id) => {
    try {
      await alertsService.deleteAlert(id);
      
      set(state => ({
        alerts: state.alerts.filter(alert => alert.id !== id)
      }));
      
      toast.success('Alert deleted');
      
    } catch (error: any) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  },
    
  // Price actions
  loadPrices: async (symbols) => {
    try {
      const prices = await priceService.getPricesFromDatabase(symbols);
      
      const pricesMap = prices.reduce((acc, price) => {
        acc[price.symbol] = price;
        return acc;
      }, {} as Record<string, PriceData>);
      
      set({ prices: pricesMap });
      
      // Update portfolio values with new prices
      await get().updatePortfolioValues();
      
    } catch (error: any) {
      console.error('Error loading prices:', error);
    }
  },
    
    getCurrentPrice: (symbol) => {
      const { prices } = get();
      const priceData = prices[symbol.toLowerCase()];
      return priceData?.price_usd || 0;
    },
    
    // Notification actions
    loadNotifications: async () => {
      const { user } = get();
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        
        set({ notifications: data || [] });
        
      } catch (error: any) {
        console.error('Error loading notifications:', error);
      }
    },
    
    markNotificationAsRead: async (id) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
          
        if (error) throw error;
        
        set(state => ({
          notifications: state.notifications.map(notif =>
            notif.id === id ? { ...notif, read: true } : notif
          )
        }));
        
      } catch (error: any) {
        console.error('Error marking notification as read:', error);
      }
    },
    
  // Utility actions
  refreshAll: async () => {
    const { user } = get();
    if (!user?.id) return;
    
    try {
      set({ isLoading: true });
      
      // Use app orchestrator for comprehensive refresh
      await appOrchestrator.refreshAllData();
      
      // Then reload local state
      await Promise.all([
        get().loadWallet(),
        get().loadPortfolio(),
        get().loadTrades(),
        get().loadAlerts(),
        get().loadNotifications(),
        get().loadPrices()
      ]);
      
      set({ lastUpdated: new Date(), isLoading: false });
      
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      set({ error: error.message, isLoading: false });
    }
  },
    
    clearError: () => set({ error: null })
  }))
);
