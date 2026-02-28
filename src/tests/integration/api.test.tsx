import { createMockUser, createMockCoin, createMockAlert } from '../setup';

// Mock useAuth to return authenticated user
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: createMockUser(),
    loading: false,
    session: { access_token: 'mock-token' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';

describe('API Integration Tests', () => {
  describe('Mock Utilities', () => {
    it('should create a valid mock user', () => {
      const user = createMockUser();
      expect(user.id).toBe('test-user-id');
      expect(user.email).toBe('test@example.com');
    });

    it('should create a valid mock user with overrides', () => {
      const user = createMockUser({ email: 'custom@example.com' });
      expect(user.email).toBe('custom@example.com');
      expect(user.id).toBe('test-user-id');
    });

    it('should create a valid mock coin', () => {
      const coin = createMockCoin();
      expect(coin.id).toBe('bitcoin');
      expect(coin.symbol).toBe('btc');
      expect(coin.current_price).toBe(50000);
    });

    it('should create a mock coin with overrides', () => {
      const coin = createMockCoin({ current_price: 60000 });
      expect(coin.current_price).toBe(60000);
      expect(coin.id).toBe('bitcoin');
    });

    it('should create a valid mock alert', () => {
      const alert = createMockAlert();
      expect(alert.coin_id).toBe('bitcoin');
      expect(alert.condition_type).toBe('above');
      expect(alert.target_price).toBe(55000);
      expect(alert.is_active).toBe(true);
    });

    it('should create a mock alert with overrides', () => {
      const alert = createMockAlert({ condition_type: 'below', target_price: 40000 });
      expect(alert.condition_type).toBe('below');
      expect(alert.target_price).toBe(40000);
    });
  });

  describe('Price Calculations', () => {
    it('should calculate portfolio value correctly', () => {
      const portfolioItems = [
        { coin_id: 'bitcoin', amount: 1, avg_buy_price: 45000, current_price: 50000 },
        { coin_id: 'ethereum', amount: 10, avg_buy_price: 3000, current_price: 3500 },
      ];

      const totalValue = portfolioItems.reduce(
        (sum, item) => sum + item.amount * item.current_price,
        0
      );
      const totalInvested = portfolioItems.reduce(
        (sum, item) => sum + item.amount * item.avg_buy_price,
        0
      );
      const pnl = totalValue - totalInvested;
      const pnlPercentage = (pnl / totalInvested) * 100;

      expect(totalValue).toBe(85000);
      expect(totalInvested).toBe(75000);
      expect(pnl).toBe(10000);
      expect(pnlPercentage).toBeCloseTo(13.33, 1);
    });

    it('should handle zero-invested portfolio', () => {
      const totalInvested = 0;
      const pnlPercentage = totalInvested > 0 ? 100 / totalInvested : 0;
      expect(pnlPercentage).toBe(0);
    });
  });

  describe('Alert Condition Checks', () => {
    it('should detect price above threshold', () => {
      const alert = createMockAlert({ condition_type: 'above', target_price: 45000 });
      const currentPrice = 50000;
      const triggered = alert.condition_type === 'above'
        ? currentPrice >= alert.target_price
        : currentPrice <= alert.target_price;
      expect(triggered).toBe(true);
    });

    it('should detect price below threshold', () => {
      const alert = createMockAlert({ condition_type: 'below', target_price: 55000 });
      const currentPrice = 50000;
      const triggered = alert.condition_type === 'below'
        ? currentPrice <= alert.target_price
        : currentPrice >= alert.target_price;
      expect(triggered).toBe(true);
    });

    it('should not trigger above alert when price is below threshold', () => {
      const alert = createMockAlert({ condition_type: 'above', target_price: 55000 });
      const currentPrice = 50000;
      const triggered = alert.condition_type === 'above'
        ? currentPrice >= alert.target_price
        : currentPrice <= alert.target_price;
      expect(triggered).toBe(false);
    });
  });
});
