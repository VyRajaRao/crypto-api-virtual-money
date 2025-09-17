import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Types
export interface MarketData {
  symbol: string;
  name: string;
  image: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  rank: number;
  lastUpdated: string;
}

export interface Asset {
  symbol: string;
  name: string;
  image: string;
  amount: number;
  averagePrice: number;
  totalInvested: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  timestamp: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  image: string;
  condition: 'above' | 'below' | 'change_percent' | 'volume';
  targetValue: number;
  currentValue: number;
  priority: 'high' | 'medium' | 'low';
  active: boolean;
  recurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
  notificationMethods: string[];
  message: string;
  createdAt: string;
  triggeredAt?: string;
  lastTriggered?: string;
}

export interface AlertNotification {
  id: string;
  type: 'alert_triggered' | 'alert_created' | 'alert_updated' | 'trade_executed';
  alertId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface SimulatorState {
  // User Financial State
  initialBalance: number;
  availableBalance: number;
  totalInvested: number;
  
  // Portfolio
  assets: Asset[];
  transactions: Transaction[];
  
  // Market Data
  marketData: MarketData[];
  
  // Alerts
  alerts: PriceAlert[];
  notifications: AlertNotification[];
  
  // System State
  isInitialized: boolean;
  lastUpdated: string;
}

// Action Types
type SimulatorAction =
  | { type: 'INITIALIZE_SIMULATOR' }
  | { type: 'UPDATE_MARKET_DATA'; payload: MarketData[] }
  | { type: 'EXECUTE_TRADE'; payload: { type: 'buy' | 'sell'; symbol: string; amount: number; price: number } }
  | { type: 'CREATE_ALERT'; payload: Omit<PriceAlert, 'id' | 'createdAt'> }
  | { type: 'UPDATE_ALERT'; payload: { id: string; updates: Partial<PriceAlert> } }
  | { type: 'DELETE_ALERT'; payload: string }
  | { type: 'TRIGGER_ALERT'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AlertNotification, 'id'> };

// Initial Market Data
const initialMarketData: MarketData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
    price: 43785.50,
    priceChange24h: 1204.75,
    priceChangePercent24h: 2.8,
    volume24h: 15240000000,
    marketCap: 857000000000,
    rank: 1,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
    price: 2567.85,
    priceChange24h: 30.42,
    priceChangePercent24h: 1.2,
    volume24h: 8750000000,
    marketCap: 308000000000,
    rank: 2,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/thumb/Solana.jpg',
    price: 38.75,
    priceChange24h: 1.75,
    priceChangePercent24h: 4.7,
    volume24h: 985000000,
    marketCap: 16800000000,
    rank: 5,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    image: 'https://assets.coingecko.com/coins/images/975/thumb/cardano.png',
    price: 0.512,
    priceChange24h: -0.0094,
    priceChangePercent24h: -1.8,
    volume24h: 245000000,
    marketCap: 17200000000,
    rank: 8,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    image: 'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png',
    price: 0.952,
    priceChange24h: 0.029,
    priceChangePercent24h: 3.2,
    volume24h: 185000000,
    marketCap: 8900000000,
    rank: 13,
    lastUpdated: new Date().toISOString()
  }
];

// Initial State
const initialState: SimulatorState = {
  initialBalance: 15000,
  availableBalance: 15000,
  totalInvested: 0,
  assets: [],
  transactions: [],
  marketData: initialMarketData,
  alerts: [],
  notifications: [],
  isInitialized: true,
  lastUpdated: new Date().toISOString()
};

// Utility Functions
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const findAssetBySymbol = (assets: Asset[], symbol: string) => 
  assets.find(asset => asset.symbol === symbol);

const calculateTradeFee = (total: number) => total * 0.001; // 0.1% fee

