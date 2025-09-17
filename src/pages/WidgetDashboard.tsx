import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Settings, Grid3x3, Maximize2, Minimize2, RotateCcw, Save,
  Wallet, TrendingUp, Bell, Activity, Zap, BarChart3, Target, Info,
  Eye, EyeOff, Move, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { 
  PerformanceWidget, 
  AlertsWidget, 
  QuickActionsWidget, 
  MarketPulseWidget,
  NewsWidget,
  AllocationWidget,
  createWidget
} from '@/components/PortfolioWidgets';
import type { Database } from '@/types/database';

// Types
interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  position: { x: number; y: number; w: number; h: number };
  settings: Record<string, any>;
}

interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  isDefault: boolean;
}

const WIDGET_TYPES = [
  { id: 'performance', label: 'Performance Summary', icon: BarChart3, description: 'Portfolio value and P&L overview' },
  { id: 'alerts', label: 'Price Alerts', icon: Bell, description: 'Active and triggered price alerts' },
  { id: 'trading', label: 'Quick Actions', icon: Zap, description: 'Fast trading and portfolio actions' },
  { id: 'market-pulse', label: 'Market Pulse', icon: Activity, description: 'Market sentiment and trends' },
  { id: 'news', label: 'News & Insights', icon: Info, description: 'Latest crypto news and updates' },
  { id: 'allocation', label: 'Portfolio Allocation', icon: Target, description: 'Asset distribution and diversity' }
];

const DEFAULT_LAYOUTS: DashboardLayout[] = [
  {
    id: 'trader',
    name: 'Active Trader',
    isDefault: true,
    widgets: [
      { id: 'performance', type: 'performance', title: 'Performance', enabled: true, position: { x: 0, y: 0, w: 8, h: 4 }, settings: {} },
      { id: 'trading', type: 'trading', title: 'Quick Actions', enabled: true, position: { x: 8, y: 0, w: 4, h: 4 }, settings: { quickAmounts: [100, 500, 1000] } },
      { id: 'alerts', type: 'alerts', title: 'Price Alerts', enabled: true, position: { x: 0, y: 4, w: 6, h: 4 }, settings: {} },
      { id: 'market-pulse', type: 'market-pulse', title: 'Market Pulse', enabled: true, position: { x: 6, y: 4, w: 6, h: 4 }, settings: {} }
    ]
  },
  {
    id: 'investor',
    name: 'Long-term Investor',
    isDefault: false,
    widgets: [
      { id: 'performance', type: 'performance', title: 'Performance', enabled: true, position: { x: 0, y: 0, w: 6, h: 5 }, settings: {} },
      { id: 'allocation', type: 'allocation', title: 'Allocation', enabled: true, position: { x: 6, y: 0, w: 6, h: 5 }, settings: {} },
      { id: 'news', type: 'news', title: 'Market News', enabled: true, position: { x: 0, y: 5, w: 8, h: 4 }, settings: {} },
      { id: 'alerts', type: 'alerts', title: 'Alerts', enabled: true, position: { x: 8, y: 5, w: 4, h: 4 }, settings: {} }
    ]
  },
  {
    id: 'minimal',
    name: 'Minimal View',
    isDefault: false,
    widgets: [
      { id: 'performance', type: 'performance', title: 'Portfolio Overview', enabled: true, position: { x: 0, y: 0, w: 12, h: 6 }, settings: { compact: false } },
      { id: 'trading', type: 'trading', title: 'Quick Trade', enabled: true, position: { x: 0, y: 6, w: 12, h: 3 }, settings: {} }
    ]
  }
];

