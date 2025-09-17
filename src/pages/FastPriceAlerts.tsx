import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Bell, Edit, Trash2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { CardSkeleton } from '@/components/LoadingSpinner';
import type { Database } from '@/types/database';

type AlertRow = Database['public']['Tables']['alerts']['Row'];

interface EnrichedAlert extends AlertRow {
  coin_name: string;
  coin_symbol: string;
  coin_image: string;
  current_price: number;
  distance_to_target: number;
  distance_percentage: number;
}

export default function FastPriceAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<EnrichedAlert | null>(null);
  
  const [newAlert, setNewAlert] = useState({
    coin_id: '',
    coin_name: '',
    coin_symbol: '',
    target_price: '',
    condition: 'above' as 'above' | 'below'
  });

  // Load alerts immediately on mount
  useEffect(() => {
    if (user) {
      loadAlertsFast();
    }
  }, [user]);

  // Check alerts every 30 seconds
  useEffect(() => {
    if (user && alerts.length > 0) {
      const interval = setInterval(() => {
        checkAlertTriggers();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, alerts]);

  const loadAlertsFast = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Step 1: Load alerts from Supabase immediately
      const { data: alertsData, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!alertsData || alertsData.length === 0) {
        setAlerts([]);
        setIsInitialLoad(false);
        setIsLoading(false);
        return;
      }

      // Step 2: Show skeleton alerts immediately
      const skeletonAlerts: EnrichedAlert[] = alertsData.map(alert => ({
        ...alert,
        coin_name: alert.coin_id,
        coin_symbol: alert.coin_id.toUpperCase(),
        coin_image: '',
        current_price: 0,
        distance_to_target: 0,
        distance_percentage: 0
      }));
      
      setAlerts(skeletonAlerts);
      setIsInitialLoad(false);
      setIsLoading(false);

      // Step 3: Enhance with market data in background
      const coinIds = alertsData.map(alert => alert.coin_id);
      
      try {
        const marketData = await coinGeckoApi.getCoinsByIds(coinIds, 'usd');
        
        const enrichedAlerts: EnrichedAlert[] = alertsData.map(alert => {
          const coinData = marketData.find(coin => coin.id === alert.coin_id);
          const current_price = coinData?.current_price || 0;
          const distance_to_target = alert.target_price - current_price;
          const distance_percentage = current_price > 0 ? (distance_to_target / current_price) * 100 : 0;

          return {
            ...alert,
            coin_name: coinData?.name || alert.coin_id,
            coin_symbol: coinData?.symbol.toUpperCase() || alert.coin_id.toUpperCase(),
            coin_image: coinData?.image || '',
            current_price,
            distance_to_target,
            distance_percentage
          };
        });

        // Update with real data
        setAlerts(enrichedAlerts);
      } catch (marketError) {
        console.warn('Market data failed, showing basic alerts:', marketError);
        // Alerts already showing with basic data
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load price alerts');
      setIsInitialLoad(false);
      setIsLoading(false);
    }
  };

  const checkAlertTriggers = async () => {
    if (!user || alerts.length === 0) return;

    try {
      const coinIds = alerts.map(alert => alert.coin_id);
      const marketData = await coinGeckoApi.getCoinsByIds(coinIds, 'usd');
      
      const updatedAlerts = alerts.map(alert => {
        const coinData = marketData.find(coin => coin.id === alert.coin_id);
        const current_price = coinData?.current_price || 0;
        
        // Check if alert should trigger
        const shouldTrigger = 
          (alert.condition === 'above' && current_price >= alert.target_price) ||
          (alert.condition === 'below' && current_price <= alert.target_price);

        if (shouldTrigger && !alert.triggered) {
          // Trigger notification
          const notificationTitle = `${alert.coin_id.toUpperCase()} Price Alert`;
          const notificationBody = `${alert.coin_id} ${alert.condition} $${alert.target_price}. Current price: $${current_price.toLocaleString()}`;
          
          if (Notification.permission === 'granted') {
            new Notification(notificationTitle, {
              body: notificationBody,
              icon: coinData?.image
            });
          }
          
          toast.success(`🚨 ${notificationTitle}`, {
            description: notificationBody
          });

          // Mark as triggered in database
          supabase
            .from('alerts')
            .update({ triggered: true })
            .eq('id', alert.id);
        }

        const distance_to_target = alert.target_price - current_price;
        const distance_percentage = current_price > 0 ? (distance_to_target / current_price) * 100 : 0;

        return {
          ...alert,
          current_price,
          distance_to_target,
          distance_percentage,
          triggered: shouldTrigger || alert.triggered
        };
      });

      setAlerts(updatedAlerts);
    } catch (error) {
      console.warn('Failed to check alert triggers:', error);
    }
  };

  const handleCreateAlert = async () => {
    if (!user || !newAlert.coin_id || !newAlert.target_price) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const { error } = await supabase.from('alerts').insert({
        user_id: user.id,
        coin_id: newAlert.coin_id,
        target_price: parseFloat(newAlert.target_price),
        condition: newAlert.condition
      });

      if (error) throw error;

      toast.success('Price alert created successfully');
      setShowAddDialog(false);
      setNewAlert({ coin_id: '', coin_name: '', coin_symbol: '', target_price: '', condition: 'above' });
      loadAlertsFast(); // Refresh
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create price alert');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Alert deleted');
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const handleEditAlert = async () => {
    if (!editingAlert || !user) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          target_price: editingAlert.target_price,
          condition: editingAlert.condition,
          triggered: false // Reset trigger status
        })
        .eq('id', editingAlert.id);

      if (error) throw error;

      toast.success('Alert updated successfully');
      setEditingAlert(null);
      loadAlertsFast(); // Refresh
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  };

  const handleCoinSelect = (coin: { id: string; name: string; symbol: string }) => {
    setNewAlert(prev => ({
      ...prev,
      coin_id: coin.id,
      coin_name: coin.name,
      coin_symbol: coin.symbol
    }));
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled');
      } else {
        toast.error('Notifications denied');
      }
    }
  };

  // Request notification permission on first load
  useEffect(() => {
    if (user && alerts.length > 0) {
      requestNotificationPermission();
    }
  }, [user, alerts]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
        <p className="text-muted-foreground">Please sign in to set up price alerts.</p>
      </div>
    );
  }

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
            Price Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Get notified when coins reach your target prices
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Search Cryptocurrency</label>
                <SearchBar onCoinSelect={handleCoinSelect} />
                {newAlert.coin_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {newAlert.coin_name} ({newAlert.coin_symbol})
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Condition</label>
                  <Select
                    value={newAlert.condition}
                    onValueChange={(value: 'above' | 'below') => setNewAlert(prev => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Price (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAlert.target_price}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, target_price: e.target.value }))}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateAlert}
                className="w-full"
                disabled={!newAlert.coin_id || !newAlert.target_price}
              >
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Notification Permission Banner */}
      {Notification.permission === 'default' && alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-card border-border/50 border-amber-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Allow notifications to receive price alerts even when this page is closed
                    </p>
                  </div>
                </div>
                <Button onClick={requestNotificationPermission} size="sm">
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Alerts Grid */}
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
        ) : alerts.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No price alerts yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first alert to get notified when prices hit your targets
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300 ${
                  alert.triggered ? 'border-crypto-gain/50' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {alert.coin_image ? (
                          <img src={alert.coin_image} alt={alert.coin_name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                        )}
                        <div>
                          <h3 className="font-semibold">{alert.coin_name || alert.coin_id}</h3>
                          <p className="text-sm text-muted-foreground uppercase">{alert.coin_symbol}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.triggered ? (
                          <Badge variant="default" className="bg-crypto-gain">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Triggered
                          </Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingAlert(alert)}
                          className="hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Price</p>
                          <p className="font-medium">
                            {alert.current_price > 0 ? `$${alert.current_price.toLocaleString()}` : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Target Price</p>
                          <p className="font-medium">${alert.target_price.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Condition</p>
                          <div className="flex items-center gap-1">
                            {alert.condition === 'above' ? (
                              <TrendingUp className="w-4 h-4 text-crypto-gain" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-crypto-loss" />
                            )}
                            <span className="text-sm font-medium capitalize">{alert.condition}</span>
                          </div>
                        </div>
                        
                        {alert.current_price > 0 && !alert.triggered && (
                          <div>
                            <p className="text-sm text-muted-foreground">Distance to Target</p>
                            <p className={`text-sm font-medium ${
                              alert.distance_to_target > 0 ? 'text-crypto-gain' : 'text-crypto-loss'
                            }`}>
                              {alert.distance_to_target > 0 ? '+' : ''}${Math.abs(alert.distance_to_target).toLocaleString()} 
                              ({alert.distance_percentage > 0 ? '+' : ''}{alert.distance_percentage.toFixed(2)}%)
                            </p>
                          </div>
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

      {/* Edit Alert Dialog */}
      <Dialog open={!!editingAlert} onOpenChange={() => setEditingAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price Alert</DialogTitle>
          </DialogHeader>
          {editingAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {editingAlert.coin_image && (
                  <img src={editingAlert.coin_image} alt={editingAlert.coin_name} className="w-8 h-8 rounded-full" />
                )}
                <div>
                  <p className="font-medium">{editingAlert.coin_name}</p>
                  <p className="text-sm text-muted-foreground uppercase">{editingAlert.coin_symbol}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Condition</label>
                  <Select
                    value={editingAlert.condition}
                    onValueChange={(value: 'above' | 'below') => setEditingAlert(prev => prev ? { ...prev, condition: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Price (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingAlert.target_price}
                    onChange={(e) => setEditingAlert(prev => prev ? { ...prev, target_price: parseFloat(e.target.value) } : null)}
                  />
                </div>
              </div>
              
              <Button onClick={handleEditAlert} className="w-full">
                Update Alert
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
