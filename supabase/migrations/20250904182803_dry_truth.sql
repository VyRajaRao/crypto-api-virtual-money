/*
  # Complete CryptoVault Database Schema

  1. New Tables
    - `profiles` - User profile information
    - `portfolio` - User cryptocurrency holdings
    - `alerts` - Price alert configurations  
    - `preferences` - User app preferences

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for authenticated users
    - Ensure users can only access their own data

  3. Data Integrity
    - Add proper constraints and defaults
    - Use UUIDs for primary keys
    - Add timestamps for audit trails
*/

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Create portfolio table for user holdings
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_symbol text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  avg_buy_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create alerts table for price notifications
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_symbol text NOT NULL,
  target_price numeric NOT NULL,
  direction text NOT NULL CHECK (direction IN ('above', 'below')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create preferences table for user settings
CREATE TABLE IF NOT EXISTS public.preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark',
  default_currency text DEFAULT 'USD',
  accent_color text DEFAULT '#00ffff',
  refresh_rate integer DEFAULT 60,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Portfolio policies
CREATE POLICY "Users can view own portfolio" ON public.portfolio
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON public.portfolio
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON public.portfolio
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio" ON public.portfolio
FOR DELETE USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON public.alerts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON public.alerts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON public.alerts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON public.alerts
FOR DELETE USING (auth.uid() = user_id);

-- Preferences policies
CREATE POLICY "Users can view own preferences" ON public.preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.preferences
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.preferences
FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();