-- Live Show Cart Reservations & Sales Tracking Migration
-- Run this in your Supabase SQL Editor
-- This adds show-level cart tracking with 6-hour reservations

-- ============================================================
-- 1. Add show_id + reserved_until columns to existing cart_items
-- ============================================================
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES public.shows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;

-- Index for show-level cart queries
CREATE INDEX IF NOT EXISTS idx_cart_items_show_id ON public.cart_items(show_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_reserved_until ON public.cart_items(reserved_until);

-- ============================================================
-- 2. Show cart activity log (tracks every add-to-cart during a show)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.show_cart_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  selected_color_id TEXT,
  selected_color_name TEXT,
  selected_size_id TEXT,
  selected_size_name TEXT,
  selected_variant_id TEXT,
  event_type TEXT NOT NULL DEFAULT 'add' CHECK (event_type IN ('add', 'remove', 'purchase')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_show_cart_events_show_id ON public.show_cart_events(show_id);
CREATE INDEX IF NOT EXISTS idx_show_cart_events_user_id ON public.show_cart_events(user_id);
CREATE INDEX IF NOT EXISTS idx_show_cart_events_product_id ON public.show_cart_events(product_id);

-- Enable RLS
ALTER TABLE public.show_cart_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "Users can view own show cart events"
  ON public.show_cart_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own events
CREATE POLICY "Users can insert own show cart events"
  ON public.show_cart_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sellers can view events for their shows
CREATE POLICY "Sellers can view show cart events for their shows"
  ON public.show_cart_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = show_cart_events.show_id
      AND shows.seller_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Add show_id to orders table for show-level order tracking
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES public.shows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_show_id ON public.orders(show_id);

-- ============================================================
-- 4. Function to clean up expired reservations
--    Call this periodically or via a cron job
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove cart items whose reservation has expired
  DELETE FROM public.cart_items
  WHERE reserved_until IS NOT NULL
    AND reserved_until < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================
-- 5. View for show sales summary (used by the host)
-- ============================================================
CREATE OR REPLACE VIEW public.show_sales_summary AS
SELECT
  o.show_id,
  COUNT(DISTINCT o.id) AS total_orders,
  COUNT(DISTINCT o.user_id) AS unique_buyers,
  COALESCE(SUM(o.total_amount), 0) AS total_revenue,
  COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
  COUNT(DISTINCT oi.product_id) AS unique_products_sold
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
WHERE o.show_id IS NOT NULL
  AND o.status = 'paid'
GROUP BY o.show_id;

-- ============================================================
-- 6. View for per-product breakdown within a show
-- ============================================================
CREATE OR REPLACE VIEW public.show_product_sales AS
SELECT
  o.show_id,
  oi.product_id,
  oi.product_name,
  oi.product_image,
  SUM(oi.quantity) AS quantity_sold,
  SUM(oi.unit_price * oi.quantity) AS revenue,
  COUNT(DISTINCT o.user_id) AS unique_buyers
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.show_id IS NOT NULL
  AND o.status = 'paid'
GROUP BY o.show_id, oi.product_id, oi.product_name, oi.product_image;

-- ============================================================
-- 7. Function to get reserved quantity for a product
--    Returns total quantity reserved across all active show carts
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_reserved_quantity(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  reserved INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO reserved
  FROM public.cart_items
  WHERE product_id = p_product_id
    AND reserved_until IS NOT NULL
    AND reserved_until > NOW();
  RETURN reserved;
END;
$$;

-- ============================================================
-- 8. View that exposes products with effective available stock
--    (actual stock minus active reservations)
-- ============================================================
CREATE OR REPLACE VIEW public.products_with_availability AS
SELECT
  p.*,
  COALESCE(p.quantity_in_stock, 0) AS raw_stock,
  COALESCE(p.quantity_in_stock, 0) - COALESCE(r.reserved_qty, 0) AS available_stock,
  COALESCE(r.reserved_qty, 0) AS reserved_stock
FROM public.products p
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS reserved_qty
  FROM public.cart_items
  WHERE reserved_until IS NOT NULL
    AND reserved_until > NOW()
  GROUP BY product_id
) r ON r.product_id = p.id;

-- ============================================================
-- 9. Enable realtime for show_cart_events
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.show_cart_events;
