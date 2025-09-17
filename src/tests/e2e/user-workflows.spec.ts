import { test, expect, Page } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  displayName: 'Test User'
};

const mockCoin = {
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'BTC',
  price: 50000
};

class CryptoTrackerPage {
  constructor(private page: Page) {}

  // Navigation helpers
  async goto(path: string = '') {
    await this.page.goto(`http://localhost:3000${path}`);
  }

  async navigateTo(section: 'dashboard' | 'portfolio' | 'alerts' | 'trading') {
    await this.page.click(`[data-testid="nav-${section}"]`);
    await this.page.waitForURL(`**/${section}`);
  }

  // Authentication helpers
  async signUp(email: string, password: string) {
    await this.goto('/auth/signup');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signup-button"]');
  }

  async signIn(email: string, password: string) {
    await this.goto('/auth/signin');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signin-button"]');
    await this.page.waitForURL('**/dashboard');
  }

  async signOut() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="signout-button"]');
    await this.page.waitForURL('**/auth/signin');
  }

  // Dashboard helpers
  async waitForDashboardToLoad() {
    await this.page.waitForSelector('[data-testid="crypto-list"]');
    await this.page.waitForSelector('[data-testid="market-overview"]');
  }

  async searchForCoin(coinName: string) {
    await this.page.fill('[data-testid="coin-search"]', coinName);
    await this.page.waitForSelector(`[data-testid="coin-${coinName.toLowerCase()}"]`);
  }

  async selectCoin(coinId: string) {
    await this.page.click(`[data-testid="coin-${coinId}"]`);
    await this.page.waitForURL(`**/coins/${coinId}`);
  }

  // Portfolio helpers
  async addToPortfolio(coinId: string, amount: number, purchasePrice: number) {
    await this.navigateTo('portfolio');
    await this.page.click('[data-testid="add-asset-button"]');
    
    await this.page.selectOption('[data-testid="coin-select"]', coinId);
    await this.page.fill('[data-testid="amount-input"]', amount.toString());
    await this.page.fill('[data-testid="purchase-price-input"]', purchasePrice.toString());
    
    await this.page.click('[data-testid="save-asset-button"]');
    await this.page.waitForSelector(`[data-testid="portfolio-item-${coinId}"]`);
  }

  async removeFromPortfolio(coinId: string) {
    await this.page.click(`[data-testid="portfolio-item-${coinId}"] [data-testid="remove-button"]`);
    await this.page.click('[data-testid="confirm-remove"]');
    await this.page.waitForSelector(`[data-testid="portfolio-item-${coinId}"]`, { state: 'detached' });
  }

  async reorderPortfolioItems(fromIndex: number, toIndex: number) {
    const items = await this.page.locator('[data-testid^="portfolio-item-"]');
    const sourceItem = items.nth(fromIndex);
    const targetItem = items.nth(toIndex);
    
    await sourceItem.dragTo(targetItem);
  }

  // Alerts helpers
  async createAlert(coinId: string, condition: 'above' | 'below', targetPrice: number) {
    await this.navigateTo('alerts');
    await this.page.click('[data-testid="create-alert-button"]');
    
    await this.page.selectOption('[data-testid="coin-select"]', coinId);
    await this.page.selectOption('[data-testid="condition-select"]', condition);
    await this.page.fill('[data-testid="target-price-input"]', targetPrice.toString());
    
    await this.page.click('[data-testid="save-alert-button"]');
    await this.page.waitForSelector(`[data-testid="alert-${coinId}-${condition}-${targetPrice}"]`);
  }

  async toggleAlert(alertId: string) {
    await this.page.click(`[data-testid="alert-${alertId}"] [data-testid="toggle-alert"]`);
  }

  async deleteAlert(alertId: string) {
    await this.page.click(`[data-testid="alert-${alertId}"] [data-testid="delete-alert"]`);
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForSelector(`[data-testid="alert-${alertId}"]`, { state: 'detached' });
  }

  // Trading helpers
  async placeOrder(type: 'buy' | 'sell', orderType: 'market' | 'limit', coinId: string, amount: number, price?: number) {
    await this.navigateTo('trading');
    await this.page.selectOption('[data-testid="coin-select"]', coinId);
    
    await this.page.click(`[data-testid="${type}-tab"]`);
    await this.page.selectOption('[data-testid="order-type-select"]', orderType);
    await this.page.fill('[data-testid="amount-input"]', amount.toString());
    
    if (orderType === 'limit' && price) {
      await this.page.fill('[data-testid="price-input"]', price.toString());
    }
    
    await this.page.click('[data-testid="place-order-button"]');
    await this.page.click('[data-testid="confirm-order"]');
  }

  async cancelOrder(orderId: string) {
    await this.page.click(`[data-testid="order-${orderId}"] [data-testid="cancel-order"]`);
    await this.page.click('[data-testid="confirm-cancel"]');
  }

  // Security helpers
  async enableTwoFactor() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="security-settings"]');
    await this.page.click('[data-testid="enable-2fa-button"]');
    
    // Wait for QR code to appear
    await this.page.waitForSelector('[data-testid="qr-code"]');
    
    // Simulate entering verification code
    await this.page.fill('[data-testid="verification-code-input"]', '123456');
    await this.page.click('[data-testid="verify-2fa-button"]');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="security-settings"]');
    await this.page.click('[data-testid="change-password-button"]');
    
    await this.page.fill('[data-testid="current-password-input"]', currentPassword);
    await this.page.fill('[data-testid="new-password-input"]', newPassword);
    await this.page.fill('[data-testid="confirm-password-input"]', newPassword);
    
    await this.page.click('[data-testid="save-password-button"]');
  }

  // Utility helpers
  async waitForToast(message: string) {
    await this.page.waitForSelector(`[data-testid="toast"]:has-text("${message}")`);
  }

  async expectToastMessage(message: string) {
    await expect(this.page.locator(`[data-testid="toast"]`)).toContainText(message);
  }

  async expectUrl(pattern: string) {
    await expect(this.page).toHaveURL(new RegExp(pattern));
  }
}

