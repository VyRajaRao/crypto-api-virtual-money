import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { useDebounce } from 'use-debounce';

export interface PortfolioItem {
  id: string;
  user_id: string;
  coin_id: string;
  symbol: string;
  amount: number;
  avg_buy_price: number;
  created_at: string;
  updated_at?: string;
  // Enriched data
  current_price?: number;
  image?: string;
  name?: string;
  market_cap_rank?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
}

export interface PortfolioAnalytics {
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPercentage: number;
  topPerformer: PortfolioItem | null;
  worstPerformer: PortfolioItem | null;
  diversificationScore: number;
  dailyChange: number;
  dailyChangePercentage: number;
  assetAllocation: Array<{
    symbol: string;
    name: string;
    percentage: number;
    value: number;
  }>;
}

export interface HistoricalPortfolioData {
  date: string;
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

export interface AssetPerformance {
  coinId: string;
  symbol: string;
  name: string;
  realizedPnL: number;
  unrealizedPnL: number;
  totalReturn: number;
  totalReturnPercentage: number;
  holdingPeriod: number; // days
  averagePrice: number;
  currentPrice: number;
  quantity: number;
  allocation: number; // percentage
}

export function usePortfolioAnalytics() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalPortfolioData[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Debounce updates to prevent excessive API calls
  const [debouncedPortfolio] = useDebounce(portfolio, 1000);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!user) {
      setPortfolio([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch portfolio from Supabase
      const { data: portfolioData, error: dbError } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      if (!portfolioData || portfolioData.length === 0) {
        setPortfolio([]);
        return;
      }

      // Get unique coin IDs for batch fetching
      const coinIds = [...new Set(portfolioData.map(item => item.coin_id))];
      
      // Fetch market data for all coins in portfolio
      const marketData = await coinGeckoApi.getCoinsByIds(coinIds);

      // Enrich portfolio data with market information
      const enrichedPortfolio: PortfolioItem[] = portfolioData.map(item => {
        const coinData = marketData.find(coin => coin.id === item.coin_id);
        return {
          ...item,
          symbol: item.symbol || coinData?.symbol || '',
          current_price: coinData?.current_price || 0,
          image: coinData?.image || '',
          name: coinData?.name || item.coin_id,
          market_cap_rank: coinData?.market_cap_rank || 0,
          price_change_24h: coinData?.price_change_24h || 0,
          price_change_percentage_24h: coinData?.price_change_percentage_24h || 0,
        };
      });

      setPortfolio(enrichedPortfolio);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch historical portfolio data
  const fetchHistoricalData = useCallback(async (timeRange: string) => {
    if (!user || portfolio.length === 0) return;

    try {
      // This would typically fetch from a database table that tracks daily portfolio values
      // For now, we'll simulate this data based on current holdings and historical prices
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const historicalPromises = portfolio.map(async (item) => {
        try {
          const history = await coinGeckoApi.getCoinHistory(item.coin_id, days);
          return { coinId: item.coin_id, history, amount: item.amount, avgBuyPrice: item.avg_buy_price };
        } catch (error) {
          console.warn(`Failed to fetch history for ${item.coin_id}:`, error);
          return null;
        }
      });

      const historicalResults = (await Promise.all(historicalPromises)).filter(Boolean);
      
      // Calculate portfolio value for each day
      const portfolioHistory: HistoricalPortfolioData[] = [];
      const dateCount = Math.min(days, 90); // Limit to 90 days for performance

      for (let i = 0; i < dateCount; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        let totalValue = 0;
        let totalInvested = 0;

        historicalResults.forEach((result) => {
          if (result && result.history.prices[i]) {
            const [, price] = result.history.prices[i];
            totalValue += price * result.amount;
            totalInvested += result.avgBuyPrice * result.amount;
          }
        });

        portfolioHistory.unshift({
          date: date.toISOString().split('T')[0],
          totalValue,
          totalPnL: totalValue - totalInvested,
          totalPnLPercentage: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
        });
      }

      setHistoricalData(portfolioHistory);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  }, [user, portfolio]);

  // Calculate analytics
  const analytics: PortfolioAnalytics = useMemo(() => {
    if (portfolio.length === 0) {
      return {
        totalValue: 0,
        totalInvested: 0,
        totalPnL: 0,
        totalPnLPercentage: 0,
        topPerformer: null,
        worstPerformer: null,
        diversificationScore: 0,
        dailyChange: 0,
        dailyChangePercentage: 0,
        assetAllocation: [],
      };
    }

    const totalValue = portfolio.reduce((sum, item) => sum + (item.current_price || 0) * item.amount, 0);
    const totalInvested = portfolio.reduce((sum, item) => sum + item.avg_buy_price * item.amount, 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Calculate daily change
    const dailyChange = portfolio.reduce((sum, item) => {
      const dailyPnL = (item.price_change_24h || 0) * item.amount;
      return sum + dailyPnL;
    }, 0);
    const dailyChangePercentage = totalValue > 0 ? (dailyChange / (totalValue - dailyChange)) * 100 : 0;

    // Find top and worst performers
    const performers = portfolio.map(item => {
      const currentValue = (item.current_price || 0) * item.amount;
      const investedValue = item.avg_buy_price * item.amount;
      const pnlPercentage = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;
      return { ...item, pnlPercentage };
    });

    const topPerformer = performers.reduce((best, current) => 
      current.pnlPercentage > best.pnlPercentage ? current : best, performers[0]);
    
    const worstPerformer = performers.reduce((worst, current) => 
      current.pnlPercentage < worst.pnlPercentage ? current : worst, performers[0]);

    // Calculate asset allocation
    const assetAllocation = portfolio.map(item => {
      const value = (item.current_price || 0) * item.amount;
      return {
        symbol: item.symbol,
        name: item.name || item.symbol,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        value,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // Calculate diversification score (higher is more diversified)
    const diversificationScore = Math.min(100, assetAllocation.length * 10 - 
      assetAllocation.reduce((sum, asset) => sum + Math.pow(asset.percentage, 2), 0) / 100);

    return {
      totalValue,
      totalInvested,
      totalPnL,
      totalPnLPercentage,
      topPerformer,
      worstPerformer,
      diversificationScore,
      dailyChange,
      dailyChangePercentage,
      assetAllocation,
    };
  }, [portfolio]);

  // Calculate individual asset performance
  const assetPerformance: AssetPerformance[] = useMemo(() => {
    return portfolio.map(item => {
      const currentValue = (item.current_price || 0) * item.amount;
      const investedValue = item.avg_buy_price * item.amount;
      const unrealizedPnL = currentValue - investedValue;
      const totalReturnPercentage = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0;
      const holdingPeriod = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const allocation = analytics.totalValue > 0 ? (currentValue / analytics.totalValue) * 100 : 0;

      return {
        coinId: item.coin_id,
        symbol: item.symbol,
        name: item.name || item.symbol,
        realizedPnL: 0, // Would need trade history to calculate
        unrealizedPnL,
        totalReturn: unrealizedPnL,
        totalReturnPercentage,
        holdingPeriod,
        averagePrice: item.avg_buy_price,
        currentPrice: item.current_price || 0,
        quantity: item.amount,
        allocation,
      };
    });
  }, [portfolio, analytics.totalValue]);

  // Portfolio management functions
  const addAsset = async (coinId: string, symbol: string, amount: number, buyPrice: number) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .insert({
        user_id: user.id,
        coin_id: coinId,
        symbol: symbol.toLowerCase(),
        amount,
        avg_buy_price: buyPrice,
      });

    if (error) throw error;
    await fetchPortfolio();
  };

  const updateAsset = async (id: string, amount: number, avgBuyPrice: number) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .update({
        amount,
        avg_buy_price: avgBuyPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchPortfolio();
  };

  const removeAsset = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchPortfolio();
  };

  const removeMultipleAssets = async (ids: string[]) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchPortfolio();
  };

  const reorderAssets = async (reorderedItems: PortfolioItem[]) => {
    // Update the local state immediately for better UX
    setPortfolio(reorderedItems);
    
    // You could implement a custom order field in the database if needed
    // For now, we'll just update the local state
  };

  // Auto-refresh portfolio data
  useEffect(() => {
    if (user) {
      fetchPortfolio();
      const interval = setInterval(fetchPortfolio, 5 * 60 * 1000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, fetchPortfolio]);

  // Fetch historical data when time range changes
  useEffect(() => {
    if (debouncedPortfolio.length > 0) {
      fetchHistoricalData(selectedTimeRange);
    }
  }, [debouncedPortfolio, selectedTimeRange, fetchHistoricalData]);

  return {
    // Data
    portfolio,
    analytics,
    assetPerformance,
    historicalData,
    
    // State
    isLoading,
    error,
    lastUpdated,
    selectedTimeRange,
    
    // Actions
    setSelectedTimeRange,
    addAsset,
    updateAsset,
    removeAsset,
    removeMultipleAssets,
    reorderAssets,
    refreshPortfolio: fetchPortfolio,
  };
}
