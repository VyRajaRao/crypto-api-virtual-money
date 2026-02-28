import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder (not available in jsdom by default)
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'mock-supabase-anon-key';
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
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock crypto
Object.defineProperty(global as any, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
      return arr;
    }),
    subtle: {
      // importKey: store the raw password bytes in the returned key handle
      importKey: jest.fn(async (_format: string, data: BufferSource) => {
        const src = data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(
              (data as ArrayBufferView).buffer,
              (data as ArrayBufferView).byteOffset,
              (data as ArrayBufferView).byteLength
            );
        return { _keyBytes: Array.from(src) };
      }),
      // deriveBits: combine password bytes + salt deterministically so that
      // different passwords always produce different hashes
      deriveBits: jest.fn(async (params: any, keyMaterial: any, bits: number) => {
        const out = new Uint8Array(bits / 8);
        const saltSrc: BufferSource = params.salt;
        const saltBytes = saltSrc instanceof ArrayBuffer
          ? new Uint8Array(saltSrc)
          : new Uint8Array(
              (saltSrc as ArrayBufferView).buffer,
              (saltSrc as ArrayBufferView).byteOffset ?? 0,
              (saltSrc as ArrayBufferView).byteLength
            );
        const keyBytes: number[] = keyMaterial._keyBytes ?? [];
        // Mix password bytes — position-weighted so order matters
        keyBytes.forEach((b, i) => {
          out[i % out.length] = (out[i % out.length] + b * (i + 1)) % 256;
        });
        // XOR with salt to make each salt produce a unique result
        saltBytes.forEach((b, i) => {
          out[(i + 8) % out.length] ^= b;
        });
        return out.buffer;
      }),
    },
  },
  configurable: true,
  writable: true,
});

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve([]),
    text: () => Promise.resolve(''),
    headers: new Map(),
  } as unknown as Response)
);

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseEnabled: false, // tests run without real credentials → demo mode
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      updateUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: {}, error: null })),
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
      then: jest.fn((callback: (r: { data: unknown[]; error: null }) => void) =>
        Promise.resolve({ data: [], error: null }).then(callback)
      ),
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

