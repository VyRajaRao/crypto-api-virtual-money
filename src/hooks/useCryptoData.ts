import useSWR from 'swr'
import { coinGeckoApi, CoinData, TrendingCoin, CoinDetails } from '@/services/coinGeckoApi'

// SWR configuration
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1 minute
  errorRetryCount: 3,
  errorRetryInterval: 5000,
}

// Custom hook for top 10 coins
export function useTop10Coins() {
  const { data, error, isLoading, mutate } = useSWR(
    'top-10-coins',
    () => coinGeckoApi.getTop10Coins(),
    {
      ...swrConfig,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    coins: data || [],
    error,
    isLoading,
    refresh: mutate,
    isTop10: (coinId: string) => data?.some(coin => coin.id === coinId) || false
  }
}

// Custom hook for trending coins
export function useTrendingCoins() {
  const { data, error, isLoading, mutate } = useSWR(
    'trending-coins',
    () => coinGeckoApi.getTrendingCoins(),
    {
      ...swrConfig,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    trending: data?.coins || [],
    error,
    isLoading,
    refresh: mutate
  }
}

// Custom hook for coin details
export function useCoinDetails(coinId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    coinId ? `coin-details-${coinId}` : null,
    () => coinId ? coinGeckoApi.getCoinDetails(coinId) : null,
    {
      ...swrConfig,
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  )

  return {
    coin: data,
    error,
    isLoading,
    refresh: mutate
  }
}

// Custom hook for coin history (OHLC data)
export function useCoinHistory(coinId: string | null, days: number = 7) {
  const { data, error, isLoading, mutate } = useSWR(
    coinId ? `coin-history-${coinId}-${days}` : null,
    () => coinId ? coinGeckoApi.getCoinHistory(coinId, days) : null,
    {
      ...swrConfig,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    history: data,
    error,
    isLoading,
    refresh: mutate
  }
}

// Custom hook for OHLC candlestick data
export function useCoinOHLC(coinId: string | null, days: number = 30) {
  const { data, error, isLoading, mutate } = useSWR(
    coinId ? `coin-ohlc-${coinId}-${days}` : null,
    () => coinId ? coinGeckoApi.getCoinOHLC(coinId, days) : null,
    {
      ...swrConfig,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    ohlc: data,
    error,
    isLoading,
    refresh: mutate
  }
}

// Custom hook for market scanner data
export function useMarketScanner() {
  const { data: gainersData, error: gainersError, isLoading: gainersLoading } = useSWR(
    'top-gainers',
    () => coinGeckoApi.getTopGainers(20),
    { ...swrConfig, refreshInterval: 120000 }
  )

  const { data: losersData, error: losersError, isLoading: losersLoading } = useSWR(
    'top-losers', 
    () => coinGeckoApi.getTopLosers(20),
    { ...swrConfig, refreshInterval: 120000 }
  )

  const { data: highVolumeData, error: volumeError, isLoading: volumeLoading } = useSWR(
    'high-volume',
    () => coinGeckoApi.getHighVolumeCoins(20),
    { ...swrConfig, refreshInterval: 120000 }
  )

  return {
    gainers: gainersData || [],
    losers: losersData || [],
    highVolume: highVolumeData || [],
    errors: {
      gainers: gainersError,
      losers: losersError,
      volume: volumeError
    },
    isLoading: gainersLoading || losersLoading || volumeLoading
  }
}

// Custom hook for global market data
export function useGlobalMarket() {
  const { data, error, isLoading, mutate } = useSWR(
    'global-market',
    () => coinGeckoApi.getGlobalMarketData(),
    {
      ...swrConfig,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    global: data?.data,
    error,
    isLoading,
    refresh: mutate
  }
}

// Custom hook for filtered coins (market scanner)
export function useFilteredCoins(filters: {
  priceChangeMin?: number
  priceChangeMax?: number
  volumeChangeMin?: number
  marketCapMin?: number
  marketCapMax?: number
  limit?: number
}) {
  const filterKey = JSON.stringify(filters)
  
  const { data, error, isLoading, mutate } = useSWR(
    filters && Object.keys(filters).length > 0 ? `filtered-coins-${filterKey}` : null,
    () => coinGeckoApi.getFilteredCoins(filters),
    {
      ...swrConfig,
      refreshInterval: 180000, // Refresh every 3 minutes
    }
  )

  return {
    coins: data || [],
    error,
    isLoading,
    refresh: mutate
  }
}

// Custom hook for coin search with prices
export function useSearchCoins(query: string) {
  const { data, error, isLoading, mutate } = useSWR(
    query.length >= 2 ? `search-coins-${query}` : null,
    () => query.length >= 2 ? coinGeckoApi.searchCoinsWithPrices(query) : null,
    {
      ...swrConfig,
      refreshInterval: 0, // Don't auto-refresh search results
      dedupingInterval: 10000, // 10 seconds deduplication
    }
  )

  return {
    results: data?.coins || [],
    error,
    isLoading,
    refresh: mutate
  }
}