test.describe('User Authentication Workflows', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
  });

  test('should allow user to sign up and sign in', async () => {
    // Sign up
    await app.signUp(testUser.email, testUser.password);
    await app.waitForToast('Account created successfully');

    // Sign out
    await app.signOut();
    await app.expectUrl('.*auth/signin');

    // Sign in
    await app.signIn(testUser.email, testUser.password);
    await app.expectUrl('.*dashboard');
  });

  test('should handle invalid credentials', async () => {
    await app.signIn('invalid@example.com', 'wrongpassword');
    await app.expectToastMessage('Invalid credentials');
  });

  test('should enable and use two-factor authentication', async () => {
    await app.signIn(testUser.email, testUser.password);
    await app.enableTwoFactor();
    await app.waitForToast('Two-factor authentication enabled');

    // Sign out and sign in again to test 2FA
    await app.signOut();
    await app.signIn(testUser.email, testUser.password);
    
    // Should be prompted for 2FA code
    await expect(app.page.locator('[data-testid="2fa-code-input"]')).toBeVisible();
  });
});

test.describe('Dashboard and Market Data Workflows', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
    await app.signIn(testUser.email, testUser.password);
  });

  test('should load and display market data', async () => {
    await app.waitForDashboardToLoad();
    
    // Check if crypto list is loaded
    await expect(app.page.locator('[data-testid="crypto-list"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="coin-bitcoin"]')).toBeVisible();
  });

  test('should search and filter cryptocurrencies', async () => {
    await app.searchForCoin('Bitcoin');
    await expect(app.page.locator('[data-testid="coin-bitcoin"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="coin-ethereum"]')).not.toBeVisible();
  });

  test('should navigate to coin details', async () => {
    await app.selectCoin('bitcoin');
    await expect(app.page.locator('[data-testid="coin-details"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="price-chart"]')).toBeVisible();
  });
});

