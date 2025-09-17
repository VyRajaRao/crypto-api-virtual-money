import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

export interface Alert {
  id: string;
  user_id: string;
  coin_id: string;
  symbol: string;
  name?: string;
  direction: 'above' | 'below';
  target_price: number;
  active: boolean;
  triggered_at?: string;
  created_at: string;
  updated_at?: string;
  // Advanced features
  condition_type?: 'price' | 'volume' | 'price_change' | 'market_cap' | 'multiple';
  volume_threshold?: number;
  price_change_threshold?: number;
  market_cap_threshold?: number;
  recurring?: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly';
  next_trigger?: string;
  priority?: 'low' | 'medium' | 'high';
  notification_methods?: string[]; // ['push', 'email', 'sms']
  // Enriched data
  current_price?: number;
  image?: string;
  price_change_24h?: number;
  market_cap?: number;
  volume_24h?: number;
}

export interface AlertHistory {
  id: string;
  alert_id: string;
  triggered_at: string;
  trigger_price: number;
  condition_met: string;
  notification_sent: boolean;
  coin_symbol: string;
  coin_name: string;
}

export interface ConditionalAlert {
  coin_id: string;
  conditions: Array<{
    type: 'price' | 'volume' | 'price_change' | 'market_cap';
    operator: 'above' | 'below' | 'equals' | 'between';
    value: number;
    value2?: number; // for 'between' operator
  }>;
  logic: 'AND' | 'OR';
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredAlerts: number;
  todayTriggers: number;
  weekTriggers: number;
  monthTriggers: number;
  averageResponseTime: number; // in minutes
}

