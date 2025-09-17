import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Star, Eye, Search, Filter, Calendar, Globe, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceChart } from '@/components/PriceChart';
import { SearchBar } from '@/components/SearchBar';
import { coinGeckoApi, type CoinData } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ExtendedCoinData extends CoinData {
  hasChartData?: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
}

export default function TopCoinsAnalysis() {
  const navigate = useNavigate();
  const [topCoins, setTopCoins] = useState<ExtendedCoinData[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<ExtendedCoinData[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<ExtendedCoinData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('market_cap_rank');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const timeframes = [
    { label: '24h', value: '1d', days: 1 },
    { label: '7d', value: '7d', days: 7 },
    { label: '30d', value: '30d', days: 30 },
    { label: '90d', value: '90d', days: 90 },
    { label: '1y', value: '365d', days: 365 },
  ];

  useEffect(() => {
    fetchTopCoins();
  }, []);

  useEffect(() => {
    filterAndSortCoins();
  }, [topCoins, searchQuery, sortBy]);

  const fetchTopCoins = async () => {
    try {
      setIsLoading(true);
      
      // Fetch top 10 coins by market cap - simplified for speed
      const coins = await coinGeckoApi.getTopCoins(10, 'usd');
      
      // Mark all top 10 coins as having chart data available
      const enhancedCoins: ExtendedCoinData[] = coins.map(coin => ({
        ...coin,
        hasChartData: coin.market_cap_rank <= 10
      }));

      setTopCoins(enhancedCoins);
      if (enhancedCoins.length > 0) {
        setSelectedCoin(enhancedCoins[0]); // Select first coin by default
      }
    } catch (error) {
      console.error('Error fetching top coins:', error);
      toast.error('Failed to load market data. Using cached data if available.');
      // Don't completely fail - just show empty state
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCoins = () => {
    let filtered = [...topCoins];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(coin => 
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.current_price - a.current_price;
        case 'change':
          return b.price_change_percentage_24h - a.price_change_percentage_24h;
        case 'market_cap':
          return b.market_cap - a.market_cap;
        case 'volume':
          return b.total_volume - a.total_volume;
        default:
          return a.market_cap_rank - b.market_cap_rank;
      }
    });

    setFilteredCoins(filtered);
  };

  const handleCoinSearch = async (searchResult: SearchResult) => {
    try {
      // Check if it's already in top 10
      const existingCoin = topCoins.find(coin => coin.id === searchResult.id);
      if (existingCoin) {
        setSelectedCoin(existingCoin);
        return;
      }

      // Fetch detailed data for the searched coin
      const coinDetails = await coinGeckoApi.getCoinDetails(searchResult.id);
      const marketData = await coinGeckoApi.getCoinsByIds([searchResult.id]);
      const coinData = marketData[0];

      if (coinData) {
        const isTop10 = searchResult.market_cap_rank <= 10;
        const extendedCoin: ExtendedCoinData = {
          ...coinData,
          hasChartData: isTop10
        };
        
        setSelectedCoin(extendedCoin);
        
        if (!isTop10) {
          toast.info('Chart data is only available for top 10 cryptocurrencies by market cap.');
        }
      }
    } catch (error) {
      console.error('Error loading coin data:', error);
      toast.error('Failed to load coin data');
    }
  };

  const CoinCard = ({ coin, isSelected = false }: { coin: ExtendedCoinData; isSelected?: boolean }) => {
    const isPositive = coin.price_change_percentage_24h >= 0;
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={`cursor-pointer transition-all duration-300 hover:shadow-glow ${
            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'bg-gradient-card border-border/50'
          }`}
          onClick={() => setSelectedCoin(coin)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={coin.image} alt={coin.name} className="w-12 h-12 rounded-full" />
                <div>
                  <h3 className="font-bold text-lg">{coin.name}</h3>
                  <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-2">
                  #{coin.market_cap_rank}
                </Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/coins/${coin.id}`);
                  }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Star className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">${coin.current_price.toLocaleString()}</p>
                <div className={`flex items-center gap-1 ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-medium">
                    {isPositive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/30">
                <div>
                  <p className="text-xs text-muted-foreground">Market Cap</p>
                  <p className="font-medium">
                    ${(coin.market_cap / 1e9).toFixed(1)}B
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-medium">
                    ${(coin.total_volume / 1e6).toFixed(1)}M
                  </p>
                </div>
              </div>

              {coin.hasChartData && (
                <Badge className="bg-crypto-gain/20 text-crypto-gain">
                  Chart Available
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const CoinRowItem = ({ coin, isSelected = false }: { coin: ExtendedCoinData; isSelected?: boolean }) => {
    const isPositive = coin.price_change_percentage_24h >= 0;
    
    return (
      <motion.tr
        className={`cursor-pointer hover:bg-secondary/30 transition-colors ${
          isSelected ? 'bg-primary/5' : ''
        }`}
        onClick={() => setSelectedCoin(coin)}
        whileHover={{ scale: 1.01 }}
      >
        <td className="p-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-muted-foreground">#{coin.market_cap_rank}</span>
            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
            <div>
              <p className="font-medium">{coin.name}</p>
              <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
            </div>
          </div>
        </td>
        <td className="p-4 text-right">
          <p className="font-bold">${coin.current_price.toLocaleString()}</p>
        </td>
        <td className="p-4 text-right">
          <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-medium">
              {isPositive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
            </span>
          </div>
        </td>
        <td className="p-4 text-right">
          <p>${(coin.market_cap / 1e9).toFixed(1)}B</p>
        </td>
        <td className="p-4 text-right">
          <p>${(coin.total_volume / 1e6).toFixed(1)}M</p>
        </td>
        <td className="p-4 text-center">
          {coin.hasChartData && (
            <Badge variant="secondary" className="bg-crypto-gain/20 text-crypto-gain">
              Charts
            </Badge>
          )}
        </td>
      </motion.tr>
    );
  };

  const ExpandedCoinDetails = ({ coin }: { coin: ExtendedCoinData }) => (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
            <span>{coin.name} Details</span>
          </div>
          {!coin.hasChartData && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              Limited Data Available
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">All-Time High</p>
            <p className="font-bold text-lg">${coin.ath.toLocaleString()}</p>
            <p className={`text-sm ${coin.ath_change_percentage >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
              {coin.ath_change_percentage.toFixed(1)}% from ATH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">All-Time Low</p>
            <p className="font-bold text-lg">${coin.atl.toLocaleString()}</p>
            <p className="text-crypto-gain text-sm">
              +{coin.atl_change_percentage.toFixed(1)}% from ATL
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Circulating Supply</p>
            <p className="font-bold text-lg">
              {(coin.circulating_supply / 1e6).toFixed(1)}M
            </p>
            <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Supply</p>
            <p className="font-bold text-lg">
              {coin.max_supply ? `${(coin.max_supply / 1e6).toFixed(1)}M` : '∞'}
            </p>
            <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/20">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h4 className="font-medium">External Links</h4>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`https://www.coingecko.com/en/coins/${coin.id}`} target="_blank" rel="noopener noreferrer">
                CoinGecko <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading market analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Market Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Top 10 cryptocurrencies by market cap with interactive charts
          </p>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1 max-w-md">
          <SearchBar onCoinSelect={handleCoinSearch} />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-40"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market_cap_rank">Rank</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="change">24h Change</SelectItem>
              <SelectItem value="market_cap">Market Cap</SelectItem>
              <SelectItem value="volume">Volume</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              List
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coins List/Grid */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>
                {filteredCoins.length === topCoins.length ? 'Top 10 Cryptocurrencies' : `Filtered Results (${filteredCoins.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-6">
                  {filteredCoins.map((coin) => (
                    <CoinCard 
                      key={coin.id} 
                      coin={coin} 
                      isSelected={selectedCoin?.id === coin.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-4 text-left text-sm font-medium text-muted-foreground">Asset</th>
                        <th className="p-4 text-right text-sm font-medium text-muted-foreground">Price</th>
                        <th className="p-4 text-right text-sm font-medium text-muted-foreground">24h %</th>
                        <th className="p-4 text-right text-sm font-medium text-muted-foreground">Market Cap</th>
                        <th className="p-4 text-right text-sm font-medium text-muted-foreground">Volume</th>
                        <th className="p-4 text-center text-sm font-medium text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCoins.map((coin) => (
                        <CoinRowItem 
                          key={coin.id} 
                          coin={coin} 
                          isSelected={selectedCoin?.id === coin.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected Coin Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 space-y-6"
        >
          {selectedCoin && (
            <>
              {selectedCoin.hasChartData ? (
                <Card className="bg-gradient-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedCoin.name} Chart</span>
                      <div className="flex gap-1">
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
                    <div className="h-64">
                      <PriceChart
                        coinId={selectedCoin.id}
                        coinName={selectedCoin.name}
                        selectedTimeframe={selectedTimeframe}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-card border-border/50">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Interactive charts are only available for top 10 cryptocurrencies by market cap.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This coin is currently ranked #{selectedCoin.market_cap_rank} by market cap.
                    </p>
                  </CardContent>
                </Card>
              )}
              
              <ExpandedCoinDetails coin={selectedCoin} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
