-- ==========================================
-- CRYPTO DASHBOARD DATABASE SCHEMA
-- ==========================================
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create portfolio table
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id text NOT NULL,
  amount numeric(28, 8) NOT NULL,
  avg_price numeric(28, 8) NOT NULL,
  asset_type text DEFAULT 'crypto',
  created_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id text NOT NULL,
  direction text CHECK(direction IN ('above','below')) NOT NULL,
  target_price numeric(28,8) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  triggered_at timestamptz
);

-- Create trades table (simulated trading)
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id text NOT NULL,
  type text CHECK(type IN ('buy','sell')) NOT NULL,
  amount numeric(28,8) NOT NULL,
  price numeric(28,8) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create wallet table (simulated wallet)
CREATE TABLE IF NOT EXISTS public.wallet (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance numeric(28,8) DEFAULT 100000.00, -- Start with $100k virtual money
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create preferences table
CREATE TABLE IF NOT EXISTS public.preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme text DEFAULT 'dark',
  currency text DEFAULT 'usd',
  refresh_rate int DEFAULT 60,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create pending_orders table (for limit orders)
CREATE TABLE IF NOT EXISTS public.pending_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id text NOT NULL,
  type text CHECK(type IN ('buy','sell')) NOT NULL,
  amount numeric(28,8) NOT NULL,
  price numeric(28,8) NOT NULL,
  status text DEFAULT 'pending' CHECK(status IN ('pending','filled','cancelled')),
  created_at timestamptz DEFAULT now(),
  filled_at timestamptz
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Portfolio policies
CREATE POLICY "users_select_portfolio" ON public.portfolio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_portfolio" ON public.portfolio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_portfolio" ON public.portfolio FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_portfolio" ON public.portfolio FOR DELETE USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "users_select_alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "users_select_trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- Wallet policies
CREATE POLICY "users_select_wallet" ON public.wallet FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_wallet" ON public.wallet FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_wallet" ON public.wallet FOR UPDATE USING (auth.uid() = user_id);

-- Preferences policies
CREATE POLICY "users_select_preferences" ON public.preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_preferences" ON public.preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_preferences" ON public.preferences FOR UPDATE USING (auth.uid() = user_id);

-- Pending orders policies
CREATE POLICY "users_select_pending_orders" ON public.pending_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_pending_orders" ON public.pending_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_pending_orders" ON public.pending_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_pending_orders" ON public.pending_orders FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_coin_id ON public.portfolio(coin_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON public.alerts(active);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON public.pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON public.pending_orders(status);

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.wallet (user_id)
  VALUES (new.id);
  
  INSERT INTO public.preferences (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet and preferences for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update wallet balance after trades
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'buy' THEN
    UPDATE public.wallet 
    SET balance = balance - (NEW.amount * NEW.price),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'sell' THEN
    UPDATE public.wallet 
    SET balance = balance + (NEW.amount * NEW.price),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update wallet balance on trades
DROP TRIGGER IF EXISTS on_trade_created ON public.trades;
CREATE TRIGGER on_trade_created
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

-- ==========================================
-- EXAMPLE DATA (Optional - for testing)
-- ==========================================

-- This will be populated when users interact with the app
