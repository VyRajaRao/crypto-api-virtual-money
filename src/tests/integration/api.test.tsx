import { renderHook, waitFor } from '@testing-library/react';
import { useCryptoData } from '@/hooks/useCryptoData';
import { useAdvancedAlerts } from '@/hooks/useAdvancedAlerts';
import { usePortfolioAnalytics } from '@/hooks/usePortfolioAnalyticsV2';
import { createMockUser, createMockCoin, createMockAlert, server } from '../setup';
import { rest } from 'msw';

// Mock useAuth to return authenticated user
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: createMockUser(),
    loading: false,
    session: { access_token: 'mock-token' }
  })
}));

describe('API Integration Tests', () => {
  describe('CoinGecko API Integration', () => {
    it('should fetch market data successfully', async () => {
      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.coins).toHaveLength(1);
      expect(result.current.coins[0]).toMatchObject({
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        current_price: 50000
      });
    });

    it('should handle API errors gracefully', async () => {
      // Override the server to return an error
      server.use(
        rest.get('https://api.coingecko.com/api/v3/coins/markets', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        })
      );

      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.coins).toEqual([]);
    });

    it('should fetch coin details', async () => {
      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const coinDetails = await result.current.getCoinDetails('bitcoin');
      expect(coinDetails).toMatchObject({
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        description: {
          en: expect.any(String)
        }
      });
    });

    it('should fetch historical data', async () => {
      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const historicalData = await result.current.getHistoricalData('bitcoin', 30);
      expect(historicalData).toMatchObject({
        prices: expect.any(Array),
        market_caps: expect.any(Array),
        total_volumes: expect.any(Array)
      });
      expect(historicalData.prices).toHaveLength(30);
    });
  });

  describe('Alerts System Integration', () => {
    it('should create and manage alerts', async () => {
      const { result } = renderHook(() => useAdvancedAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Create a new alert
      const newAlert = {
        coin_id: 'bitcoin',
        coin_name: 'Bitcoin',
        condition_type: 'above' as const,
        target_price: 55000,
        message: 'Bitcoin reached target price'
      };

      const success = await result.current.createAlert(newAlert);
      expect(success).toBe(true);
    });

    it('should update alert status', async () => {
      const { result } = renderHook(() => useAdvancedAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.updateAlert('test-alert-id', {
        is_active: false
      });
      expect(success).toBe(true);
    });

    it('should perform bulk operations', async () => {
      const { result } = renderHook(() => useAdvancedAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const alertIds = ['alert-1', 'alert-2', 'alert-3'];
      const success = await result.current.bulkUpdateAlerts(alertIds, {
        is_active: false
      });
      expect(success).toBe(true);
    });

    it('should export alerts data', async () => {
      const { result } = renderHook(() => useAdvancedAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const csvData = await result.current.exportAlerts('csv');
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('Coin,Condition,Target Price,Status');
    });
  });

  describe('Portfolio Analytics Integration', () => {
    it('should calculate portfolio metrics', async () => {
      const mockPortfolioItems = [
        { coin_id: 'bitcoin', amount: 1, purchase_price: 45000 },
        { coin_id: 'ethereum', amount: 10, purchase_price: 3000 }
      ];

      const { result } = renderHook(() => usePortfolioAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load portfolio items
      result.current.setPortfolioItems(mockPortfolioItems);

      await waitFor(() => {
        expect(result.current.analytics.totalValue).toBeGreaterThan(0);
      });

      expect(result.current.analytics).toMatchObject({
        totalValue: expect.any(Number),
        totalPnL: expect.any(Number),
        totalPnLPercentage: expect.any(Number),
        dayChange: expect.any(Number),
        dayChangePercentage: expect.any(Number)
      });
    });

    it('should handle drag and drop reordering', async () => {
      const { result } = renderHook(() => usePortfolioAnalytics());

      const mockItems = [
        { id: '1', coin_id: 'bitcoin', amount: 1, purchase_price: 45000 },
        { id: '2', coin_id: 'ethereum', amount: 10, purchase_price: 3000 }
      ];

      result.current.setPortfolioItems(mockItems);

      // Test reordering
      const reorderedItems = result.current.reorderItems(0, 1);
      expect(reorderedItems[0].coin_id).toBe('ethereum');
      expect(reorderedItems[1].coin_id).toBe('bitcoin');
    });

    it('should generate performance chart data', async () => {
      const { result } = renderHook(() => usePortfolioAnalytics());

      const mockItems = [
        { coin_id: 'bitcoin', amount: 1, purchase_price: 45000 }
      ];

      result.current.setPortfolioItems(mockItems);

      await waitFor(() => {
        expect(result.current.performanceData).toHaveLength(30);
      });

      const performanceData = result.current.performanceData;
      expect(performanceData[0]).toMatchObject({
        date: expect.any(String),
        value: expect.any(Number),
        pnl: expect.any(Number),
        pnlPercentage: expect.any(Number)
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      // Simulate network failure
      server.use(
        rest.get('*', (req, res, ctx) => {
          return res.networkError('Network connection failed');
        })
      );

      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.coins).toEqual([]);
    });

    it('should retry failed requests', async () => {
      let callCount = 0;
      server.use(
        rest.get('https://api.coingecko.com/api/v3/coins/markets', (req, res, ctx) => {
          callCount++;
          if (callCount < 3) {
            return res(ctx.status(500));
          }
          return res(ctx.json([createMockCoin()]));
        })
      );

      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 10000 });

      expect(callCount).toBe(3);
      expect(result.current.coins).toHaveLength(1);
    });

    it('should handle rate limiting', async () => {
      server.use(
        rest.get('https://api.coingecko.com/api/v3/coins/markets', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({ error: 'Rate limit exceeded' })
          );
        })
      );

      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('rate limit');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across hooks', async () => {
      const cryptoHook = renderHook(() => useCryptoData());
      const alertsHook = renderHook(() => useAdvancedAlerts());

      await waitFor(() => {
        expect(cryptoHook.result.current.loading).toBe(false);
        expect(alertsHook.result.current.loading).toBe(false);
      });

      // Both hooks should have consistent coin data
      const bitcoinFromCrypto = cryptoHook.result.current.coins.find(c => c.id === 'bitcoin');
      const bitcoinFromAlerts = alertsHook.result.current.coinPrices.bitcoin;

      expect(bitcoinFromCrypto?.current_price).toBe(bitcoinFromAlerts);
    });

    it('should update related data when alerts are triggered', async () => {
      const { result } = renderHook(() => useAdvancedAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock an alert being triggered
      const triggeredAlert = createMockAlert({
        target_price: 45000, // Below current price
        condition_type: 'below'
      });

      // Check if alert gets triggered
      const isTriggered = result.current.checkAlertCondition(
        triggeredAlert,
        50000 // current price
      );

      expect(isTriggered).toBe(false); // 50000 is not below 45000
    });
  });

  describe('Performance and Caching', () => {
    it('should cache API responses', async () => {
      let callCount = 0;
      server.use(
        rest.get('https://api.coingecko.com/api/v3/coins/markets', (req, res, ctx) => {
          callCount++;
          return res(ctx.json([createMockCoin()]));
        })
      );

      const { result: result1 } = renderHook(() => useCryptoData());
      const { result: result2 } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      // Should only call API once due to caching
      expect(callCount).toBe(1);
      expect(result1.current.coins).toEqual(result2.current.coins);
    });

    it('should invalidate cache after TTL', async () => {
      jest.useFakeTimers();
      
      let callCount = 0;
      server.use(
        rest.get('https://api.coingecko.com/api/v3/coins/markets', (req, res, ctx) => {
          callCount++;
          return res(ctx.json([createMockCoin()]));
        })
      );

      const { result } = renderHook(() => useCryptoData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(callCount).toBe(1);

      // Fast forward time to expire cache
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      // Force refresh
      await result.current.refreshData();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(callCount).toBe(2);

      jest.useRealTimers();
    });
  });
});
