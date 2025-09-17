import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Wallet, AlertTriangle, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import type { Database } from '@/types/database';

type PortfolioRow = Database['public']['Tables']['portfolio']['Row'];
type PortfolioInsert = Database['public']['Tables']['portfolio']['Insert'];

interface EnrichedPortfolioItem extends PortfolioRow {
  current_price: number;
  current_value: number;
  profit_loss: number;
  profit_percentage: number;
  name: string;
  symbol: string;
  image: string;
}

interface LocalStoragePortfolio {
  coinId: string;
  name: string;
  symbol: string;
  amount: number;
  avgPrice?: number;
}

export default function EnhancedPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EnrichedPortfolioItem | null>(null);
  const [localStorageData, setLocalStorageData] = useState<LocalStoragePortfolio[]>([]);
  
  const [newAsset, setNewAsset] = useState<{
    coin_id: string;
    coin_name: string;
    coin_symbol: string;
    amount: string;
    avg_price: string;
    asset_type: string;
  }>({
    coin_id: '',
    coin_name: '',
    coin_symbol: '',
    amount: '',
    avg_price: '',
    asset_type: 'crypto'
  });

  useEffect(() => {
    if (user) {
      checkForLocalStorageData();
      fetchPortfolio();
    }
  }, [user]);

  const checkForLocalStorageData = () => {
    try {
      const localData = localStorage.getItem('portfolio');
      if (localData) {
        const parsedData: LocalStoragePortfolio[] = JSON.parse(localData);
        if (parsedData.length > 0) {
          setLocalStorageData(parsedData);
          setShowMigrationDialog(true);
        }
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }
  };

  const migrateFromLocalStorage = async () => {
    if (!user || localStorageData.length === 0) return;

    try {
      const migrationPromises = localStorageData.map(async (item) => {
        return supabase.from('portfolio').insert({
          user_id: user.id,
          coin_id: item.coinId,
          amount: item.amount,
          avg_price: item.avgPrice || 0,
          asset_type: 'crypto'
        });
      });

      await Promise.all(migrationPromises);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('portfolio');
      
      toast.success(`Successfully migrated ${localStorageData.length} portfolio items`);
      setShowMigrationDialog(false);
      fetchPortfolio();
    } catch (error) {
      console.error('Error migrating data:', error);
      toast.error('Failed to migrate portfolio data');
    }
  };

  const skipMigration = () => {
    localStorage.removeItem('portfolio');
    setShowMigrationDialog(false);
  };

  const fetchPortfolio = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data: portfolioData, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!portfolioData || portfolioData.length === 0) {
        setPortfolio([]);
        setIsLoading(false);
        return;
      }

      // Load portfolio data first, then enrich with market data
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
            symbol: coinData?.symbol.toUpperCase() || '',
            image: coinData?.image || ''
          };
        });

        setPortfolio(enrichedPortfolio);
      } catch (marketError) {
        console.error('Error fetching market data:', marketError);
        // Show portfolio without market data if API fails
        const basicPortfolio: EnrichedPortfolioItem[] = portfolioData.map(item => ({
          ...item,
          current_price: 0,
          current_value: 0,
          profit_loss: 0,
          profit_percentage: 0,
          name: item.coin_id,
          symbol: item.coin_id.toUpperCase(),
          image: ''
        }));
        setPortfolio(basicPortfolio);
        toast.error('Market data unavailable - showing portfolio without prices');
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async () => {
    if (!user || !newAsset.coin_id || !newAsset.amount || !newAsset.avg_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('portfolio').insert({
        user_id: user.id,
        coin_id: newAsset.coin_id,
        amount: parseFloat(newAsset.amount),
        avg_price: parseFloat(newAsset.avg_price),
        asset_type: newAsset.asset_type
      });

      if (error) throw error;

      toast.success('Asset added to portfolio');
      setShowAddDialog(false);
      setNewAsset({
        coin_id: '',
        coin_name: '',
        coin_symbol: '',
        amount: '',
        avg_price: '',
        asset_type: 'crypto'
      });
      fetchPortfolio();
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error('Failed to add asset');
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingItem || !newAsset.amount || !newAsset.avg_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('portfolio')
        .update({
          amount: parseFloat(newAsset.amount),
          avg_price: parseFloat(newAsset.avg_price)
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Asset updated successfully');
      setEditingItem(null);
      setNewAsset({
        coin_id: '',
        coin_name: '',
        coin_symbol: '',
        amount: '',
        avg_price: '',
        asset_type: 'crypto'
      });
      fetchPortfolio();
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error('Failed to update asset');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Asset removed from portfolio');
      fetchPortfolio();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to remove asset');
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

  const handleEdit = (item: EnrichedPortfolioItem) => {
    setEditingItem(item);
    setNewAsset({
      coin_id: item.coin_id,
      coin_name: item.name,
      coin_symbol: item.symbol,
      amount: item.amount.toString(),
      avg_price: item.avg_price.toString(),
      asset_type: item.asset_type
    });
  };

  const calculateTotals = () => {
    const totalValue = portfolio.reduce((sum, item) => sum + item.current_value, 0);
    const totalInvested = portfolio.reduce((sum, item) => sum + (item.amount * item.avg_price), 0);
    const totalProfit = totalValue - totalInvested;
    const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return { totalValue, totalInvested, totalProfit, totalProfitPercentage };
  };

  const exportPortfolio = () => {
    const exportData = portfolio.map(item => ({
      coin: item.name,
      symbol: item.symbol,
      amount: item.amount,
      avg_price: item.avg_price,
      current_price: item.current_price,
      current_value: item.current_value,
      profit_loss: item.profit_loss,
      profit_percentage: item.profit_percentage
    }));

    const csvContent = [
      ['Coin', 'Symbol', 'Amount', 'Avg Price', 'Current Price', 'Current Value', 'Profit/Loss', 'Profit %'].join(','),
      ...exportData.map(item => [
        item.coin,
        item.symbol,
        item.amount,
        item.avg_price,
        item.current_price,
        item.current_value,
        item.profit_loss,
        item.profit_percentage
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Portfolio exported to CSV');
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-muted-foreground">Please sign in to manage your portfolio.</p>
      </div>
    );
  }

  const { totalValue, totalInvested, totalProfit, totalProfitPercentage } = calculateTotals();

  return (
    <div className="space-y-8">
      {/* Migration Dialog */}
      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Migrate Portfolio Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">
                We found {localStorageData.length} portfolio items in your browser's local storage.
                Would you like to migrate them to your secure cloud account?
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {localStorageData.slice(0, 3).map((item, index) => (
                  <li key={index}>• {item.name} ({item.amount} {item.symbol})</li>
                ))}
                {localStorageData.length > 3 && (
                  <li>• ... and {localStorageData.length - 3} more</li>
                )}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={migrateFromLocalStorage} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Yes, Migrate Data
              </Button>
              <Button onClick={skipMigration} variant="outline" className="flex-1">
                Skip Migration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
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
            Track your crypto investments and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPortfolio} variant="outline" size="sm" disabled={portfolio.length === 0}>
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
                <DialogTitle>
                  {editingItem ? 'Edit Asset' : 'Add New Asset'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!editingItem && (
                  <div>
                    <label className="text-sm font-medium">Search Cryptocurrency</label>
                    <SearchBar onCoinSelect={handleCoinSelect} />
                    {newAsset.coin_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {newAsset.coin_name} ({newAsset.coin_symbol})
                      </p>
                    )}
                  </div>
                )}
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
                  <label className="text-sm font-medium">Average Purchase Price (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAsset.avg_price}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, avg_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Asset Type</label>
                  <Select
                    value={newAsset.asset_type}
                    onValueChange={(value) => setNewAsset(prev => ({ ...prev, asset_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="stock">Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={editingItem ? handleUpdateAsset : handleAddAsset} 
                  className="w-full"
                  disabled={!newAsset.coin_id || !newAsset.amount || !newAsset.avg_price}
                >
                  {editingItem ? 'Update Asset' : 'Add Asset'}
                </Button>
                {editingItem && (
                  <Button 
                    onClick={() => {
                      setEditingItem(null);
                      setNewAsset({
                        coin_id: '',
                        coin_name: '',
                        coin_symbol: '',
                        amount: '',
                        avg_price: '',
                        asset_type: 'crypto'
                      });
                    }} 
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-bold">${totalInvested.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <div className="flex items-center gap-2">
                {totalProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-crypto-gain" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-crypto-loss" />
                )}
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  ${Math.abs(totalProfit).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Return</p>
              <div className="flex items-center gap-2">
                {totalProfitPercentage >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-crypto-gain" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-crypto-loss" />
                )}
                <p className={`text-2xl font-bold ${totalProfitPercentage >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {totalProfitPercentage >= 0 ? '+' : ''}{totalProfitPercentage.toFixed(2)}%
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
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading portfolio...</p>
              </div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Assets Yet</h3>
                <p className="text-muted-foreground">Add your first cryptocurrency to start tracking.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Asset</th>
                      <th className="p-4 text-right text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="p-4 text-right text-sm font-medium text-muted-foreground">Avg Price</th>
                      <th className="p-4 text-right text-sm font-medium text-muted-foreground">Current Price</th>
                      <th className="p-4 text-right text-sm font-medium text-muted-foreground">Value</th>
                      <th className="p-4 text-right text-sm font-medium text-muted-foreground">P&L</th>
                      <th className="p-4 text-center text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-8 h-8 rounded-full" />
                            )}
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">{item.symbol}</p>
                                <Badge variant="outline" className="text-xs">
                                  {item.asset_type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-medium">{item.amount.toFixed(8)}</p>
                          <p className="text-xs text-muted-foreground">{item.symbol}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-medium">${item.avg_price.toLocaleString()}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-medium">${item.current_price.toLocaleString()}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-medium">${item.current_value.toLocaleString()}</p>
                        </td>
                        <td className="p-4 text-right">
                          <div className="space-y-1">
                            <p className={`font-medium ${item.profit_loss >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                              {item.profit_loss >= 0 ? '+' : ''}${Math.abs(item.profit_loss).toLocaleString()}
                            </p>
                            <p className={`text-xs ${item.profit_percentage >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                              {item.profit_percentage >= 0 ? '+' : ''}{item.profit_percentage.toFixed(2)}%
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleEdit(item);
                                setShowAddDialog(true);
                              }}
                              className="hover:bg-primary/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-destructive/10 text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Asset</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {item.name} from your portfolio? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAsset(item.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
