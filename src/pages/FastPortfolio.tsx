import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Wallet, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { LoadingSpinner, CardSkeleton } from '@/components/LoadingSpinner';
import type { Database } from '@/types/database';

type PortfolioRow = Database['public']['Tables']['portfolio']['Row'];

interface EnrichedPortfolioItem extends PortfolioRow {
  current_price: number;
  current_value: number;
  profit_loss: number;
  profit_percentage: number;
  name: string;
  symbol: string;
  image: string;
}

export default function FastPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EnrichedPortfolioItem | null>(null);
  
  const [newAsset, setNewAsset] = useState({
    coin_id: '',
    coin_name: '',
    coin_symbol: '',
    amount: '',
    avg_price: ''
  });

  // Load portfolio immediately on mount
  useEffect(() => {
    if (user) {
      loadPortfolioFast();
    }
  }, [user]);

  const loadPortfolioFast = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Step 1: Load portfolio data from Supabase immediately
      const { data: portfolioData, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!portfolioData || portfolioData.length === 0) {
        setPortfolio([]);
        setIsInitialLoad(false);
        setIsLoading(false);
        return;
      }

      // Step 2: Show portfolio skeleton immediately
      const skeletonPortfolio: EnrichedPortfolioItem[] = portfolioData.map(item => ({
        ...item,
        current_price: 0,
        current_value: 0,
        profit_loss: 0,
        profit_percentage: 0,
        name: item.coin_id,
        symbol: item.coin_id.toUpperCase(),
        image: ''
      }));
      
      setPortfolio(skeletonPortfolio);
      setIsInitialLoad(false);
      setIsLoading(false);

      // Step 3: Enhance with market data in background
      const coinIds = portfolioData.map(item => item.coin_id);
      
      try {
        const marketData = await coinGeckoApi.getCoinsByIds(coinIds, 'usd');
        
        const enrichedPortfolio: EnrichedPortfolioItem[] = portfolioData.map(item => {
          const coinData = marketData.find(coin => coin.id === item.coin_id);
          const current_price = coinData?.current_price || 0;
          const current_value = item.amount * current_price;
          const invested_value = item.amount * item.avg_price;
          const profit_loss = current_value - invested_value;
          const profit_percentage = invested_value > 0 ? (profit_loss / invested_value) * 100 : 0;

          return {
            ...item,
            current_price,
            current_value,
            profit_loss,
            profit_percentage,
            name: coinData?.name || item.coin_id,
            symbol: coinData?.symbol.toUpperCase() || item.coin_id.toUpperCase(),
            image: coinData?.image || ''
          };
        });

        // Update with real data
        setPortfolio(enrichedPortfolio);
      } catch (marketError) {
        console.warn('Market data failed, showing basic portfolio:', marketError);
        // Portfolio already showing with basic data
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      toast.error('Failed to load portfolio');
      setIsInitialLoad(false);
      setIsLoading(false);
    }
  };

  const handleAddAsset = async () => {
    if (!user || !newAsset.coin_id || !newAsset.amount || !newAsset.avg_price) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const { error } = await supabase.from('portfolio').insert({
        user_id: user.id,
        coin_id: newAsset.coin_id,
        amount: parseFloat(newAsset.amount),
        avg_price: parseFloat(newAsset.avg_price),
        asset_type: 'crypto'
      });

      if (error) throw error;

      toast.success('Asset added successfully');
      setShowAddDialog(false);
      setNewAsset({ coin_id: '', coin_name: '', coin_symbol: '', amount: '', avg_price: '' });
      loadPortfolioFast(); // Refresh
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error('Failed to add asset');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Asset deleted');
      setPortfolio(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const handleCoinSelect = (coin: { id: string; name: string; symbol: string }) => {
    setNewAsset(prev => ({
      ...prev,
      coin_id: coin.id,
      coin_name: coin.name,
      coin_symbol: coin.symbol
    }));
  };

  const calculateTotals = () => {
    const totalValue = portfolio.reduce((sum, item) => sum + item.current_value, 0);
    const totalInvested = portfolio.reduce((sum, item) => sum + (item.amount * item.avg_price), 0);
    const totalProfit = totalValue - totalInvested;
    const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    return { totalValue, totalInvested, totalProfit, totalProfitPercentage };
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
        <p className="text-muted-foreground">Please sign in to view your portfolio.</p>
      </div>
    );
  }

  const { totalValue, totalInvested, totalProfit, totalProfitPercentage } = calculateTotals();

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
            Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your cryptocurrency investments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={portfolio.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Search Cryptocurrency</label>
                  <SearchBar onCoinSelect={handleCoinSelect} />
                  {newAsset.coin_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {newAsset.coin_name} ({newAsset.coin_symbol})
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
                      value={newAsset.amount}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Avg Price (USD)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newAsset.avg_price}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, avg_price: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddAsset}
                  className="w-full"
                  disabled={!newAsset.coin_id || !newAsset.amount || !newAsset.avg_price}
                >
                  Add Asset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Summary Cards - loads immediately with basic data */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {totalValue > 0 ? `$${totalValue.toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-secondary/20">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold">
                  {totalInvested > 0 ? `$${totalInvested.toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-crypto-gain/20' : 'bg-crypto-loss/20'}`}>
                {totalProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-crypto-gain" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-crypto-loss" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {totalProfit !== 0 ? `${totalProfit >= 0 ? '+' : ''}$${Math.abs(totalProfit).toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${totalProfitPercentage >= 0 ? 'bg-crypto-gain/20' : 'bg-crypto-loss/20'}`}>
                {totalProfitPercentage >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-crypto-gain" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-crypto-loss" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Return</p>
                <p className={`text-2xl font-bold ${totalProfitPercentage >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {totalProfitPercentage !== 0 ? `${totalProfitPercentage >= 0 ? '+' : ''}${totalProfitPercentage.toFixed(2)}%` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isInitialLoad ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : portfolio.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-12 text-center">
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your portfolio is empty</h3>
              <p className="text-muted-foreground mb-6">
                Add your first cryptocurrency to start tracking
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                        )}
                        <div>
                          <h3 className="font-semibold">{item.name || item.coin_id}</h3>
                          <p className="text-sm text-muted-foreground uppercase">{item.symbol}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAsset(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Holdings</p>
                        <p className="font-medium">{item.amount.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="font-medium">
                          {item.current_price > 0 ? `$${item.current_price.toLocaleString()}` : 'Loading...'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Value</p>
                        <p className="font-semibold">
                          {item.current_value > 0 ? `$${item.current_value.toLocaleString()}` : 'Loading...'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">P&L</p>
                        {item.current_value > 0 ? (
                          <div className={`flex items-center gap-1 ${item.profit_loss >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                            {item.profit_loss >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <div className="text-sm">
                              <p className="font-medium">
                                {item.profit_loss >= 0 ? '+' : ''}${Math.abs(item.profit_loss).toLocaleString()}
                              </p>
                              <p className="text-xs">
                                {item.profit_percentage.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Loading...</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
