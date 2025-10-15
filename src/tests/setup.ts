import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { setupServer } from 'msw/node';
import * as msw from 'msw';
const { rest } = msw as any;

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-supabase-anon-key';
process.env.NEXT_PUBLIC_COINGECKO_API_KEY = 'mock-coingecko-api-key';

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock crypto
Object.defineProperty(global as any, 'crypto', {
  value: {
    getRandomValues: jest.fn(() => new Uint8Array(32)),
  },
});

// Mock server for API calls
export const server = setupServer(
  // CoinGecko API mocks
  rest.get('https://api.coingecko.com/api/v3/coins/markets', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
          current_price: 50000,
          market_cap: 1000000000,
          market_cap_rank: 1,
          fully_diluted_valuation: 1050000000,
          total_volume: 30000000,
          high_24h: 52000,
          low_24h: 49000,
          price_change_24h: 1000,
          price_change_percentage_24h: 2.0,
          market_cap_change_24h: 20000000,
          market_cap_change_percentage_24h: 2.0,
          circulating_supply: 19000000,
          total_supply: 21000000,
          max_supply: 21000000,
          ath: 69000,
          ath_change_percentage: -27.5,
          ath_date: '2021-11-10T14:24:11.849Z',
          atl: 67.81,
          atl_change_percentage: 73605.4,
          atl_date: '2013-07-06T00:00:00.000Z',
          roi: null,
          last_updated: '2024-01-01T12:00:00.000Z'
        }
      ])
    );
  }),

  rest.get('https://api.coingecko.com/api/v3/coins/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        symbol: 'btc',
        name: 'Bitcoin',
        description: {
          en: 'Bitcoin is a cryptocurrency and worldwide payment system.'
        },
        links: {
          homepage: ['https://bitcoin.org/']
        },
        image: {
          thumb: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
          small: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
          large: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
        },
        market_data: {
          current_price: {
            usd: 50000
          },
          market_cap: {
            usd: 1000000000
          },
          total_volume: {
            usd: 30000000
          }
        }
      })
    );
  }),

  rest.get('https://api.coingecko.com/api/v3/coins/:id/market_chart', (req, res, ctx) => {
    const mockData = {
      prices: Array.from({ length: 30 }, (_, i) => [
        Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        50000 + Math.random() * 10000
      ]),
      market_caps: Array.from({ length: 30 }, (_, i) => [
        Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        1000000000 + Math.random() * 100000000
      ]),
      total_volumes: Array.from({ length: 30 }, (_, i) => [
        Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        30000000 + Math.random() * 5000000
      ])
    };
    return res(ctx.json(mockData));
  })
);

// Setup server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Next.js router if available
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require.resolve('next/router');
  jest.mock('next/router', () => ({
    useRouter() {
      return {
        route: '/',
        pathname: '/',
        query: {},
        asPath: '/',
        push: jest.fn(() => Promise.resolve(true)),
        replace: jest.fn(() => Promise.resolve(true)),
        reload: jest.fn(() => Promise.resolve(true)),
        back: jest.fn(() => Promise.resolve(true)),
        prefetch: jest.fn(() => Promise.resolve()),
        beforePopState: jest.fn(() => Promise.resolve()),
        events: {
          on: jest.fn(),
          off: jest.fn(),
          emit: jest.fn(),
        },
      };
    },
  }));
} catch (e) {
  // next/router not installed in this project; skip mocking
}

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((callback: any) => callback({ data: [], error: null })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
        download: jest.fn(() => Promise.resolve({ data: null, error: null })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
      })),
    },
  },
}));

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const createMockCoin = (overrides = {}) => ({
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  current_price: 50000,
  market_cap: 1000000000,
  market_cap_rank: 1,
  price_change_percentage_24h: 2.0,
  ...overrides,
});

export const createMockAlert = (overrides = {}) => ({
  id: 'test-alert-id',
  user_id: 'test-user-id',
  coin_id: 'bitcoin',
  coin_name: 'Bitcoin',
  condition_type: 'above',
  target_price: 55000,
  current_price: 50000,
  is_active: true,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
  id: 'test-order-id',
  user_id: 'test-user-id',
  coin_id: 'bitcoin',
  coin_symbol: 'BTC',
  type: 'buy',
  order_type: 'market',
  amount: 1,
  price: 50000,
  total: 50000,
  status: 'pending',
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// Mock local storage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(global as any).localStorage = localStorageMock as any;

// Mock session storage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(global as any).sessionStorage = sessionStorageMock as any;

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
