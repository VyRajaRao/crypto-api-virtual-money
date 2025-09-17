import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Star,
  Plus,
  Check,
  ChevronDown,
  Coins
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { priceService } from '@/services/priceService';
import { coinGeckoApi } from '@/services/coinGeckoApi';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  market_cap_rank?: number;
}

interface CryptoSelectorProps {
  onAssetSelect: (asset: CryptoAsset) => void;
  selectedAsset?: CryptoAsset;
  placeholder?: string;
  className?: string;
  showPrice?: boolean;
  showTrending?: boolean;
  mode?: 'popover' | 'dialog';
  disabled?: boolean;
}

const CryptoSelector: React.FC<CryptoSelectorProps> = ({
  onAssetSelect,
  selectedAsset,
  placeholder = "Search cryptocurrencies...",
  className = "",
  showPrice = true,
  showTrending = false,
  mode = 'popover',
  disabled = false
}) => {
  const { prices } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<CryptoAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularAssets, setPopularAssets] = useState<CryptoAsset[]>([]);

  // Get popular assets from API
  useEffect(() => {
    const loadPopularAssets = async () => {
      try {
        const topCoins = await coinGeckoApi.getTopCoins(50);
        const popular = topCoins.map(coin => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.image,
          current_price: coin.current_price,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          market_cap: coin.market_cap,
          market_cap_rank: coin.market_cap_rank
        }));
        setPopularAssets(popular);
      } catch (error) {
        console.error('Failed to load popular assets:', error);
        // Fallback to prices store if API fails
        const popular = Object.values(prices)
          .map(price => ({
            id: price.coingecko_id,
            symbol: price.symbol,
            name: price.name,
            image: price.image,
            current_price: price.price_usd,
            price_change_percentage_24h: price.price_change_percentage_24h,
            market_cap: price.market_cap
          }))
          .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
          .slice(0, 20);
        setPopularAssets(popular);
      }
    };

    loadPopularAssets();
  }, [prices]);

  // Search for cryptocurrencies
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchAssets = async () => {
      setIsSearching(true);
      try {
        const results = await coinGeckoApi.searchCoinsWithPrices(debouncedQuery);
        const formattedResults = results.coins.slice(0, 20).map(coin => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.thumb,
          current_price: coin.current_price,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          market_cap_rank: coin.market_cap_rank
        }));
        setSearchResults(formattedResults);
      } catch (error) {
        console.error('Search failed:', error);
        toast.error('Failed to search cryptocurrencies');
      } finally {
        setIsSearching(false);
      }
    };

    searchAssets();
  }, [debouncedQuery]);

  // Get trending assets (highest price change)
  const trendingAssets = useMemo(() => {
    return popularAssets
      .filter(asset => asset.price_change_percentage_24h !== undefined)
      .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
      .slice(0, 10);
  }, [popularAssets]);

  const handleAssetSelect = (asset: CryptoAsset) => {
    onAssetSelect(asset);
    setIsOpen(false);
    setSearchQuery('');
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString()}`;
  };

  const formatPriceChange = (change: number | undefined) => {
    if (change === undefined) return null;
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  const AssetItem = ({ asset, onSelect }: { asset: CryptoAsset; onSelect: () => void }) => (
    <div
      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        {asset.image && (
          <img 
            src={asset.image} 
            alt={asset.name} 
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div>
          <div className="font-medium text-sm">{asset.name}</div>
          <div className="text-xs text-muted-foreground">{asset.symbol.toUpperCase()}</div>
        </div>
      </div>
      
      {showPrice && (
        <div className="text-right">
          <div className="text-sm font-mono">{formatPrice(asset.current_price)}</div>
          {formatPriceChange(asset.price_change_percentage_24h)}
        </div>
      )}
    </div>
  );

  const SearchContent = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[400px]">
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Searching...</div>
          </div>
        ) : searchQuery.length >= 2 ? (
          <div className="space-y-2">
            {searchResults.length > 0 ? (
              <>
                <div className="text-sm font-medium text-muted-foreground px-3">
                  Search Results ({searchResults.length})
                </div>
                {searchResults.map((asset) => (
                  <AssetItem
                    key={asset.id}
                    asset={asset}
                    onSelect={() => handleAssetSelect(asset)}
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">No cryptocurrencies found</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Try searching for Bitcoin, Ethereum, or other popular coins
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Popular Assets */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground px-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Popular Cryptocurrencies
              </div>
              {popularAssets.slice(0, 10).map((asset) => (
                <AssetItem
                  key={asset.id}
                  asset={asset}
                  onSelect={() => handleAssetSelect(asset)}
                />
              ))}
            </div>

            {/* Trending Assets */}
            {showTrending && trendingAssets.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground px-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trending (24h)
                </div>
                {trendingAssets.slice(0, 5).map((asset) => (
                  <AssetItem
                    key={`trending-${asset.id}`}
                    asset={asset}
                    onSelect={() => handleAssetSelect(asset)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  if (mode === 'dialog') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className={`justify-start ${className}`} disabled={disabled}>
            {selectedAsset ? (
              <div className="flex items-center gap-2">
                {selectedAsset.image && (
                  <img src={selectedAsset.image} alt={selectedAsset.name} className="w-4 h-4 rounded-full" />
                )}
                <span>{selectedAsset.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {selectedAsset.symbol.toUpperCase()}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span>{placeholder}</span>
              </div>
            )}
            <ChevronDown className="ml-auto w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Cryptocurrency</DialogTitle>
          </DialogHeader>
          <SearchContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start ${className}`} disabled={disabled}>
          {selectedAsset ? (
            <div className="flex items-center gap-2 w-full">
              {selectedAsset.image && (
                <img src={selectedAsset.image} alt={selectedAsset.name} className="w-4 h-4 rounded-full" />
              )}
              <span className="flex-1 text-left truncate">{selectedAsset.name}</span>
              <Badge variant="outline">
                {selectedAsset.symbol.toUpperCase()}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <Coins className="w-4 h-4" />
              <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
            </div>
          )}
          <ChevronDown className="ml-2 w-4 h-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-4">
          <SearchContent />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CryptoSelector;