export function useAdvancedAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'triggered' | 'inactive'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'target_price' | 'priority' | 'triggered_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch alerts with enriched data
  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: alertsData, error: dbError } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      if (!alertsData || alertsData.length === 0) {
        setAlerts([]);
        return;
      }

      // Get unique coin IDs for batch fetching
      const coinIds = [...new Set(alertsData.map(alert => alert.coin_id))];
      
      // Fetch market data for all coins
      let enrichedAlerts: Alert[] = alertsData;
      
      try {
        const marketData = await coinGeckoApi.getCoinsByIds(coinIds);
        
        enrichedAlerts = alertsData.map(alert => {
          const coinData = marketData.find(coin => coin.id === alert.coin_id);
          return {
            ...alert,
            name: coinData?.name || alert.coin_id,
            current_price: coinData?.current_price || 0,
            image: coinData?.image || '',
            price_change_24h: coinData?.price_change_24h || 0,
            market_cap: coinData?.market_cap || 0,
            volume_24h: coinData?.total_volume || 0,
          };
        });
      } catch (apiError) {
        console.warn('Failed to fetch market data for alerts:', apiError);
        // Continue with basic alert data
      }

      setAlerts(enrichedAlerts);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch alert history
  const fetchAlertHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .eq('user_id', user.id)
        .order('triggered_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAlertHistory(data || []);
    } catch (err) {
      console.error('Error fetching alert history:', err);
    }
  }, [user]);

  // Check alerts for triggers
  const checkAlerts = useCallback(async () => {
    if (!user || alerts.length === 0) return;

    const activeAlerts = alerts.filter(alert => alert.active && !alert.triggered_at);
    if (activeAlerts.length === 0) return;

    for (const alert of activeAlerts) {
      try {
        let shouldTrigger = false;
        let triggerReason = '';
        let triggerPrice = alert.current_price || 0;

        // Check different condition types
        switch (alert.condition_type || 'price') {
          case 'price':
            if (alert.direction === 'above' && triggerPrice >= alert.target_price) {
              shouldTrigger = true;
              triggerReason = `Price reached $${alert.target_price}`;
            } else if (alert.direction === 'below' && triggerPrice <= alert.target_price) {
              shouldTrigger = true;
              triggerReason = `Price dropped to $${alert.target_price}`;
            }
            break;

          case 'volume':
            if (alert.volume_threshold && alert.volume_24h) {
              if (alert.direction === 'above' && alert.volume_24h >= alert.volume_threshold) {
                shouldTrigger = true;
                triggerReason = `Volume exceeded $${alert.volume_threshold.toLocaleString()}`;
              } else if (alert.direction === 'below' && alert.volume_24h <= alert.volume_threshold) {
                shouldTrigger = true;
                triggerReason = `Volume dropped below $${alert.volume_threshold.toLocaleString()}`;
              }
            }
            break;

          case 'price_change':
            if (alert.price_change_threshold && alert.price_change_24h !== undefined) {
              const changePercent = (alert.price_change_24h / triggerPrice) * 100;
              if (alert.direction === 'above' && changePercent >= alert.price_change_threshold) {
                shouldTrigger = true;
                triggerReason = `Price changed by ${changePercent.toFixed(2)}%`;
              } else if (alert.direction === 'below' && changePercent <= alert.price_change_threshold) {
                shouldTrigger = true;
                triggerReason = `Price changed by ${changePercent.toFixed(2)}%`;
              }
            }
            break;

          case 'market_cap':
            if (alert.market_cap_threshold && alert.market_cap) {
              if (alert.direction === 'above' && alert.market_cap >= alert.market_cap_threshold) {
                shouldTrigger = true;
                triggerReason = `Market cap exceeded $${alert.market_cap_threshold.toLocaleString()}`;
              } else if (alert.direction === 'below' && alert.market_cap <= alert.market_cap_threshold) {
                shouldTrigger = true;
                triggerReason = `Market cap dropped below $${alert.market_cap_threshold.toLocaleString()}`;
              }
            }
            break;
        }

        if (shouldTrigger) {
          // Update alert as triggered (or schedule next if recurring)
          const now = new Date().toISOString();
          let updateData: any = { triggered_at: now };

          if (alert.recurring) {
            // Calculate next trigger time
            const nextTrigger = new Date();
            switch (alert.recurring_interval) {
              case 'daily':
                nextTrigger.setDate(nextTrigger.getDate() + 1);
                break;
              case 'weekly':
                nextTrigger.setDate(nextTrigger.getDate() + 7);
                break;
              case 'monthly':
                nextTrigger.setMonth(nextTrigger.getMonth() + 1);
                break;
            }
            updateData = {
              triggered_at: null, // Keep active for recurring
              next_trigger: nextTrigger.toISOString(),
            };
          }

          await supabase
            .from('alerts')
            .update(updateData)
            .eq('id', alert.id);

          // Add to alert history
          await supabase
            .from('alert_history')
            .insert([{
              user_id: user.id,
              alert_id: alert.id,
              triggered_at: now,
              trigger_price: triggerPrice,
              condition_met: triggerReason,
              notification_sent: true,
              coin_symbol: alert.symbol,
              coin_name: alert.name || alert.symbol,
            }]);

          // Show notification
          const priorityEmoji = alert.priority === 'high' ? '🚨' : alert.priority === 'medium' ? '⚠️' : '📢';
          toast.success(
            `${priorityEmoji} Alert Triggered! ${alert.name || alert.symbol} - ${triggerReason}`,
            { 
              duration: alert.priority === 'high' ? 15000 : 10000,
              action: {
                label: 'View',
                onClick: () => {
                  // Could navigate to coin details
                }
              }
            }
          );

          // TODO: Send other notifications (email, SMS) based on notification_methods
        }
      } catch (error) {
        console.error('Error checking alert:', alert.id, error);
      }
    }

    // Refresh alerts after checking
    await fetchAlerts();
    await fetchAlertHistory();
  }, [user, alerts, fetchAlerts, fetchAlertHistory]);

  // Create alert
  const createAlert = useCallback(async (alertData: Partial<Alert>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('alerts')
      .insert([{
        ...alertData,
        user_id: user.id,
        active: alertData.active !== false,
        priority: alertData.priority || 'medium',
        notification_methods: alertData.notification_methods || ['push'],
      }]);

    if (error) throw error;
    
    await fetchAlerts();
    toast.success('Alert created successfully');
  }, [user, fetchAlerts]);

  // Update alert
  const updateAlert = useCallback(async (alertId: string, updates: Partial<Alert>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw error;
    
    await fetchAlerts();
    toast.success('Alert updated successfully');
  }, [user, fetchAlerts]);

  // Delete alert
  const deleteAlert = useCallback(async (alertId: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw error;
    
    await fetchAlerts();
    toast.success('Alert deleted successfully');
  }, [user, fetchAlerts]);

  // Bulk operations
  const bulkDeleteAlerts = useCallback(async (alertIds: string[]) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('alerts')
      .delete()
      .in('id', alertIds)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setSelectedAlerts(new Set());
    await fetchAlerts();
    toast.success(`${alertIds.length} alert(s) deleted successfully`);
  }, [user, fetchAlerts]);

  const bulkUpdateAlerts = useCallback(async (alertIds: string[], updates: Partial<Alert>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', alertIds)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setSelectedAlerts(new Set());
    await fetchAlerts();
    toast.success(`${alertIds.length} alert(s) updated successfully`);
  }, [user, fetchAlerts]);

  // Filter and sort alerts
  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = alerts.filter(alert => {
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          alert.name?.toLowerCase().includes(searchLower) ||
          alert.symbol.toLowerCase().includes(searchLower) ||
          alert.coin_id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      switch (filterStatus) {
        case 'active':
          if (!alert.active || alert.triggered_at) return false;
          break;
        case 'triggered':
          if (!alert.triggered_at) return false;
          break;
        case 'inactive':
          if (alert.active) return false;
          break;
      }

      // Priority filter
      if (filterPriority !== 'all' && alert.priority !== filterPriority) {
        return false;
      }

      return true;
    });

    // Sort alerts
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'target_price':
          aVal = a.target_price;
          bVal = b.target_price;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority || 'medium'];
          bVal = priorityOrder[b.priority || 'medium'];
          break;
        case 'triggered_at':
          aVal = a.triggered_at ? new Date(a.triggered_at).getTime() : 0;
          bVal = b.triggered_at ? new Date(b.triggered_at).getTime() : 0;
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [alerts, debouncedSearch, filterStatus, filterPriority, sortBy, sortOrder]);

  // Calculate statistics
  const alertStats: AlertStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const todayTriggers = alertHistory.filter(h => 
      new Date(h.triggered_at) >= today
    ).length;

    const weekTriggers = alertHistory.filter(h => 
      new Date(h.triggered_at) >= weekAgo
    ).length;

    const monthTriggers = alertHistory.filter(h => 
      new Date(h.triggered_at) >= monthAgo
    ).length;

    // Calculate average response time (simplified)
    const recentTriggers = alertHistory.slice(0, 10);
    const avgResponseTime = recentTriggers.length > 0 
      ? recentTriggers.reduce((sum, trigger) => sum + 5, 0) / recentTriggers.length 
      : 0; // Simplified to 5 minutes average

    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.active && !a.triggered_at).length,
      triggeredAlerts: alerts.filter(a => a.triggered_at).length,
      todayTriggers,
      weekTriggers,
      monthTriggers,
      averageResponseTime: avgResponseTime,
    };
  }, [alerts, alertHistory]);

  // Auto-check alerts
  useEffect(() => {
    if (user && alerts.length > 0) {
      checkAlerts();
      
      // Set up interval for checking alerts
      const interval = setInterval(checkAlerts, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user, alerts.length, checkAlerts]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchAlerts();
      fetchAlertHistory();
    }
  }, [user, fetchAlerts, fetchAlertHistory]);

  return {
    // Data
    alerts: filteredAndSortedAlerts,
    allAlerts: alerts,
    alertHistory,
    alertStats,
    
    // State
    isLoading,
    error,
    lastChecked,
    selectedAlerts,
    searchQuery,
    filterStatus,
    filterPriority,
    sortBy,
    sortOrder,
    
    // Actions
    setSelectedAlerts,
    setSearchQuery,
    setFilterStatus,
    setFilterPriority,
    setSortBy,
    setSortOrder,
    createAlert,
    updateAlert,
    deleteAlert,
    bulkDeleteAlerts,
    bulkUpdateAlerts,
    refreshAlerts: fetchAlerts,
    checkAlerts,
  };
}
