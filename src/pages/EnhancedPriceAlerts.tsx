import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Bell, BellOff, Trash2, Edit, TrendingUp, TrendingDown, Clock, Target, Activity, Settings, RefreshCw, Search, Filter, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Types
interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  image: string;
  condition: 'above' | 'below' | 'change_percent' | 'volume';
  targetValue: number;
  currentValue: number;
  priority: 'high' | 'medium' | 'low';
  active: boolean;
  recurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
  notificationMethods: string[];
  message: string;
  createdAt: string;
  triggeredAt?: string;
  lastTriggered?: string;
}

interface AlertNotification {
  id: string;
  type: 'alert_triggered' | 'alert_created' | 'alert_updated';
  alertId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface MarketData {
  symbol: string;
  name: string;
  image: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  rank: number;
}

const EnhancedPriceAlerts = () => {
  // Mock market data
  const [marketData] = useState<MarketData[]>([
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
      price: 43785.50,
      priceChange24h: 1204.75,
      priceChangePercent24h: 2.8,
      volume24h: 15240000000,
      marketCap: 857000000000,
      rank: 1
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
      price: 2567.85,
      priceChange24h: 30.42,
      priceChangePercent24h: 1.2,
      volume24h: 8750000000,
      marketCap: 308000000000,
      rank: 2
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      image: 'https://assets.coingecko.com/coins/images/4128/thumb/Solana.jpg',
      price: 38.75,
      priceChange24h: 1.75,
      priceChangePercent24h: 4.7,
      volume24h: 985000000,
      marketCap: 16800000000,
      rank: 5
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      image: 'https://assets.coingecko.com/coins/images/975/thumb/cardano.png',
      price: 0.512,
      priceChange24h: -0.0094,
      priceChangePercent24h: -1.8,
      volume24h: 245000000,
      marketCap: 17200000000,
      rank: 8
    }
  ]);

  // Mock alerts - Empty initial state
  const [alerts] = useState<PriceAlert[]>([]);

  // Mock notifications - Empty initial state
  const [notifications] = useState<AlertNotification[]>([]);

