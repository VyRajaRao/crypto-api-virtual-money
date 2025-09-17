import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cryptoApi } from '@/services/cryptoApi';

interface SupabasePortfolioItem {
  id: string;
  user_id: string;
  asset_symbol: string;
  amount: number;
  avg_buy_price: number;
  created_at: string;
}

interface EnrichedPortfolioItem extends SupabasePortfolioItem {
  currentPrice: number;
  image: string;
  name: string;
}

export function useSupabasePortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPortfolio = async () => {
    if (!user) {
      setPortfolio([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch portfolio from Supabase
      const { data: portfolioData, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!portfolioData || portfolioData.length === 0) {
        setPortfolio([]);
        return;
      }

      // Enrich with current market data
      const coinsData = await cryptoApi.getCoins('usd', 250);
      
      const enrichedPortfolio: EnrichedPortfolioItem[] = portfolioData.map(item => {
        const coinData = coinsData.find(coin => 
          coin.symbol.toLowerCase() === item.asset_symbol.toLowerCase()
        );
        
        return {
          ...item,
          currentPrice: coinData?.current_price || 0,
          image: coinData?.image || '',
          name: coinData?.name || item.asset_symbol.toUpperCase(),
        };
      });

      setPortfolio(enrichedPortfolio);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setPortfolio([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToPortfolio = async (coinSymbol: string, amount: number, buyPrice: number) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .insert({
        user_id: user.id,
        asset_symbol: coinSymbol.toLowerCase(),
        amount,
        avg_buy_price: buyPrice,
      });

    if (error) throw error;
    
    // Refresh portfolio
    await fetchPortfolio();
  };

  const removeFromPortfolio = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    // Refresh portfolio
    await fetchPortfolio();
  };

  const updatePortfolioItem = async (id: string, amount: number, avgBuyPrice: number) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('portfolio')
      .update({
        amount,
        avg_buy_price: avgBuyPrice,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    // Refresh portfolio
    await fetchPortfolio();
  };

  useEffect(() => {
    fetchPortfolio();
  }, [user]);

  return {
    portfolio,
    isLoading,
    addToPortfolio,
    removeFromPortfolio,
    updatePortfolioItem,
    refreshPortfolio: fetchPortfolio,
  };
}