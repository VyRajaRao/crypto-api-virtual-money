import axios from 'axios';

const API_KEY = import.meta.env.VITE_COINGECKO_KEY || '';
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: API_KEY ? {
    'X-CG-Demo-API-Key': API_KEY,
  } : {},
});

export interface CoinData {
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

export interface TrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  price_btc: number;
  score: number;
}

export interface HistoricalData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface GlobalData {
  total_market_cap: { [key: string]: number };
  total_volume: { [key: string]: number };
  market_cap_percentage: { [key: string]: number };
  market_cap_change_percentage_24h_usd: number;
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
  markets: number;
}

class CryptoApiService {
  // Get market data for coins
  async getCoins(
    currency = 'usd',
    perPage = 100,
    page = 1,
    sparkline = false,
    priceChangePercentage = '24h'
  ): Promise<CoinData[]> {
    try {
      const response = await api.get('/coins/markets', {
        params: {
          vs_currency: currency,
          order: 'market_cap_desc',
          per_page: perPage,
          page,
          sparkline,
          price_change_percentage: priceChangePercentage,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coins:', error);
      throw error;
    }
  }

  // Get trending coins
  async getTrending(): Promise<{ coins: TrendingCoin[] }> {
    try {
      const response = await api.get('/search/trending');
      return response.data;
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      throw error;
    }
  }

  // Get global market data
  async getGlobalData(): Promise<{ data: GlobalData }> {
    try {
      const response = await api.get('/global');
      return response.data;
    } catch (error) {
      console.error('Error fetching global data:', error);
      throw error;
    }
  }

  // Get historical data for a specific coin
  async getHistoricalData(
    coinId: string,
    currency = 'usd',
    days = '7'
  ): Promise<HistoricalData> {
    try {
      const response = await api.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: currency,
          days,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  // Get specific coin data
  async getCoinData(coinId: string): Promise<any> {
    try {
      const response = await api.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coin data:', error);
      throw error;
    }
  }

  // Search coins
  async searchCoins(query: string): Promise<any> {
    try {
      const response = await api.get('/search', {
        params: {
          query,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching coins:', error);
      throw error;
    }
  }

  // Get exchange rates
  async getExchangeRates(): Promise<any> {
    try {
      const response = await api.get('/exchange_rates');
      return response.data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw error;
    }
  }
}

export const cryptoApi = new CryptoApiService();