// Reducer
function simulatorReducer(state: SimulatorState, action: SimulatorAction): SimulatorState {
  switch (action.type) {
    case 'INITIALIZE_SIMULATOR':
      return {
        ...state,
        isInitialized: true,
        lastUpdated: new Date().toISOString()
      };

    case 'UPDATE_MARKET_DATA':
      return {
        ...state,
        marketData: action.payload.map(data => ({
          ...data,
          lastUpdated: new Date().toISOString()
        })),
        lastUpdated: new Date().toISOString()
      };

    case 'EXECUTE_TRADE': {
      const { type, symbol, amount, price } = action.payload;
      const total = amount * price;
      const fee = calculateTradeFee(total);
      const marketInfo = state.marketData.find(m => m.symbol === symbol);
      
      if (!marketInfo) {
        return state; // Invalid symbol
      }

      // Validate transaction
      if (type === 'buy') {
        const totalCost = total + fee;
        if (totalCost > state.availableBalance) {
          return state; // Insufficient funds
        }
        
        // Update or create asset
        const existingAsset = findAssetBySymbol(state.assets, symbol);
        let newAssets: Asset[];
        
        if (existingAsset) {
          // Update existing asset with new average price
          const newAmount = existingAsset.amount + amount;
          const newTotalInvested = existingAsset.totalInvested + total;
          const newAveragePrice = newTotalInvested / newAmount;
          
          newAssets = state.assets.map(asset => 
            asset.symbol === symbol
              ? {
                  ...asset,
                  amount: newAmount,
                  averagePrice: newAveragePrice,
                  totalInvested: newTotalInvested
                }
              : asset
          );
        } else {
          // Create new asset
          newAssets = [
            ...state.assets,
            {
              symbol,
              name: marketInfo.name,
              image: marketInfo.image,
              amount,
              averagePrice: price,
              totalInvested: total
            }
          ];
        }

        // Create transaction record
        const transaction: Transaction = {
          id: generateId(),
          type: 'buy',
          symbol,
          name: marketInfo.name,
          amount,
          price,
          total,
          fee,
          timestamp: new Date().toISOString()
        };

        return {
          ...state,
          availableBalance: state.availableBalance - totalCost,
          totalInvested: state.totalInvested + total,
          assets: newAssets,
          transactions: [transaction, ...state.transactions],
          lastUpdated: new Date().toISOString()
        };
        
      } else { // sell
        const existingAsset = findAssetBySymbol(state.assets, symbol);
        if (!existingAsset || existingAsset.amount < amount) {
          return state; // Insufficient assets
        }
        
        const newAmount = existingAsset.amount - amount;
        const proportionSold = amount / existingAsset.amount;
        const investmentSold = existingAsset.totalInvested * proportionSold;
        const netProceeds = total - fee;
        
        let newAssets: Asset[];
        if (newAmount === 0) {
          // Remove asset completely
          newAssets = state.assets.filter(asset => asset.symbol !== symbol);
        } else {
          // Update asset
          newAssets = state.assets.map(asset => 
            asset.symbol === symbol
              ? {
                  ...asset,
                  amount: newAmount,
                  totalInvested: existingAsset.totalInvested - investmentSold
                }
              : asset
          );
        }

        // Create transaction record
        const transaction: Transaction = {
          id: generateId(),
          type: 'sell',
          symbol,
          name: marketInfo.name,
          amount,
          price,
          total,
          fee,
          timestamp: new Date().toISOString()
        };

        return {
          ...state,
          availableBalance: state.availableBalance + netProceeds,
          totalInvested: state.totalInvested - investmentSold,
          assets: newAssets,
          transactions: [transaction, ...state.transactions],
          lastUpdated: new Date().toISOString()
        };
      }
    }

    case 'CREATE_ALERT': {
      const alert: PriceAlert = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString()
      };
      
      const notification: AlertNotification = {
        id: generateId(),
        type: 'alert_created',
        alertId: alert.id,
        title: 'Alert Created',
        message: `Created ${alert.condition} alert for ${alert.symbol}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: alert.priority
      };

      return {
        ...state,
        alerts: [...state.alerts, alert],
        notifications: [notification, ...state.notifications],
        lastUpdated: new Date().toISOString()
      };
    }

    case 'UPDATE_ALERT': {
      const { id, updates } = action.payload;
      return {
        ...state,
        alerts: state.alerts.map(alert =>
          alert.id === id ? { ...alert, ...updates } : alert
        ),
        lastUpdated: new Date().toISOString()
      };
    }

    case 'DELETE_ALERT': {
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload),
        lastUpdated: new Date().toISOString()
      };
    }

    case 'TRIGGER_ALERT': {
      const alertId = action.payload;
      const alert = state.alerts.find(a => a.id === alertId);
      
      if (!alert) return state;
      
      const notification: AlertNotification = {
        id: generateId(),
        type: 'alert_triggered',
        alertId,
        title: 'Price Alert Triggered',
        message: `${alert.symbol} has ${alert.condition} ${alert.targetValue}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: alert.priority
      };

      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === alertId
            ? { ...a, triggeredAt: new Date().toISOString(), active: !alert.recurring }
            : a
        ),
        notifications: [notification, ...state.notifications],
        lastUpdated: new Date().toISOString()
      };
    }

    case 'MARK_NOTIFICATION_READ': {
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };
    }

    case 'ADD_NOTIFICATION': {
      const notification: AlertNotification = {
        ...action.payload,
        id: generateId()
      };
      
      return {
        ...state,
        notifications: [notification, ...state.notifications]
      };
    }

    default:
      return state;
  }
}

// Context
const SimulatorContext = createContext<{
  state: SimulatorState;
  dispatch: React.Dispatch<SimulatorAction>;
  
  // Computed values
  portfolioValue: number;
  totalPnL: number;
  dailyPnL: number;
  
  // Helper functions
  executeTrade: (type: 'buy' | 'sell', symbol: string, amount: number) => boolean;
  createAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  getAssetValue: (symbol: string) => number;
  getAssetPnL: (symbol: string) => { unrealizedPnL: number; pnlPercentage: number };
} | null>(null);

