-- Create portfolio table
CREATE TABLE IF NOT EXISTS public.portfolio (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coin_id TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coin_id TEXT NOT NULL,
    target_price DECIMAL(20, 8) NOT NULL CHECK (target_price > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create preferences table
CREATE TABLE IF NOT EXISTS public.preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    currency TEXT DEFAULT 'usd' CHECK (currency IN ('usd', 'eur', 'btc', 'eth'))
);

-- Enable Row Level Security on all tables
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own portfolio data" ON public.portfolio;
DROP POLICY IF EXISTS "Users can insert own portfolio data" ON public.portfolio;
DROP POLICY IF EXISTS "Users can update own portfolio data" ON public.portfolio;
DROP POLICY IF EXISTS "Users can delete own portfolio data" ON public.portfolio;

DROP POLICY IF EXISTS "Users can view own alerts data" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts data" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts data" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts data" ON public.alerts;

DROP POLICY IF EXISTS "Users can view own preferences data" ON public.preferences;
DROP POLICY IF EXISTS "Users can insert own preferences data" ON public.preferences;
DROP POLICY IF EXISTS "Users can update own preferences data" ON public.preferences;
DROP POLICY IF EXISTS "Users can delete own preferences data" ON public.preferences;

-- Portfolio RLS policies
CREATE POLICY "Users can view own portfolio data" ON public.portfolio
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio data" ON public.portfolio
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio data" ON public.portfolio
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio data" ON public.portfolio
    FOR DELETE USING (auth.uid() = user_id);

-- Alerts RLS policies
CREATE POLICY "Users can view own alerts data" ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts data" ON public.alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts data" ON public.alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts data" ON public.alerts
    FOR DELETE USING (auth.uid() = user_id);

-- Preferences RLS policies
CREATE POLICY "Users can view own preferences data" ON public.preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences data" ON public.preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences data" ON public.preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences data" ON public.preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_coin_id ON public.portfolio(coin_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_coin_id ON public.alerts(coin_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON public.preferences(user_id);

-- Grant necessary permissions
GRANT ALL ON public.portfolio TO authenticated;
GRANT ALL ON public.alerts TO authenticated;
GRANT ALL ON public.preferences TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE portfolio_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE alerts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE preferences_id_seq TO authenticated;
