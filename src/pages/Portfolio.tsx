import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, PieChart, Edit, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio } from "@/hooks/useSupabase";
import { coinGeckoApi } from "@/services/coinGeckoApi";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface PortfolioItemProps {
  item: any;
  onRemove: (id: string) => void;
  onUpdate?: (id: string, amount: number, avgBuyPrice: number) => void;
}

function PortfolioItemCard({ item, onRemove, onUpdate }: PortfolioItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(item.amount?.toString() || '0');
  const [editPrice, setEditPrice] = useState(item.avg_buy_price?.toString() || '0');

  const currentValue = (item.amount || 0) * (item.current_price || 0);
  const purchaseValue = (item.amount || 0) * (item.avg_buy_price || 0);
  const profit = currentValue - purchaseValue;
  const profitPercentage = purchaseValue > 0 ? ((profit / purchaseValue) * 100) : 0;
  const isProfit = profit >= 0;

  const handleUpdate = async () => {
    if (!onUpdate) return;
    try {
      await onUpdate(item.id, parseFloat(editAmount), parseFloat(editPrice));
      setIsEditing(false);
      toast.success("Portfolio item updated successfully!");
    } catch (error) {
      toast.error("Failed to update portfolio item");
    }
  };

  const handleRemove = async () => {
    try {
      await onRemove(item.id);
      toast.success("Asset removed from portfolio");
    } catch (error) {
      toast.error("Failed to remove asset");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 touch-manipulation">
        <CardContent className="p-4 sm:p-6">
          {/* Header with coin info and actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {item.image && (
                <img src={item.image} alt={item.symbol} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                  {item.symbol?.toUpperCase() || 'Unknown'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  ${(item.current_price || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {onUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-8 w-8 sm:h-10 sm:w-10 p-0 text-primary hover:text-primary hover:bg-primary/10 touch-manipulation"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>

          {isEditing && onUpdate ? (
            /* Edit mode */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-amount" className="text-xs sm:text-sm">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="bg-background border-border/50 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-price" className="text-xs sm:text-sm">Avg Buy Price ($)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="any"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="bg-background border-border/50 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  className="bg-gradient-primary touch-manipulation"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="touch-manipulation"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-3">
              {/* Mobile-first layout */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Holdings</p>
                  <p className="font-medium text-foreground text-sm sm:text-base truncate">
                    {(item.amount || 0).toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Current Value</p>
                  <p className="font-semibold text-foreground text-sm sm:text-base">
                    ${currentValue.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* P&L Section */}
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="text-xs sm:text-sm text-muted-foreground">Profit & Loss</div>
                <div className="flex items-center gap-1">
                  {isProfit ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-crypto-gain" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-crypto-loss" />
                  )}
                  <div className="text-right">
                    <p className={`font-medium text-xs sm:text-sm ${isProfit ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {isProfit ? '+' : ''}${Math.abs(profit).toLocaleString()}
                    </p>
                    <p className={`text-xs ${isProfit ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {isProfit ? '+' : ''}{profitPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AddAssetDialog({ onAdd }: { onAdd: (symbol: string, amount: number, buyPrice: number) => Promise<void> }) {
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const searchCoins = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await coinGeckoApi.searchCoins(query);
      setSearchResults(response.coins.slice(0, 5));
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectCoin = (coin: any) => {
    setSymbol(coin.symbol);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !amount || !buyPrice) return;

    setIsLoading(true);
    try {
      await onAdd(symbol, parseFloat(amount), parseFloat(buyPrice));
      
      // Reset form
      setSymbol("");
      setAmount("");
      setBuyPrice("");
      setOpen(false);
      
      toast.success("Asset added to portfolio successfully!");
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error("Failed to add asset to portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300 touch-manipulation text-sm sm:text-base">
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Asset</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 mx-4 sm:mx-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm">Search Cryptocurrency</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Bitcoin, Ethereum, etc..."
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  searchCoins(e.target.value);
                }}
                className="bg-background border-border/50 pl-10 text-sm"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border border-border/50 rounded-lg bg-background max-h-40 overflow-y-auto scrollbar-mobile">
                {searchResults.map((coin) => (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => selectCoin(coin)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors first:rounded-t-lg last:rounded-b-lg touch-manipulation"
                  >
                    <img src={coin.thumb} alt={coin.name} className="w-6 h-6 rounded-full" />
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{coin.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-border/50 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm">Purchase Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="any"
                placeholder="0.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="bg-background border-border/50 text-sm"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!symbol || !amount || !buyPrice || isLoading}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 touch-manipulation"
          >
            {isLoading ? "Adding..." : "Add Asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Portfolio() {
  const { user } = useAuth();
  const { 
    portfolio, 
    isLoading, 
    addToPortfolio, 
    removeFromPortfolio, 
    updatePortfolioItem 
  } = usePortfolio();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const totalValue = portfolio?.reduce((sum, item) => sum + ((item.amount || 0) * (item.current_price || 0)), 0) || 0;
  const totalInvested = portfolio?.reduce((sum, item) => sum + ((item.amount || 0) * (item.avg_buy_price || 0)), 0) || 0;
  const totalProfit = totalValue - totalInvested;
  const totalProfitPercentage = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

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
            Portfolio
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base pr-2">
            Track your cryptocurrency investments
          </p>
        </div>
        <div className="shrink-0">
          <AddAssetDialog onAdd={addToPortfolio} />
        </div>
      </motion.div>

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Wallet className="w-5 h-5 text-primary" />
              Portfolio Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-4 sm:p-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 sm:p-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Invested</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  ${totalInvested.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 sm:p-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total P&L</p>
                <div className="flex items-center justify-center gap-2">
                  {totalProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-crypto-gain" />
                  ) : (
                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-crypto-loss" />
                  )}
                  <div>
                    <p className={`text-lg sm:text-2xl font-bold ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {totalProfit >= 0 ? '+' : ''}${Math.abs(totalProfit).toLocaleString()}
                    </p>
                    <p className={`text-xs sm:text-sm ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                      {totalProfit >= 0 ? '+' : ''}{totalProfitPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {isLoading ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">Loading portfolio...</p>
            </CardContent>
          </Card>
        ) : !portfolio || portfolio.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-8 sm:p-12 text-center">
              <PieChart className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Your portfolio is empty
              </h3>
              <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                Add your first cryptocurrency to start tracking your investments
              </p>
              <AddAssetDialog onAdd={addToPortfolio} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {portfolio.map((item) => (
              <PortfolioItemCard
                key={item.id}
                item={item}
                onRemove={removeFromPortfolio}
                onUpdate={updatePortfolioItem}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