// Provider Component
interface SimulatorProviderProps {
  children: ReactNode;
}

export const SimulatorProvider: React.FC<SimulatorProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(simulatorReducer, initialState);

  // Price update simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedMarketData = state.marketData.map(coin => ({
        ...coin,
        price: coin.price + (Math.random() - 0.5) * coin.price * 0.005, // ±0.5% random change
        lastUpdated: new Date().toISOString()
      }));
      
      dispatch({ type: 'UPDATE_MARKET_DATA', payload: updatedMarketData });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [state.marketData]);

  // Alert monitoring
  useEffect(() => {
    state.alerts
      .filter(alert => alert.active)
      .forEach(alert => {
        const marketInfo = state.marketData.find(m => m.symbol === alert.symbol);
        if (!marketInfo) return;

        let shouldTrigger = false;
        
        switch (alert.condition) {
          case 'above':
            shouldTrigger = marketInfo.price >= alert.targetValue;
            break;
          case 'below':
            shouldTrigger = marketInfo.price <= alert.targetValue;
            break;
          case 'change_percent':
            shouldTrigger = Math.abs(marketInfo.priceChangePercent24h) >= alert.targetValue;
            break;
          case 'volume':
            shouldTrigger = marketInfo.volume24h >= alert.targetValue;
            break;
        }

        if (shouldTrigger) {
          dispatch({ type: 'TRIGGER_ALERT', payload: alert.id });
        }
      });
  }, [state.marketData, state.alerts]);

  // Computed values
  const portfolioValue = state.availableBalance + 
    state.assets.reduce((total, asset) => {
      const marketPrice = state.marketData.find(m => m.symbol === asset.symbol)?.price || 0;
      return total + (asset.amount * marketPrice);
    }, 0);

  const totalPnL = portfolioValue - state.initialBalance;
  
  const dailyPnL = state.assets.reduce((total, asset) => {
    const marketInfo = state.marketData.find(m => m.symbol === asset.symbol);
    if (!marketInfo) return total;
    return total + (asset.amount * marketInfo.priceChange24h);
  }, 0);

  // Helper functions
  const executeTrade = (type: 'buy' | 'sell', symbol: string, amount: number): boolean => {
    const marketInfo = state.marketData.find(m => m.symbol === symbol);
    if (!marketInfo) {
      toast.error('Invalid cryptocurrency symbol');
      return false;
    }

    const price = marketInfo.price;
    const total = amount * price;
    const fee = calculateTradeFee(total);

    // Validation
    if (type === 'buy') {
      const totalCost = total + fee;
      if (totalCost > state.availableBalance) {
        toast.error('Insufficient virtual funds');
        return false;
      }
    } else {
      const existingAsset = findAssetBySymbol(state.assets, symbol);
      if (!existingAsset || existingAsset.amount < amount) {
        toast.error(`Insufficient ${symbol} to sell`);
        return false;
      }
    }

    dispatch({ type: 'EXECUTE_TRADE', payload: { type, symbol, amount, price } });
    
    // Add trade notification
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: {
        type: 'trade_executed',
        title: 'Trade Executed',
        message: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${amount} ${symbol}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'medium'
      }
    });
    
    toast.success(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${amount} ${symbol}`);
    return true;
  };

  const createAlert = (alertData: Omit<PriceAlert, 'id' | 'createdAt'>) => {
    dispatch({ type: 'CREATE_ALERT', payload: alertData });
    toast.success(`Created alert for ${alertData.symbol}`);
  };

  const getAssetValue = (symbol: string): number => {
    const asset = findAssetBySymbol(state.assets, symbol);
    const marketPrice = state.marketData.find(m => m.symbol === symbol)?.price || 0;
    return asset ? asset.amount * marketPrice : 0;
  };

  const getAssetPnL = (symbol: string) => {
    const asset = findAssetBySymbol(state.assets, symbol);
    const marketPrice = state.marketData.find(m => m.symbol === symbol)?.price || 0;
    
    if (!asset) {
      return { unrealizedPnL: 0, pnlPercentage: 0 };
    }

    const currentValue = asset.amount * marketPrice;
    const unrealizedPnL = currentValue - asset.totalInvested;
    const pnlPercentage = asset.totalInvested > 0 ? (unrealizedPnL / asset.totalInvested) * 100 : 0;

    return { unrealizedPnL, pnlPercentage };
  };

  const contextValue = {
    state,
    dispatch,
    portfolioValue,
    totalPnL,
    dailyPnL,
    executeTrade,
    createAlert,
    getAssetValue,
    getAssetPnL
  };

  return (
    <SimulatorContext.Provider value={contextValue}>
      {children}
    </SimulatorContext.Provider>
  );
};

// Hook
export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
};

export default SimulatorContext;
