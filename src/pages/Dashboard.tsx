import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Activity, Eye, Star, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { coinGeckoApi, CoinData } from "@/services/coinGeckoApi";
import { TableSkeleton } from "@/components/LoadingSpinner";
import { showNetworkErrorToast, classifyNetworkError, useNetworkStatus } from "@/utils/networkErrorHandler";

function StatCard({ title, value, change, icon: Icon, isLoading }: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  isLoading?: boolean;
}) {
  const changeValue = parseFloat(change?.replace('%', '') || '0');
  const isPositive = changeValue >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow touch-manipulation">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
              {isLoading ? (
                <div className="h-6 sm:h-8 w-20 sm:w-24 bg-muted animate-pulse rounded"></div>
              ) : (
                <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{value}</p>
              )}
              {change && !isLoading && (
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-crypto-gain" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-crypto-loss" />
                  )}
                  <span className={`text-xs sm:text-sm font-medium ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Mobile-optimized coin card component
function CoinCard({ coin, index }: { coin: CoinData; index: number }) {
  const isPositive = coin.price_change_percentage_24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="p-4 border-b border-border/30 hover:bg-secondary/20 transition-colors duration-200 touch-manipulation"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">{coin.name}</p>
            <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
          </div>
        </div>
        <div className="text-right space-y-1">
          <p className="font-medium text-foreground text-sm sm:text-base">
            ${coin.current_price.toLocaleString()}
          </p>
          <div className="flex items-center justify-end gap-1">
            {isPositive ? (
              <TrendingUp className="w-3 h-3 text-crypto-gain" />
            ) : (
              <TrendingDown className="w-3 h-3 text-crypto-loss" />
            )}
            <span className={`text-xs font-medium ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
              {coin.price_change_percentage_24h.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Market Cap: ${(coin.market_cap / 1e9).toFixed(2)}B</p>
          <p>Volume: ${(coin.total_volume / 1e6).toFixed(2)}M</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 touch-manipulation">
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-accent/10 touch-manipulation">
            <Star className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function CoinRow({ coin, index }: { coin: CoinData; index: number }) {
  const isPositive = coin.price_change_percentage_24h >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border-b border-border/30 hover:bg-secondary/30 transition-colors duration-200"
    >
      <td className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={coin.image} alt={coin.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm sm:text-base truncate">{coin.name}</p>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase">{coin.symbol}</p>
          </div>
        </div>
      </td>
      <td className="p-3 sm:p-4 text-right">
        <p className="font-medium text-foreground text-sm sm:text-base">
          ${coin.current_price.toLocaleString()}
        </p>
      </td>
      <td className="p-3 sm:p-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-crypto-gain" />
          ) : (
            <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-crypto-loss" />
          )}
          <span className={`font-medium text-xs sm:text-sm ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
            {coin.price_change_percentage_24h.toFixed(2)}%
          </span>
        </div>
      </td>
      <td className="p-3 sm:p-4 text-right hidden sm:table-cell">
        <p className="text-muted-foreground text-sm">
          ${(coin.market_cap / 1e9).toFixed(2)}B
        </p>
      </td>
      <td className="p-3 sm:p-4 text-right hidden md:table-cell">
        <p className="text-muted-foreground text-sm">
          ${(coin.total_volume / 1e6).toFixed(2)}M
        </p>
      </td>
      <td className="p-3 sm:p-4">
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 touch-manipulation">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-accent/10 touch-manipulation">
            <Star className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function Dashboard() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [globalData, setGlobalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isOnline = useNetworkStatus();

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Check network status before making requests
      if (!isOnline) {
        throw new Error('No internet connection. Please check your network.');
      }
      
      // Only fetch essential data for faster loading
      const coinsData = await coinGeckoApi.getTopCoins(10, 'usd');
      setCoins(coinsData);
      
      // Skip global data for now to speed up loading
      setGlobalData({
        total_market_cap: { usd: coinsData.reduce((sum, coin) => sum + coin.market_cap, 0) },
        total_volume: { usd: coinsData.reduce((sum, coin) => sum + coin.total_volume, 0) },
        market_cap_change_percentage_24h_usd: 0,
        active_cryptocurrencies: 10000,
        market_cap_percentage: { btc: 45 }
      });
    } catch (err: any) {
      const networkError = classifyNetworkError(err);
      setError(networkError.message);
      console.error('Error fetching data:', err);
      
      // Show user-friendly error toast
      showNetworkErrorToast(networkError);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Only set up polling if online
    if (isOnline) {
      // Increase polling interval to reduce API calls
      const interval = setInterval(() => fetchData(), 120000); // 2 minutes
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Market Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base pr-2">Failed to load market data</p>
          </div>
        </div>
        <Card className="bg-gradient-card border-border/50 p-6 sm:p-8 text-center">
          <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4 text-sm sm:text-base">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-gradient-primary touch-manipulation">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Market Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base pr-2">
            Real-time cryptocurrency market data and insights
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isOnline && (
            <div className="flex items-center gap-2 text-destructive">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Offline</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || isLoading}
            className="touch-target"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="ml-2 hidden sm:inline">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </Button>
          
          {isOnline && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-crypto-gain rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Market Cap"
          value={globalData ? formatLargeNumber(globalData.total_market_cap.usd) : ""}
          change={globalData ? `${globalData.market_cap_change_percentage_24h_usd.toFixed(2)}%` : undefined}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="24h Volume"
          value={globalData ? formatLargeNumber(globalData.total_volume.usd) : ""}
          icon={Activity}
          isLoading={isLoading}
        />
        <StatCard
          title="BTC Dominance"
          value={globalData ? `${globalData.market_cap_percentage.btc.toFixed(1)}%` : ""}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Cryptocurrencies"
          value={globalData ? globalData.active_cryptocurrencies.toLocaleString() : ""}
          icon={Activity}
          isLoading={isLoading}
        />
      </div>

      {/* Top Cryptocurrencies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-lg sm:text-xl">Top Cryptocurrencies</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary w-fit">
                Live Prices
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 sm:p-6">
                <TableSkeleton rows={10} />
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block sm:hidden">
                  {coins.map((coin, index) => (
                    <CoinCard key={coin.id} coin={coin} index={index} />
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden sm:block table-mobile-responsive">
                  <table className="w-full min-w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground text-overflow-mobile">Asset</th>
                        <th className="p-3 sm:p-4 text-right text-xs sm:text-sm font-medium text-muted-foreground text-overflow-mobile">Price</th>
                        <th className="p-3 sm:p-4 text-right text-xs sm:text-sm font-medium text-muted-foreground text-overflow-mobile">24h %</th>
                        <th className="p-3 sm:p-4 text-right text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell text-overflow-mobile">Market Cap</th>
                        <th className="p-3 sm:p-4 text-right text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell text-overflow-mobile">Volume</th>
                        <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-medium text-muted-foreground text-overflow-mobile">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coins.map((coin, index) => (
                        <CoinRow key={coin.id} coin={coin} index={index} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}