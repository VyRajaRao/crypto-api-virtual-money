import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw, 
  Filter,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle
} from 'lucide-react';
import { coinApiNewsService, NewsItem } from '@/services/coinApiNewsService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsWidgetProps {
  selectedAssets?: string[];
  maxItems?: number;
  showControls?: boolean;
  className?: string;
  height?: string;
}

const NewsWidget: React.FC<NewsWidgetProps> = ({ 
  selectedAssets = [], 
  maxItems = 10, 
  showControls = true,
  className = '',
  height = '400px'
}) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'relevant'>('all');

  // Auto-refresh news every 60 seconds
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(async () => {
      await fetchNews(false); // Silent fetch
    }, 60 * 1000); // 60 seconds

    return () => clearInterval(interval);
  }, [selectedAssets, isAutoRefresh]);

  // Initial load
  useEffect(() => {
    fetchNews();
  }, [selectedAssets]);

  const fetchNews = async (showToast = false) => {
    try {
      setIsLoading(true);
      
      let fetchedNews: NewsItem[];
      
      if (selectedAssets.length > 0 && filterType === 'relevant') {
        fetchedNews = await coinApiNewsService.fetchNewsByAssets(selectedAssets, maxItems * 2);
      } else {
        fetchedNews = await coinApiNewsService.fetchLatestNews(maxItems * 2);
      }
      
      setNews(fetchedNews.slice(0, maxItems));
      setLastUpdated(new Date());
      
      if (showToast) {
        toast.success(`Updated with ${fetchedNews.length} news articles`);
      }
      
    } catch (error) {
      console.error('Failed to fetch news:', error);
      if (showToast) {
        toast.error('Failed to fetch latest news');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter news based on selected assets
  const filteredNews = useMemo(() => {
    if (filterType === 'all' || selectedAssets.length === 0) {
      return news;
    }

    const symbolsLower = selectedAssets.map(s => s.toLowerCase());
    return news.filter(article => {
      const titleLower = article.title.toLowerCase();
      const contentLower = article.content.toLowerCase();
      return symbolsLower.some(symbol => 
        titleLower.includes(symbol) || 
        contentLower.includes(symbol) ||
        article.related_symbols.includes(symbol)
      );
    });
  }, [news, selectedAssets, filterType]);

  const getSentimentBadge = (article: NewsItem) => {
    const title = article.title.toLowerCase();
    const content = article.content.toLowerCase();
    
    const bullishKeywords = ['surge', 'rise', 'bull', 'gain', 'up', 'high', 'positive', 'growth', 'increase', 'rally'];
    const bearishKeywords = ['crash', 'fall', 'bear', 'loss', 'down', 'low', 'negative', 'decline', 'drop', 'dump'];
    
    const bullishScore = bullishKeywords.reduce((score, word) => 
      score + (title.includes(word) ? 2 : 0) + (content.includes(word) ? 1 : 0), 0);
    const bearishScore = bearishKeywords.reduce((score, word) => 
      score + (title.includes(word) ? 2 : 0) + (content.includes(word) ? 1 : 0), 0);
    
    if (bullishScore > bearishScore && bullishScore > 2) {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Bullish</Badge>;
    } else if (bearishScore > bullishScore && bearishScore > 2) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Bearish</Badge>;
    }
    return <Badge variant="secondary">Neutral</Badge>;
  };

  const formatTimeAgo = (dateString: string) => {
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
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Live News Feed
            {selectedAssets.length > 0 && filterType === 'relevant' && (
              <Badge variant="outline" className="ml-2 text-xs">
                {selectedAssets.join(', ').toUpperCase()}
              </Badge>
            )}
          </CardTitle>
          
          {showControls && (
            <div className="flex items-center gap-1 sm:gap-2">
              {selectedAssets.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterType(filterType === 'all' ? 'relevant' : 'all')}
                  className="h-7 sm:h-8 text-xs"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">{filterType === 'all' ? 'Show Relevant' : 'Show All'}</span>
                  <span className="sm:hidden">{filterType === 'all' ? 'Relevant' : 'All'}</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`h-7 sm:h-8 text-xs ${isAutoRefresh ? 'bg-green-50 border-green-200' : ''}`}
              >
                <Clock className="w-3 h-3 mr-1" />
                {isAutoRefresh ? 'Auto' : 'Manual'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNews(true)}
                disabled={isLoading}
                className="h-7 sm:h-8 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''} sm:mr-1`} />
                <span className="hidden sm:inline ml-1">Refresh</span>
              </Button>
            </div>
          )}
        </div>
        
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {isAutoRefresh && ' • Auto-refresh: 60s'}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea style={{ height }} className="w-full">
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNews.length > 0 ? filteredNews.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-medium line-clamp-2 flex-1">
                      {article.title}
                    </h3>
                    {getSentimentBadge(article)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {article.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">
                        {article.source}
                      </span>
                      <span className="text-muted-foreground">
                        {formatTimeAgo(article.published_at)}
                      </span>
                    </div>
                    
                    {article.url !== '#' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {article.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge 
                          key={tagIndex} 
                          variant="outline" 
                          className="text-xs px-1 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              )) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? 'Loading news...' : 'No news articles available'}
                  </p>
                  {!isLoading && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchNews(true)}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NewsWidget;
