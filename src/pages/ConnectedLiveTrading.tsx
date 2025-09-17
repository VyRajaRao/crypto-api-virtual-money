import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, Play, Pause, X, Plus, Minus, Wallet, Activity, Target, RefreshCw, Zap, BarChart3 } from 'lucide-react';
import { useSimulator } from '@/contexts/SimulatorContext';

const ConnectedLiveTrading = () => {
  const { state, executeTrade, portfolioValue, totalPnL, dailyPnL } = useSimulator();
  const [selectedPair, setSelectedPair] = useState('BTC');
  const [orderForm, setOrderForm] = useState({
    side: 'buy' as 'buy' | 'sell',
    type: 'market' as 'market' | 'limit' | 'stop',
    amount: '',
    price: '',
    stopPrice: ''
  });
  const [isTrading, setIsTrading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('positions');
  const [chartTimeframe, setChartTimeframe] = useState('1D');
  const [isLoading, setIsLoading] = useState(false);

  // Current trading pair data
  const currentPair = useMemo(() => {
    return state.marketData.find(pair => pair.symbol === selectedPair) || state.marketData[0];
  }, [selectedPair, state.marketData]);

  // Generate mock price data for charts
  const priceData = useMemo(() => {
    const data = [];
    const basePrice = currentPair.price;
    const now = Date.now();
    
    for (let i = 24; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000); // Hourly data
      const variance = (Math.random() - 0.5) * basePrice * 0.02; // ±2% variance
      data.push({
        timestamp,
        price: basePrice + variance,
        volume: Math.random() * 1000000
      });
    }
    return data;
  }, [currentPair]);

  // Order book simulation
  const orderBook = useMemo(() => {
    const currentPrice = currentPair.price;
    const bids = [];
    const asks = [];
    
    for (let i = 0; i < 15; i++) {
      bids.push({
        price: currentPrice - (i + 1) * (currentPrice * 0.001),
        amount: Math.random() * 2 + 0.1,
        total: 0
      });
      
      asks.push({
        price: currentPrice + (i + 1) * (currentPrice * 0.001),
        amount: Math.random() * 2 + 0.1,
        total: 0
      });
    }
    
    return { bids, asks };
  }, [currentPair]);

  // Calculate portfolio positions from assets
  const positions = state.assets.map(asset => {
    const marketInfo = state.marketData.find(m => m.symbol === asset.symbol);
    const currentPrice = marketInfo?.price || 0;
    const totalValue = asset.amount * currentPrice;
    const unrealizedPnL = totalValue - asset.totalInvested;
    const pnlPercentage = asset.totalInvested > 0 ? (unrealizedPnL / asset.totalInvested) * 100 : 0;

    return {
      symbol: asset.symbol,
      name: asset.name,
      image: asset.image,
      amount: asset.amount,
      averagePrice: asset.averagePrice,
      currentPrice,
      totalValue,
      unrealizedPnL,
      pnlPercentage
    };
  });

  // Recent transactions as orders
  const orders = state.transactions.slice(0, 10).map(tx => ({
    id: tx.id,
    symbol: tx.symbol,
    side: tx.type,
    type: 'market' as const,
    amount: tx.amount,
    price: tx.price,
    total: tx.total,
    filled: tx.amount,
    remaining: 0,
    fee: tx.fee,
    status: 'filled' as const,
    timestamp: tx.timestamp
  }));

  // Calculated values
  const estimatedTotal = useMemo(() => {
    const amount = parseFloat(orderForm.amount) || 0;
    const price = orderForm.type === 'market' 
      ? currentPair.price 
      : parseFloat(orderForm.price) || 0;
    return amount * price;
  }, [orderForm, currentPair.price]);

  const estimatedFee = useMemo(() => {
    return estimatedTotal * 0.001; // 0.1% fee
  }, [estimatedTotal]);

  const maxAmount = useMemo(() => {
    if (orderForm.side === 'buy') {
      const price = orderForm.type === 'market' ? currentPair.price : parseFloat(orderForm.price) || 0;
      return price > 0 ? (state.availableBalance / price) * 0.999 : 0; // Leave room for fees
    } else {
      const position = positions.find(p => p.symbol === selectedPair);
      return position?.amount || 0;
    }
  }, [orderForm, currentPair.price, state.availableBalance, positions, selectedPair]);

  // Handlers
  const handlePlaceOrder = () => {
    if (!orderForm.amount || (orderForm.type !== 'market' && !orderForm.price)) {
      return;
    }

    setIsLoading(true);
    
    // Execute trade using global state
    setTimeout(() => {
      const amount = parseFloat(orderForm.amount);
      const success = executeTrade(orderForm.side, selectedPair, amount);
      
      if (success) {
        // Reset form
        setOrderForm({
          side: 'buy',
          type: 'market',
          amount: '',
          price: '',
          stopPrice: ''
        });
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
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
          <h1 className="text-3xl font-bold">Live Trading</h1>
          <p className="text-muted-foreground">
            Trade cryptocurrencies with advanced tools and real-time data
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2 mb-2">
            <p className="text-sm text-slate-700 font-medium">
              💰 Virtual Trading - Start with $15,000 to practice live trading strategies
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(state.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={isTrading ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsTrading(!isTrading)}
          >
            {isTrading ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isTrading ? 'Pause' : 'Start'} Trading
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/portfolio'}
          >
            <Wallet className="w-4 h-4 mr-2" />
            View Portfolio
          </Button>
        </div>
      </div>

      {/* Trading Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(state.availableBalance)}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(portfolioValue)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
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
              </div>
              {dailyPnL >= 0 ? (
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
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-semibold ${
                  totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(totalPnL)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Trading Pairs Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {state.marketData.map((pair) => (
                  <div
                    key={pair.symbol}
                    onClick={() => setSelectedPair(pair.symbol)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      selectedPair === pair.symbol 
                        ? 'bg-slate-50 border-slate-300 shadow-sm' 
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={pair.image} alt={pair.name} className="w-6 h-6" />
                        <div>
                          <div className="font-semibold text-sm">{pair.symbol}</div>
                          <div className="text-xs text-muted-foreground">{pair.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">
                          {formatCurrency(pair.price)}
                        </div>
                        <div className={`text-xs ${
                          pair.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(pair.priceChangePercent24h)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Price Chart and Order Book */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={currentPair.image} alt={currentPair.name} className="w-8 h-8" />
                <div>
                  <CardTitle className="text-xl">{currentPair.symbol}/USD</CardTitle>
                  <p className="text-muted-foreground">{currentPair.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCurrency(currentPair.price)}
                  </div>
                  <div className={`text-sm ${
                    currentPair.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(currentPair.priceChange24h)} ({formatPercentage(currentPair.priceChangePercent24h)})
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart">Price Chart</TabsTrigger>
                <TabsTrigger value="orderbook">Order Book</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart" className="space-y-4">
                <div className="flex justify-end gap-2">
                  {['1H', '4H', '1D', '1W'].map((timeframe) => (
                    <Button
                      key={timeframe}
                      variant={chartTimeframe === timeframe ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartTimeframe(timeframe)}
                    >
                      {timeframe}
                    </Button>
                  ))}
                </div>
                
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                    />
                    <YAxis 
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Price']}
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#0088FE" 
                      fill="#0088FE" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="orderbook">
                <div className="grid grid-cols-2 gap-4 h-[300px]">
                  {/* Asks */}
                  <div>
                    <h4 className="font-semibold text-red-600 mb-2">Asks (Sell Orders)</h4>
                    <div className="space-y-1 text-xs">
                      {orderBook.asks.slice(0, 10).reverse().map((ask, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2 p-1 hover:bg-slate-50">
                          <span className="text-red-600">{formatCurrency(ask.price)}</span>
                          <span className="text-right">{ask.amount.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bids */}
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Bids (Buy Orders)</h4>
                    <div className="space-y-1 text-xs">
                      {orderBook.bids.slice(0, 10).map((bid, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2 p-1 hover:bg-slate-50">
                          <span className="text-green-600">{formatCurrency(bid.price)}</span>
                          <span className="text-right">{bid.amount.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Trading Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Trade {currentPair.symbol}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={orderForm.side === 'buy' ? 'default' : 'outline'}
                onClick={() => setOrderForm({ ...orderForm, side: 'buy' })}
                className="w-full"
              >
                Buy
              </Button>
              <Button
                variant={orderForm.side === 'sell' ? 'destructive' : 'outline'}
                onClick={() => setOrderForm({ ...orderForm, side: 'sell' })}
                className="w-full"
              >
                Sell
              </Button>
            </div>

            {/* Order Type */}
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select 
                value={orderForm.type}
                onValueChange={(value: any) => setOrderForm({ ...orderForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market Order</SelectItem>
                  <SelectItem value="limit">Limit Order</SelectItem>
                  <SelectItem value="stop">Stop Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Amount ({currentPair.symbol})</Label>
                <span className="text-xs text-muted-foreground">
                  Max: {maxAmount.toFixed(6)}
                </span>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={orderForm.amount}
                onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })}
              />
              <div className="flex gap-1">
                {[0.25, 0.5, 0.75, 1].map((percentage) => (
                  <Button
                    key={percentage}
                    variant="outline"
                    size="sm"
                    onClick={() => setOrderForm({ 
                      ...orderForm, 
                      amount: (maxAmount * percentage).toFixed(6)
                    })}
                  >
                    {(percentage * 100).toFixed(0)}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Price (for limit orders) */}
            {orderForm.type !== 'market' && (
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  placeholder={currentPair.price.toString()}
                  value={orderForm.price}
                  onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                />
              </div>
            )}

            {/* Stop Price (for stop orders) */}
            {orderForm.type === 'stop' && (
              <div className="space-y-2">
                <Label>Stop Price (USD)</Label>
                <Input
                  type="number"
                  placeholder={currentPair.price.toString()}
                  value={orderForm.stopPrice}
                  onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })}
                />
              </div>
            )}

            {/* Order Summary */}
            {estimatedTotal > 0 && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Estimated Total:</span>
                  <span>{formatCurrency(estimatedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fee (0.1%):</span>
                  <span>{formatCurrency(estimatedFee)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Cost:</span>
                  <span>{formatCurrency(estimatedTotal + estimatedFee)}</span>
                </div>
              </div>
            )}

            {/* Place Order Button */}
            <Button
              onClick={handlePlaceOrder}
              disabled={!orderForm.amount || isLoading || !isTrading}
              className={`w-full ${
                orderForm.side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLoading ? 'Placing Order...' : `${orderForm.side.toUpperCase()} ${currentPair.symbol}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Positions and Orders */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <img src={position.image} alt={position.name} className="w-10 h-10" />
                        <div>
                          <h3 className="font-semibold">{position.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{position.name}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="grid grid-cols-4 gap-8 text-sm">
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-semibold">{position.amount.toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg. Price</p>
                            <p className="font-semibold">{formatCurrency(position.averagePrice)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Value</p>
                            <p className="font-semibold">{formatCurrency(position.totalValue)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">P&L</p>
                            <p className={`font-semibold ${
                              position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(position.unrealizedPnL)}
                            </p>
                            <p className={`text-xs ${
                              position.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ({formatPercentage(position.pnlPercentage)})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Positions</h3>
                  <p className="text-muted-foreground">Start trading to build your positions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                          {order.side.toUpperCase()}
                        </Badge>
                        <div>
                          <h3 className="font-semibold">{order.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{order.type} order</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="grid grid-cols-4 gap-6 text-sm">
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-semibold">{order.amount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-semibold">{formatCurrency(order.price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <Badge variant="default">
                              {order.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Time</p>
                            <p className="font-semibold">{formatTimeAgo(order.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Orders</h3>
                  <p className="text-muted-foreground">Your trading orders will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {state.transactions.map((trade) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConnectedLiveTrading;
