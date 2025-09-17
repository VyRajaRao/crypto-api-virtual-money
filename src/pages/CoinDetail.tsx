import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Star, Plus, Calendar, Globe, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceChart } from '@/components/PriceChart';
import { coinGeckoApi, type CoinDetails, type CoinData } from '@/services/coinGeckoApi';
import { toast } from 'sonner';

export default function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coinDetails, setCoinDetails] = useState<CoinDetails | null>(null);
  const [isTop10, setIsTop10] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  const timeframes = [
    { label: '24h', value: '24h', days: 1 },
    { label: '7d', value: '7d', days: 7 },
    { label: '30d', value: '30d', days: 30 },
    { label: '90d', value: '90d', days: 90 },
    { label: '1y', value: '1y', days: 365 },
  ];

  useEffect(() => {
    const fetchCoinDetails = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        
        // Fetch coin details
        const details = await coinGeckoApi.getCoinDetails(id);
        setCoinDetails(details);

        // Check if coin is in top 10 by market cap
        const top10 = await coinGeckoApi.getTopCoins(10, 'usd');
        const isInTop10 = top10.some(coin => coin.id === id);
        setIsTop10(isInTop10);

      } catch (error) {
        console.error('Error fetching coin details:', error);
        toast.error('Failed to load coin details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoinDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading coin details...</p>
      </div>
    );
  }

  if (!coinDetails) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Coin Not Found</h2>
        <p className="text-muted-foreground mb-6">The coin you're looking for could not be found.</p>
        <Button onClick={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }

  const isPositive = coinDetails.market_data.price_change_percentage_24h >= 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="hover:bg-secondary/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-4">
          <img 
            src={coinDetails.image.large} 
            alt={coinDetails.name} 
            className="w-12 h-12 rounded-full"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {coinDetails.name}
              </h1>
              <Badge variant="outline" className="text-sm">
                {coinDetails.symbol.toUpperCase()}
              </Badge>
              {isTop10 && (
                <Badge className="bg-primary text-primary-foreground">
                  Top 10
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Market Cap Rank #{coinDetails.market_cap_rank}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Price and Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold">
                ${coinDetails.market_data.current_price.usd.toLocaleString()}
              </p>
              <div className={`flex items-center gap-1 ${
                isPositive ? 'text-crypto-gain' : 'text-crypto-loss'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isPositive ? '+' : ''}{coinDetails.market_data.price_change_percentage_24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Market Cap</p>
              <p className="text-xl font-bold">
                ${(coinDetails.market_data.market_cap.usd / 1e9).toFixed(2)}B
              </p>
              <div className={`text-sm ${
                coinDetails.market_data.market_cap_change_percentage_24h >= 0 
                  ? 'text-crypto-gain' 
                  : 'text-crypto-loss'
              }`}>
                {coinDetails.market_data.market_cap_change_percentage_24h >= 0 ? '+' : ''}
                {coinDetails.market_data.market_cap_change_percentage_24h.toFixed(2)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">24h Volume</p>
              <p className="text-xl font-bold">
                ${(coinDetails.market_data.total_volume.usd / 1e6).toFixed(2)}M
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Circulating Supply</p>
              <p className="text-xl font-bold">
                {(coinDetails.market_data.circulating_supply / 1e6).toFixed(2)}M
              </p>
              <p className="text-xs text-muted-foreground">
                {coinDetails.symbol.toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Chart Section (only for Top 10) */}
      {isTop10 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Price Chart</span>
                <div className="flex gap-2">
                  {timeframes.map((timeframe) => (
                    <Button
                      key={timeframe.value}
                      variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTimeframe(timeframe.value)}
                      className={selectedTimeframe === timeframe.value ? "bg-gradient-primary" : ""}
                    >
                      {timeframe.label}
                    </Button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart
                coinId={coinDetails.id}
                coinName={coinDetails.name}
                selectedTimeframe={selectedTimeframe}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Additional Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Price Statistics */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Price Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">All-Time High</span>
              <div className="text-right">
                <p className="font-medium">${coinDetails.market_data.ath.usd.toLocaleString()}</p>
                <p className={`text-xs ${
                  coinDetails.market_data.ath_change_percentage.usd >= 0 
                    ? 'text-crypto-gain' 
                    : 'text-crypto-loss'
                }`}>
                  {coinDetails.market_data.ath_change_percentage.usd.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">All-Time Low</span>
              <div className="text-right">
                <p className="font-medium">${coinDetails.market_data.atl.usd.toLocaleString()}</p>
                <p className={`text-xs ${
                  coinDetails.market_data.atl_change_percentage.usd >= 0 
                    ? 'text-crypto-gain' 
                    : 'text-crypto-loss'
                }`}>
                  +{coinDetails.market_data.atl_change_percentage.usd.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h High</span>
              <p className="font-medium">${coinDetails.market_data.high_24h?.usd?.toLocaleString() || 'N/A'}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h Low</span>
              <p className="font-medium">${coinDetails.market_data.low_24h?.usd?.toLocaleString() || 'N/A'}</p>
            </div>
            {coinDetails.market_data.total_supply && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Supply</span>
                <p className="font-medium">
                  {(coinDetails.market_data.total_supply / 1e6).toFixed(2)}M {coinDetails.symbol.toUpperCase()}
                </p>
              </div>
            )}
            {coinDetails.market_data.max_supply && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Supply</span>
                <p className="font-medium">
                  {(coinDetails.market_data.max_supply / 1e6).toFixed(2)}M {coinDetails.symbol.toUpperCase()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>About {coinDetails.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coinDetails.description?.en && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {coinDetails.description.en.length > 300 
                    ? `${coinDetails.description.en.substring(0, 300)}...`
                    : coinDetails.description.en
                  }
                </p>
              </div>
            )}
            
            {/* Links */}
            <div className="pt-4 border-t border-border/30">
              <h4 className="font-medium mb-3">Official Links</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://www.coingecko.com/en/coins/${coinDetails.id}`} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    CoinGecko
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notice for Non-Top 10 Coins */}
      {!isTop10 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Interactive charts are only available for top 10 cryptocurrencies by market cap.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                This coin is currently ranked #{coinDetails.market_cap_rank} by market cap.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
