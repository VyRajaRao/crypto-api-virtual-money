import axios from 'axios';
import { toast } from 'sonner';

export interface CoinAPINews {
  id: string;
  title: string;
  body: string;
  created_at: string;
  domain_name: string;
  source: string;
  url: string;
  tags: string[];
  related_assets?: {
    asset_id: string;
    asset_name: string;
    asset_symbol: string;
  }[];
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
  source: string;
  url: string;
  tags: string[];
  related_symbols: string[];
}

class CoinAPINewsService {
  private apiKey: string;
  private baseUrl = 'https://rest.coinapi.io/v1';
  private newsUpdateInterval: NodeJS.Timeout | null = null;
  private lastFetchTime: number = 0;
  private cachedNews: NewsItem[] = [];
  
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_COINAPI_KEY || import.meta.env.VITE_COINAPI_KEY || '6fece79b-d027-454a-9c87-182c3b2fe683';
  }

  /**
   * Fetch latest crypto news from CoinAPI
   */
  async fetchLatestNews(limit: number = 50): Promise<NewsItem[]> {
    try {
      console.log('🗞️ Fetching latest crypto news from CoinAPI...');

      const response = await axios.get(`${this.baseUrl}/news/latest`, {
        headers: {
          'X-CoinAPI-Key': this.apiKey,
        },
        params: {
          limit,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.status === 200 && response.data) {
        const transformedNews = this.transformNewsData(response.data);
        this.cachedNews = transformedNews;
        this.lastFetchTime = Date.now();
        
        console.log(`✅ Successfully fetched ${transformedNews.length} news articles`);
        return transformedNews;
      }

      throw new Error(`CoinAPI returned status ${response.status}`);

    } catch (error: any) {
      console.error('Error fetching news from CoinAPI:', error);
      
      // If we have cached news and it's less than 10 minutes old, return it
      if (this.cachedNews.length > 0 && Date.now() - this.lastFetchTime < 10 * 60 * 1000) {
        console.log('📰 Returning cached news due to API error');
        return this.cachedNews;
      }

      // Fallback to simulated news if API fails
      return this.generateFallbackNews();
    }
  }

  /**
   * Fetch news filtered by specific crypto assets
   */
  async fetchNewsByAssets(symbols: string[], limit: number = 20): Promise<NewsItem[]> {
    try {
      // First get all news, then filter
      const allNews = await this.fetchLatestNews(100);
      
      if (symbols.length === 0) {
        return allNews.slice(0, limit);
      }

      // Filter news by symbols (case insensitive)
      const symbolsLower = symbols.map(s => s.toLowerCase());
      const filteredNews = allNews.filter(article => {
        // Check if any of the target symbols appear in the article
        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        const tagsLower = article.tags.map(tag => tag.toLowerCase());
        const relatedSymbolsLower = article.related_symbols.map(s => s.toLowerCase());
        
        return symbolsLower.some(symbol => 
          titleLower.includes(symbol) ||
          contentLower.includes(symbol) ||
          tagsLower.includes(symbol) ||
          relatedSymbolsLower.includes(symbol) ||
          titleLower.includes(this.getFullCoinName(symbol).toLowerCase()) ||
          contentLower.includes(this.getFullCoinName(symbol).toLowerCase())
        );
      });

      return filteredNews.slice(0, limit);

    } catch (error) {
      console.error('Error fetching filtered news:', error);
      return [];
    }
  }

  /**
   * Transform CoinAPI news data to our internal format
   */
  private transformNewsData(apiNews: CoinAPINews[]): NewsItem[] {
    return apiNews.map(article => ({
      id: article.id || `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: article.title || 'Untitled',
      content: article.body || 'No content available',
      published_at: article.created_at || new Date().toISOString(),
      source: article.domain_name || article.source || 'Unknown',
      url: article.url || '#',
      tags: article.tags || [],
      related_symbols: article.related_assets?.map(asset => asset.asset_symbol.toLowerCase()) || []
    }));
  }

  /**
   * Generate fallback news when API is unavailable
   */
  private generateFallbackNews(): NewsItem[] {
    const fallbackArticles = [
      {
        title: "Bitcoin Shows Strong Momentum Above $43,000",
        content: "Bitcoin continues to maintain its position above the $43,000 level, with technical analysts pointing to strong buying pressure and institutional interest.",
        source: "Crypto News",
        symbols: ['btc', 'bitcoin']
      },
      {
        title: "Ethereum Network Upgrades Drive Developer Activity",
        content: "The Ethereum ecosystem sees increased developer activity following recent network improvements, with new DeFi protocols launching weekly.",
        source: "DeFi Times", 
        symbols: ['eth', 'ethereum']
      },
      {
        title: "Solana Ecosystem Grows with New Project Launches",
        content: "Solana's ecosystem continues to expand with several high-profile project launches, attracting both developers and investors.",
        source: "Blockchain Daily",
        symbols: ['sol', 'solana']
      },
      {
        title: "Regulatory Clarity Drives Institutional Crypto Adoption",
        content: "Clearer regulatory frameworks are encouraging more institutional investors to enter the cryptocurrency market, boosting overall market confidence.",
        source: "Financial Times",
        symbols: ['btc', 'eth', 'crypto']
      },
      {
        title: "DeFi TVL Reaches New Highs Across Multiple Chains",
        content: "Total Value Locked (TVL) in DeFi protocols reaches new all-time highs, with multi-chain ecosystems leading the growth.",
        source: "DeFi Pulse",
        symbols: ['eth', 'sol', 'ada', 'avax']
      }
    ];

    return fallbackArticles.map((article, index) => ({
      id: `fallback-${Date.now()}-${index}`,
      title: article.title,
      content: article.content,
      published_at: new Date(Date.now() - index * 3600000).toISOString(), // Spread over last few hours
      source: article.source,
      url: '#',
      tags: ['cryptocurrency', 'blockchain'],
      related_symbols: article.symbols
    }));
  }

  /**
   * Get full coin name from symbol
   */
  private getFullCoinName(symbol: string): string {
    const coinNames: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum', 
      'sol': 'solana',
      'ada': 'cardano',
      'dot': 'polkadot',
      'matic': 'polygon',
      'avax': 'avalanche',
      'link': 'chainlink',
      'atom': 'cosmos',
      'algo': 'algorand'
    };
    return coinNames[symbol.toLowerCase()] || symbol;
  }

  /**
   * Start auto-refresh of news data
   */
  startNewsUpdates(intervalMinutes: number = 1): void {
    if (this.newsUpdateInterval) {
      clearInterval(this.newsUpdateInterval);
    }

    console.log(`📰 Starting news updates every ${intervalMinutes} minute(s)`);

    // Initial fetch
    this.fetchLatestNews().catch(console.error);

    // Set up recurring updates  
    this.newsUpdateInterval = setInterval(async () => {
      try {
        await this.fetchLatestNews();
      } catch (error) {
        console.error('Scheduled news update failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop auto-refresh of news data
   */
  stopNewsUpdates(): void {
    if (this.newsUpdateInterval) {
      clearInterval(this.newsUpdateInterval);
      this.newsUpdateInterval = null;
      console.log('🛑 Stopped news updates');
    }
  }

  /**
   * Get cached news (useful for immediate display)
   */
  getCachedNews(): NewsItem[] {
    return this.cachedNews;
  }

  /**
   * Check if cached news is fresh (less than 2 minutes old)
   */
  isCachedNewsFresh(): boolean {
    return Date.now() - this.lastFetchTime < 2 * 60 * 1000;
  }

  /**
   * Format news item for display
   */
  formatNewsItem(news: NewsItem) {
    return {
      ...news,
      timeAgo: this.getTimeAgo(news.published_at),
      shortContent: news.content.length > 200 ? news.content.substring(0, 200) + '...' : news.content,
      isRecent: Date.now() - new Date(news.published_at).getTime() < 24 * 60 * 60 * 1000 // Less than 24 hours old
    };
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
  }
}

export const coinApiNewsService = new CoinAPINewsService();
export default coinApiNewsService;
