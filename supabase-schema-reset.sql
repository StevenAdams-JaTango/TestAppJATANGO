-- Supabase Database Schema for JaTango Live Shopping App
-- SAFE TO RE-RUN: Drops existing policies before recreating

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Sellers can insert own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;

DROP POLICY IF EXISTS "Live and ended shows are viewable by everyone" ON public.shows;
DROP POLICY IF EXISTS "Sellers can insert own shows" ON public.shows;
DROP POLICY IF EXISTS "Sellers can update own shows" ON public.shows;
DROP POLICY IF EXISTS "Sellers can delete own shows" ON public.shows;

DROP POLICY IF EXISTS "Show products are viewable by everyone" ON public.show_products;
DROP POLICY IF EXISTS "Sellers can manage show products for own shows" ON public.show_products;

-- ============================================
-- CREATE TABLES (IF NOT EXISTS)
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  is_seller BOOLEAN DEFAULT false,
  store_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  msrp DECIMAL(10,2),
  cost DECIMAL(10,2),
  image TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  description TEXT DEFAULT '',
  category TEXT,
  weight DECIMAL(10,2),
  weight_unit TEXT CHECK (weight_unit IN ('oz', 'lb', 'g', 'kg')),
  quantity_in_stock INTEGER DEFAULT 0,
  aisle TEXT,
  bin TEXT,
  length DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  dimension_unit TEXT CHECK (dimension_unit IN ('in', 'cm')),
  barcode TEXT,
  sku TEXT,
  colors JSONB DEFAULT '[]',
  sizes JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  shipping_profile TEXT,
  tax_category TEXT,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'ended')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_key TEXT,
  product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Show products junction table
CREATE TABLE IF NOT EXISTS public.show_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, product_id)
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_shows_seller_id ON public.shows(seller_id);
CREATE INDEX IF NOT EXISTS idx_shows_status ON public.shows(status);
CREATE INDEX IF NOT EXISTS idx_show_products_show_id ON public.show_products(show_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_products ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Products policies
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Sellers can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = seller_id);

-- Shows policies
CREATE POLICY "Live and ended shows are viewable by everyone"
  ON public.shows FOR SELECT
  USING (status IN ('live', 'ended') OR auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own shows"
  ON public.shows FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own shows"
  ON public.shows FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own shows"
  ON public.shows FOR DELETE
  USING (auth.uid() = seller_id);

-- Show products policies
CREATE POLICY "Show products are viewable by everyone"
  ON public.show_products FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage show products for own shows"
  ON public.show_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = show_products.show_id
      AND shows.seller_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_shows_updated_at ON public.shows;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE REALTIME (ignore errors if already added)
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shows;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
