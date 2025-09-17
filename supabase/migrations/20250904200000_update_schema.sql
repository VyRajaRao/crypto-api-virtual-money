-- Enhanced portfolio table with avg_price tracking
DROP TABLE IF EXISTS public.portfolio;
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  coin_id text not null,
  amount numeric(28, 8) not null,
  avg_price numeric(28, 8) not null,
  asset_type text default 'crypto',
  created_at timestamptz default now()
);

-- Enhanced alerts table with direction field
DROP TABLE IF EXISTS public.alerts;
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  coin_id text not null,
  direction text check(direction in ('above','below')) not null,
  target_price numeric(28,8) not null,
  active boolean default true,
  created_at timestamptz default now(),
  triggered_at timestamptz
);

-- Trades table for simulated trading
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  coin_id text not null,
  type text check(type in ('buy','sell')) not null,
  amount numeric(28,8) not null,
  price numeric(28,8) not null,
  created_at timestamptz default now()
);

-- Wallet table for simulated trading balance
CREATE TABLE IF NOT EXISTS public.wallet (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  balance numeric(28,8) default 10000.0,
  created_at timestamptz default now()
);

-- Enhanced preferences table
DROP TABLE IF EXISTS public.preferences;
CREATE TABLE IF NOT EXISTS public.preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  theme text default 'dark',
  currency text default 'usd',
  refresh_rate int default 60,
  created_at timestamptz default now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "users_select_portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "users_insert_portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "users_update_portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "users_delete_portfolio" ON public.portfolio;

DROP POLICY IF EXISTS "users_select_alerts" ON public.alerts;
DROP POLICY IF EXISTS "users_insert_alerts" ON public.alerts;
DROP POLICY IF EXISTS "users_update_alerts" ON public.alerts;
DROP POLICY IF EXISTS "users_delete_alerts" ON public.alerts;

DROP POLICY IF EXISTS "users_select_trades" ON public.trades;
DROP POLICY IF EXISTS "users_insert_trades" ON public.trades;
DROP POLICY IF EXISTS "users_update_trades" ON public.trades;
DROP POLICY IF EXISTS "users_delete_trades" ON public.trades;

DROP POLICY IF EXISTS "users_select_wallet" ON public.wallet;
DROP POLICY IF EXISTS "users_insert_wallet" ON public.wallet;
DROP POLICY IF EXISTS "users_update_wallet" ON public.wallet;
DROP POLICY IF EXISTS "users_delete_wallet" ON public.wallet;

DROP POLICY IF EXISTS "users_select_preferences" ON public.preferences;
DROP POLICY IF EXISTS "users_insert_preferences" ON public.preferences;
DROP POLICY IF EXISTS "users_update_preferences" ON public.preferences;
DROP POLICY IF EXISTS "users_delete_preferences" ON public.preferences;

-- Portfolio RLS policies
CREATE POLICY "users_select_portfolio" ON public.portfolio FOR select using (auth.uid() = user_id);
CREATE POLICY "users_insert_portfolio" ON public.portfolio FOR insert with check (auth.uid() = user_id);
CREATE POLICY "users_update_portfolio" ON public.portfolio FOR update using (auth.uid() = user_id);
CREATE POLICY "users_delete_portfolio" ON public.portfolio FOR delete using (auth.uid() = user_id);

-- Alerts RLS policies
CREATE POLICY "users_select_alerts" ON public.alerts FOR select using (auth.uid() = user_id);
CREATE POLICY "users_insert_alerts" ON public.alerts FOR insert with check (auth.uid() = user_id);
CREATE POLICY "users_update_alerts" ON public.alerts FOR update using (auth.uid() = user_id);
CREATE POLICY "users_delete_alerts" ON public.alerts FOR delete using (auth.uid() = user_id);

-- Trades RLS policies
CREATE POLICY "users_select_trades" ON public.trades FOR select using (auth.uid() = user_id);
CREATE POLICY "users_insert_trades" ON public.trades FOR insert with check (auth.uid() = user_id);
CREATE POLICY "users_update_trades" ON public.trades FOR update using (auth.uid() = user_id);
CREATE POLICY "users_delete_trades" ON public.trades FOR delete using (auth.uid() = user_id);

-- Wallet RLS policies
CREATE POLICY "users_select_wallet" ON public.wallet FOR select using (auth.uid() = user_id);
CREATE POLICY "users_insert_wallet" ON public.wallet FOR insert with check (auth.uid() = user_id);
CREATE POLICY "users_update_wallet" ON public.wallet FOR update using (auth.uid() = user_id);
CREATE POLICY "users_delete_wallet" ON public.wallet FOR delete using (auth.uid() = user_id);

-- Preferences RLS policies
CREATE POLICY "users_select_preferences" ON public.preferences FOR select using (auth.uid() = user_id);
CREATE POLICY "users_insert_preferences" ON public.preferences FOR insert with check (auth.uid() = user_id);
CREATE POLICY "users_update_preferences" ON public.preferences FOR update using (auth.uid() = user_id);
CREATE POLICY "users_delete_preferences" ON public.preferences FOR delete using (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_coin_id ON public.portfolio(coin_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_coin_id ON public.alerts(coin_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON public.alerts(active);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_coin_id ON public.trades(coin_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON public.preferences(user_id);

-- Grant necessary permissions
GRANT ALL ON public.portfolio TO authenticated;
GRANT ALL ON public.alerts TO authenticated;
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.wallet TO authenticated;
GRANT ALL ON public.preferences TO authenticated;
