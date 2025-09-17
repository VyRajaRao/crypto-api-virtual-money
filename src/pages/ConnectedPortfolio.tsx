import React, { useMemo } from 'react';
import { useTabState } from '@/utils/statePersistence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieChartIcon, BarChart3, Clock, Target, RefreshCw } from 'lucide-react';
import { useSimulator } from '@/contexts/SimulatorContext';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

const ConnectedPortfolio = () => {
  const { state, portfolioValue, totalPnL, dailyPnL, getAssetValue, getAssetPnL } = useSimulator();
  const { activeTab: selectedTab, changeTab: setSelectedTab } = useTabState('overview');

  // Calculate portfolio data
  const portfolioAssets = state.assets.map((asset, index) => {
    const marketInfo = state.marketData.find(m => m.symbol === asset.symbol);
    const currentValue = getAssetValue(asset.symbol);
    const { unrealizedPnL, pnlPercentage } = getAssetPnL(asset.symbol);
    const allocation = portfolioValue > 0 ? (currentValue / portfolioValue) * 100 : 0;

    return {
      id: asset.symbol,
      symbol: asset.symbol,
      name: asset.name,
      image: asset.image,
      amount: asset.amount,
      averagePrice: asset.averagePrice,
      currentPrice: marketInfo?.price || 0,
      totalValue: currentValue,
      totalInvested: asset.totalInvested,
      unrealizedPnL,
      pnlPercentage,
      allocation,
      priceChange24h: marketInfo?.priceChangePercent24h || 0,
      color: COLORS[index % COLORS.length]
    };
  });

  // Chart data
  const pieChartData = portfolioAssets.map(asset => ({
    name: asset.symbol,
    value: asset.totalValue,
    color: asset.color,
    percentage: asset.allocation
  }));

  // Performance chart data (simplified for demo)
  const performanceData = useMemo(() => {
    const days = 30;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const variance = (Math.random() - 0.5) * 1000;
      return {
        date: date.toISOString().split('T')[0],
        value: portfolioValue + variance,
        pnl: totalPnL + (variance * 0.1)
      };
    });
  }, [portfolioValue, totalPnL]);

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

  const totalPnLPercentage = state.initialBalance > 0 ? (totalPnL / state.initialBalance) * 100 : 0;

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
            Last updated: {new Date(state.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/trading'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Trading
          </Button>
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
                  {formatCurrency(portfolioValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(totalPnLPercentage)} total return
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
                  totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(totalPnL)}
                </p>
                <p className={`text-xs ${
                  totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(totalPnLPercentage)}
                </p>
              </div>
              {totalPnL >= 0 ? (
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
                  {formatCurrency(state.availableBalance)}
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
                  dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(dailyPnL)}
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
        <TabsList className="grid w-full grid-cols-4 tabs-mobile-fix">
          <TabsTrigger value="overview" className="text-overflow-mobile">Overview</TabsTrigger>
          <TabsTrigger value="assets" className="text-overflow-mobile">Assets</TabsTrigger>
          <TabsTrigger value="trades" className="text-overflow-mobile">Trades</TabsTrigger>
          <TabsTrigger value="analytics" className="text-overflow-mobile">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {portfolioAssets.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Wallet className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Welcome to Your Portfolio!</h3>
                  <p className="text-muted-foreground mb-4">
                    You're starting with {formatCurrency(state.initialBalance)} in virtual funds. Start trading to build your portfolio.
                  </p>
                  <Button onClick={() => setSelectedTab('assets')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Go to Live Trading
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
                      {portfolioAssets.map((asset, index) => (
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
                      {state.transactions.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                          <p className="text-muted-foreground">Your trading activity will appear here</p>
                        </div>
                      ) : (
                        state.transactions.slice(0, 5).map((trade) => (
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
                                {formatTimeAgo(trade.timestamp)}
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
          <div className="space-y-4">
            {portfolioAssets.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Assets Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start trading to add assets to your portfolio
                    </p>
                    <Button onClick={() => window.location.href = '/trading'}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Trading
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              portfolioAssets.map((asset) => (
                <Card key={asset.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src={asset.image} alt={asset.name} className="w-12 h-12 rounded-full" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{asset.symbol}</h3>
                            <Badge variant="secondary">{asset.allocation.toFixed(1)}%</Badge>
                          </div>
                          <p className="text-muted-foreground">{asset.name}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="grid grid-cols-4 gap-8 text-sm">
                          <div>
                            <p className="text-muted-foreground">Holdings</p>
                            <p className="font-semibold">{asset.amount.toFixed(6)}</p>
                            <p className="text-xs text-muted-foreground">
                              Avg: {formatCurrency(asset.averagePrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Price</p>
                            <p className="font-semibold">{formatCurrency(asset.currentPrice)}</p>
                            <p className={`text-xs ${
                              asset.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPercentage(asset.priceChange24h)} 24h
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Market Value</p>
                            <p className="font-semibold">{formatCurrency(asset.totalValue)}</p>
                            <p className="text-xs text-muted-foreground">
                              Invested: {formatCurrency(asset.totalInvested)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">P&L</p>
                            <p className={`font-semibold ${
                              asset.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(asset.unrealizedPnL)}
                            </p>
                            <p className={`text-xs ${
                              asset.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ({formatPercentage(asset.pnlPercentage)})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {state.transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
                    <p className="text-muted-foreground">Your trade history will appear here</p>
                  </div>
                ) : (
                  state.transactions.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <h3 className="font-semibold">{trade.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{formatTimeAgo(trade.timestamp)}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">{trade.amount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price</p>
                          <p className="font-semibold">{formatCurrency(trade.price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold">{formatCurrency(trade.total)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fee</p>
                          <p className="font-semibold">{formatCurrency(trade.fee)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-semibold">{state.assets.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-semibold">{state.transactions.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Best Performer</p>
                  <p className="text-lg font-semibold">
                    {portfolioAssets.length > 0 
                      ? portfolioAssets.sort((a, b) => b.pnlPercentage - a.pnlPercentage)[0].symbol
                      : 'N/A'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Portfolio Diversity</p>
                  <p className="text-lg font-semibold">
                    {portfolioAssets.length > 0 ? 'Diversified' : 'Not Started'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConnectedPortfolio;
