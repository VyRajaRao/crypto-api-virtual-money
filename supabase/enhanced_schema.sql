-- ==========================================
-- ENHANCED CRYPTO VAULT DATABASE SCHEMA
-- ==========================================
-- Additional schema enhancements for integrated portfolio system
-- Run this after your existing schema.sql
-- ==========================================

-- Add missing columns to existing tables and create new tables needed for integrated trading

-- Enhance portfolio table with better P&L tracking
ALTER TABLE public.portfolio 
ADD COLUMN IF NOT EXISTS symbol text,
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS image text,
ADD COLUMN IF NOT EXISTS current_price numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_change_24h numeric(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS market_cap numeric(28,2),
ADD COLUMN IF NOT EXISTS total_invested numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unrealized_pnl numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Enhance alerts table for advanced alert features
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS symbol text,
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS image text,
ADD COLUMN IF NOT EXISTS current_price numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS condition_type text DEFAULT 'price' CHECK(condition_type IN ('price', 'volume', 'price_change', 'market_cap')),
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_interval text CHECK(recurring_interval IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS notification_methods jsonb DEFAULT '["push"]',
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Enhance trades table for better tracking
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS symbol text,
ADD COLUMN IF NOT EXISTS side text CHECK(side IN ('buy','sell')),
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'market' CHECK(order_type IN ('market', 'limit', 'stop', 'stop_limit')),
ADD COLUMN IF NOT EXISTS fees_usd numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_usd numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'filled' CHECK(status IN ('pending', 'filled', 'cancelled', 'rejected')),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update trades to match new schema (migrate existing data)
UPDATE public.trades SET 
  side = type,
  total_usd = amount * price,
  fees_usd = (amount * price) * 0.001 -- 0.1% fee
WHERE side IS NULL;

-- Create latest_prices table for caching market data
CREATE TABLE IF NOT EXISTS public.latest_prices (
  symbol text PRIMARY KEY,
  coingecko_id text NOT NULL,
  name text,
  image text,
  price_usd numeric(28,8) NOT NULL,
  price_change_24h numeric(10,4) DEFAULT 0,
  price_change_percentage_24h numeric(10,4) DEFAULT 0,
  market_cap numeric(28,2) DEFAULT 0,
  volume_24h numeric(28,2) DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create notifications table for alert notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK(type IN ('alert_triggered', 'trade_executed', 'portfolio_milestone', 'welcome')),
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create news_events table for simulated market news
CREATE TABLE IF NOT EXISTS public.news_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK(type IN ('bullish', 'bearish', 'neutral', 'regulatory', 'technical', 'partnership', 'adoption')),
  severity text NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  affected_assets text[] NOT NULL DEFAULT '{}',
  price_impact_percentage numeric(10,4) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create portfolios table (enhanced version of portfolio for better data structure)
-- This will eventually replace the portfolio table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  coingecko_id text NOT NULL,
  name text,
  image text,
  amount numeric(28,8) NOT NULL CHECK (amount >= 0),
  avg_buy_price numeric(28,8) NOT NULL DEFAULT 0,
  total_invested numeric(28,8) NOT NULL DEFAULT 0,
  current_price numeric(28,8) DEFAULT 0,
  total_value numeric(28,8) DEFAULT 0,
  unrealized_pnl numeric(28,8) DEFAULT 0,
  realized_pnl numeric(28,8) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, symbol)
);

-- Enhance wallet table for better cash tracking
ALTER TABLE public.wallet
ADD COLUMN IF NOT EXISTS total_invested numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_balance numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS portfolio_value numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pnl numeric(28,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_pnl numeric(28,8) DEFAULT 0;

-- Update existing wallet records to set available_balance = balance
UPDATE public.wallet SET available_balance = balance WHERE available_balance IS NULL OR available_balance = 0;

-- ==========================================
-- ENHANCED RLS POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE public.latest_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;

-- Latest prices policies (read-only for all authenticated users)
CREATE POLICY "authenticated_users_select_prices" ON public.latest_prices FOR SELECT TO authenticated USING (true);

-- Notifications policies
CREATE POLICY "users_select_notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Portfolios policies
CREATE POLICY "users_select_portfolios" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

-- News events policies (read-only for all authenticated users)
CREATE POLICY "authenticated_users_select_news" ON public.news_events FOR SELECT TO authenticated USING (true);

-- ==========================================
-- ENHANCED INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_latest_prices_symbol ON public.latest_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_latest_prices_updated_at ON public.latest_prices(updated_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_symbol ON public.portfolios(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolios_updated_at ON public.portfolios(updated_at);
CREATE INDEX IF NOT EXISTS idx_news_events_created_at ON public.news_events(created_at);
CREATE INDEX IF NOT EXISTS idx_news_events_expires_at ON public.news_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_news_events_is_active ON public.news_events(is_active);
CREATE INDEX IF NOT EXISTS idx_news_events_type ON public.news_events(type);
CREATE INDEX IF NOT EXISTS idx_news_events_affected_assets ON public.news_events USING GIN(affected_assets);

-- ==========================================
-- ENHANCED FUNCTIONS
-- ==========================================

-- Function to execute a trade (with proper P&L calculation)
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_user_id uuid,
  p_symbol text,
  p_side text,
  p_amount numeric,
  p_price numeric,
  p_order_type text DEFAULT 'market'
)
RETURNS jsonb AS $$
DECLARE
  v_total numeric;
  v_fees numeric;
  v_wallet_balance numeric;
  v_current_position numeric DEFAULT 0;
  v_new_avg_price numeric;
  v_realized_pnl numeric DEFAULT 0;
  v_trade_id uuid;
BEGIN
  -- Calculate totals
  v_total := p_amount * p_price;
  v_fees := v_total * 0.001; -- 0.1% fee
  
  -- Get current wallet balance
  SELECT balance INTO v_wallet_balance FROM public.wallet WHERE user_id = p_user_id;
  
  -- Get current position if exists
  SELECT amount INTO v_current_position FROM public.portfolios 
  WHERE user_id = p_user_id AND symbol = p_symbol;
  
  v_current_position := COALESCE(v_current_position, 0);
  
  -- Validate trade
  IF p_side = 'buy' AND (v_total + v_fees) > v_wallet_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  IF p_side = 'sell' AND p_amount > v_current_position THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient holdings');
  END IF;
  
  -- Insert trade record
  INSERT INTO public.trades (user_id, coin_id, symbol, side, amount, price, order_type, fees_usd, total_usd, status)
  VALUES (p_user_id, p_symbol, p_symbol, p_side, p_amount, p_price, p_order_type, v_fees, v_total, 'filled')
  RETURNING id INTO v_trade_id;
  
  -- Update wallet balance
  IF p_side = 'buy' THEN
    UPDATE public.wallet 
    SET balance = balance - v_total - v_fees,
        available_balance = available_balance - v_total - v_fees,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.wallet 
    SET balance = balance + v_total - v_fees,
        available_balance = available_balance + v_total - v_fees,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Update or create portfolio position
  IF p_side = 'buy' THEN
    -- Calculate new average buy price
    IF v_current_position > 0 THEN
      SELECT avg_buy_price * v_current_position INTO v_new_avg_price FROM public.portfolios 
      WHERE user_id = p_user_id AND symbol = p_symbol;
      v_new_avg_price := (v_new_avg_price + v_total) / (v_current_position + p_amount);
    ELSE
      v_new_avg_price := p_price;
    END IF;
    
    INSERT INTO public.portfolios (user_id, symbol, coingecko_id, amount, avg_buy_price, total_invested, updated_at)
    VALUES (p_user_id, p_symbol, p_symbol, p_amount, v_new_avg_price, v_total, now())
    ON CONFLICT (user_id, symbol) 
    DO UPDATE SET 
      amount = portfolios.amount + p_amount,
      avg_buy_price = v_new_avg_price,
      total_invested = portfolios.total_invested + v_total,
      updated_at = now();
  ELSE
    -- Calculate realized P&L for sell
    SELECT avg_buy_price INTO v_new_avg_price FROM public.portfolios 
    WHERE user_id = p_user_id AND symbol = p_symbol;
    v_realized_pnl := (p_price - v_new_avg_price) * p_amount - v_fees;
    
    UPDATE public.portfolios 
    SET amount = amount - p_amount,
        realized_pnl = realized_pnl + v_realized_pnl,
        updated_at = now()
    WHERE user_id = p_user_id AND symbol = p_symbol;
    
    -- Remove position if amount becomes 0
    DELETE FROM public.portfolios 
    WHERE user_id = p_user_id AND symbol = p_symbol AND amount <= 0;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'trade_id', v_trade_id,
    'realized_pnl', v_realized_pnl,
    'fees', v_fees
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update portfolio values with current market prices
CREATE OR REPLACE FUNCTION public.update_portfolio_values()
RETURNS void AS $$
BEGIN
  UPDATE public.portfolios 
  SET 
    current_price = lp.price_usd,
    name = lp.name,
    image = lp.image,
    total_value = amount * lp.price_usd,
    unrealized_pnl = (amount * lp.price_usd) - total_invested,
    updated_at = now()
  FROM public.latest_prices lp 
  WHERE portfolios.symbol = lp.symbol;
  
  -- Update wallet portfolio summary
  UPDATE public.wallet 
  SET 
    portfolio_value = (
      SELECT COALESCE(SUM(total_value), 0) 
      FROM public.portfolios 
      WHERE user_id = wallet.user_id
    ),
    total_value = balance + (
      SELECT COALESCE(SUM(total_value), 0) 
      FROM public.portfolios 
      WHERE user_id = wallet.user_id
    ),
    total_pnl = (
      SELECT COALESCE(SUM(unrealized_pnl + realized_pnl), 0) 
      FROM public.portfolios 
      WHERE user_id = wallet.user_id
    ),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and trigger alerts
CREATE OR REPLACE FUNCTION public.check_alerts()
RETURNS void AS $$
DECLARE
  alert_record RECORD;
BEGIN
  FOR alert_record IN 
    SELECT a.*, lp.price_usd, lp.name, lp.image
    FROM public.alerts a
    JOIN public.latest_prices lp ON a.symbol = lp.symbol
    WHERE a.active = true AND a.triggered_at IS NULL
  LOOP
    -- Check price alerts
    IF alert_record.condition_type = 'price' AND (
      (alert_record.direction = 'above' AND alert_record.price_usd >= alert_record.target_price) OR
      (alert_record.direction = 'below' AND alert_record.price_usd <= alert_record.target_price)
    ) THEN
      -- Trigger alert
      UPDATE public.alerts 
      SET 
        active = CASE WHEN recurring THEN true ELSE false END,
        triggered_at = now(),
        current_price = alert_record.price_usd,
        updated_at = now()
      WHERE id = alert_record.id;
      
      -- Create notification
      INSERT INTO public.notifications (user_id, type, title, message, payload)
      VALUES (
        alert_record.user_id,
        'alert_triggered',
        format('%s Alert Triggered', alert_record.name OR alert_record.symbol),
        format('%s has %s $%s (target: $%s)', 
          alert_record.name OR alert_record.symbol,
          CASE WHEN alert_record.direction = 'above' THEN 'reached' ELSE 'dropped to' END,
          alert_record.price_usd,
          alert_record.target_price
        ),
        jsonb_build_object(
          'alert_id', alert_record.id,
          'symbol', alert_record.symbol,
          'current_price', alert_record.price_usd,
          'target_price', alert_record.target_price,
          'direction', alert_record.direction
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- MIGRATION DATA FROM OLD SCHEMA
-- ==========================================

-- Migrate existing portfolio data to new portfolios table
INSERT INTO public.portfolios (user_id, symbol, coingecko_id, amount, avg_buy_price, total_invested, created_at)
SELECT 
  user_id,
  COALESCE(coin_id, 'unknown') as symbol,
  coin_id as coingecko_id,
  amount,
  avg_price as avg_buy_price,
  amount * avg_price as total_invested,
  created_at
FROM public.portfolio
ON CONFLICT (user_id, symbol) DO NOTHING;

-- Update symbols in existing data where possible
UPDATE public.portfolios SET symbol = 'btc' WHERE coingecko_id = 'bitcoin';
UPDATE public.portfolios SET symbol = 'eth' WHERE coingecko_id = 'ethereum';
UPDATE public.portfolios SET symbol = 'sol' WHERE coingecko_id = 'solana';
UPDATE public.portfolios SET symbol = 'ada' WHERE coingecko_id = 'cardano';
UPDATE public.portfolios SET symbol = 'dot' WHERE coingecko_id = 'polkadot';

-- Update alerts with symbols
UPDATE public.alerts SET symbol = 'btc' WHERE coin_id = 'bitcoin';
UPDATE public.alerts SET symbol = 'eth' WHERE coin_id = 'ethereum';
UPDATE public.alerts SET symbol = 'sol' WHERE coin_id = 'solana';
UPDATE public.alerts SET symbol = 'ada' WHERE coin_id = 'cardano';
UPDATE public.alerts SET symbol = 'dot' WHERE coin_id = 'polkadot';

-- Update trades with symbols
UPDATE public.trades SET symbol = 'btc' WHERE coin_id = 'bitcoin';
UPDATE public.trades SET symbol = 'eth' WHERE coin_id = 'ethereum';
UPDATE public.trades SET symbol = 'sol' WHERE coin_id = 'solana';
UPDATE public.trades SET symbol = 'ada' WHERE coin_id = 'cardano';
UPDATE public.trades SET symbol = 'dot' WHERE coin_id = 'polkadot';

-- ==========================================
-- SAMPLE PRICE DATA
-- ==========================================

-- Insert some initial price data for testing
INSERT INTO public.latest_prices (symbol, coingecko_id, name, price_usd, price_change_24h, price_change_percentage_24h, market_cap, updated_at)
VALUES 
  ('btc', 'bitcoin', 'Bitcoin', 43250.00, 1250.50, 2.98, 847000000000, now()),
  ('eth', 'ethereum', 'Ethereum', 2380.75, -45.25, -1.87, 286000000000, now()),
  ('sol', 'solana', 'Solana', 98.45, 3.22, 3.38, 43500000000, now()),
  ('ada', 'cardano', 'Cardano', 0.485, 0.012, 2.53, 17200000000, now()),
  ('dot', 'polkadot', 'Polkadot', 7.23, -0.18, -2.43, 9800000000, now())
ON CONFLICT (symbol) DO UPDATE SET
  price_usd = EXCLUDED.price_usd,
  price_change_24h = EXCLUDED.price_change_24h,
  price_change_percentage_24h = EXCLUDED.price_change_percentage_24h,
  market_cap = EXCLUDED.market_cap,
  updated_at = EXCLUDED.updated_at;
