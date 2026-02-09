-- Shipping Addresses & Stripe Customer Migration
-- Run this in your Supabase SQL Editor to add address management and Stripe Customer linking

-- Add stripe_customer_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Shipping addresses table
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);

-- Enable RLS
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only manage their own addresses
CREATE POLICY "Users can view own addresses"
  ON public.shipping_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
  ON public.shipping_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON public.shipping_addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON public.shipping_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.shipping_addresses
    SET is_default = false, updated_at = NOW()
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-unset other defaults when one is set
DROP TRIGGER IF EXISTS trigger_ensure_single_default_address ON public.shipping_addresses;
CREATE TRIGGER trigger_ensure_single_default_address
  AFTER INSERT OR UPDATE OF is_default ON public.shipping_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_address();

-- Updated_at trigger for shipping_addresses
CREATE OR REPLACE FUNCTION public.update_shipping_address_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shipping_address_timestamp ON public.shipping_addresses;
CREATE TRIGGER trigger_update_shipping_address_timestamp
  BEFORE UPDATE ON public.shipping_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shipping_address_timestamp();
