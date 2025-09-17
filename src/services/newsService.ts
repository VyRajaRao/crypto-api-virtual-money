import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface NewsEvent {
  id: string;
  title: string;
  content: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'regulatory' | 'technical' | 'partnership' | 'adoption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_assets: string[];
  price_impact_percentage: number;
  duration_minutes: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

interface NewsTemplate {
  title: string;
  content: string;
  type: NewsEvent['type'];
  severity: NewsEvent['severity'];
  price_impact_range: [number, number];
  duration_range: [number, number];
}

const NEWS_TEMPLATES: NewsTemplate[] = [
  {
    title: "Major Institution Announces {{ASSET}} Investment",
    content: "A leading financial institution has announced a significant investment in {{ASSET}}, citing strong fundamentals and future potential. This move is expected to boost institutional adoption.",
    type: 'bullish',
    severity: 'high',
    price_impact_range: [3, 8],
    duration_range: [60, 180]
  },
  {
    title: "Regulatory Concerns Surface for {{ASSET}}",
    content: "Regulatory authorities are reportedly reviewing the legal status of {{ASSET}}, causing uncertainty in the market. Investors are advised to exercise caution.",
    type: 'regulatory',
    severity: 'medium',
    price_impact_range: [-5, -2],
    duration_range: [30, 120]
  },
  {
    title: "{{ASSET}} Network Upgrade Successfully Completed",
    content: "The {{ASSET}} network has successfully completed a major upgrade, improving transaction speed and reducing fees. The community response has been overwhelmingly positive.",
    type: 'technical',
    severity: 'medium',
    price_impact_range: [2, 6],
    duration_range: [45, 90]
  },
  {
    title: "Security Vulnerability Discovered in {{ASSET}} Protocol",
    content: "Researchers have identified a potential security vulnerability in the {{ASSET}} protocol. While no funds are at immediate risk, developers are working on a fix.",
    type: 'bearish',
    severity: 'high',
    price_impact_range: [-8, -3],
    duration_range: [90, 240]
  },
  {
    title: "Major Partnership Announced for {{ASSET}}",
    content: "{{ASSET}} has announced a strategic partnership with a Fortune 500 company, opening up new use cases and potentially increasing adoption significantly.",
    type: 'partnership',
    severity: 'high',
    price_impact_range: [4, 10],
    duration_range: [120, 300]
  },
  {
    title: "Whale Movement Detected in {{ASSET}}",
    content: "Large {{ASSET}} holders have been moving significant amounts to exchanges, raising concerns about potential selling pressure. Market participants are monitoring closely.",
    type: 'bearish',
    severity: 'medium',
    price_impact_range: [-4, -1],
    duration_range: [30, 90]
  },
  {
    title: "{{ASSET}} Adoption Grows Among Retail Investors",
    content: "Retail investment in {{ASSET}} has surged by over 300% this month, driven by increased awareness and improved accessibility through mainstream platforms.",
    type: 'bullish',
    severity: 'medium',
    price_impact_range: [2, 5],
    duration_range: [60, 150]
  },
  {
    title: "Central Bank Comments on {{ASSET}} and Digital Assets",
    content: "The central bank has made statements regarding {{ASSET}} and the broader cryptocurrency market, emphasizing the need for proper regulation while acknowledging innovation potential.",
    type: 'regulatory',
    severity: 'medium',
    price_impact_range: [-2, 3],
    duration_range: [45, 120]
  },
  {
    title: "Technical Analysis Shows {{ASSET}} Breaking Key Resistance",
    content: "{{ASSET}} has broken through a major resistance level, with technical analysts predicting potential for continued upward momentum based on chart patterns.",
    type: 'bullish',
    severity: 'low',
    price_impact_range: [1, 4],
    duration_range: [30, 90]
  },
  {
    title: "Market Manipulation Concerns Rise for {{ASSET}}",
    content: "Trading patterns in {{ASSET}} have raised concerns about potential market manipulation, with authorities launching an investigation into unusual price movements.",
    type: 'bearish',
    severity: 'high',
    price_impact_range: [-6, -2],
    duration_range: [120, 240]
  }
];

class NewsService {
  private eventGenerationInterval: NodeJS.Timeout | null = null;
  private readonly EVENT_GENERATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_TIME_BETWEEN_EVENTS = 2 * 60 * 1000; // 2 minutes
  private lastEventTime = 0;

  /**
   * Start generating simulated news events
   */
  startNewsGeneration(): void {
    if (this.eventGenerationInterval) {
      clearInterval(this.eventGenerationInterval);
    }

    console.log('🗞️ Starting simulated news generation...');

    // Generate initial event
    setTimeout(() => {
      this.generateRandomEvent();
    }, 10000); // First event after 10 seconds

    // Set up recurring generation
    this.eventGenerationInterval = setInterval(() => {
      this.generateRandomEvent();
    }, this.EVENT_GENERATION_INTERVAL);
  }

  /**
   * Stop generating news events
   */
  stopNewsGeneration(): void {
    if (this.eventGenerationInterval) {
      clearInterval(this.eventGenerationInterval);
      this.eventGenerationInterval = null;
      console.log('🛑 Stopped news generation');
    }
  }

  /**
   * Generate a random news event
   */
  private async generateRandomEvent(): Promise<void> {
    const now = Date.now();
    
    // Prevent events from being generated too frequently
    if (now - this.lastEventTime < this.MIN_TIME_BETWEEN_EVENTS) {
      return;
    }

    try {
      // Get available assets
      const availableAssets = await this.getAvailableAssets();
      if (availableAssets.length === 0) {
        console.warn('No assets available for news generation');
        return;
      }

      // Randomly decide whether to generate an event (30% chance each interval)
      if (Math.random() > 0.3) {
        return;
      }

      // Select random template and asset
      const template = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
      const asset = availableAssets[Math.floor(Math.random() * availableAssets.length)];

      // Generate event details
      const priceImpact = this.getRandomInRange(template.price_impact_range[0], template.price_impact_range[1]);
      const duration = this.getRandomInRange(template.duration_range[0], template.duration_range[1]);

      const newsEvent: Omit<NewsEvent, 'id' | 'created_at' | 'expires_at'> = {
        title: template.title.replace(/\{\{ASSET\}\}/g, asset.name),
        content: template.content.replace(/\{\{ASSET\}\}/g, asset.name),
        type: template.type,
        severity: template.severity,
        affected_assets: [asset.symbol],
        price_impact_percentage: priceImpact,
        duration_minutes: duration,
        is_active: true
      };

      // Create the event
      const createdEvent = await this.createNewsEvent(newsEvent);
      
      if (createdEvent) {
        this.lastEventTime = now;
        console.log('📰 Generated news event:', createdEvent.title);
        
        // Apply market impact
        await this.applyMarketImpact(createdEvent);
        
        // Show notification to users
        this.notifyUsers(createdEvent);
        
        // Schedule event expiration
        this.scheduleEventExpiration(createdEvent);
      }

    } catch (error) {
      console.error('Error generating random news event:', error);
    }
  }

  /**
   * Get available assets for news generation
   */
  private async getAvailableAssets(): Promise<Array<{ symbol: string; name: string }>> {
    try {
      const { data, error } = await supabase
        .from('latest_prices')
        .select('symbol, name')
        .order('market_cap', { ascending: false })
        .limit(20); // Top 20 by market cap

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching available assets:', error);
      return [];
    }
  }

  /**
   * Create a news event in the database
   */
  private async createNewsEvent(eventData: Omit<NewsEvent, 'id' | 'created_at' | 'expires_at'>): Promise<NewsEvent | null> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + eventData.duration_minutes * 60 * 1000);

      const { data, error } = await supabase
        .from('news_events')
        .insert({
          ...eventData,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating news event:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating news event:', error);
      return null;
    }
  }

  /**
   * Apply market impact from news event (simulated price changes)
   */
  private async applyMarketImpact(event: NewsEvent): Promise<void> {
    try {
      // This is a simplified simulation - in a real system, you'd have more complex logic
      for (const symbol of event.affected_assets) {
        // Get current price
        const { data: priceData, error } = await supabase
          .from('latest_prices')
          .select('price_usd')
          .eq('symbol', symbol)
          .single();

        if (error || !priceData) {
          console.error(`Price not found for ${symbol}`);
          continue;
        }

        // Calculate new price with impact
        const currentPrice = priceData.price_usd;
        const impactMultiplier = 1 + (event.price_impact_percentage / 100);
        const newPrice = currentPrice * impactMultiplier;

        // Update price in database
        await supabase
          .from('latest_prices')
          .update({
            price_usd: newPrice,
            price_change_24h: (newPrice - currentPrice),
            price_change_percentage_24h: event.price_impact_percentage,
            updated_at: new Date().toISOString()
          })
          .eq('symbol', symbol);

        console.log(`📊 Applied ${event.price_impact_percentage.toFixed(2)}% impact to ${symbol}: $${currentPrice.toFixed(2)} → $${newPrice.toFixed(2)}`);
      }

      // Update portfolio values after price changes
      await supabase.rpc('update_portfolio_values');

    } catch (error) {
      console.error('Error applying market impact:', error);
    }
  }

  /**
   * Notify users about the news event
   */
  private notifyUsers(event: NewsEvent): void {
    // Create browser notification for users who have affected assets
    if ('Notification' in window && Notification.permission === 'granted') {
      const severity = event.severity === 'critical' ? '🚨' : event.severity === 'high' ? '⚠️' : '📰';
      
      new Notification(`${severity} Market News`, {
        body: event.title,
        icon: '/favicon.ico',
        tag: `news-${event.id}`,
        requireInteraction: event.severity === 'critical'
      });
    }

    // Show toast notification
    const toastType = event.type === 'bullish' ? 'success' : 
                     event.type === 'bearish' ? 'error' : 'info';

    // Note: This will only show for the current user - in a real app you'd use websockets
    if (toastType === 'success') {
      toast.success('📈 Bullish News!', {
        description: event.title,
        duration: 5000
      });
    } else if (toastType === 'error') {
      toast.error('📉 Bearish News!', {
        description: event.title,
        duration: 5000
      });
    } else {
      toast.info('📰 Market News', {
        description: event.title,
        duration: 4000
      });
    }
  }

  /**
   * Schedule news event expiration
   */
  private scheduleEventExpiration(event: NewsEvent): void {
    setTimeout(async () => {
      try {
        await supabase
          .from('news_events')
          .update({ is_active: false })
          .eq('id', event.id);

        console.log(`⏰ News event expired: ${event.title}`);
      } catch (error) {
        console.error('Error expiring news event:', error);
      }
    }, event.duration_minutes * 60 * 1000);
  }

  /**
   * Get recent news events
   */
  async getRecentNews(limit = 20): Promise<NewsEvent[]> {
    try {
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching recent news:', error);
      return [];
    }
  }

  /**
   * Get active news events
   */
  async getActiveNews(): Promise<NewsEvent[]> {
    try {
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching active news:', error);
      return [];
    }
  }

  /**
   * Manually trigger a news event (for testing)
   */
  async triggerManualEvent(type: NewsEvent['type'], asset: string): Promise<NewsEvent | null> {
    try {
      const templates = NEWS_TEMPLATES.filter(t => t.type === type);
      if (templates.length === 0) {
        throw new Error(`No templates found for type: ${type}`);
      }

      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Get asset info
      const { data: assetData } = await supabase
        .from('latest_prices')
        .select('name')
        .eq('symbol', asset)
        .single();

      const assetName = assetData?.name || asset.toUpperCase();
      
      const priceImpact = this.getRandomInRange(template.price_impact_range[0], template.price_impact_range[1]);
      const duration = this.getRandomInRange(template.duration_range[0], template.duration_range[1]);

      const newsEvent: Omit<NewsEvent, 'id' | 'created_at' | 'expires_at'> = {
        title: template.title.replace(/\{\{ASSET\}\}/g, assetName),
        content: template.content.replace(/\{\{ASSET\}\}/g, assetName),
        type: template.type,
        severity: template.severity,
        affected_assets: [asset],
        price_impact_percentage: priceImpact,
        duration_minutes: duration,
        is_active: true
      };

      const createdEvent = await this.createNewsEvent(newsEvent);
      
      if (createdEvent) {
        await this.applyMarketImpact(createdEvent);
        this.notifyUsers(createdEvent);
        this.scheduleEventExpiration(createdEvent);
      }

      return createdEvent;
    } catch (error) {
      console.error('Error triggering manual event:', error);
      return null;
    }
  }

  /**
   * Get random number in range
   */
  private getRandomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}

export const newsService = new NewsService();
export default newsService;
