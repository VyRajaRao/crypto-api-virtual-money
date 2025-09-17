import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, ShoppingCart, ArrowUpDown, History, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { CardSkeleton } from '@/components/LoadingSpinner';
import type { Database } from '@/types/database';

type TradeRow = Database['public']['Tables']['trades']['Row'];
type WalletRow = Database['public']['Tables']['wallet']['Row'];

interface EnrichedTrade extends TradeRow {
  coin_name: string;
  coin_symbol: string;
  coin_image: string;
  current_price: number;
  profit_loss: number;
  profit_percentage: number;
}

interface WalletBalance extends WalletRow {
  coin_name: string;
  coin_symbol: string;
  coin_image: string;
  current_value: number;
}

export default function FastLiveTrading() {
  const { user } = useAuth();
  
  // UI state - loads immediately
  const [balance, setBalance] = useState(10000); // Default virtual balance
  const [trades, setTrades] = useState<EnrichedTrade[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  
  const [tradeForm, setTradeForm] = useState({
    coin_id: '',
    coin_name: '',
    coin_symbol: '',
    amount: '',
    price: '',
    total: ''
  });

  // Load trading data immediately on mount
  useEffect(() => {
    if (user) {
      loadTradingDataFast();
    }
  }, [user]);

  // Auto-refresh current prices every 30 seconds
  useEffect(() => {
    if (user && (trades.length > 0 || walletBalances.length > 0)) {
      const interval = setInterval(() => {
        updateCurrentPrices();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, trades, walletBalances]);

  const loadTradingDataFast = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load wallet balance first (fastest)
      const { data: walletData } = await supabase
        .from('wallet')
        .select('*')
        .eq('user_id', user.id);

      const usdBalance = walletData?.find(item => item.asset === 'USD')?.balance || 10000;
      setBalance(usdBalance);

      // Show immediate UI response
      setIsInitialLoad(false);

      // Load trades and wallet data in parallel
      const [tradesResponse, walletsResponse] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('wallet')
          .select('*')
          .eq('user_id', user.id)
          .neq('asset', 'USD')
      ]);

      if (tradesResponse.error || walletsResponse.error) {
        throw tradesResponse.error || walletsResponse.error;
      }

      const tradesData = tradesResponse.data || [];
      const walletsData = walletsResponse.data || [];

      // Show skeleton data immediately
      const skeletonTrades: EnrichedTrade[] = tradesData.map(trade => ({
        ...trade,
        coin_name: trade.coin_id,
        coin_symbol: trade.coin_id.toUpperCase(),
        coin_image: '',
        current_price: 0,
        profit_loss: 0,
        profit_percentage: 0
      }));

      const skeletonWallets: WalletBalance[] = walletsData.map(wallet => ({
        ...wallet,
        coin_name: wallet.asset,
        coin_symbol: wallet.asset.toUpperCase(),
        coin_image: '',
        current_value: 0
      }));

      setTrades(skeletonTrades);
      setWalletBalances(skeletonWallets);
      setIsLoading(false);

      // Enhance with market data in background
      if (tradesData.length > 0 || walletsData.length > 0) {
        const allCoinIds = [
          ...new Set([
            ...tradesData.map(trade => trade.coin_id),
            ...walletsData.map(wallet => wallet.asset.toLowerCase())
          ])
        ];

        try {
          const marketData = await coinGeckoApi.getCoinsByIds(allCoinIds, 'usd');
          
          // Update trades with market data
          const enrichedTrades: EnrichedTrade[] = tradesData.map(trade => {
            const coinData = marketData.find(coin => coin.id === trade.coin_id);
            const current_price = coinData?.current_price || 0;
            const profit_loss = trade.trade_type === 'buy' 
              ? (current_price - trade.price) * trade.amount
              : (trade.price - current_price) * trade.amount;
            const profit_percentage = trade.price > 0 ? (profit_loss / (trade.price * trade.amount)) * 100 : 0;

            return {
              ...trade,
              coin_name: coinData?.name || trade.coin_id,
              coin_symbol: coinData?.symbol.toUpperCase() || trade.coin_id.toUpperCase(),
              coin_image: coinData?.image || '',
              current_price,
              profit_loss,
              profit_percentage
            };
          });

          // Update wallet with market data
          const enrichedWallets: WalletBalance[] = walletsData.map(wallet => {
            const coinData = marketData.find(coin => coin.id === wallet.asset.toLowerCase());
            const current_value = (coinData?.current_price || 0) * wallet.balance;

            return {
              ...wallet,
              coin_name: coinData?.name || wallet.asset,
              coin_symbol: coinData?.symbol.toUpperCase() || wallet.asset.toUpperCase(),
              coin_image: coinData?.image || '',
              current_value
            };
          });

          setTrades(enrichedTrades);
          setWalletBalances(enrichedWallets);
        } catch (marketError) {
          console.warn('Market data failed:', marketError);
          // Data already showing with basic info
        }
      }
    } catch (error) {
      console.error('Error loading trading data:', error);
      toast.error('Failed to load trading data');
      setIsInitialLoad(false);
      setIsLoading(false);
    }
  };

  const updateCurrentPrices = async () => {
    if (!user || (trades.length === 0 && walletBalances.length === 0)) return;

    try {
      const allCoinIds = [
        ...new Set([
          ...trades.map(trade => trade.coin_id),
          ...walletBalances.map(wallet => wallet.asset.toLowerCase())
        ])
      ];

      if (allCoinIds.length === 0) return;

      const marketData = await coinGeckoApi.getCoinsByIds(allCoinIds, 'usd');
      
      // Update trades
      setTrades(prev => prev.map(trade => {
        const coinData = marketData.find(coin => coin.id === trade.coin_id);
        const current_price = coinData?.current_price || trade.current_price;
        const profit_loss = trade.trade_type === 'buy' 
          ? (current_price - trade.price) * trade.amount
          : (trade.price - current_price) * trade.amount;
        const profit_percentage = trade.price > 0 ? (profit_loss / (trade.price * trade.amount)) * 100 : 0;

        return {
          ...trade,
          current_price,
          profit_loss,
          profit_percentage
        };
      }));

      // Update wallet balances
      setWalletBalances(prev => prev.map(wallet => {
        const coinData = marketData.find(coin => coin.id === wallet.asset.toLowerCase());
        const current_value = (coinData?.current_price || 0) * wallet.balance;

        return {
          ...wallet,
          current_value
        };
      }));
    } catch (error) {
      console.warn('Failed to update current prices:', error);
    }
  };

  const handleTrade = async () => {
    if (!user || !tradeForm.coin_id || !tradeForm.amount || !tradeForm.price) {
      toast.error('Please fill all fields');
      return;
    }

    const amount = parseFloat(tradeForm.amount);
    const price = parseFloat(tradeForm.price);
    const total = amount * price;

    if (tradeType === 'buy' && total > balance) {
      toast.error('Insufficient balance');
      return;
    }

    // Check sell balance
    if (tradeType === 'sell') {
      const coinBalance = walletBalances.find(w => w.asset.toLowerCase() === tradeForm.coin_id)?.balance || 0;
      if (amount > coinBalance) {
        toast.error('Insufficient coin balance');
        return;
      }
    }

    try {
      // Execute trade
      const { error: tradeError } = await supabase.from('trades').insert({
        user_id: user.id,
        coin_id: tradeForm.coin_id,
        trade_type: tradeType,
        amount: amount,
        price: price
      });

      if (tradeError) throw tradeError;

      // Update wallet balances
      if (tradeType === 'buy') {
        // Decrease USD balance
        await supabase.from('wallet').upsert({
          user_id: user.id,
          asset: 'USD',
          balance: balance - total
        });

        // Increase coin balance
        const existingCoinBalance = walletBalances.find(w => w.asset.toLowerCase() === tradeForm.coin_id)?.balance || 0;
        await supabase.from('wallet').upsert({
          user_id: user.id,
          asset: tradeForm.coin_id.toUpperCase(),
          balance: existingCoinBalance + amount
        });
      } else {
        // Increase USD balance
        await supabase.from('wallet').upsert({
          user_id: user.id,
          asset: 'USD',
          balance: balance + total
        });

        // Decrease coin balance
        const existingCoinBalance = walletBalances.find(w => w.asset.toLowerCase() === tradeForm.coin_id)?.balance || 0;
        await supabase.from('wallet').upsert({
          user_id: user.id,
          asset: tradeForm.coin_id.toUpperCase(),
          balance: Math.max(0, existingCoinBalance - amount)
        });
      }

      toast.success(`${tradeType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${tradeForm.coin_symbol} successfully`);
      setShowTradeDialog(false);
      setTradeForm({ coin_id: '', coin_name: '', coin_symbol: '', amount: '', price: '', total: '' });
      
      // Refresh data
      loadTradingDataFast();
    } catch (error) {
      console.error('Error executing trade:', error);
      toast.error('Failed to execute trade');
    }
  };

  const handleCoinSelect = async (coin: { id: string; name: string; symbol: string }) => {
    setTradeForm(prev => ({
      ...prev,
      coin_id: coin.id,
      coin_name: coin.name,
      coin_symbol: coin.symbol
    }));

    // Fetch current price
    try {
      const marketData = await coinGeckoApi.getCoinsByIds([coin.id], 'usd');
      if (marketData[0]) {
        setTradeForm(prev => ({
          ...prev,
          price: marketData[0].current_price.toString()
        }));
      }
    } catch (error) {
      console.warn('Failed to fetch current price:', error);
    }
  };

  const calculateTotal = (amount: string, price: string) => {
    const numAmount = parseFloat(amount) || 0;
    const numPrice = parseFloat(price) || 0;
    return (numAmount * numPrice).toFixed(2);
  };

  const getTotalPortfolioValue = () => {
    const walletValue = walletBalances.reduce((sum, wallet) => sum + wallet.current_value, 0);
    return balance + walletValue;
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
        <p className="text-muted-foreground">Please sign in to start trading.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - loads immediately */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Live Trading
          </h1>
          <p className="text-muted-foreground mt-1">
            Virtual trading with real market prices
          </p>
        </div>
        <Dialog open={showTradeDialog} onOpenChange={setShowTradeDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              New Trade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Execute Trade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={tradeType === 'buy' ? 'default' : 'outline'}
                  onClick={() => setTradeType('buy')}
                  className={tradeType === 'buy' ? 'bg-crypto-gain' : ''}
                >
                  Buy
                </Button>
                <Button
                  variant={tradeType === 'sell' ? 'default' : 'outline'}
                  onClick={() => setTradeType('sell')}
                  className={tradeType === 'sell' ? 'bg-crypto-loss' : ''}
                >
                  Sell
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium">Search Cryptocurrency</label>
                <SearchBar onCoinSelect={handleCoinSelect} />
                {tradeForm.coin_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {tradeForm.coin_name} ({tradeForm.coin_symbol})
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.00000001"
                    placeholder="0.00000000"
                    value={tradeForm.amount}
                    onChange={(e) => {
                      const amount = e.target.value;
                      setTradeForm(prev => ({
                        ...prev,
                        amount,
                        total: calculateTotal(amount, prev.price)
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tradeForm.price}
                    onChange={(e) => {
                      const price = e.target.value;
                      setTradeForm(prev => ({
                        ...prev,
                        price,
                        total: calculateTotal(prev.amount, price)
                      }));
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Total (USD)</label>
                <Input
                  value={tradeForm.total}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>Available Balance: ${balance.toLocaleString()}</p>
                {tradeType === 'sell' && tradeForm.coin_id && (
                  <p>
                    Available {tradeForm.coin_symbol}: {
                      walletBalances.find(w => w.asset.toLowerCase() === tradeForm.coin_id)?.balance?.toFixed(8) || '0'
                    }
                  </p>
                )}
              </div>
              
              <Button 
                onClick={handleTrade}
                className={`w-full ${tradeType === 'buy' ? 'bg-crypto-gain' : 'bg-crypto-loss'}`}
                disabled={!tradeForm.coin_id || !tradeForm.amount || !tradeForm.price}
              >
                {tradeType === 'buy' ? 'Buy' : 'Sell'} {tradeForm.coin_symbol}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Balance Cards - loads immediately */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <p className="text-2xl font-bold">${balance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Wallet className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-bold">
                  ${walletBalances.reduce((sum, wallet) => sum + wallet.current_value, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-chart-3/20">
                <TrendingUp className="w-6 h-6 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${getTotalPortfolioValue().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Balances */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/20">
                  <Wallet className="w-5 h-5 text-chart-4" />
                </div>
                <CardTitle>Wallet Balances</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInitialLoad ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                  ))}
                </div>
              ) : walletBalances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2" />
                  <p>No holdings yet</p>
                  <p className="text-sm">Start trading to build your portfolio</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {walletBalances.map((wallet, index) => (
                    <motion.div
                      key={wallet.asset}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-muted/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {wallet.coin_image ? (
                          <img src={wallet.coin_image} alt={wallet.coin_name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        )}
                        <div>
                          <p className="font-medium">{wallet.coin_name}</p>
                          <p className="text-sm text-muted-foreground">{wallet.balance.toFixed(8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {wallet.current_value > 0 ? `$${wallet.current_value.toLocaleString()}` : 'Loading...'}
                        </p>
                        <p className="text-sm text-muted-foreground">{wallet.coin_symbol}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-5/20">
                  <History className="w-5 h-5 text-chart-5" />
                </div>
                <CardTitle>Recent Trades</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInitialLoad ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                  ))}
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2" />
                  <p>No trades yet</p>
                  <p className="text-sm">Your trading history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {trades.slice(0, 10).map((trade, index) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-muted/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {trade.coin_image ? (
                          <img src={trade.coin_image} alt={trade.coin_name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={trade.trade_type === 'buy' ? 'default' : 'secondary'} className={
                              trade.trade_type === 'buy' ? 'bg-crypto-gain' : 'bg-crypto-loss'
                            }>
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                            <p className="font-medium">{trade.coin_name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {trade.amount.toFixed(6)} @ ${trade.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {trade.current_price > 0 ? (
                          <div className={`${trade.profit_loss >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                            <p className="font-medium">
                              {trade.profit_loss >= 0 ? '+' : ''}${Math.abs(trade.profit_loss).toLocaleString()}
                            </p>
                            <p className="text-sm">
                              {trade.profit_percentage.toFixed(2)}%
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Loading...</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
