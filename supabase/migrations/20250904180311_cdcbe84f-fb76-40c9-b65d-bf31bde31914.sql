-- Update portfolio table structure to match requirements
ALTER TABLE public.portfolio 
DROP COLUMN IF EXISTS asset_symbol,
ADD COLUMN IF NOT EXISTS coin_id TEXT NOT NULL DEFAULT '';

-- Update portfolio table to use coin_id instead of asset_symbol
UPDATE public.portfolio SET coin_id = asset_symbol WHERE coin_id = '';
ALTER TABLE public.portfolio DROP COLUMN IF EXISTS asset_symbol;

-- Update alerts table to use coin_id
ALTER TABLE public.alerts 
DROP COLUMN IF EXISTS asset_symbol,
ADD COLUMN IF NOT EXISTS coin_id TEXT NOT NULL DEFAULT '';

-- Update alerts to use coin_id
UPDATE public.alerts SET coin_id = asset_symbol WHERE coin_id = '';
ALTER TABLE public.alerts DROP COLUMN IF EXISTS asset_symbol;

-- Enable RLS on all tables
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolio
CREATE POLICY "Users can view own portfolio" ON public.portfolio
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON public.portfolio
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON public.portfolio
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio" ON public.portfolio
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for alerts
CREATE POLICY "Users can view own alerts" ON public.alerts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON public.alerts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON public.alerts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON public.alerts
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for preferences
CREATE POLICY "Users can view own preferences" ON public.preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.preferences
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.preferences
FOR DELETE USING (auth.uid() = user_id);