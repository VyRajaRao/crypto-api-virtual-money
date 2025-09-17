import axios from 'axios'
import { apiCache } from '@/lib/cache'
import { fetchWithRetry, NetworkErrorTypes, createNetworkError } from '@/utils/networkErrorHandler'

const BASE_URL = 'https://api.coingecko.com/api/v3'

// Rate limiting helper - reduced for better performance
let lastApiCall = 0
const RATE_LIMIT_MS = 500 // 500ms between calls for better performance

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const rateLimitedRequest = async (url: string) => {
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCall
  
  if (timeSinceLastCall < RATE_LIMIT_MS) {
    await delay(RATE_LIMIT_MS - timeSinceLastCall)
  }
  
  lastApiCall = Date.now()
  
  try {
    // Use enhanced fetch with retry and better error handling
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoTracker-App/1.0'
      }
    }, {
      maxAttempts: 3,
      delay: 1000,
      backoff: true
    })
    
    if (!response.ok) {
      throw createNetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status >= 500 ? NetworkErrorTypes.SERVER_ERROR : NetworkErrorTypes.BAD_REQUEST,
        response.status
      )
    }
    
    const data = await response.json()
    return { data }
  } catch (error) {
    // Re-throw network errors for consistent handling
    throw error
  }
}

export interface CoinData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  fully_diluted_valuation: number | null
  total_volume: number
  high_24h: number
  low_24h: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap_change_24h: number
  market_cap_change_percentage_24h: number
  circulating_supply: number
  total_supply: number | null
  max_supply: number | null
  ath: number
  ath_change_percentage: number
  ath_date: string
  atl: number
  atl_change_percentage: number
  atl_date: string
  roi: null | {
    times: number
    currency: string
    percentage: number
  }
  last_updated: string
}

export interface TrendingCoin {
  id: string
  coin_id: number
  name: string
  symbol: string
  market_cap_rank: number
  thumb: string
  small: string
  large: string
  slug: string
  price_btc: number
  score: number
}

export interface CoinDetails {
  id: string
  symbol: string
  name: string
  description: {
    en: string
  }
  image: {
    thumb: string
    small: string
    large: string
  }
  market_cap_rank: number
  market_data: {
    current_price: {
      usd: number
    }
    market_cap: {
      usd: number
    }
    total_volume: {
      usd: number
    }
    price_change_24h: number
    price_change_percentage_24h: number
    price_change_percentage_7d: number
    price_change_percentage_30d: number
    market_cap_change_24h: number
    market_cap_change_percentage_24h: number
    circulating_supply: number
    total_supply: number | null
    max_supply: number | null
    ath: {
      usd: number
    }
    ath_change_percentage: {
      usd: number
    }
    ath_date: {
      usd: string
    }
    atl: {
      usd: number
    }
    atl_change_percentage: {
      usd: number
    }
    atl_date: {
      usd: string
    }
  }
}

// Top 10 coins cache for quick lookup
let top10CoinsCache: string[] = []
let top10LastFetch = 0
const TOP10_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

class CoinGeckoAPI {
  // Check if a coin is in the top 10 by market cap
  async isTop10Coin(coinId: string): Promise<boolean> {
    const now = Date.now()
    
    // Refresh top 10 cache if expired
    if (!top10CoinsCache.length || now - top10LastFetch > TOP10_CACHE_TTL) {
      try {
        const top10 = await this.getTop10Coins()
        top10CoinsCache = top10.map(coin => coin.id)
        top10LastFetch = now
        console.log('[Top10 Cache] Updated:', top10CoinsCache)
      } catch (error) {
        console.warn('[Top10 Cache] Failed to update:', error)
        // Use stale cache if available
      }
    }
    
    return top10CoinsCache.includes(coinId)
  }
  
  // Get current top 10 coins list
  getTop10CoinIds(): string[] {
    return [...top10CoinsCache]
  }
  
  // Get exactly top 10 coins (separate method for clarity)
  async getTop10Coins(currency: string = 'usd'): Promise<CoinData[]> {
    const cacheKey = `top-10-coins-${currency}`
    
    if (apiCache.has(cacheKey)) {
      return apiCache.get(cacheKey)
    }
    
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=1h,24h,7d`
      )
      
      // Cache for 2 minutes
      apiCache.set(cacheKey, response.data, 120000)
      
      // Update top10 cache
      top10CoinsCache = response.data.map((coin: CoinData) => coin.id)
      top10LastFetch = Date.now()
      
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getTop10Coins')
    }
  }

  private handleApiError(error: unknown, context: string): never {
    console.error(`CoinGecko API Error - ${context}:`, error);
    
    // If it's already a NetworkError, just re-throw it
    if (error && typeof error === 'object' && (error as any).isNetworkError) {
      throw error;
    }
    
    // For other errors, classify them
    const networkError = error instanceof Error 
      ? createNetworkError(
          error.message || 'Unknown API error occurred',
          NetworkErrorTypes.UNKNOWN,
          undefined,
          true
        )
      : createNetworkError(
          'Unknown API error occurred',
          NetworkErrorTypes.UNKNOWN,
          undefined,
          true
        );
    
    throw networkError;
  }

  async getTopCoins(limit: number = 100, currency: string = 'usd'): Promise<CoinData[]> {
    const cacheKey = `top-coins-${limit}-${currency}`;
    
    // Check cache first
    if (apiCache.has(cacheKey)) {
      return apiCache.get(cacheKey);
    }

    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      )
      
      // Cache the result for 2 minutes
      apiCache.set(cacheKey, response.data, 120000);
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getTopCoins')
    }
  }

  async getTrendingCoins(): Promise<{ coins: TrendingCoin[] }> {
    try {
      const response = await rateLimitedRequest(`${BASE_URL}/search/trending`)
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getTrendingCoins')
    }
  }

  async getCoinDetails(coinId: string): Promise<CoinDetails> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getCoinDetails')
    }
  }

  async getCoinsByIds(coinIds: string[], currency: string = 'usd'): Promise<CoinData[]> {
    const cacheKey = `coins-${coinIds.sort().join(',')}-${currency}`;
    
    // Check cache first
    if (apiCache.has(cacheKey)) {
      return apiCache.get(cacheKey);
    }

    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=${currency}&ids=${coinIds.join(',')}&order=market_cap_desc&per_page=250&page=1&sparkline=false`
      )
      
