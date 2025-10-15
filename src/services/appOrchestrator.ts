import { priceService } from './priceService';
import { tradingEngine } from './tradingEngine';
import { alertsService } from './alertsService';
import { newsService } from './newsService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export class AppOrchestrator {
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private orderProcessingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize the entire application
   */
  async initialize(options?: { notifyOnError?: boolean }): Promise<void> {
    if (this.isInitialized) {
      console.log('App already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing CryptoVault Virtual Trading Simulator...');

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        
        // Initialize user wallet if it doesn't exist
        await this.initializeUserWallet(user.id);
        
        // Start all services
        await this.startServices();
      } else {
        console.log('⚠️ User not authenticated - limited functionality');
        
        // Still start price updates for public data
        priceService.startPriceUpdates(5); // Update every 5 minutes
      }

      this.isInitialized = true;
      console.log('✅ CryptoVault initialization complete!');

    } catch (error) {
      console.error('❌ Failed to initialize CryptoVault:', error);
      // Only show error toasts when explicitly requested (avoid alarming users on first load)
      if (options?.notifyOnError) {
        toast.error('Failed to initialize application');
      }
    }
  }

  /**
   * Start all background services
   */
  private async startServices(): Promise<void> {
    try {
      // 1. Start price service (updates every 5 minutes)
      console.log('🔄 Starting price service...');
      priceService.startPriceUpdates(5);

      // 2. Start trading engine (processes orders every minute)
      console.log('📈 Starting trading engine...');
      this.orderProcessingInterval = tradingEngine.startOrderProcessing(1);

      // 3. Start alerts monitoring (checks every 30 seconds)
      console.log('🔔 Starting alerts monitoring...');
      alertsService.startAlertMonitoring();

      // 4. Start simulated news generation (every 5 minutes)
      console.log('🗞️ Starting news service...');
      newsService.startNewsGeneration();

      // 5. Set up real-time subscriptions
      await this.setupRealtimeSubscriptions();

      console.log('✅ All services started successfully');
    } catch (error) {
      console.error('❌ Error starting services:', error);
      throw error;
    }
  }

  /**
   * Initialize user wallet with starting balance
   */
  private async initializeUserWallet(userId: string): Promise<void> {
    try {
      // Check if wallet already exists
      const { data: existingWallet, error: fetchError } = await supabase
        .from('wallet')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing wallet:', fetchError);
        return;
      }

      if (!existingWallet) {
        // Create new wallet with $10,000 virtual starting balance
        const { error: createError } = await supabase
          .from('wallet')
          .insert({
            user_id: userId,
            balance: 10000,
            available_balance: 10000,
            currency: 'USD',
            total_invested: 0,
            total_value: 10000,
            portfolio_value: 0,
            total_pnl: 0,
            daily_pnl: 0
          });

        if (createError) {
          console.error('Error creating wallet:', createError);
          throw createError;
        }

        console.log('✅ Created new wallet with $10,000 starting balance');
        
        // Show welcome notification
        await this.createWelcomeNotification(userId);
      } else {
        console.log('✅ Existing wallet found:', existingWallet.balance.toLocaleString());
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw error;
    }
  }

  /**
   * Create welcome notification for new users
   */
  private async createWelcomeNotification(userId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'welcome',
          title: 'Welcome to CryptoVault!',
          message: 'Your virtual trading account has been created with $10,000. Start trading cryptocurrencies with real market prices in a risk-free environment!',
          payload: {
            starting_balance: 10000,
            currency: 'USD'
          }
        });
    } catch (error) {
      console.error('Error creating welcome notification:', error);
    }
  }

  /**
   * Set up real-time subscriptions
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to price updates
      supabase
        .channel('price-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'latest_prices'
          },
          (payload) => {
            console.log('Price updated:', payload.new);
            // Trigger portfolio value updates
            this.updatePortfolioValues();
          }
        )
        .subscribe();

      // Subscribe to alerts
      supabase
        .channel('user-alerts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification:', payload.new);
            // Show toast notification
            if (payload.new.type === 'alert_triggered') {
              toast.success(payload.new.title, {
                description: payload.new.message,
                duration: 5000
              });
            }
          }
        )
        .subscribe();

      console.log('✅ Real-time subscriptions established');
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }
  }

  /**
   * Update portfolio values for all users
   */
  private async updatePortfolioValues(): Promise<void> {
    try {
      await supabase.rpc('update_portfolio_values');
    } catch (error) {
      console.error('Error updating portfolio values:', error);
    }
  }

  /**
   * Handle user authentication changes
   */
  async onAuthStateChange(user: any): Promise<void> {
    if (user) {
      console.log('👤 User signed in:', user.email);
      
      // Initialize wallet for new/returning user
      await this.initializeUserWallet(user.id);
      
      // Start user-specific services if not already running
      if (!this.isInitialized) {
        await this.startServices();
        this.isInitialized = true;
      }
    } else {
      console.log('👋 User signed out');
      
      // Stop user-specific services but keep price updates
      this.stopUserServices();
    }
  }

  /**
   * Stop user-specific services (but keep price updates running)
   */
  private stopUserServices(): void {
    // Stop trading engine
    if (this.orderProcessingInterval) {
      clearInterval(this.orderProcessingInterval);
      this.orderProcessingInterval = null;
    }

    // Stop alerts monitoring
    alertsService.stopAlertMonitoring();

    // Stop news generation
    newsService.stopNewsGeneration();

    console.log('🛑 User services stopped');
  }

  /**
   * Shutdown all services
   */
  shutdown(): void {
    console.log('🛑 Shutting down CryptoVault services...');

    // Stop price service
    priceService.stopPriceUpdates();

    // Stop trading engine
    if (this.orderProcessingInterval) {
      clearInterval(this.orderProcessingInterval);
      this.orderProcessingInterval = null;
    }

    // Stop alerts monitoring
    alertsService.stopAlertMonitoring();

    // Stop news service
    newsService.stopNewsGeneration();

    this.isInitialized = false;
    console.log('✅ Shutdown complete');
  }

  /**
   * Get application status
   */
  getStatus(): {
    initialized: boolean;
    services: {
      priceService: boolean;
      tradingEngine: boolean;
      alertsService: boolean;
      newsService: boolean;
    };
  } {
    return {
      initialized: this.isInitialized,
      services: {
        priceService: priceService['updateInterval'] !== null,
        tradingEngine: this.orderProcessingInterval !== null,
        alertsService: alertsService['monitoringInterval'] !== null,
        newsService: newsService['eventGenerationInterval'] !== null
      }
    };
  }

  /**
   * Manual data refresh
   */
  async refreshAllData(): Promise<void> {
    try {
      console.log('🔄 Manual refresh initiated...');

      // Update prices
      await priceService.updateAllPrices();

      // Process any pending orders
      await tradingEngine.processPendingOrders();

      // Check all alerts
      await alertsService.checkAllAlerts();

      // Update portfolio values
      await this.updatePortfolioValues();

      console.log('✅ Manual refresh complete');
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      toast.error('Failed to refresh data');
    }
  }

  /**
   * Health check - verify all services are running
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    lastUpdate?: Date;
  }> {
    try {
      const services = {
        database: false,
        priceService: false,
        tradingEngine: false,
        alertsService: false,
        newsService: false
      };

      // Check database connectivity
      try {
        const { error } = await supabase.from('wallet').select('count').single();
        services.database = !error;
      } catch (e) {
        services.database = false;
      }

      // Check service status
      const status = this.getStatus();
      services.priceService = status.services.priceService;
      services.tradingEngine = status.services.tradingEngine;
      services.alertsService = status.services.alertsService;
      services.newsService = status.services.newsService;

      const healthyCount = Object.values(services).filter(Boolean).length;
      const totalServices = Object.keys(services).length;

      let healthStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === totalServices) {
        healthStatus = 'healthy';
      } else if (healthyCount >= totalServices / 2) {
        healthStatus = 'degraded';
      } else {
        healthStatus = 'unhealthy';
      }

      return {
        status: healthStatus,
        services,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        services: {
          database: false,
          priceService: false,
          tradingEngine: false,
          alertsService: false,
          newsService: false
        }
      };
    }
  }
}

// Export singleton instance
export const appOrchestrator = new AppOrchestrator();
export default appOrchestrator;
