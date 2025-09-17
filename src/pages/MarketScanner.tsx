import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, TrendingUp, TrendingDown, Activity, Search, Zap, Volume2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useMarketScanner, useTop10Coins } from '@/hooks/useCryptoData';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Sparkline } from '@/components/AdvancedChart';
import { type CoinData, coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';

interface FilterConfig {
  priceChangeMin: string;
  priceChangeMax: string;
  volumeChangeMin: string;
  marketCapMin: string;
  marketCapMax: string;
  category: string;
  timeframe: '1h' | '24h' | '7d';
}

const PRESETS = [
  {
    id: 'top-gainers',
    name: 'Top Gainers 24h',
    description: 'Coins with highest 24h gains',
    icon: TrendingUp,
    color: 'text-crypto-gain'
  },
  {
    id: 'top-losers',
    name: 'Top Losers 24h',
    description: 'Coins with biggest 24h drops',
    icon: TrendingDown,
    color: 'text-crypto-loss'
  },
  {
    id: 'high-volume',
    name: 'High Volume Surge',
    description: 'Coins with unusually high volume',
    icon: Volume2,
    color: 'text-blue-400'
  },
  {
    id: 'small-caps',
    name: 'Small Cap Gems',
    description: 'Low market cap opportunities',
    icon: Target,
    color: 'text-yellow-400'
  }
];

export default function MarketScanner() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<CoinData[]>([]);
  const [filters, setFilters] = useState<FilterConfig>({
    priceChangeMin: '',
    priceChangeMax: '',
    volumeChangeMin: '',
    marketCapMin: '',
    marketCapMax: '',
    category: '',
    timeframe: '24h'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchCoins = async (showToast = true) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await coinGeckoApi.getTopCoins(100, 'usd');
      setCoins(data);
      setFilteredCoins(data);
      setRetryCount(0);
      if (showToast && retryCount > 0) {
        toast.success('Market data loaded successfully!');
      }
    } catch (error: any) {
      console.error('Error fetching coins:', error);
      const isRateLimit = error?.message?.includes('rate limit') || error?.message?.includes('429') || error?.status === 429;
      const errorMessage = isRateLimit 
        ? '⚠️ Market Scanner is temporarily busy due to high demand. Please try again in a moment.' 
        : 'Failed to load market data. Please check your connection and try again.';
      
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      
      if (showToast) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchCoins(true);
  };

  useEffect(() => {
    fetchCoins(false);
    const interval = setInterval(() => fetchCoins(false), 120000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = [...coins];

    // Apply filters
    if (filters.priceChangeMin) {
      filtered = filtered.filter(coin => coin.price_change_percentage_24h >= parseFloat(filters.priceChangeMin));
    }
    if (filters.priceChangeMax) {
      filtered = filtered.filter(coin => coin.price_change_percentage_24h <= parseFloat(filters.priceChangeMax));
    }
    if (filters.volumeChangeMin) {
      // Note: We don't have volume change data from the API, this is a placeholder
      // In a real implementation, you'd need additional API calls for volume change data
    }
    if (filters.marketCapMin) {
      filtered = filtered.filter(coin => coin.market_cap >= parseFloat(filters.marketCapMin));
    }
    if (filters.marketCapMax) {
      filtered = filtered.filter(coin => coin.market_cap <= parseFloat(filters.marketCapMax));
    }

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(coin => 
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCoins(filtered);
  }, [coins, filters, searchQuery]);

  const handlePreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Apply preset-specific filters
    let newFilters = {
      priceChangeMin: '',
      priceChangeMax: '',
      volumeChangeMin: '',
      marketCapMin: '',
      marketCapMax: '',
      category: '',
      timeframe: '24h' as const
    };

    switch (preset.id) {
      case 'top-gainers':
        newFilters.priceChangeMin = '5';
        break;
      case 'top-losers':
        newFilters.priceChangeMax = '-5';
        break;
      case 'high-volume':
        newFilters.volumeChangeMin = '50';
        break;
      case 'small-caps':
        newFilters.marketCapMax = '1000000000';
        break;
    }

    setFilters(newFilters);
    toast.success(`Applied ${preset.name} filter`);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Symbol', 'Price (USD)', '24h Change (%)', 'Market Cap', 'Volume'];
    const csvData = [
      headers.join(','),
      ...filteredCoins.map(coin => [
        coin.name,
        coin.symbol.toUpperCase(),
        coin.current_price,
        coin.price_change_percentage_24h.toFixed(2),
        coin.market_cap,
        coin.total_volume
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-scanner-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Market data exported to CSV');
  };

  const resetFilters = () => {
    setFilters({
      priceChangeMin: '',
      priceChangeMax: '',
      volumeChangeMin: '',
      marketCapMin: '',
      marketCapMax: '',
      category: '',
      timeframe: '24h'
    });
    setSearchQuery('');
    toast.success('Filters reset');
  };

  if (isLoading) {
    return (
      <div className="error-state-mobile px-4 sm:px-6">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground text-sm sm:text-base text-mobile-readable">Loading market scanner...</p>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="container-mobile">
        <div className="error-state-mobile">
          <Card className="bg-gradient-card border-border/50 max-w-md w-full mobile-card-padded">
            <CardContent className="mobile-card-content">
              <div className="error-icon-mobile bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
                <Activity className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="error-title-mobile">⚠️ Market Scanner Busy</h3>
              <p className="error-message-mobile">{error}</p>
              <Button 
                onClick={handleRetry} 
                className="retry-button-mobile w-full bg-gradient-primary hover:opacity-90 touch-target"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Retrying...
                  </>
                ) : (
                  <>🔄 Reload Market Data</>
                )}
              </Button>
              {retryCount > 2 && (
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs mx-auto leading-relaxed">
                  ⏱️ High traffic detected. The API may be temporarily overloaded. Please wait a moment before trying again.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Retry attempt: {retryCount}/5
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="container-mobile max-w-full space-y-3 sm:space-y-4 lg:space-y-6 pb-4 portrait:space-y-3 landscape:space-y-2 landscape:py-2">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="flex flex-col gap-3 portrait:gap-4 landscape:gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="responsive-title bg-gradient-primary bg-clip-text text-transparent">
                  📊 Market Scanner
                </h1>
                <p className="responsive-small text-muted-foreground mt-1">
                  Find cryptocurrencies with custom filters
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  {filteredCoins.length} Results
                </Badge>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="touch-target text-xs px-2 py-1">
                  <Download className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Presets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="px-3 py-2 sm:px-4 sm:py-3 landscape:py-2">
              <CardTitle className="card-title-responsive flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                ⚡ Quick Presets
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2 sm:px-4 sm:py-3 landscape:py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 landscape:gap-1">
                {PRESETS.map((preset) => {
                  const IconComponent = preset.icon;
                  return (
                    <Button
                      key={preset.id}
                      variant="outline"
                      onClick={() => handlePreset(preset.id)}
                      className="flex flex-col items-center justify-center gap-1 h-auto p-2 sm:p-3 hover:bg-primary/10 transition-colors touch-target"
                    >
                      <IconComponent className={`w-4 h-4 ${preset.color} shrink-0`} />
                      <div className="text-center min-w-0 flex-1">
                        <div className="responsive-caption font-medium leading-tight truncate">{preset.name}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-center landscape:mt-2">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground text-xs px-2 py-1">
                  🔄 Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advanced Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="px-3 py-2 sm:px-4 sm:py-3 landscape:py-2">
              <CardTitle className="card-title-responsive flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                🔍 Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2 sm:px-4 sm:py-3 space-y-3 landscape:py-2 landscape:space-y-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search coins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 touch-target responsive-body h-9"
                />
              </div>

              {/* Price Change Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 landscape:gap-1">
                <div className="space-y-1">
                  <label className="responsive-caption font-medium block">Min %</label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={filters.priceChangeMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceChangeMin: e.target.value }))}
                    className="touch-target responsive-small h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="responsive-caption font-medium block">Max %</label>
                  <Input
                    type="number"
                    placeholder="-5"
                    value={filters.priceChangeMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceChangeMax: e.target.value }))}
                    className="touch-target responsive-small h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="responsive-caption font-medium block">Min Cap</label>
                  <Input
                    type="number"
                    placeholder="1B"
                    value={filters.marketCapMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, marketCapMin: e.target.value }))}
                    className="touch-target responsive-small h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="responsive-caption font-medium block">Max Cap</label>
                  <Input
                    type="number"
                    placeholder="10B"
                    value={filters.marketCapMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, marketCapMax: e.target.value }))}
                    className="touch-target responsive-small h-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="px-3 py-2 sm:px-4 sm:py-3 landscape:py-2">
              <CardTitle className="card-title-responsive">📊 Results ({filteredCoins.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCoins.length === 0 && !isLoading ? (
                <div className="error-state-mobile">
                  <Search className="error-icon-mobile text-muted-foreground" />
                  <h3 className="error-title-mobile">No Results Found</h3>
                  <p className="error-message-mobile">Try adjusting your filters or search criteria.</p>
                  <Button 
                    variant="outline" 
                    onClick={resetFilters} 
                    className="retry-button-mobile"
                  >
                    🔄 Clear Filters
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile Card Layout */}
                  <div className="block sm:hidden">
                    <div className="max-h-96 overflow-y-auto mobile-scrollable landscape:max-h-64">
                      {filteredCoins.map((coin, index) => {
                        const isPositive = coin.price_change_percentage_24h >= 0;
                        return (
                          <motion.div
                            key={coin.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.02 }}
                            className="p-3 border-b border-border/30 hover:bg-secondary/20 transition-colors touch-target"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="responsive-body font-medium truncate">{coin.name}</p>
                                  <p className="responsive-caption text-muted-foreground uppercase">{coin.symbol}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="responsive-body font-medium">
                                  ${coin.current_price.toLocaleString()}
                                </p>
                                <div className="flex items-center justify-end gap-1">
                                  {isPositive ? (
                                    <TrendingUp className="w-3 h-3 text-crypto-gain" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 text-crypto-loss" />
                                  )}
                                  <span className={`responsive-caption font-medium ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                                    {coin.price_change_percentage_24h.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                              <div className="responsive-caption text-muted-foreground space-y-1">
                                <p>Cap: ${(coin.market_cap / 1e9).toFixed(2)}B</p>
                                <p>Vol: ${(coin.total_volume / 1e6).toFixed(2)}M</p>
                              </div>
                              <Badge variant="outline" className="responsive-caption">#{coin.market_cap_rank}</Badge>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden sm:block">
                    <div className="overflow-x-auto mobile-scrollable">
                      <table className="w-full">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="p-2 text-left text-xs font-medium text-muted-foreground">Asset</th>
                            <th className="p-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                            <th className="p-2 text-right text-xs font-medium text-muted-foreground">24h %</th>
                            <th className="p-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Market Cap</th>
                            <th className="p-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Volume</th>
                            <th className="p-2 text-center text-xs font-medium text-muted-foreground">Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCoins.map((coin, index) => {
                            const isPositive = coin.price_change_percentage_24h >= 0;
                            return (
                              <motion.tr
                                key={coin.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.02 }}
                                className="border-b border-border/30 hover:bg-secondary/30 transition-colors duration-200"
                              >
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                                    <div className="min-w-0">
                                      <p className="font-medium text-xs truncate">{coin.name}</p>
                                      <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 text-right">
                                  <p className="font-medium text-xs">
                                    ${coin.current_price.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isPositive ? (
                                      <TrendingUp className="w-3 h-3 text-crypto-gain" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3 text-crypto-loss" />
                                    )}
                                    <span className={`font-medium text-xs ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                                      {coin.price_change_percentage_24h.toFixed(2)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 text-right hidden md:table-cell">
                                  <p className="text-muted-foreground text-xs">
                                    ${(coin.market_cap / 1e9).toFixed(2)}B
                                  </p>
                                </td>
                                <td className="p-2 text-right hidden lg:table-cell">
                                  <p className="text-muted-foreground text-xs">
                                    ${(coin.total_volume / 1e6).toFixed(2)}M
                                  </p>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline" className="text-xs">#{coin.market_cap_rank}</Badge>
                                </td>
                            </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
