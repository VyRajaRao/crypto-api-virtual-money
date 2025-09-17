import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { coinGeckoApi, type CoinData, type TrendingCoin } from "@/services/coinGeckoApi";
import { PriceChart } from "@/components/PriceChart";

const timeframes = [
  { label: "24h", value: "24h", days: 1 },
  { label: "7d", value: "7d", days: 7 },
  { label: "30d", value: "30d", days: 30 },
];

export default function Trends() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch TOP 10 coins by market cap (as per requirements)
        const [top10CoinsData, trendingData] = await Promise.all([
          coinGeckoApi.getTopCoins(10, 'usd'), // Only top 10
          coinGeckoApi.getTrendingCoins()
        ]);
        setCoins(top10CoinsData);
        setTrending(trendingData.coins);
        // Set first coin as default selection for chart
        if (top10CoinsData.length > 0 && !selectedCoin) {
          setSelectedCoin(top10CoinsData[0]);
        }
      } catch (error) {
        console.error('Error fetching trends data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // 2 minutes to respect rate limits
    return () => clearInterval(interval);
  }, []);

  const topGainers = coins
    .filter(coin => coin.price_change_percentage_24h > 0)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 10);

  const topLosers = coins
    .filter(coin => coin.price_change_percentage_24h < 0)
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="text-center py-8 sm:py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading market trends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Market Trends
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base pr-2">
            Discover trending coins and market movers
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe.value)}
              className={`touch-manipulation ${selectedTimeframe === timeframe.value ? "bg-gradient-primary" : ""}`}
            >
              {timeframe.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Trending Coins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Trending Coins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Top 10 Market Cap Coins */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>Top 10 by Market Cap</span>
                <Badge className="bg-primary text-primary-foreground">Interactive Charts</Badge>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {coins.map((coin, index) => (
                  <motion.div
                    key={coin.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedCoin(coin)}
                    className="p-3 sm:p-4 rounded-lg bg-background/50 border border-primary/20 hover:border-primary/50 transition-all cursor-pointer hover:scale-105 touch-manipulation"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="text-xs bg-primary shrink-0">
                        #{index + 1}
                      </Badge>
                      <img src={coin.image} alt={coin.name} className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h4 className="font-medium text-xs sm:text-sm truncate">{coin.name}</h4>
                    <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                    <p className="text-xs font-medium mt-1">${coin.current_price.toLocaleString()}</p>
                    <div className={`text-xs flex items-center gap-1 mt-1 ${
                      coin.price_change_percentage_24h >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'
                    }`}>
                      {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                      {coin.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trending Coins (Details Only) */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>Trending Coins</span>
                <Badge variant="outline">Details Only</Badge>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {trending.slice(0, 10).map((coin, index) => {
                  const isTop10 = coins.some(topCoin => topCoin.id === coin.id);
                  return (
                    <motion.div
                      key={coin.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={async () => {
                        if (isTop10) {
                          // If it's in top 10, show interactive chart
                          const fullCoinData = coins.find(c => c.id === coin.id);
                          if (fullCoinData) {
                            setSelectedCoin(fullCoinData);
                          }
                        } else {
                          // If not in top 10, show details only
                          try {
                            const coinDetails = await coinGeckoApi.getCoinDetails(coin.id);
                            alert(`${coinDetails.name} - Details Only\n\nPrice: $${coinDetails.market_data.current_price.usd.toLocaleString()}\nMarket Cap: $${(coinDetails.market_data.market_cap.usd / 1e9).toFixed(2)}B\nRank: #${coinDetails.market_cap_rank}\n\n${coinDetails.description.en.slice(0, 200)}...`);
                          } catch (error) {
                            console.error('Error fetching coin details:', error);
                          }
                        }
                      }}
                      className={`p-3 sm:p-4 rounded-lg bg-background/50 border transition-all cursor-pointer hover:scale-105 touch-manipulation ${
                        isTop10 
                          ? 'border-primary/20 hover:border-primary/50' 
                          : 'border-border/30 hover:border-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isTop10 ? (
                          <Badge className="text-xs bg-primary shrink-0">Top 10</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs shrink-0">
                            #{index + 1}
                          </Badge>
                        )}
                        <img src={coin.small} alt={coin.name} className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <h4 className="font-medium text-xs sm:text-sm truncate">{coin.name}</h4>
                      <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Interactive Chart */}
      {selectedCoin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <PriceChart
            coinId={selectedCoin.id}
            coinName={selectedCoin.name}
            selectedTimeframe={selectedTimeframe}
          />
        </motion.div>
      )}

      {/* Top Gainers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Gainers */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-crypto-gain">
                <TrendingUp className="w-5 h-5" />
                Top Gainers (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topGainers.map((coin, index) => (
                  <motion.div
                    key={coin.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs min-w-6 sm:min-w-8 shrink-0">
                        #{index + 1}
                      </Badge>
                      <img src={coin.image} alt={coin.name} className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{coin.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">${coin.current_price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-crypto-gain">
                        +{coin.price_change_percentage_24h.toFixed(2)}%
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Losers */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-crypto-loss">
                <TrendingDown className="w-5 h-5" />
                Top Losers (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topLosers.map((coin, index) => (
                  <motion.div
                    key={coin.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs min-w-6 sm:min-w-8 shrink-0">
                        #{index + 1}
                      </Badge>
                      <img src={coin.image} alt={coin.name} className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{coin.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">${coin.current_price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-crypto-loss">
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}