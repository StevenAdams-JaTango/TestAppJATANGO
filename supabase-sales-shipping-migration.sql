-- Sales & Shipping Migration
-- Run this in your Supabase SQL Editor to add store addresses, shipping fields, and seller sales access

-- ============================================================
-- 1. Store address fields on profiles
-- ============================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS store_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS store_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS store_city TEXT,
ADD COLUMN IF NOT EXISTS store_state TEXT,
ADD COLUMN IF NOT EXISTS store_zip TEXT,
ADD COLUMN IF NOT EXISTS store_country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS store_phone TEXT;

-- ============================================================
-- 2. Shipping & tracking fields on orders
-- ============================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
ADD COLUMN IF NOT EXISTS shipping_service TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS label_url TEXT,
ADD COLUMN IF NOT EXISTS shippo_shipment_id TEXT,
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS package_type TEXT,
ADD COLUMN IF NOT EXISTS package_length TEXT,
ADD COLUMN IF NOT EXISTS package_width TEXT,
ADD COLUMN IF NOT EXISTS package_height TEXT,
ADD COLUMN IF NOT EXISTS package_weight TEXT;

-- Index for seller lookups on orders
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);

-- ============================================================
-- 3. RLS: Sellers can view orders containing their products
-- ============================================================
CREATE POLICY "Sellers can view orders for their products"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.order_items
      WHERE order_items.order_id = orders.id
      AND order_items.seller_id = auth.uid()
    )
  );

-- Sellers can update orders for their products (e.g., mark as shipped)
CREATE POLICY "Sellers can update orders for their products"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items
      WHERE order_items.order_id = orders.id
      AND order_items.seller_id = auth.uid()
    )
  );