test.describe('Portfolio Management Workflows', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
    await app.signIn(testUser.email, testUser.password);
  });

  test('should add and remove assets from portfolio', async () => {
    // Add asset
    await app.addToPortfolio('bitcoin', 1, 45000);
    await expect(app.page.locator('[data-testid="portfolio-item-bitcoin"]')).toBeVisible();

    // Verify portfolio metrics are calculated
    await expect(app.page.locator('[data-testid="total-value"]')).toContainText('$');
    await expect(app.page.locator('[data-testid="total-pnl"]')).toContainText('$');

    // Remove asset
    await app.removeFromPortfolio('bitcoin');
    await expect(app.page.locator('[data-testid="portfolio-item-bitcoin"]')).not.toBeVisible();
  });

  test('should reorder portfolio items via drag and drop', async () => {
    // Add multiple assets
    await app.addToPortfolio('bitcoin', 1, 45000);
    await app.addToPortfolio('ethereum', 10, 3000);

    // Get initial order
    const initialOrder = await app.page.locator('[data-testid^="portfolio-item-"]').allTextContents();

    // Reorder items
    await app.reorderPortfolioItems(0, 1);

    // Verify new order
    const newOrder = await app.page.locator('[data-testid^="portfolio-item-"]').allTextContents();
    expect(newOrder).not.toEqual(initialOrder);
  });

  test('should export portfolio data', async () => {
    await app.addToPortfolio('bitcoin', 1, 45000);
    
    await app.navigateTo('portfolio');
    await app.page.click('[data-testid="export-button"]');
    await app.page.selectOption('[data-testid="export-format"]', 'csv');
    
    const downloadPromise = app.page.waitForEvent('download');
    await app.page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('portfolio');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});

test.describe('Price Alerts Workflows', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
    await app.signIn(testUser.email, testUser.password);
  });

  test('should create and manage price alerts', async () => {
    // Create alert
    await app.createAlert('bitcoin', 'above', 55000);
    
    // Verify alert is created
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"]')).toContainText('Bitcoin');
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"]')).toContainText('$55,000');

    // Toggle alert
    await app.toggleAlert('bitcoin-above-55000');
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"] [data-testid="status-badge"]')).toContainText('Inactive');

    // Delete alert
    await app.deleteAlert('bitcoin-above-55000');
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"]')).not.toBeVisible();
  });

  test('should filter alerts by status and coin', async () => {
    // Create multiple alerts
    await app.createAlert('bitcoin', 'above', 55000);
    await app.createAlert('ethereum', 'below', 2500);

    // Filter by coin
    await app.page.selectOption('[data-testid="coin-filter"]', 'bitcoin');
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="alert-ethereum-below-2500"]')).not.toBeVisible();

    // Clear filter
    await app.page.selectOption('[data-testid="coin-filter"]', 'all');
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="alert-ethereum-below-2500"]')).toBeVisible();
  });

  test('should perform bulk alert operations', async () => {
    // Create multiple alerts
    await app.createAlert('bitcoin', 'above', 55000);
    await app.createAlert('ethereum', 'below', 2500);

    // Select multiple alerts
    await app.page.check('[data-testid="alert-bitcoin-above-55000"] [data-testid="select-checkbox"]');
    await app.page.check('[data-testid="alert-ethereum-below-2500"] [data-testid="select-checkbox"]');

    // Bulk deactivate
    await app.page.click('[data-testid="bulk-actions-button"]');
    await app.page.click('[data-testid="bulk-deactivate"]');
    await app.page.click('[data-testid="confirm-bulk-action"]');

    // Verify both alerts are deactivated
    await expect(app.page.locator('[data-testid="alert-bitcoin-above-55000"] [data-testid="status-badge"]')).toContainText('Inactive');
    await expect(app.page.locator('[data-testid="alert-ethereum-below-2500"] [data-testid="status-badge"]')).toContainText('Inactive');
  });
});

