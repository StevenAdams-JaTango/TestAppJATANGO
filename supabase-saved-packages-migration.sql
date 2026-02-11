-- Saved Packages Migration
-- Run this in your Supabase SQL Editor to add the saved_packages table

-- ============================================================
-- 1. Create saved_packages table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  package_type TEXT NOT NULL DEFAULT 'box',
  length TEXT NOT NULL,
  width TEXT NOT NULL,
  height TEXT NOT NULL,
  weight TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for seller lookups
CREATE INDEX IF NOT EXISTS idx_saved_packages_seller_id ON public.saved_packages(seller_id);

-- ============================================================
-- 2. RLS Policies
-- ============================================================
ALTER TABLE public.saved_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved packages"
  ON public.saved_packages FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert their own saved packages"
  ON public.saved_packages FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own saved packages"
  ON public.saved_packages FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own saved packages"
  ON public.saved_packages FOR DELETE
  USING (auth.uid() = seller_id);

-- ============================================================
-- 3. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_saved_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_packages_updated_at
  BEFORE UPDATE ON public.saved_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_packages_updated_at();