export default function WidgetDashboard() {
  const { user } = useAuth();
  
  // Dashboard state
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(DEFAULT_LAYOUTS[0]);
  const [availableLayouts] = useState<DashboardLayout[]>(DEFAULT_LAYOUTS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  
  // Data state
  const [portfolioData, setPortfolioData] = useState<any>({});
  const [marketData, setMarketData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard and data
  useEffect(() => {
    if (user) {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Load all data in parallel
      const [portfolioRes, alertsRes, tradesRes, walletRes] = await Promise.all([
        supabase.from('portfolio').select('*').eq('user_id', user.id),
        supabase.from('alerts').select('*').eq('user_id', user.id),
        supabase.from('trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('wallet').select('*').eq('user_id', user.id)
      ]);

      const portfolioItems = portfolioRes.data || [];
      const alerts = alertsRes.data || [];
      const trades = tradesRes.data || [];
      const wallet = walletRes.data || [];

      // Enrich with market data
      let enrichedPortfolio = [];
      if (portfolioItems.length > 0) {
        const coinIds = portfolioItems.map(item => item.coin_id);
        const marketPrices = await coinGeckoApi.getCoinsByIds(coinIds, 'usd');

        enrichedPortfolio = portfolioItems.map(item => {
          const coinData = marketPrices.find(coin => coin.id === item.coin_id);
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
            image: coinData?.image || '',
            price_change_24h: coinData?.price_change_percentage_24h || 0
          };
        });
      }

      // Calculate totals
      const totalValue = enrichedPortfolio.reduce((sum, item) => sum + item.current_value, 0);
      const totalInvested = enrichedPortfolio.reduce((sum, item) => sum + (item.amount * item.avg_price), 0);
      const totalProfit = totalValue - totalInvested;
      const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
      const balance = wallet.find(w => w.asset === 'USD')?.balance || 10000;

      // Process alerts
      const activeAlerts = alerts.filter(alert => !alert.triggered).map(alert => {
        const portfolioItem = enrichedPortfolio.find(p => p.coin_id === alert.coin_id);
        return {
          ...alert,
          coin_image: portfolioItem?.image || '',
          current_price: portfolioItem?.current_price || 0
        };
      });
      const triggeredAlerts = alerts.filter(alert => alert.triggered).slice(0, 5);

      // Top gainers/losers
      const topGainers = enrichedPortfolio
        .filter(item => item.profit_percentage > 0)
        .sort((a, b) => b.profit_percentage - a.profit_percentage)
        .slice(0, 3);
      
      const topLosers = enrichedPortfolio
        .filter(item => item.profit_percentage < 0)
        .sort((a, b) => a.profit_percentage - b.profit_percentage)
        .slice(0, 3);

      // Update state
      setPortfolioData({
        portfolio: enrichedPortfolio,
        portfolioItems: enrichedPortfolio,
        totalValue,
        totalInvested,
        totalProfit,
        totalProfitPercentage,
        balance,
        activeAlerts,
        triggeredAlerts,
        topGainers,
        topLosers,
        recentTrades: trades.slice(0, 10)
      });

      setMarketData({
        fear_greed_index: Math.floor(Math.random() * 100), // Mock data
        volume_24h: 45234567890,
        news: [
          { title: 'Bitcoin reaches new monthly high amid institutional buying', source: 'CryptoNews', time: '2h ago' },
          { title: 'Ethereum upgrade shows promising scalability improvements', source: 'CoinDesk', time: '4h ago' },
          { title: 'Major bank announces crypto custody services', source: 'Reuters', time: '6h ago' }
        ]
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const switchLayout = (layoutId: string) => {
    const layout = availableLayouts.find(l => l.id === layoutId);
    if (layout) {
      setCurrentLayout(layout);
      toast.success(`Switched to ${layout.name} layout`);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget => 
        widget.id === widgetId 
          ? { ...widget, enabled: !widget.enabled }
          : widget
      )
    }));
  };

  const addWidget = (type: string) => {
    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type,
      title: WIDGET_TYPES.find(t => t.id === type)?.label || type,
      enabled: true,
      position: { x: 0, y: 0, w: 6, h: 4 },
      settings: {}
    };

    setCurrentLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));

    setShowAddWidget(false);
    toast.success('Widget added to dashboard');
  };

  const removeWidget = (widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId)
    }));
    toast.success('Widget removed');
  };

  const resetLayout = () => {
    setCurrentLayout(DEFAULT_LAYOUTS[0]);
    toast.success('Layout reset to default');
  };

  // Combine all data for widgets
  const widgetData = { ...portfolioData, ...marketData };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
        <p className="text-muted-foreground">Please sign in to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Personal Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Customizable portfolio management hub • {currentLayout.name} Layout
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={currentLayout.id} onValueChange={switchLayout}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLayouts.map(layout => (
                <SelectItem key={layout.id} value={layout.id}>
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="w-4 h-4" />
                    {layout.name}
                    {layout.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={isCustomizing ? 'bg-primary/10' : ''}
          >
            <Settings className="w-4 h-4 mr-2" />
            Customize
          </Button>
        </div>
      </motion.div>

      {/* Customization Bar */}
      <AnimatePresence>
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Widgets:</span>
                    {currentLayout.widgets.map(widget => (
                      <div key={widget.id} className="flex items-center gap-1">
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                          size="sm"
                        />
                        <span className="text-xs">{widget.title}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeWidget(widget.id)}
                          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Widget
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Widget</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {WIDGET_TYPES.map(type => (
                            <Card key={type.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addWidget(type.id)}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 rounded-lg bg-primary/20">
                                    <type.icon className="w-4 h-4 text-primary" />
                                  </div>
                                  <h3 className="font-medium">{type.label}</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">{type.description}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button size="sm" variant="outline" onClick={resetLayout}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Grid */}
      <div className="grid grid-cols-12 gap-6 auto-rows-max">
        <AnimatePresence>
          {currentLayout.widgets
            .filter(widget => widget.enabled)
            .map((widget, index) => (
              <motion.div
                key={widget.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className={`col-span-12 md:col-span-${Math.min(widget.position.w, 12)} lg:col-span-${Math.min(widget.position.w, 12)}`}
                style={{ gridColumn: `span ${Math.min(widget.position.w, 12)} / span ${Math.min(widget.position.w, 12)}` }}
              >
                {isLoading ? (
                  <Card className="bg-gradient-card border-border/50 h-48">
                    <CardContent className="p-6 h-full flex items-center justify-center">
                      <div className="animate-pulse space-y-4 w-full">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-8 bg-muted rounded w-1/2"></div>
                        <div className="h-16 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  createWidget(widget.type, {
                    widget,
                    data: widgetData,
                    onAction: (action: string, data: any) => {
                      // Handle widget actions
                      console.log('Widget action:', action, data);
                    }
                  })
                )}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {currentLayout.widgets.filter(w => w.enabled).length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Grid3x3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No widgets enabled</h3>
          <p className="text-muted-foreground mb-6">
            Enable some widgets or add new ones to get started
          </p>
          <Button onClick={() => setShowAddWidget(true)} className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </motion.div>
      )}
    </div>
  );
}