test.describe('Trading Workflows', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
    await app.signIn(testUser.email, testUser.password);
  });

  test('should place and manage orders', async () => {
    // Place market buy order
    await app.placeOrder('buy', 'market', 'bitcoin', 0.1);
    await app.waitForToast('Order placed successfully');

    // Verify order appears in order list
    await expect(app.page.locator('[data-testid="orders-list"]')).toContainText('BTC');
    await expect(app.page.locator('[data-testid="orders-list"]')).toContainText('Buy');

    // Place limit sell order
    await app.placeOrder('sell', 'limit', 'bitcoin', 0.05, 52000);
    await app.waitForToast('Order placed successfully');

    // Verify limit order
    await expect(app.page.locator('[data-testid="orders-list"]')).toContainText('$52,000');
  });

  test('should cancel pending orders', async () => {
    // Place limit order
    await app.placeOrder('buy', 'limit', 'bitcoin', 0.1, 48000);
    
    // Get order ID from the UI
    const orderRow = app.page.locator('[data-testid="orders-list"] tr').first();
    const orderId = await orderRow.getAttribute('data-order-id');

    if (orderId) {
      // Cancel order
      await app.cancelOrder(orderId);
      await app.waitForToast('Order cancelled successfully');

      // Verify order is removed or marked as cancelled
      await expect(orderRow).toContainText('Cancelled');
    }
  });

  test('should display order book and recent trades', async () => {
    await app.navigateTo('trading');

    // Verify order book is displayed
    await expect(app.page.locator('[data-testid="order-book"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="bid-orders"]')).toBeVisible();
    await expect(app.page.locator('[data-testid="ask-orders"]')).toBeVisible();

    // Verify recent trades
    await expect(app.page.locator('[data-testid="recent-trades"]')).toBeVisible();
  });
});

test.describe('Security and Settings Workflows', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
    await app.signIn(testUser.email, testUser.password);
  });

  test('should change password', async () => {
    const newPassword = 'NewTestPassword123!';
    
    await app.changePassword(testUser.password, newPassword);
    await app.waitForToast('Password changed successfully');

    // Sign out and sign in with new password
    await app.signOut();
    await app.signIn(testUser.email, newPassword);
    await app.expectUrl('.*dashboard');
  });

  test('should manage trusted devices', async () => {
    await app.page.click('[data-testid="user-menu"]');
    await app.page.click('[data-testid="security-settings"]');

    // Add current device as trusted
    await app.page.click('[data-testid="add-trusted-device"]');
    await app.waitForToast('Device added to trusted devices');

    // Verify device appears in list
    await expect(app.page.locator('[data-testid="trusted-devices-list"]')).toContainText('Current Device');

    // Remove trusted device
    await app.page.click('[data-testid="remove-trusted-device"]');
    await app.page.click('[data-testid="confirm-remove-device"]');
    await app.waitForToast('Device removed from trusted devices');
  });
});

test.describe('Performance and Responsiveness', () => {
  let app: CryptoTrackerPage;

  test.beforeEach(async ({ page }) => {
    app = new CryptoTrackerPage(page);
    await app.signIn(testUser.email, testUser.password);
  });

  test('should load dashboard within acceptable time', async () => {
    const startTime = Date.now();
    await app.goto('/dashboard');
    await app.waitForDashboardToLoad();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('should handle large portfolio efficiently', async () => {
    // Add many portfolio items
    const coins = ['bitcoin', 'ethereum', 'cardano', 'polkadot', 'chainlink'];
    
    for (const coin of coins) {
      await app.addToPortfolio(coin, Math.random() * 10, Math.random() * 1000);
    }

    // Navigate to portfolio and verify it loads quickly
    const startTime = Date.now();
    await app.navigateTo('portfolio');
    await app.page.waitForSelector('[data-testid="portfolio-analytics"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await app.goto('/dashboard');
    await app.waitForDashboardToLoad();

    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
  });
});