  // State
  const [selectedTab, setSelectedTab] = useState('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'triggered' | 'inactive'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Create alert form
  const [alertForm, setAlertForm] = useState({
    symbol: '',
    condition: 'above' as const,
    targetValue: '',
    priority: 'medium' as const,
    active: true,
    recurring: false,
    recurringInterval: 'daily' as const,
    notificationMethods: ['push'],
    message: ''
  });

  // Simulated price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.symbol.toLowerCase().includes(query) ||
        alert.name.toLowerCase().includes(query) ||
        alert.message.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'active':
          filtered = filtered.filter(alert => alert.active);
          break;
        case 'inactive':
          filtered = filtered.filter(alert => !alert.active);
          break;
        case 'triggered':
          filtered = filtered.filter(alert => alert.triggeredAt);
          break;
      }
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(alert => alert.priority === filterPriority);
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [alerts, searchQuery, filterStatus, filterPriority]);

  // Alert statistics
  const alertStats = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter(a => a.active).length;
    const triggered = alerts.filter(a => a.triggeredAt).length;
    const highPriority = alerts.filter(a => a.priority === 'high').length;
    
    return { total, active, triggered, highPriority };
  }, [alerts]);

  // Unread notifications
  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.read).slice(0, 5);
  }, [notifications]);

  // Handlers
  const handleCreateAlert = async () => {
    if (!alertForm.symbol || !alertForm.targetValue || !alertForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success(`Created ${alertForm.condition} alert for ${alertForm.symbol.toUpperCase()}`);
      setAlertForm({
        symbol: '',
        condition: 'above',
        targetValue: '',
        priority: 'medium',
        active: true,
        recurring: false,
        recurringInterval: 'daily',
        notificationMethods: ['push'],
        message: ''
      });
      setShowCreateDialog(false);
      setIsLoading(false);
    }, 1000);
  };

  const handleToggleAlert = (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      toast.success(`Alert ${alert.active ? 'deactivated' : 'activated'}`);
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      toast.success(`Deleted alert for ${alert.symbol}`);
    }
  };

  const refreshAlerts = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
      toast.success('Alerts refreshed');
    }, 1500);
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

  const getConditionText = (alert: PriceAlert) => {
    switch (alert.condition) {
      case 'above':
        return `Above ${formatCurrency(alert.targetValue)}`;
      case 'below':
        return `Below ${formatCurrency(alert.targetValue)}`;
      case 'change_percent':
        return `Change > ${alert.targetValue}%`;
      case 'volume':
        return `Volume > ${alert.targetValue}`;
      default:
        return 'Unknown condition';
    }
  };

  const getConditionStatus = (alert: PriceAlert) => {
    switch (alert.condition) {
      case 'above':
        return alert.currentValue >= alert.targetValue;
      case 'below':
        return alert.currentValue <= alert.targetValue;
      case 'change_percent':
        const marketInfo = marketData.find(m => m.symbol === alert.symbol);
        return Math.abs(marketInfo?.priceChangePercent24h || 0) >= alert.targetValue;
      default:
        return false;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Price Alerts</h1>
          <p className="text-muted-foreground">
            Set up intelligent price alerts for your favorite cryptocurrencies
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2 mb-2">
            <p className="text-sm text-slate-700 font-medium">
              🚨 Virtual Trading Simulator - Create alerts to practice trading strategies
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
            onClick={refreshAlerts}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Price Alert</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cryptocurrency</Label>
                  <Select 
                    value={alertForm.symbol} 
                    onValueChange={(value) => setAlertForm({ ...alertForm, symbol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {marketData.map((coin) => (
                        <SelectItem key={coin.symbol} value={coin.symbol}>
                          <div className="flex items-center gap-2">
                            <img src={coin.image} alt={coin.name} className="w-5 h-5" />
                            <span>{coin.symbol} - {coin.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select 
                    value={alertForm.condition} 
                    onValueChange={(value: any) => setAlertForm({ ...alertForm, condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Price Above</SelectItem>
                      <SelectItem value="below">Price Below</SelectItem>
                      <SelectItem value="change_percent">Price Change %</SelectItem>
                      <SelectItem value="volume">Volume Above</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    placeholder={alertForm.condition === 'change_percent' ? '10' : '45000'}
                    value={alertForm.targetValue}
                    onChange={(e) => setAlertForm({ ...alertForm, targetValue: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={alertForm.priority} 
                    onValueChange={(value: any) => setAlertForm({ ...alertForm, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Alert message..."
                    value={alertForm.message}
                    onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="recurring"
                    checked={alertForm.recurring}
                    onCheckedChange={(checked) => setAlertForm({ ...alertForm, recurring: checked })}
                  />
                  <Label htmlFor="recurring">Recurring Alert</Label>
                </div>
                
                {alertForm.recurring && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select 
                      value={alertForm.recurringInterval} 
                      onValueChange={(value: any) => setAlertForm({ ...alertForm, recurringInterval: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Notification Methods</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="push" 
                        checked={alertForm.notificationMethods.includes('push')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAlertForm({ 
                              ...alertForm, 
                              notificationMethods: [...alertForm.notificationMethods, 'push']
                            });
                          } else {
                            setAlertForm({ 
                              ...alertForm, 
                              notificationMethods: alertForm.notificationMethods.filter(m => m !== 'push')
                            });
                          }
                        }}
                      />
                      <Label htmlFor="push">Push</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="email"
                        checked={alertForm.notificationMethods.includes('email')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAlertForm({ 
                              ...alertForm, 
                              notificationMethods: [...alertForm.notificationMethods, 'email']
                            });
                          } else {
                            setAlertForm({ 
                              ...alertForm, 
                              notificationMethods: alertForm.notificationMethods.filter(m => m !== 'email')
                            });
                          }
                        }}
                      />
                      <Label htmlFor="email">Email</Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateAlert}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Alert'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-semibold">{alertStats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-semibold text-green-600">{alertStats.active}</p>
              </div>
              <Bell className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Triggered</p>
                <p className="text-2xl font-semibold text-orange-600">{alertStats.triggered}</p>
              </div>
              <Target className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-semibold text-red-600">{alertStats.highPriority}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="triggered">Triggered</TabsTrigger>
          <TabsTrigger value="market">Market Watch</TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="active" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="triggered">Triggered</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={(value: any) => setFilterPriority(value)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const isTriggered = getConditionStatus(alert);
              const marketInfo = marketData.find(m => m.symbol === alert.symbol);
              
              return (
                <Card key={alert.id} className={isTriggered ? 'border-amber-200 bg-amber-50/50' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img src={alert.image} alt={alert.name} className="w-12 h-12 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{alert.symbol}</h3>
                            <Badge 
                              variant={
                                alert.priority === 'high' ? 'destructive' :
                                alert.priority === 'medium' ? 'default' : 'secondary'
                              }
                            >
                              {alert.priority}
                            </Badge>
                            {alert.recurring && (
                              <Badge variant="outline">Recurring</Badge>
                            )}
                            {isTriggered && (
                              <Badge variant="destructive">Triggered!</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-1">{alert.name}</p>
                          <p className="text-sm font-medium mb-2">{getConditionText(alert)}</p>
                          <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Current Price</p>
                              <p className="font-semibold">{formatCurrency(alert.currentValue)}</p>
                              {marketInfo && (
                                <p className={`text-xs ${
                                  marketInfo.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatPercentage(marketInfo.priceChangePercent24h)} 24h
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-muted-foreground">Target</p>
                              <p className="font-semibold">
                                {alert.condition === 'change_percent' ? 
                                  `${alert.targetValue}%` : 
                                  formatCurrency(alert.targetValue)
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Notifications</p>
                              <p className="font-semibold">{alert.notificationMethods.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Created</p>
                              <p className="font-semibold">{formatTimeAgo(alert.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAlert(alert.id)}
                        >
                          {alert.active ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Triggered Alerts Tab */}
        <TabsContent value="triggered" className="space-y-4">
          <div className="space-y-4">
            {alerts.filter(alert => alert.triggeredAt).map((alert) => (
              <Card key={alert.id} className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={alert.image} alt={alert.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{alert.symbol}</h3>
                          <Badge variant="default">Triggered</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Triggered {formatTimeAgo(alert.triggeredAt!)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(alert.currentValue)}</p>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatCurrency(alert.targetValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Market Watch Tab */}
        <TabsContent value="market" className="space-y-4">
          <div className="space-y-4">
            {marketData.map((coin) => (
              <Card key={coin.symbol}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={coin.image} alt={coin.name} className="w-12 h-12 rounded-full" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{coin.symbol}</h3>
                          <Badge variant="secondary">#{coin.rank}</Badge>
                        </div>
                        <p className="text-muted-foreground">{coin.name}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-semibold">
                        {formatCurrency(coin.price)}
                      </div>
                      <div className={`text-sm ${
                        coin.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(coin.priceChange24h)} ({formatPercentage(coin.priceChangePercent24h)})
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t text-sm">
                    <div>
                      <p className="text-muted-foreground">Market Cap</p>
                      <p className="font-semibold">{formatCurrency(coin.marketCap)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">24h Volume</p>
                      <p className="font-semibold">{formatCurrency(coin.volume24h)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alerts</p>
                      <p className="font-semibold">
                        {alerts.filter(a => a.symbol === coin.symbol).length} active
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button 
                      size="sm"
                      onClick={() => {
                        setAlertForm({ ...alertForm, symbol: coin.symbol });
                        setShowCreateDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Notifications Panel */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Notifications
              <Badge variant="secondary">{unreadNotifications.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
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
      )}
    </div>
  );
};

export default EnhancedPriceAlerts;