      // Cache the result for 1 minute (shorter for portfolio data)
      apiCache.set(cacheKey, response.data, 60000);
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getCoinsByIds')
    }
  }

  async searchCoins(query: string): Promise<{
    coins: Array<{
      id: string
      name: string
      symbol: string
      market_cap_rank: number
      thumb: string
    }>
  }> {
    try {
      const response = await rateLimitedRequest(`${BASE_URL}/search?query=${encodeURIComponent(query)}`)
      return response.data
    } catch (error) {
      this.handleApiError(error, 'searchCoins')
    }
  }

  async getCoinHistory(coinId: string, days: number = 7, currency: string = 'usd'): Promise<{
    prices: Array<[number, number]>
    market_caps: Array<[number, number]>
    total_volumes: Array<[number, number]>
  }> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getCoinHistory')
    }
  }

  async getCoinOHLC(coinId: string, days: number = 7): Promise<Array<[number, number, number, number, number]>> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getCoinOHLC')
    }
  }

  async getTopCoinsWithSparklines(limit: number = 100, currency: string = 'usd'): Promise<CoinData[]> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getTopCoinsWithSparklines')
    }
  }

  async getGlobalMarketData(): Promise<{
    data: {
      active_cryptocurrencies: number
      upcoming_icos: number
      ongoing_icos: number
      ended_icos: number
      markets: number
      total_market_cap: { [key: string]: number }
      total_volume: { [key: string]: number }
      market_cap_percentage: { [key: string]: number }
      market_cap_change_percentage_24h_usd: number
      updated_at: number
    }
  }> {
    try {
      const response = await rateLimitedRequest(`${BASE_URL}/global`)
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getGlobalMarketData')
    }
  }

  // Market Scanner Methods
  async getTopGainers(limit: number = 20, timeframe: '24h' | '7d' = '24h'): Promise<CoinData[]> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=percent_change_${timeframe}_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=${timeframe}`
      )
      return response.data.filter((coin: CoinData) => coin.price_change_percentage_24h > 0)
    } catch (error) {
      this.handleApiError(error, 'getTopGainers')
    }
  }

  async getTopLosers(limit: number = 20, timeframe: '24h' | '7d' = '24h'): Promise<CoinData[]> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=percent_change_${timeframe}_asc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=${timeframe}`
      )
      return response.data.filter((coin: CoinData) => coin.price_change_percentage_24h < 0)
    } catch (error) {
      this.handleApiError(error, 'getTopLosers')
    }
  }

  async getHighVolumeCoins(limit: number = 50): Promise<CoinData[]> {
    try {
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=volume_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h`
      )
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getHighVolumeCoins')
    }
  }

  // Advanced filtering for market scanner
  async getFilteredCoins(filters: {
    priceChangeMin?: number
    priceChangeMax?: number
    volumeChangeMin?: number
    marketCapMin?: number
    marketCapMax?: number
    limit?: number
  }): Promise<CoinData[]> {
    try {
      const { limit = 100 } = filters
      const response = await rateLimitedRequest(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`
      )
      
      return response.data.filter((coin: CoinData) => {
        if (filters.priceChangeMin !== undefined && coin.price_change_percentage_24h < filters.priceChangeMin) return false
        if (filters.priceChangeMax !== undefined && coin.price_change_percentage_24h > filters.priceChangeMax) return false
        if (filters.marketCapMin !== undefined && coin.market_cap < filters.marketCapMin) return false
        if (filters.marketCapMax !== undefined && coin.market_cap > filters.marketCapMax) return false
        return true
      })
    } catch (error) {
      this.handleApiError(error, 'getFilteredCoins')
    }
  }

  // Get coin categories
  async getCoinCategories(): Promise<Array<{ category_id: string; name: string }>> {
    try {
      const response = await rateLimitedRequest(`${BASE_URL}/coins/categories/list`)
      return response.data
    } catch (error) {
      this.handleApiError(error, 'getCoinCategories')
    }
  }

  // Enhanced search with price info
  async searchCoinsWithPrices(query: string): Promise<{
    coins: Array<{
      id: string
      name: string
      symbol: string
      market_cap_rank: number
      thumb: string
      current_price?: number
      price_change_percentage_24h?: number
    }>
  }> {
    try {
      const [searchResult, marketData] = await Promise.all([
        rateLimitedRequest(`${BASE_URL}/search?query=${encodeURIComponent(query)}`),
        this.getTopCoins(250) // Get more coins for price lookup
      ])
      
      // Enhance search results with price data
      const enhancedCoins = searchResult.data.coins.map((coin: any) => {
        const priceData = marketData.find((market: CoinData) => market.id === coin.id)
        return {
          ...coin,
          current_price: priceData?.current_price,
          price_change_percentage_24h: priceData?.price_change_percentage_24h
        }
      })
      
      return { coins: enhancedCoins }
    } catch (error) {
      this.handleApiError(error, 'searchCoinsWithPrices')
    }
  }
}

export const coinGeckoApi = new CoinGeckoAPI()
