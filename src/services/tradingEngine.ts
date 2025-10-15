import { supabase } from '@/lib/supabase';
import { priceService } from './priceService';
import { toast } from 'sonner';

export interface TradeRequest {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK'; // Good Till Cancelled, Immediate or Cancel, Fill or Kill
  expiresAt?: string;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total_usd: number;
  fees_usd: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
  order_type: string;
  created_at: string;
  updated_at: string;
  filled_amount?: number;
  remaining_amount?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  name?: string;
  image?: string;
  amount: number;
  avg_buy_price: number;
  total_invested: number;
  current_price: number;
  total_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  total_invested: number;
  total_value: number;
  portfolio_value: number;
  total_pnl: number;
  daily_pnl: number;
  currency: string;
}

import { D, mul, add, toNumber } from '@/lib/decimal'

class TradingEngine {
  private readonly TRADING_FEE_RATE = D(0.001); // 0.1% trading fee
  private readonly MIN_ORDER_VALUE = D(1); // Minimum $1 order

  /**
   * Execute a market order immediately
   */
  async executeMarketOrder(request: TradeRequest): Promise<{ success: boolean; trade?: Trade; error?: string }> {
    try {
      // Get current market price
      const currentPrice = await this.getCurrentPrice(request.symbol);
      if (currentPrice === 0) {
        return { success: false, error: 'Unable to get current market price' };
      }

      // Validate order
      const validation = await this.validateOrder({ ...request, price: currentPrice });
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Execute trade using the stored procedure
      const { data, error } = await supabase.rpc('execute_trade', {
        p_user_id: request.userId,
        p_symbol: request.symbol,
        p_side: request.side,
        p_amount: request.amount,
        p_price: currentPrice,
        p_order_type: 'market'
      });

      if (error) {
        console.error('Trade execution error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Get the created trade
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', data.trade_id)
        .single();

      if (tradeError) {
        console.error('Error fetching trade:', tradeError);
        return { success: false, error: 'Trade executed but failed to retrieve details' };
      }

      // Update portfolio values
      await this.updatePortfolioValues(request.userId);

      return { success: true, trade };

    } catch (error: any) {
      console.error('Market order execution error:', error);
      return { success: false, error: error.message || 'Failed to execute market order' };
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(request: TradeRequest): Promise<{ success: boolean; trade?: Trade; error?: string }> {
    try {
      if (!request.price || request.price <= 0) {
        return { success: false, error: 'Limit price is required and must be greater than 0' };
      }

      // Validate order
      const validation = await this.validateOrder(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if limit order can be executed immediately
      const currentPrice = await this.getCurrentPrice(request.symbol);
      const canExecuteImmediately = this.canExecuteLimitOrderImmediately(
        request.side, 
        request.price, 
        currentPrice
      );

      if (canExecuteImmediately) {
        // Execute as market order
        return await this.executeMarketOrder({ ...request, orderType: 'market' });
      }

      // Place pending limit order
      const total = mul(request.amount, request.price)
      const fees = total.times(this.TRADING_FEE_RATE)

      const { data: trade, error } = await supabase
        .from('trades')
        .insert({
          user_id: request.userId,
          symbol: request.symbol,
          side: request.side,
          amount: request.amount,
          price: request.price,
          total_usd: toNumber(total),
          fees_usd: toNumber(fees),
          status: 'pending',
          order_type: 'limit',
          coin_id: request.symbol, // For compatibility with existing schema
          remaining_amount: request.amount,
          filled_amount: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Limit order placement error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, trade };

    } catch (error: any) {
      console.error('Limit order placement error:', error);
      return { success: false, error: error.message || 'Failed to place limit order' };
    }
  }

  /**
   * Process pending limit orders
   */
  async processPendingOrders(): Promise<void> {
    try {
      // Get all pending limit orders
      const { data: pendingOrders, error } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'pending')
        .eq('order_type', 'limit');

      if (error) {
        console.error('Error fetching pending orders:', error);
        return;
      }

      if (!pendingOrders || pendingOrders.length === 0) {
        return;
      }

      console.log(`Processing ${pendingOrders.length} pending limit orders`);

      for (const order of pendingOrders) {
        try {
          await this.processLimitOrder(order);
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error processing pending orders:', error);
    }
  }

  /**
   * Process a single limit order
   */
  private async processLimitOrder(order: Trade): Promise<void> {
    try {
      const currentPrice = await this.getCurrentPrice(order.symbol);
      if (currentPrice === 0) {
        return; // Skip if can't get price
      }

      // Check if order should be executed
      const shouldExecute = this.shouldExecuteLimitOrder(order.side, order.price, currentPrice);
      
      if (!shouldExecute) {
        return;
      }

      // Execute the order
      const { data, error } = await supabase.rpc('execute_trade', {
        p_user_id: order.user_id,
        p_symbol: order.symbol,
        p_side: order.side,
        p_amount: order.remaining_amount || order.amount,
        p_price: currentPrice,
        p_order_type: 'limit'
      });

      if (error || !data.success) {
        console.error(`Failed to execute limit order ${order.id}:`, error?.message || data.error);
        return;
      }

      // Update order status
      await supabase
        .from('trades')
        .update({
          status: 'filled',
          filled_amount: order.amount,
          remaining_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // Update portfolio values
      await this.updatePortfolioValues(order.user_id);

      console.log(`Executed limit order ${order.id} for ${order.symbol} at $${currentPrice}`);

      // Send notification
      await this.createTradeNotification(order.user_id, order, currentPrice);

    } catch (error) {
      console.error(`Error processing limit order ${order.id}:`, error);
    }
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.status !== 'pending') {
        return { success: false, error: 'Only pending orders can be cancelled' };
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };

    } catch (error: any) {
      console.error('Order cancellation error:', error);
      return { success: false, error: error.message || 'Failed to cancel order' };
    }
  }

  /**
   * Get user's trading history
   */
  async getTradingHistory(userId: string, limit = 50): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trading history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Trading history error:', error);
      return [];
    }
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(userId: string): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching open orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Open orders error:', error);
      return [];
    }
  }

  /**
   * Validate trade order
   */
  private async validateOrder(request: TradeRequest & { price: number }): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check minimum order value using decimal math
      const orderValue = mul(request.amount, request.price)
      if (orderValue.lt(this.MIN_ORDER_VALUE)) {
        return { valid: false, error: `Minimum order value is $${this.MIN_ORDER_VALUE.toNumber()}` };
      }

      // Get user wallet and portfolio
      const [walletResult, portfolioResult] = await Promise.all([
        supabase.from('wallet').select('*').eq('user_id', request.userId).single(),
        supabase.from('portfolios').select('*').eq('user_id', request.userId).eq('symbol', request.symbol).single()
      ]);

      const wallet = walletResult.data;
      const position = portfolioResult.data;

      if (!wallet) {
        return { valid: false, error: 'User wallet not found' };
      }

      // Validate buy order
      if (request.side === 'buy') {
        const totalCost = add(orderValue, orderValue.times(this.TRADING_FEE_RATE))
        if (totalCost.gt(D(wallet.available_balance))) {
          return { valid: false, error: 'Insufficient funds' };
        }
      }

      // Validate sell order
      if (request.side === 'sell') {
        if (!position || D(request.amount).gt(D(position.amount))) {
          return { valid: false, error: 'Insufficient holdings' };
        }
      }

      return { valid: true };

    } catch (error: any) {
      console.error('Order validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Get current price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('latest_prices')
        .select('price_usd')
        .eq('symbol', symbol.toLowerCase())
        .single();

      if (error || !data) {
        console.error(`Price not found for ${symbol}`);
        return 0;
      }

      return data.price_usd;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Check if limit order can be executed immediately
   */
  private canExecuteLimitOrderImmediately(side: 'buy' | 'sell', limitPrice: number, currentPrice: number): boolean {
    if (side === 'buy') {
      return currentPrice <= limitPrice; // Buy if current price is at or below limit
    } else {
      return currentPrice >= limitPrice; // Sell if current price is at or above limit
    }
  }

  /**
   * Check if pending limit order should be executed
   */
  private shouldExecuteLimitOrder(side: 'buy' | 'sell', limitPrice: number, currentPrice: number): boolean {
    return this.canExecuteLimitOrderImmediately(side, limitPrice, currentPrice);
  }

  /**
   * Update portfolio values with current prices
   */
  private async updatePortfolioValues(userId: string): Promise<void> {
    try {
      await supabase.rpc('update_portfolio_values');
    } catch (error) {
      console.error('Error updating portfolio values:', error);
    }
  }

  /**
   * Create notification for trade execution
   */
  private async createTradeNotification(userId: string, order: Trade, executionPrice: number): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'trade_executed',
          title: 'Limit Order Executed',
          message: `Your ${order.side.toUpperCase()} order for ${order.amount} ${order.symbol.toUpperCase()} was executed at $${executionPrice.toLocaleString()}`,
          payload: {
            trade_id: order.id,
            symbol: order.symbol,
            side: order.side,
            amount: order.amount,
            execution_price: executionPrice
          }
        });
    } catch (error) {
      console.error('Error creating trade notification:', error);
    }
  }

  /**
   * Start processing pending orders at regular intervals
   */
  startOrderProcessing(intervalMinutes = 1): NodeJS.Timeout {
    const interval = setInterval(async () => {
      await this.processPendingOrders();
    }, intervalMinutes * 60 * 1000);

    console.log(`Started order processing every ${intervalMinutes} minute(s)`);
    return interval;
  }
}

export const tradingEngine = new TradingEngine();
export default tradingEngine;
