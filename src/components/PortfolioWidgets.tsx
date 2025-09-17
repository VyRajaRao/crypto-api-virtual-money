import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Bell, DollarSign, Activity, Target, 
  Clock, BarChart3, Zap, Minimize2, Maximize2, Settings, X,
  AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface WidgetProps {
  widget: {
    id: string;
    title: string;
    enabled: boolean;
    settings: Record<string, any>;
  };
  data: any;
  onSettingsChange?: (settings: Record<string, any>) => void;
  onRemove?: () => void;
  compact?: boolean;
}

// Performance Summary Widget
export function PerformanceWidget({ widget, data, compact = false }: WidgetProps) {
  const { totalValue, totalProfit, totalProfitPercentage, portfolioItems } = data;
  
  const performanceData = portfolioItems?.map((item: any, index: number) => ({
    name: item.symbol,
    value: item.profit_percentage,
    color: item.profit_percentage >= 0 ? '#10B981' : '#EF4444'
  })) || [];

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {widget.title}
          </CardTitle>
          <Badge variant={totalProfit >= 0 ? 'default' : 'destructive'} className="text-xs">
            {totalProfit >= 0 ? '+' : ''}{totalProfitPercentage?.toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">${totalValue?.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
            </div>
            <div className={`text-right ${totalProfit >= 0 ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
              <p className="text-lg font-semibold">
                {totalProfit >= 0 ? '+' : ''}${Math.abs(totalProfit)?.toLocaleString()}
              </p>
              <p className="text-xs">P&L Today</p>
            </div>
          </div>
          
          {!compact && performanceData.length > 0 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData.slice(0, 5)}>
                  <defs>
                    <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#performanceGradient)" 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Performance']}
                    labelFormatter={(label) => `Asset: ${label}`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Active Alerts Widget
export function AlertsWidget({ widget, data, compact = false }: WidgetProps) {
  const { activeAlerts, triggeredAlerts } = data;
  const totalAlerts = activeAlerts?.length || 0;
  const recentTriggered = triggeredAlerts?.slice(0, 3) || [];

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {widget.title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {totalAlerts} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-crypto-gain rounded-full animate-pulse" />
              <span className="text-sm">Monitoring prices</span>
            </div>
            <span className="text-xs text-muted-foreground">{totalAlerts} alerts</span>
          </div>
          
          {!compact && activeAlerts?.slice(0, 3).map((alert: any, index: number) => (
            <motion.div 
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-2 bg-muted/30 rounded"
            >
              <div className="flex items-center gap-2">
                <img src={alert.coin_image} alt={alert.coin_id} className="w-4 h-4 rounded-full" />
                <span className="text-xs font-medium">{alert.coin_id.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">${alert.target_price}</p>
                <p className="text-xs text-muted-foreground">{alert.condition}</p>
              </div>
            </motion.div>
          ))}
          
          {recentTriggered.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Recently Triggered</p>
              {recentTriggered.map((alert: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-xs text-crypto-gain">
                  <CheckCircle className="w-3 h-3" />
                  <span>{alert.coin_id.toUpperCase()} hit ${alert.target_price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Actions Widget
export function QuickActionsWidget({ widget, data, onAction }: WidgetProps & { onAction?: (action: string, data: any) => void }) {
  const { topGainers, topLosers, portfolio } = data;
  const quickAmounts = widget.settings?.quickAmounts || [100, 500, 1000];

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {widget.title}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick Buy Amounts</p>
            <div className="flex gap-2">
              {quickAmounts.map((amount: number) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs hover:bg-crypto-gain/20"
                  onClick={() => onAction?.('quick-buy', { amount })}
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-crypto-gain mb-1">Top Gainer</p>
              {topGainers?.[0] && (
                <div className="p-2 bg-crypto-gain/10 rounded text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <img src={topGainers[0].image} alt={topGainers[0].symbol} className="w-3 h-3 rounded-full" />
                    <span className="font-medium">{topGainers[0].symbol}</span>
                  </div>
                  <p className="text-crypto-gain font-medium">+{topGainers[0].profit_percentage.toFixed(2)}%</p>
                </div>
              )}
            </div>
            
            <div>
              <p className="text-xs font-medium text-crypto-loss mb-1">Top Loser</p>
              {topLosers?.[0] && (
                <div className="p-2 bg-crypto-loss/10 rounded text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <img src={topLosers[0].image} alt={topLosers[0].symbol} className="w-3 h-3 rounded-full" />
                    <span className="font-medium">{topLosers[0].symbol}</span>
                  </div>
                  <p className="text-crypto-loss font-medium">{topLosers[0].profit_percentage.toFixed(2)}%</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs bg-crypto-gain hover:bg-crypto-gain/90">
              Quick Buy
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs hover:bg-crypto-loss/20">
              Quick Sell
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Market Pulse Widget
export function MarketPulseWidget({ widget, data }: WidgetProps) {
  const { marketTrends, fear_greed_index, volume_24h } = data;
  
  const pulseColor = fear_greed_index > 50 ? 'text-crypto-gain' : 'text-crypto-loss';
  const pulseLevel = fear_greed_index > 75 ? 'Extreme Greed' : 
                    fear_greed_index > 50 ? 'Greed' :
                    fear_greed_index > 25 ? 'Fear' : 'Extreme Fear';

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {widget.title}
          </CardTitle>
          <div className={`flex items-center gap-1 ${pulseColor}`}>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
            <span className="text-xs">{pulseLevel}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Fear & Greed Index</span>
              <span className={`text-xs font-medium ${pulseColor}`}>{fear_greed_index}/100</span>
            </div>
            <Progress value={fear_greed_index} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">24h Volume</p>
              <p className="font-medium">${volume_24h?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Market Cap</p>
              <p className="font-medium">$2.1T</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bitcoin Dominance</span>
              <span className="font-medium">42.3%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Active Coins</span>
              <span className="font-medium">13,421</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// News & Insights Widget
export function NewsWidget({ widget, data }: WidgetProps) {
  const { news = [] } = data;
  
  const newsItems = news.slice(0, 3).map((item: any, index: number) => ({
    ...item,
    sentiment: index % 3 === 0 ? 'positive' : index % 3 === 1 ? 'neutral' : 'negative'
  }));

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            {widget.title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {newsItems.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">No recent news</p>
            </div>
          ) : (
            newsItems.map((item: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    item.sentiment === 'positive' ? 'bg-crypto-gain' :
                    item.sentiment === 'neutral' ? 'bg-yellow-500' : 'bg-crypto-loss'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2 mb-1">
                      {item.title || `Market Update ${index + 1}`}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {item.source || 'CryptoNews'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.time || '2h ago'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
          
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
            View All News
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Portfolio Allocation Widget
export function AllocationWidget({ widget, data }: WidgetProps) {
  const { portfolio } = data;
  
  const allocations = portfolio?.slice(0, 5).map((asset: any) => ({
    name: asset.symbol,
    value: asset.current_value,
    percentage: ((asset.current_value / data.totalValue) * 100),
    color: `hsl(${Math.random() * 360}, 50%, 50%)`
  })) || [];

  return (
    <Card className="bg-gradient-card border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4" />
            {widget.title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{allocations.length} Assets</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {allocations.map((allocation, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{allocation.name}</span>
                <span className="text-muted-foreground">{allocation.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${allocation.percentage}%`,
                    backgroundColor: allocation.color 
                  }}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Portfolio Diversity</span>
              <span className="font-medium text-crypto-gain">
                {allocations.length > 5 ? 'Well Diversified' : 'Moderate'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Widget Factory
export function createWidget(type: string, props: WidgetProps) {
  switch (type) {
    case 'performance':
      return <PerformanceWidget {...props} />;
    case 'alerts':
      return <AlertsWidget {...props} />;
    case 'trading':
      return <QuickActionsWidget {...props} />;
    case 'market-pulse':
      return <MarketPulseWidget {...props} />;
    case 'news':
      return <NewsWidget {...props} />;
    case 'allocation':
      return <AllocationWidget {...props} />;
    default:
      return null;
  }
}
