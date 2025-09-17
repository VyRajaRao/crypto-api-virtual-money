import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieChartIcon, BarChart3, Clock, Target, RefreshCw, Search, Trash2, Edit, Star, Filter } from 'lucide-react';
import { toast } from 'sonner';

// Types
interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  totalInvested: number;
  unrealizedPnL: number;
  realizedPnL: number;
  pnlPercentage: number;
  allocation: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
  lastUpdated: string;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  fee: number;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

interface Notification {
  id: string;
  type: 'trade' | 'alert' | 'news' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface WalletInfo {
  totalBalance: number;
  availableBalance: number;
  portfolioValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

const IntegratedPortfolio = () => {
  // Mock wallet data - VIRTUAL MONEY FOR SIMULATION ONLY
  const [wallet] = useState<WalletInfo>({
    totalBalance: 15000,
    availableBalance: 15000,
    portfolioValue: 0,
    totalPnL: 0,
    totalPnLPercentage: 0,
    dailyPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0
  });

  // Mock portfolio assets - Empty initial state
  const [portfolio] = useState<PortfolioAsset[]>([]);

  // Mock recent trades - Empty initial state
  const [trades] = useState<Trade[]>([]);

  // Mock notifications - Empty initial state
  const [notifications] = useState<Notification[]>([]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'allocation' | 'name'>('value');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Add asset form
  const [addForm, setAddForm] = useState({
    symbol: '',
    amount: '',
    price: ''
  });

  // Simulated price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Filtered portfolio
  const filteredPortfolio = useMemo(() => {
    let filtered = portfolio;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query)
      );
    }

    // Hide small balances
    if (hideSmallBalances) {
      filtered = filtered.filter(asset => asset.totalValue > 10);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.totalValue - a.totalValue;
        case 'pnl':
          return b.unrealizedPnL - a.unrealizedPnL;
        case 'allocation':
          return b.allocation - a.allocation;
        case 'name':
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });

    return filtered;
  }, [portfolio, searchQuery, hideSmallBalances, sortBy]);

  // Chart data
  const pieChartData = useMemo(() => {
    return portfolio.map((asset, index) => ({
      name: asset.symbol,
      value: asset.totalValue,
      color: COLORS[index % COLORS.length],
      percentage: asset.allocation
    }));
  }, [portfolio]);

  // Performance chart data
  const performanceData = useMemo(() => {
    const days = 30;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const variance = (Math.random() - 0.5) * 1000;
      return {
        date: date.toISOString().split('T')[0],
        value: wallet.portfolioValue + variance,
        pnl: wallet.totalPnL + (variance * 0.1)
      };
    });
  }, [wallet]);

  // Handlers
  const handleAddAsset = async () => {
    if (!addForm.symbol || !addForm.amount || !addForm.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success(`Added ${addForm.amount} ${addForm.symbol.toUpperCase()} to portfolio`);
      setAddForm({ symbol: '', amount: '', price: '' });
      setShowAddDialog(false);
      setIsLoading(false);
    }, 1000);
  };

  const handleRemoveAsset = (assetId: string) => {
    const asset = portfolio.find(a => a.id === assetId);
    if (asset) {
      toast.success(`Removed ${asset.symbol} from portfolio`);
    }
  };

  const refreshPortfolio = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
      toast.success('Portfolio refreshed');
    }, 1500);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">
            Track your cryptocurrency investments and performance
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2 mb-2">
            <p className="text-sm text-slate-700 font-medium">
              💡 Virtual Money Simulator - All funds are virtual for educational purposes only
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPortfolio}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Asset to Portfolio</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    placeholder="BTC, ETH, SOL..."
                    value={addForm.symbol}
                    onChange={(e) => setAddForm({ ...addForm, symbol: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Average Buy Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAsset}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Adding...' : 'Add Asset'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(wallet.portfolioValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(wallet.totalPnLPercentage)} total return
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-semibold ${
                  wallet.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(wallet.totalPnL)}
                </p>
                <p className={`text-xs ${
                  wallet.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(wallet.totalPnLPercentage)}
                </p>
              </div>
              {wallet.totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(wallet.availableBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready to invest
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily P&L</p>
                <p className={`text-2xl font-semibold ${
                  wallet.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(wallet.dailyPnL)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {portfolio.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Wallet className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Welcome to Your Portfolio!</h3>
                  <p className="text-muted-foreground mb-4">
                    You're starting with $15,000 in virtual funds. Start trading to build your portfolio.
                  </p>
                  <Button onClick={() => setSelectedTab('assets')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Asset
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Allocation Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Portfolio Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={300} className="lg:w-2/3">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          dataKey="value"
                          label={({name, percentage}) => `${name} ${percentage.toFixed(1)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Value']} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="space-y-3 lg:w-1/3">
                      {portfolio.map((asset, index) => (
                        <div key={asset.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <img src={asset.image} alt={asset.name} className="w-6 h-6" />
                            <span className="font-medium">{asset.symbol}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{asset.allocation.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(asset.totalValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {trades.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                          <p className="text-muted-foreground">Your trading activity will appear here</p>
                        </div>
                      ) : (
                        trades.slice(0, 5).map((trade) => (
                          <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                                {trade.type.toUpperCase()}
                              </Badge>
                              <div>
                                <div className="font-medium">{trade.symbol}</div>
                                <div className="text-xs text-muted-foreground">
                                  {trade.amount} @ {formatCurrency(trade.price)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(trade.total)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTimeAgo(trade.date)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Portfolio Performance (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'value' ? 'Portfolio Value' : 'P&L'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">Sort by Value</SelectItem>
                      <SelectItem value="pnl">Sort by P&L</SelectItem>
                      <SelectItem value="allocation">Sort by Allocation</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hide-small"
                      checked={hideSmallBalances}
                      onCheckedChange={setHideSmallBalances}
                    />
                    <Label htmlFor="hide-small" className="text-sm">Hide small balances</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assets List */}
          <div className="space-y-4">
            {filteredPortfolio.map((asset) => (
              <Card key={asset.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={asset.image} alt={asset.name} className="w-12 h-12 rounded-full" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{asset.symbol}</h3>
                          <Badge variant="secondary">#{asset.rank}</Badge>
                        </div>
                        <p className="text-muted-foreground">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.amount.toFixed(6)} tokens
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-semibold">
                        {formatCurrency(asset.totalValue)}
                      </div>
                      <div className={`text-sm ${
                        asset.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(asset.unrealizedPnL)} ({formatPercentage(asset.pnlPercentage)})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {asset.allocation.toFixed(1)}% of portfolio
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Price</p>
                      <p className="font-semibold">{formatCurrency(asset.currentPrice)}</p>
                      <p className={`text-xs ${
                        asset.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(asset.priceChange24h)} 24h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg. Buy Price</p>
                      <p className="font-semibold">{formatCurrency(asset.avgBuyPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Market Cap</p>
                      <p className="font-semibold">{formatCurrency(asset.marketCap)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">24h Volume</p>
                      <p className="font-semibold">{formatCurrency(asset.volume24h)}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRemoveAsset(asset.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {trades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge 
                          variant={trade.type === 'buy' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {trade.amount} @ {formatCurrency(trade.price)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Fee: {formatCurrency(trade.fee)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(trade.total)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimeAgo(trade.date)}
                        </div>
                        <Badge 
                          variant={
                            trade.status === 'completed' ? 'default' :
                            trade.status === 'pending' ? 'secondary' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-muted-foreground">Total Return</span>
                  <span className={`font-semibold ${
                    wallet.totalPnLPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(wallet.totalPnLPercentage)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-muted-foreground">Daily P&L</span>
                  <span className={`font-semibold ${
                    wallet.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(wallet.dailyPnL)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-muted-foreground">Weekly P&L</span>
                  <span className={`font-semibold ${
                    wallet.weeklyPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(wallet.weeklyPnL)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-muted-foreground">Monthly P&L</span>
                  <span className={`font-semibold ${
                    wallet.monthlyPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(wallet.monthlyPnL)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio
                    .sort((a, b) => b.pnlPercentage - a.pnlPercentage)
                    .slice(0, 5)
                    .map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <img src={asset.image} alt={asset.name} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="font-semibold">{asset.symbol}</div>
                            <div className="text-xs text-muted-foreground">{asset.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            asset.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(asset.pnlPercentage)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(asset.unrealizedPnL)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Asset Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={portfolio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="symbol" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatPercentage(value), 'P&L %']}
                  />
                  <Bar dataKey="pnlPercentage" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notifications Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Notifications
            <Badge variant="secondary">{notifications.filter(n => !n.read).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 border rounded-lg ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{notification.title}</span>
                        <Badge 
                          variant={
                            notification.priority === 'high' ? 'destructive' :
                            notification.priority === 'medium' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegratedPortfolio;
