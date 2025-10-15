import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface PriceData {
  symbol: string;
  coingecko_id: string;
  name: string;
  image: string;
  price_usd: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
  updated_at: string;
}

import { fetchWithRetry } from '@/utils/networkErrorHandler'

class PriceService {
  private apiKey: string;
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_COINGECKO_KEY || '';
  }

  /**
   * Fetch current prices for top cryptocurrencies
   */
  async fetchTopCryptoPrices(limit = 100): Promise<CoinGeckoPrice[]> {
    try {
      const response = await fetchWithRetry(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&locale=en`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      throw error;
    }
  }

  /**
   * Fetch price for specific coins by IDs
   */
  async fetchSpecificPrices(coinIds: string[]): Promise<CoinGeckoPrice[]> {
    if (coinIds.length === 0) return [];
    
    try {
      const idsParam = coinIds.join(',');
      const response = await fetchWithRetry(
        `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=250&page=1&sparkline=false&locale=en`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching specific prices:', error);
      throw error;
    }
  }

  /**
   * Get current price for a single coin
   */
  async getCurrentPrice(coinId: string): Promise<number> {
    try {
      const response = await fetchWithRetry(
        `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch (error) {
      console.error(`Error fetching price for ${coinId}:`, error);
      return 0;
    }
  }

  /**
   * Transform CoinGecko data to our internal format
   */
  private transformPriceData(coinGeckoData: CoinGeckoPrice[]): PriceData[] {
    return coinGeckoData.map(coin => ({
      symbol: coin.symbol.toLowerCase(),
      coingecko_id: coin.id,
      name: coin.name,
      image: coin.image,
      price_usd: coin.current_price,
      price_change_24h: coin.price_change_24h || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      market_cap: coin.market_cap || 0,
      volume_24h: coin.total_volume || 0,
      updated_at: new Date().toISOString()
    }));
  }

  /**
   * Update prices in Supabase database
   */
  async updatePricesInDatabase(priceData: PriceData[]): Promise<void> {
    if (priceData.length === 0) return;

    try {
      const { error } = await supabase
        .from('latest_prices')
        .upsert(priceData, { 
          onConflict: 'symbol',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error updating prices in database:', error);
        throw error;
      }

      console.log(`Updated ${priceData.length} prices in database`);
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  /**
   * Fetch and update all prices
   */
  async updateAllPrices(): Promise<void> {
    try {
      // Delegate to secure serverless function; client should not write to DB
      const res = await fetchWithRetry('/.netlify/functions/admin-refresh-prices', { method: 'POST' })
      if (!res.ok) {
        throw new Error(`admin-refresh-prices failed: ${res.status}`)
      }
      console.log('Triggered server-side price refresh')
    } catch (error) {
      console.error('Error triggering server-side price refresh:', error)
      throw error
    }
  }

  /**
   * Start automatic price updates
   */
  startPriceUpdates(intervalMinutes = 5): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Initial update
    this.updateAllPrices().catch(console.error);

    // Set up recurring updates
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateAllPrices();
      } catch (error) {
        console.error('Scheduled price update failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Started price updates every ${intervalMinutes} minutes`);
  }

  /**
   * Stop automatic price updates
   */
  stopPriceUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Stopped price updates');
    }
  }

  /**
   * Get prices from database
   */
  async getPricesFromDatabase(symbols?: string[]): Promise<PriceData[]> {
    try {
      let query = supabase
        .from('latest_prices')
        .select('*');

      if (symbols && symbols.length > 0) {
        query = query.in('symbol', symbols);
      } else {
        query = query.order('market_cap', { ascending: false }).limit(100);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching prices from database:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Database fetch error:', error);
      throw error;
    }
  }

  /**
   * Get specific portfolio prices
   */
  async getPortfolioPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    if (symbols.length === 0) return {};

    try {
      const prices = await this.getPricesFromDatabase(symbols);
      return prices.reduce((acc, price) => {
        acc[price.symbol] = price;
        return acc;
      }, {} as Record<string, PriceData>);
    } catch (error) {
      console.error('Error fetching portfolio prices:', error);
      return {};
    }
  }

  /**
   * Search for coins
   */
  async searchCoins(query: string): Promise<{ id: string; name: string; symbol: string; thumb: string }[]> {
    if (query.length < 2) return [];

    try {
      const response = await fetchWithRetry(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      return data.coins?.slice(0, 10) || [];
    } catch (error) {
      console.error('Error searching coins:', error);
      return [];
    }
  }
}

export const priceService = new PriceService();
export default priceService;
