import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { coinGeckoApi } from "@/services/coinGeckoApi";
import { ARIA_LABELS, handleKeyboardNavigation, announceToScreenReader, prefersReducedMotion } from "../utils/accessibility";

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number;
  current_price?: number;
}

interface SearchBarProps {
  onCoinSelect?: (coin: SearchResult) => void;
}

export function SearchBar({ onCoinSelect }: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  useEffect(() => {
    const searchCoins = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await coinGeckoApi.searchCoins(query);
        // Don't fetch price data for search results to improve speed
        const simpleResults = response.coins.slice(0, 6).map(coin => ({
          ...coin,
          current_price: undefined // Skip price data for faster search
        }));
        
        setResults(simpleResults);
        setIsOpen(true);
        
        // Announce search results to screen readers
        announceToScreenReader(`${simpleResults.length} search results found for ${query}`);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        announceToScreenReader("Search failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCoins, 800); // Longer debounce to reduce API calls
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleCoinSelect = (coin: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Announce selection to screen readers
    announceToScreenReader(`Selected ${coin.name}`);
    
    // If onCoinSelect callback is provided, use it (for internal component use)
    if (onCoinSelect) {
      onCoinSelect(coin);
    } else {
      // Otherwise, navigate to coin detail page (default behavior)
      navigate(`/coins/${coin.id}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      handleKeyboardNavigation(event, undefined, undefined, () => {
        setIsOpen(false);
        setSelectedIndex(-1);
      });
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleCoinSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search cryptocurrencies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 focus:ring-accessible min-h-[44px]"
          aria-label={ARIA_LABELS.searchInput}
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
          autoComplete="off"
          role="searchbox"
        />
        {isLoading && (
          <div 
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
            aria-label={ARIA_LABELS.loading}
            role="status"
          >
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="sr-only">{ARIA_LABELS.loading}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            {...(reducedMotion ? 
              { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } } :
              { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.2 } }
            )}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-xl">
              <ul 
                className="p-2" 
                role="listbox" 
                aria-label="Search results"
              >
                {results.map((coin, index) => (
                  <li key={coin.id} role="option" aria-selected={selectedIndex === index}>
                    <motion.button
                      id={`search-result-${index}`}
                      {...(reducedMotion ? 
                        { initial: {}, animate: {}, transition: { duration: 0 } } :
                        { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.2, delay: index * 0.05 } }
                      )}
                      onClick={() => handleCoinSelect(coin)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg transition-colors duration-200 text-left focus:ring-accessible
                        ${
                          selectedIndex === index 
                            ? 'bg-primary/10 border-primary/20 border' 
                            : 'hover:bg-secondary/50'
                        }
                      `}
                      aria-label={`Select ${coin.name} (${coin.symbol}) - Rank ${coin.market_cap_rank || 'N/A'}${coin.current_price ? `, Price $${coin.current_price.toLocaleString()}` : ''}`}
                    >
                      <img
                        src={coin.thumb}
                        alt={`${coin.name} logo`}
                        className="w-8 h-8 rounded-full"
                        loading="lazy"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {coin.name}
                          </span>
                          <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground uppercase">
                            {coin.symbol}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="w-3 h-3" aria-hidden="true" />
                            <span>Rank #{coin.market_cap_rank || "N/A"}</span>
                          </div>
                          {coin.current_price && (
                            <div className="flex items-center gap-1 text-primary font-medium">
                              <DollarSign className="w-3 h-3" aria-hidden="true" />
                              <span>${coin.current_price.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}