import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';

export interface Order {
  id: string;
  user_id: string;
  coin_id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  stop_price?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  created_at: string;
  filled_at?: string;
  filled_price?: number;
  filled_amount?: number;
}

export interface Trade {
  id: string;
  user_id: string;
  coin_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  fee: number;
  created_at: string;
  order_id?: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: 'bid' | 'ask';
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercentage: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  amount: number;
  timestamp: Date;
  side: 'buy' | 'sell';
}

export interface TradingPair {
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export function useAdvancedTrading(coinId?: string) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({
    bids: [],
    asks: [],
    spread: 0,
    spreadPercentage: 0
  });
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; positions: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Current trading pair
  const [currentPair, setCurrentPair] = useState<TradingPair | null>(null);

  // Initialize wallet and fetch user data
  const initializeTrading = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Create new wallet with starting balance
        const { data: newWallet, error: createError } = await supabase
          .from('wallet')
          .insert([{ user_id: user.id, balance: 10000 }])
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
        toast.success('Welcome! You\'ve been given $10,000 in virtual funds to start trading.');
      } else if (walletError) {
        throw walletError;
      }

      setWallet({ 
        balance: walletData.balance, 
        positions: [] // TODO: Fetch positions
      });

      // Fetch initial data
      await Promise.all([
        fetchOrders(),
        fetchTrades(),
      ]);

    } catch (err) {
      console.error('Error initializing trading:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize trading');
      toast.error('Failed to initialize trading account');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch user orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, [user]);

  // Fetch user trades
  const fetchTrades = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
  }, [user]);

  // Generate simulated order book
  const generateOrderBook = useCallback(async (price: number) => {
    if (!price) return;

    const spread = price * 0.001; // 0.1% spread
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];

    // Generate bids (buy orders)
    for (let i = 0; i < 15; i++) {
      const orderPrice = price - spread - (i * price * 0.0002);
      const amount = Math.random() * 10 + 0.1;
      bids.push({
        price: parseFloat(orderPrice.toFixed(8)),
        amount: parseFloat(amount.toFixed(8)),
        total: parseFloat((orderPrice * amount).toFixed(2)),
        type: 'bid'
      });
    }

    // Generate asks (sell orders)
    for (let i = 0; i < 15; i++) {
      const orderPrice = price + spread + (i * price * 0.0002);
      const amount = Math.random() * 10 + 0.1;
      asks.push({
        price: parseFloat(orderPrice.toFixed(8)),
        amount: parseFloat(amount.toFixed(8)),
        total: parseFloat((orderPrice * amount).toFixed(2)),
        type: 'ask'
      });
    }

    const spreadValue = asks[0]?.price - bids[0]?.price || 0;
    const spreadPercentage = bids[0]?.price ? (spreadValue / bids[0].price) * 100 : 0;

    setOrderBook({
      bids,
      asks,
      spread: spreadValue,
      spreadPercentage
    });
  }, []);

  // Generate simulated recent trades
  const generateRecentTrades = useCallback((price: number) => {
    if (!price) return;

    const trades: RecentTrade[] = [];
    
    for (let i = 0; i < 30; i++) {
      const priceVariation = (Math.random() - 0.5) * price * 0.005; // ±0.5%
      const tradePrice = price + priceVariation;
      const amount = Math.random() * 5 + 0.01;
      
      trades.push({
        id: `trade-${i}`,
        price: parseFloat(tradePrice.toFixed(8)),
        amount: parseFloat(amount.toFixed(8)),
        timestamp: new Date(Date.now() - i * 15000), // 15 seconds apart
        side: Math.random() > 0.5 ? 'buy' : 'sell'
      });
    }

    setRecentTrades(trades);
  }, []);

  // Update current trading pair
  const updateTradingPair = useCallback(async (symbol: string, coinData?: any) => {
    try {
      let pairData;
      
      if (coinData) {
        pairData = {
          symbol: coinData.symbol.toUpperCase(),
          name: coinData.name,
          currentPrice: coinData.current_price,
          priceChange24h: coinData.price_change_24h,
          priceChangePercentage24h: coinData.price_change_percentage_24h,
          volume24h: coinData.total_volume,
          high24h: coinData.high_24h,
          low24h: coinData.low_24h,
        };
      } else {
        // Fetch coin data if not provided
        const details = await coinGeckoApi.getCoinDetails(coinId || symbol);
        pairData = {
          symbol: details.symbol.toUpperCase(),
          name: details.name,
          currentPrice: details.market_data.current_price.usd,
          priceChange24h: details.market_data.price_change_24h,
          priceChangePercentage24h: details.market_data.price_change_percentage_24h,
          volume24h: details.market_data.total_volume.usd,
          high24h: details.market_data.high_24h.usd,
          low24h: details.market_data.low_24h.usd,
        };
      }

      setCurrentPair(pairData);
      
      // Update order book and recent trades
      await generateOrderBook(pairData.currentPrice);
      generateRecentTrades(pairData.currentPrice);

    } catch (err) {
      console.error('Error updating trading pair:', err);
      toast.error('Failed to load trading pair data');
    }
  }, [coinId, generateOrderBook, generateRecentTrades]);

  // Place order
  const placeOrder = useCallback(async (orderData: {
    coinId: string;
    symbol: string;
    type: Order['type'];
    side: Order['side'];
    amount: number;
    price?: number;
    stopPrice?: number;
  }) => {
    if (!user || !wallet) {
      toast.error('Please ensure you are logged in');
      return;
    }

    const { coinId, symbol, type, side, amount, price, stopPrice } = orderData;

    try {
      // Validate order
      const executionPrice = price || currentPair?.currentPrice || 0;
      const totalCost = amount * executionPrice;

      if (side === 'buy' && totalCost > wallet.balance) {
        toast.error('Insufficient balance');
        return;
      }

      // For market orders, execute immediately
      if (type === 'market') {
        return await executeMarketOrder(orderData);
      }

      // Place limit/stop order
      const { error } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          coin_id: coinId,
          symbol: symbol.toLowerCase(),
          type,
          side,
          amount,
          price,
          stop_price: stopPrice,
          status: 'pending'
        }]);

      if (error) throw error;

      toast.success(`${type.replace('_', ' ').toUpperCase()} order placed successfully`);
      await fetchOrders();

    } catch (err) {
      console.error('Error placing order:', err);
      toast.error('Failed to place order');
    }
  }, [user, wallet, currentPair]);

  // Execute market order immediately
  const executeMarketOrder = useCallback(async (orderData: {
    coinId: string;
    symbol: string;
    side: Order['side'];
    amount: number;
  }) => {
    if (!user || !wallet || !currentPair) return;

    const { coinId, symbol, side, amount } = orderData;
    const executionPrice = currentPair.currentPrice;
    const totalCost = amount * executionPrice;
    const fee = totalCost * 0.001; // 0.1% fee

    try {
      // Create trade record
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert([{
          user_id: user.id,
          coin_id: coinId,
          symbol: symbol.toLowerCase(),
          side,
          amount,
          price: executionPrice,
          total: totalCost,
          fee
        }])
        .select()
        .single();

      if (tradeError) throw tradeError;

      // Update wallet balance
      const newBalance = side === 'buy' 
        ? wallet.balance - totalCost - fee
        : wallet.balance + totalCost - fee;

      const { error: walletError } = await supabase
        .from('wallet')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      setWallet({ ...wallet, balance: newBalance });

      toast.success(
        `${side.toUpperCase()} order executed: ${amount} ${symbol.toUpperCase()} at $${executionPrice.toLocaleString()}`
      );

      // Refresh data
      await fetchTrades();

    } catch (err) {
      console.error('Error executing market order:', err);
      throw err;
    }
  }, [user, wallet, currentPair, fetchTrades]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Order cancelled');
      await fetchOrders();

    } catch (err) {
      console.error('Error cancelling order:', err);
      toast.error('Failed to cancel order');
    }
  }, [user, fetchOrders]);

  // Get order history with filters
  const getFilteredOrders = useMemo(() => {
    return (filters: {
      status?: Order['status'];
      type?: Order['type'];
      side?: Order['side'];
      coinId?: string;
    }) => {
      return orders.filter(order => {
        if (filters.status && order.status !== filters.status) return false;
        if (filters.type && order.type !== filters.type) return false;
        if (filters.side && order.side !== filters.side) return false;
        if (filters.coinId && order.coin_id !== filters.coinId) return false;
        return true;
      });
    };
  }, [orders]);

  // Get trade history with filters
  const getFilteredTrades = useMemo(() => {
    return (filters: {
      side?: Trade['side'];
      coinId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }) => {
      return trades.filter(trade => {
        if (filters.side && trade.side !== filters.side) return false;
        if (filters.coinId && trade.coin_id !== filters.coinId) return false;
        if (filters.dateFrom && new Date(trade.created_at) < filters.dateFrom) return false;
        if (filters.dateTo && new Date(trade.created_at) > filters.dateTo) return false;
        return true;
      });
    };
  }, [trades]);

  // Calculate trading statistics
  const tradingStats = useMemo(() => {
    const totalTrades = trades.length;
    const buyTrades = trades.filter(t => t.side === 'buy');
    const sellTrades = trades.filter(t => t.side === 'sell');
    
    const totalVolume = trades.reduce((sum, trade) => sum + trade.total, 0);
    const totalFees = trades.reduce((sum, trade) => sum + trade.fee, 0);
    
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    
    return {
      totalTrades,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalVolume,
      totalFees,
      avgTradeSize,
      activeOrders: orders.filter(o => o.status === 'pending').length,
    };
  }, [trades, orders]);

  // Initialize trading when user changes or component mounts
  useEffect(() => {
    if (user) {
      initializeTrading();
    }
  }, [user, initializeTrading]);

  // Update trading pair when coinId changes
  useEffect(() => {
    if (coinId) {
      updateTradingPair(coinId);
    }
  }, [coinId, updateTradingPair]);

  // Auto-refresh order book and recent trades
  useEffect(() => {
    if (currentPair) {
      const interval = setInterval(() => {
        generateOrderBook(currentPair.currentPrice);
        generateRecentTrades(currentPair.currentPrice);
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [currentPair, generateOrderBook, generateRecentTrades]);

  return {
    // Data
    orders,
    trades,
    orderBook,
    recentTrades,
    wallet,
    currentPair,
    tradingStats,
    
    // State
    isLoading,
    error,
    
    // Actions
    placeOrder,
    cancelOrder,
    updateTradingPair,
    getFilteredOrders,
    getFilteredTrades,
    refreshOrders: fetchOrders,
    refreshTrades: fetchTrades,
  };
}
