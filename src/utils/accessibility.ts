// Accessibility utility functions and constants

export const ARIA_LABELS = {
  // Navigation
  mainNavigation: 'Main navigation',
  sidebarToggle: 'Toggle sidebar',
  breadcrumb: 'Breadcrumb navigation',
  
  // Data tables
  sortable: 'Sortable column',
  ascending: 'Sorted ascending',
  descending: 'Sorted descending',
  
  // Forms
  required: 'Required field',
  invalid: 'Invalid input',
  searchInput: 'Search cryptocurrencies',
  
  // Charts
  priceChart: 'Price chart showing historical data',
  portfolioChart: 'Portfolio allocation pie chart',
  
  // Actions
  edit: 'Edit item',
  delete: 'Delete item',
  save: 'Save changes',
  cancel: 'Cancel action',
  
  // Status indicators
  loading: 'Loading content',
  error: 'Error message',
  success: 'Success message',
  warning: 'Warning message',
  
  // Market data
  priceUp: 'Price increased',
  priceDown: 'Price decreased',
  marketCap: 'Market capitalization',
  volume: 'Trading volume'
};

export const SCREEN_READER_ONLY_CLASS = 'sr-only';

/**
 * Generate accessible price change text for screen readers
 */
export const getPriceChangeA11yText = (
  price: number,
  priceChange: number,
  priceChangePercentage: number,
  coinName: string
): string => {
  const direction = priceChangePercentage >= 0 ? 'increased' : 'decreased';
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
  
  const formattedChange = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Math.abs(priceChange));
  
  const formattedPercentage = Math.abs(priceChangePercentage).toFixed(2);
  
  return `${coinName} price: ${formattedPrice}. ${direction} by ${formattedChange} or ${formattedPercentage} percent in the last 24 hours.`;
};

/**
 * Generate accessible portfolio performance text
 */
export const getPortfolioA11yText = (
  totalValue: number,
  totalProfit: number,
  totalProfitPercentage: number
): string => {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(totalValue);
  
  const formattedProfit = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Math.abs(totalProfit));
  
  const performance = totalProfit >= 0 ? 'gained' : 'lost';
  const formattedPercentage = Math.abs(totalProfitPercentage).toFixed(2);
  
  return `Portfolio total value: ${formattedValue}. You have ${performance} ${formattedProfit} or ${formattedPercentage} percent overall.`;
};

/**
 * Focus trap utility for modals and dialogs
 */
export class FocusTrap {
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private originalFocus: HTMLElement | null = null;

  constructor(private container: HTMLElement) {
    this.updateFocusableElements();
  }

  private updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
    
    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  public activate() {
    this.originalFocus = document.activeElement as HTMLElement;
    
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }
    
    document.addEventListener('keydown', this.handleKeyDown);
  }

  public deactivate() {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    if (this.originalFocus) {
      this.originalFocus.focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab - move backwards
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab - move forwards
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };
}

/**
 * Keyboard navigation helper
 */
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  onEnter?: () => void,
  onSpace?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void
) => {
  switch (event.key) {
    case 'Enter':
      if (onEnter) {
        event.preventDefault();
        onEnter();
      }
      break;
    case ' ':
      if (onSpace) {
        event.preventDefault();
        onSpace();
      }
      break;
    case 'Escape':
      if (onEscape) {
        event.preventDefault();
        onEscape();
      }
      break;
    case 'ArrowUp':
      if (onArrowUp) {
        event.preventDefault();
        onArrowUp();
      }
      break;
    case 'ArrowDown':
      if (onArrowDown) {
        event.preventDefault();
        onArrowDown();
      }
      break;
  }
};

/**
 * Responsive breakpoints
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

/**
 * Check if current screen size matches breakpoint
 */
export const useBreakpoint = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS[breakpoint];
};

/**
 * Announce content changes to screen readers
 */
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Color contrast utilities
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Simplified luminance calculation for demo
    // In production, use a proper color library
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if color combination meets WCAG contrast requirements
 */
export const meetsContrastRequirements = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  } else {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }
};

/**
 * Reduce motion preference detection
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * High contrast mode detection
 */
export const prefersHighContrast = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
};
