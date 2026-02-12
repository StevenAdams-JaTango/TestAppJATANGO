-- ============================================================
-- Normalize JSONB variants, colors, and sizes into relational tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Create product_colors table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_colors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT,
  name TEXT NOT NULL,
  hex_code TEXT,
  image TEXT,
  price DECIMAL(10,2),
  msrp DECIMAL(10,2),
  cost DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  weight DECIMAL(10,2),
  weight_unit TEXT,
  length DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  dimension_unit TEXT,
  is_archived BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON public.product_colors(product_id);

-- ============================================================
-- 2. Create product_sizes table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT,
  name TEXT NOT NULL,
  image TEXT,
  price DECIMAL(10,2),
  msrp DECIMAL(10,2),
  cost DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  weight DECIMAL(10,2),
  weight_unit TEXT,
  length DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  dimension_unit TEXT,
  is_archived BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON public.product_sizes(product_id);

-- ============================================================
-- 3. Create product_variants table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT,
  color_id TEXT,
  color_name TEXT,
  size_id TEXT,
  size_name TEXT,
  sku TEXT,
  barcode TEXT,
  price DECIMAL(10,2),
  msrp DECIMAL(10,2),
  cost DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  weight DECIMAL(10,2),
  weight_unit TEXT,
  length DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  dimension_unit TEXT,
  image TEXT,
  is_archived BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku) WHERE sku IS NOT NULL;

-- ============================================================
-- 4. Enable RLS
-- ============================================================
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- product_colors policies
CREATE POLICY "Product colors are viewable by everyone"
  ON public.product_colors FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage own product colors"
  ON public.product_colors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_colors.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- product_sizes policies
CREATE POLICY "Product sizes are viewable by everyone"
  ON public.product_sizes FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage own product sizes"
  ON public.product_sizes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_sizes.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- product_variants policies
CREATE POLICY "Product variants are viewable by everyone"
  ON public.product_variants FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage own product variants"
  ON public.product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_variants.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Atomic stock decrement RPC functions
-- ============================================================

-- Decrement variant-level stock (atomic, prevents overselling)
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  UPDATE public.product_variants
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_variant_id
    AND stock_quantity >= p_quantity
  RETURNING stock_quantity INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
  END IF;

  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement product-level stock (atomic, for non-variant products)
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  UPDATE public.products
  SET quantity_in_stock = quantity_in_stock - p_quantity
  WHERE id = p_product_id
    AND quantity_in_stock >= p_quantity
  RETURNING quantity_in_stock INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;

  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Migrate existing JSONB data into new tables
-- ============================================================

-- Migrate colors
INSERT INTO public.product_colors (product_id, name, hex_code, image, price, msrp, cost, stock_quantity, sku, barcode, weight, weight_unit, is_archived, display_order)
SELECT
  p.id AS product_id,
  c->>'name' AS name,
  c->>'hexCode' AS hex_code,
  c->>'image' AS image,
  (c->>'price')::DECIMAL(10,2) AS price,
  (c->>'msrp')::DECIMAL(10,2) AS msrp,
  (c->>'cost')::DECIMAL(10,2) AS cost,
  COALESCE((c->>'stockQuantity')::INTEGER, 0) AS stock_quantity,
  c->>'sku' AS sku,
  c->>'barcode' AS barcode,
  (c->>'weight')::DECIMAL(10,2) AS weight,
  c->>'weightUnit' AS weight_unit,
  COALESCE((c->>'isArchived')::BOOLEAN, false) AS is_archived,
  idx AS display_order
FROM public.products p,
     jsonb_array_elements(p.colors) WITH ORDINALITY AS t(c, idx)
WHERE p.colors IS NOT NULL AND jsonb_array_length(p.colors) > 0;

-- Migrate sizes
INSERT INTO public.product_sizes (product_id, name, image, price, msrp, cost, stock_quantity, sku, barcode, weight, weight_unit, is_archived, display_order)
SELECT
  p.id AS product_id,
  s->>'name' AS name,
  s->>'image' AS image,
  (s->>'price')::DECIMAL(10,2) AS price,
  (s->>'msrp')::DECIMAL(10,2) AS msrp,
  (s->>'cost')::DECIMAL(10,2) AS cost,
  COALESCE((s->>'stockQuantity')::INTEGER, 0) AS stock_quantity,
  s->>'sku' AS sku,
  s->>'barcode' AS barcode,
  (s->>'weight')::DECIMAL(10,2) AS weight,
  s->>'weightUnit' AS weight_unit,
  COALESCE((s->>'isArchived')::BOOLEAN, false) AS is_archived,
  idx AS display_order
FROM public.products p,
     jsonb_array_elements(p.sizes) WITH ORDINALITY AS t(s, idx)
WHERE p.sizes IS NOT NULL AND jsonb_array_length(p.sizes) > 0;

-- Migrate variants
INSERT INTO public.product_variants (product_id, color_id, color_name, size_id, size_name, sku, barcode, price, msrp, cost, stock_quantity, weight, weight_unit, length, width, height, dimension_unit, image, is_archived, display_order)
SELECT
  p.id AS product_id,
  v->>'colorId' AS color_id,
  v->>'colorName' AS color_name,
  v->>'sizeId' AS size_id,
  v->>'sizeName' AS size_name,
  v->>'sku' AS sku,
  v->>'barcode' AS barcode,
  (v->>'price')::DECIMAL(10,2) AS price,
  (v->>'msrp')::DECIMAL(10,2) AS msrp,
  (v->>'cost')::DECIMAL(10,2) AS cost,
  COALESCE((v->>'stockQuantity')::INTEGER, 0) AS stock_quantity,
  (v->>'weight')::DECIMAL(10,2) AS weight,
  v->>'weightUnit' AS weight_unit,
  (v->>'length')::DECIMAL(10,2) AS length,
  (v->>'width')::DECIMAL(10,2) AS width,
  (v->>'height')::DECIMAL(10,2) AS height,
  v->>'dimensionUnit' AS dimension_unit,
  v->>'image' AS image,
  COALESCE((v->>'isArchived')::BOOLEAN, false) AS is_archived,
  idx AS display_order
FROM public.products p,
     jsonb_array_elements(p.variants) WITH ORDINALITY AS t(v, idx)
WHERE p.variants IS NOT NULL AND jsonb_array_length(p.variants) > 0;

-- ============================================================
-- 7. Enable realtime for new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_colors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_sizes;

-- ============================================================
-- NOTE: JSONB columns (colors, sizes, variants) are kept on
-- the products table for now as a rollback safety net.
-- They will be dropped in a future cleanup migration after
-- verifying everything works correctly.
-- ============================================================
