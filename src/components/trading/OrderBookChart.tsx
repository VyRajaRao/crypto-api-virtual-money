import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { OrderBook, OrderBookEntry } from '@/hooks/useAdvancedTrading';

interface OrderBookChartProps {
  orderBook: OrderBook;
  currentPrice: number;
  symbol: string;
  className?: string;
}

interface ChartDataPoint {
  price: number;
  bidVolume: number;
  askVolume: number;
  cumulativeBidVolume: number;
  cumulativeAskVolume: number;
  type: 'bid' | 'ask' | 'spread';
}

export default function OrderBookChart({ 
  orderBook, 
  currentPrice, 
  symbol,
  className = '' 
}: OrderBookChartProps) {
  // Process order book data for chart
  const chartData = useMemo(() => {
    if (!orderBook.bids.length || !orderBook.asks.length) return [];

    const data: ChartDataPoint[] = [];
    
    // Process bids (cumulative from highest to lowest price)
    let cumulativeBidVolume = 0;
    const sortedBids = [...orderBook.bids].sort((a, b) => b.price - a.price);
    
    for (const bid of sortedBids) {
      cumulativeBidVolume += bid.amount;
      data.push({
        price: bid.price,
        bidVolume: bid.amount,
        askVolume: 0,
        cumulativeBidVolume,
        cumulativeAskVolume: 0,
        type: 'bid'
      });
    }

    // Add spread indicator
    const bestBid = orderBook.bids[0]?.price || 0;
    const bestAsk = orderBook.asks[0]?.price || 0;
    
    if (bestBid && bestAsk) {
      data.push({
        price: currentPrice,
        bidVolume: 0,
        askVolume: 0,
        cumulativeBidVolume: 0,
        cumulativeAskVolume: 0,
        type: 'spread'
      });
    }

    // Process asks (cumulative from lowest to highest price)
    let cumulativeAskVolume = 0;
    const sortedAsks = [...orderBook.asks].sort((a, b) => a.price - b.price);
    
    for (const ask of sortedAsks) {
      cumulativeAskVolume += ask.amount;
      data.push({
        price: ask.price,
        bidVolume: 0,
        askVolume: ask.amount,
        cumulativeBidVolume: 0,
        cumulativeAskVolume,
        type: 'ask'
      });
    }

    return data.sort((a, b) => a.price - b.price);
  }, [orderBook, currentPrice]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as ChartDataPoint;
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm">
          Price: ${parseFloat(label).toLocaleString()}
        </p>
        {data.type === 'bid' && (
          <div className="text-crypto-gain text-sm">
            <p>Bid Volume: {data.bidVolume.toFixed(4)}</p>
            <p>Cumulative: {data.cumulativeBidVolume.toFixed(4)}</p>
          </div>
        )}
        {data.type === 'ask' && (
          <div className="text-crypto-loss text-sm">
            <p>Ask Volume: {data.askVolume.toFixed(4)}</p>
            <p>Cumulative: {data.cumulativeAskVolume.toFixed(4)}</p>
          </div>
        )}
        {data.type === 'spread' && (
          <div className="text-muted-foreground text-sm">
            <p>Current Market Price</p>
          </div>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card className={`bg-gradient-card ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Order Book Depth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Loading order book data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bestBid = orderBook.bids[0]?.price || 0;
  const bestAsk = orderBook.asks[0]?.price || 0;
  const spreadPercentage = bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;

  return (
    <Card className={`bg-gradient-card ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Order Book Depth
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Spread: {spreadPercentage.toFixed(3)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market info */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Best Bid</p>
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-crypto-gain" />
              <p className="font-medium text-sm text-crypto-gain">
                ${bestBid.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-bold text-sm">
              ${currentPrice.toLocaleString()}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Best Ask</p>
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-crypto-loss" />
              <p className="font-medium text-sm text-crypto-loss">
                ${bestAsk.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Depth chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#00C49F" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF8042" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FF8042" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <XAxis 
                dataKey="price" 
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tickFormatter={(value) => value.toFixed(2)}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference line for current price */}
              <ReferenceLine 
                x={currentPrice} 
                stroke="#0088FE" 
                strokeDasharray="2 2" 
                strokeWidth={2}
              />
              
              {/* Bid depth area */}
              <Area
                type="stepAfter"
                dataKey="cumulativeBidVolume"
                stroke="#00C49F"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#bidGradient)"
                connectNulls={false}
              />
              
              {/* Ask depth area */}
              <Area
                type="stepBefore"
                dataKey="cumulativeAskVolume"
                stroke="#FF8042"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#askGradient)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order book summary */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/30">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Bid Volume</p>
            <p className="font-medium text-crypto-gain">
              {orderBook.bids.reduce((sum, bid) => sum + bid.amount, 0).toFixed(4)} {symbol.toUpperCase()}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Ask Volume</p>
            <p className="font-medium text-crypto-loss">
              {orderBook.asks.reduce((sum, ask) => sum + ask.amount, 0).toFixed(4)} {symbol.toUpperCase()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
