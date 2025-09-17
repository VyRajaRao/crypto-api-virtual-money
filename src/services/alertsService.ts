import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  name?: string;
  image?: string;
  direction: 'above' | 'below';
  target_price: number;
  current_price: number;
  condition_type: 'price' | 'volume' | 'price_change' | 'market_cap';
  priority: 'low' | 'medium' | 'high';
  active: boolean;
  recurring: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly';
  notification_methods: string[];
  message?: string;
  created_at: string;
  triggered_at?: string;
  updated_at: string;
}

export interface PriceAlert extends Alert {
  condition_type: 'price';
}

export interface VolumeAlert extends Alert {
  condition_type: 'volume';
  target_volume: number;
}

export interface PriceChangeAlert extends Alert {
  condition_type: 'price_change';
  target_change_percentage: number;
}

export interface MarketCapAlert extends Alert {
  condition_type: 'market_cap';
  target_market_cap: number;
}

export interface AlertNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  payload: any;
  read: boolean;
  created_at: string;
}

class AlertsService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_SECONDS = 30; // Check every 30 seconds

  /**
   * Start monitoring all active alerts
   */
  startAlertMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log(`Starting alert monitoring (checking every ${this.MONITORING_INTERVAL_SECONDS}s)`);

    // Initial check
    this.checkAllAlerts().catch(console.error);

    // Set up recurring checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllAlerts();
      } catch (error) {
        console.error('Alert monitoring error:', error);
      }
    }, this.MONITORING_INTERVAL_SECONDS * 1000);
  }

  /**
   * Stop alert monitoring
   */
  stopAlertMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Stopped alert monitoring');
    }
  }

  /**
   * Check all active alerts against current market conditions
   */
  async checkAllAlerts(): Promise<void> {
    try {
      // Get all active alerts
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select(`
          *,
          latest_prices!inner(price_usd, price_change_percentage_24h, volume_24h, market_cap, name, image)
        `)
        .eq('active', true)
        .is('triggered_at', null);

      if (error) {
        console.error('Error fetching active alerts:', error);
        return;
      }

      if (!alerts || alerts.length === 0) {
        return;
      }

      console.log(`Checking ${alerts.length} active alerts`);

      // Process each alert
      for (const alert of alerts) {
        try {
          await this.checkAlert(alert as any);
        } catch (error) {
          console.error(`Error checking alert ${alert.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in alert monitoring:', error);
    }
  }

  /**
   * Check a single alert against current market conditions
   */
  private async checkAlert(alert: Alert & { latest_prices: any }): Promise<void> {
    const priceData = alert.latest_prices;
    if (!priceData) {
      console.warn(`No price data found for alert ${alert.id} (${alert.symbol})`);
      return;
    }

    let shouldTrigger = false;
    let triggerMessage = '';

    // Check different alert conditions
    switch (alert.condition_type) {
      case 'price':
        const result = this.checkPriceAlert(alert, priceData.price_usd);
        shouldTrigger = result.shouldTrigger;
        triggerMessage = result.message;
        break;

      case 'volume':
        // Volume alert logic (you can extend this)
        break;

      case 'price_change':
        const changeResult = this.checkPriceChangeAlert(alert, priceData.price_change_percentage_24h);
        shouldTrigger = changeResult.shouldTrigger;
        triggerMessage = changeResult.message;
        break;

      case 'market_cap':
        // Market cap alert logic (you can extend this)
        break;
    }

    if (shouldTrigger) {
      await this.triggerAlert(alert, priceData, triggerMessage);
    }
  }

  /**
   * Check if a price alert should be triggered
   */
  private checkPriceAlert(alert: Alert, currentPrice: number): { shouldTrigger: boolean; message: string } {
    let shouldTrigger = false;
    let message = '';

    if (alert.direction === 'above' && currentPrice >= alert.target_price) {
      shouldTrigger = true;
      message = `${alert.name || alert.symbol.toUpperCase()} has reached $${currentPrice.toLocaleString()} (target: $${alert.target_price.toLocaleString()})`;
    } else if (alert.direction === 'below' && currentPrice <= alert.target_price) {
      shouldTrigger = true;
      message = `${alert.name || alert.symbol.toUpperCase()} has dropped to $${currentPrice.toLocaleString()} (target: $${alert.target_price.toLocaleString()})`;
    }

    return { shouldTrigger, message };
  }

  /**
   * Check if a price change alert should be triggered
   */
  private checkPriceChangeAlert(alert: PriceChangeAlert, priceChangePercentage: number): { shouldTrigger: boolean; message: string } {
    let shouldTrigger = false;
    let message = '';

    if (alert.direction === 'above' && priceChangePercentage >= alert.target_change_percentage) {
      shouldTrigger = true;
      message = `${alert.name || alert.symbol.toUpperCase()} is up ${priceChangePercentage.toFixed(2)}% in 24h (target: ${alert.target_change_percentage}%)`;
    } else if (alert.direction === 'below' && priceChangePercentage <= alert.target_change_percentage) {
      shouldTrigger = true;
      message = `${alert.name || alert.symbol.toUpperCase()} is down ${Math.abs(priceChangePercentage).toFixed(2)}% in 24h (target: ${Math.abs(alert.target_change_percentage)}%)`;
    }

    return { shouldTrigger, message };
  }

  /**
   * Trigger an alert and create notifications
   */
  private async triggerAlert(alert: Alert, priceData: any, triggerMessage: string): Promise<void> {
    try {
      console.log(`Triggering alert ${alert.id}: ${triggerMessage}`);

      // Update alert status
      const updateData: any = {
        triggered_at: new Date().toISOString(),
        current_price: priceData.price_usd,
        updated_at: new Date().toISOString()
      };

      // If not recurring, deactivate the alert
      if (!alert.recurring) {
        updateData.active = false;
      }

      const { error: updateError } = await supabase
        .from('alerts')
        .update(updateData)
        .eq('id', alert.id);

      if (updateError) {
        console.error('Error updating triggered alert:', updateError);
        return;
      }

      // Create notification
      await this.createAlertNotification(alert, priceData, triggerMessage);

      // If recurring, schedule reactivation
      if (alert.recurring && alert.recurring_interval) {
        await this.scheduleRecurringAlert(alert);
      }

      console.log(`Alert ${alert.id} triggered successfully`);

    } catch (error) {
      console.error(`Error triggering alert ${alert.id}:`, error);
    }
  }

  /**
   * Create notification for triggered alert
   */
  private async createAlertNotification(alert: Alert, priceData: any, triggerMessage: string): Promise<void> {
    try {
      const notification = {
        user_id: alert.user_id,
        type: 'alert_triggered',
        title: `${alert.priority.toUpperCase()} Priority Alert`,
        message: alert.message || triggerMessage,
        payload: {
          alert_id: alert.id,
          symbol: alert.symbol,
          current_price: priceData.price_usd,
          target_price: alert.target_price,
          direction: alert.direction,
          priority: alert.priority,
          image: priceData.image,
          name: priceData.name
        }
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) {
        console.error('Error creating alert notification:', error);
        return;
      }

      // Send browser notification if supported
      if (alert.notification_methods.includes('push')) {
        await this.sendBrowserNotification(alert, triggerMessage, priceData);
      }

    } catch (error) {
      console.error('Error creating alert notification:', error);
    }
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(alert: Alert, message: string, priceData: any): Promise<void> {
    try {
      if (!('Notification' in window)) {
        return;
      }

      if (Notification.permission === 'granted') {
        new Notification(`CryptoVault Alert - ${alert.priority.toUpperCase()}`, {
          body: message,
          icon: priceData.image || '/favicon.ico',
          tag: `alert-${alert.id}`,
          requireInteraction: alert.priority === 'high'
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(`CryptoVault Alert - ${alert.priority.toUpperCase()}`, {
            body: message,
            icon: priceData.image || '/favicon.ico',
            tag: `alert-${alert.id}`,
            requireInteraction: alert.priority === 'high'
          });
        }
      }
    } catch (error) {
      console.error('Error sending browser notification:', error);
    }
  }

  /**
   * Schedule recurring alert reactivation
   */
  private async scheduleRecurringAlert(alert: Alert): Promise<void> {
    try {
      let nextTriggerTime = new Date();

      switch (alert.recurring_interval) {
        case 'daily':
          nextTriggerTime.setDate(nextTriggerTime.getDate() + 1);
          break;
        case 'weekly':
          nextTriggerTime.setDate(nextTriggerTime.getDate() + 7);
          break;
        case 'monthly':
          nextTriggerTime.setMonth(nextTriggerTime.getMonth() + 1);
          break;
        default:
          return;
      }

      // For simplicity, we'll just reactivate the alert immediately
      // In a production system, you'd want to use a proper job queue
      setTimeout(async () => {
        try {
          await supabase
            .from('alerts')
            .update({
              active: true,
              triggered_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', alert.id);
        } catch (error) {
          console.error('Error reactivating recurring alert:', error);
        }
      }, 60000); // Reactivate after 1 minute for demo purposes

    } catch (error) {
      console.error('Error scheduling recurring alert:', error);
    }
  }

  /**
   * Create a new alert
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Alert | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const newAlert = {
        ...alertData,
        user_id: user.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('alerts')
        .insert(newAlert)
        .select()
        .single();

      if (error) {
        console.error('Error creating alert:', error);
        throw error;
      }

      console.log('Alert created successfully:', data.id);
      return data;

    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Update an existing alert
   */
  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('Error updating alert:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('Error deleting alert:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }

  /**
   * Get user's alerts
   */
  async getUserAlerts(userId?: string): Promise<Alert[]> {
    try {
      if (!userId) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return [];
        userId = user.user.id;
      }

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user alerts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      return [];
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId?: string, limit = 50): Promise<AlertNotification[]> {
    try {
      if (!userId) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return [];
        userId = user.user.id;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Bulk update alerts
   */
  async bulkUpdateAlerts(alertIds: string[], updates: Partial<Alert>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', alertIds);

      if (error) {
        console.error('Error bulk updating alerts:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error bulk updating alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics for a user
   */
  async getAlertStats(userId?: string): Promise<{
    total: number;
    active: number;
    triggered: number;
    highPriority: number;
  }> {
    try {
      if (!userId) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return { total: 0, active: 0, triggered: 0, highPriority: 0 };
        userId = user.user.id;
      }

      const alerts = await this.getUserAlerts(userId);

      return {
        total: alerts.length,
        active: alerts.filter(a => a.active).length,
        triggered: alerts.filter(a => a.triggered_at).length,
        highPriority: alerts.filter(a => a.priority === 'high').length
      };
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      return { total: 0, active: 0, triggered: 0, highPriority: 0 };
    }
  }
}

export const alertsService = new AlertsService();
export default alertsService;
