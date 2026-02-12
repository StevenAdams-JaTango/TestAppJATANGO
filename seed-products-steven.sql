-- Seed 10 products for Steven using normalized variant tables
-- Stock is set on product_variants rows so nothing shows as "out of stock"
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Also run supabase-add-client-id-migration.sql first if you haven't

DO $$
DECLARE
  steven_id UUID;
  pid UUID;  -- reusable product id
  cid1 TEXT; cid2 TEXT; cid3 TEXT; cid4 TEXT;
  sid1 TEXT; sid2 TEXT; sid3 TEXT; sid4 TEXT; sid5 TEXT;
  ord INT;
BEGIN
  -- Find Steven's profile
  SELECT id INTO steven_id FROM public.profiles
  WHERE store_name ILIKE '%jatangoautomation%' OR name ILIKE '%jatangoautomation%'
  LIMIT 1;

  IF steven_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Steven''s profile.';
  END IF;

  RAISE NOTICE 'Found Steven with ID: %', steven_id;

  -- Clean up old products for Steven (cascade deletes normalized rows)
  DELETE FROM public.products WHERE seller_id = steven_id;

  -- ============================================================
  -- 1. Classic Crew Neck Tee (Clothing — 4 colors × 4 sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Classic Crew Neck Tee', 24.99, 34.99,
    'Soft cotton crew neck t-shirt. Perfect for everyday wear. Pre-shrunk fabric.',
    'Clothing',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
    0, 6.0, 'oz', 'TEE-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_tee_black'; cid2 := 'color_tee_white'; cid3 := 'color_tee_navy'; cid4 := 'color_tee_grey';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Black',        '#000000', 1),
    (pid, cid2, 'White',        '#FFFFFF', 2),
    (pid, cid3, 'Navy',         '#1E3A5F', 3),
    (pid, cid4, 'Heather Grey', '#B0B0B0', 4);

  sid1 := 'size_tee_s'; sid2 := 'size_tee_m'; sid3 := 'size_tee_l'; sid4 := 'size_tee_xl';
  INSERT INTO public.product_sizes (product_id, client_id, name, display_order) VALUES
    (pid, sid1, 'S',  1),
    (pid, sid2, 'M',  2),
    (pid, sid3, 'L',  3),
    (pid, sid4, 'XL', 4);

  ord := 0;
  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, size_id, size_name, price, msrp, stock_quantity, display_order)
  SELECT pid, 'var_tee_' || c.cid || '_' || s.sid, c.cid, c.cname, s.sid, s.sname, 24.99, 34.99, 150, row_number() OVER ()
  FROM (VALUES (cid1,'Black'),(cid2,'White'),(cid3,'Navy'),(cid4,'Heather Grey')) AS c(cid,cname),
       (VALUES (sid1,'S'),(sid2,'M'),(sid3,'L'),(sid4,'XL')) AS s(sid,sname);

  -- ============================================================
  -- 2. Vintage Wash Hoodie (Clothing — 3 colors × 5 sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Vintage Wash Hoodie', 54.99, 74.99,
    'Heavyweight vintage wash hoodie with kangaroo pocket and drawstring hood.',
    'Clothing',
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
    ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'],
    0, 14.0, 'oz', 'HOOD-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_hood_wblack'; cid2 := 'color_hood_green'; cid3 := 'color_hood_burg';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Washed Black',  '#2C2C2C', 1),
    (pid, cid2, 'Forest Green',  '#228B22', 2),
    (pid, cid3, 'Burgundy',      '#800020', 3);

  sid1 := 'size_hood_s'; sid2 := 'size_hood_m'; sid3 := 'size_hood_l'; sid4 := 'size_hood_xl'; sid5 := 'size_hood_2xl';
  INSERT INTO public.product_sizes (product_id, client_id, name, display_order) VALUES
    (pid, sid1, 'S',   1),
    (pid, sid2, 'M',   2),
    (pid, sid3, 'L',   3),
    (pid, sid4, 'XL',  4),
    (pid, sid5, '2XL', 5);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, size_id, size_name, price, msrp, stock_quantity, display_order)
  SELECT pid, 'var_hood_' || c.cid || '_' || s.sid, c.cid, c.cname, s.sid, s.sname, 54.99, 74.99, 100, row_number() OVER ()
  FROM (VALUES (cid1,'Washed Black'),(cid2,'Forest Green'),(cid3,'Burgundy')) AS c(cid,cname),
       (VALUES (sid1,'S'),(sid2,'M'),(sid3,'L'),(sid4,'XL'),(sid5,'2XL')) AS s(sid,sname);

  -- ============================================================
  -- 3. Slim Fit Joggers (Clothing — 3 colors × 4 sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Slim Fit Joggers', 39.99, 49.99,
    'Tapered joggers with elastic waistband and zippered pockets.',
    'Clothing',
    'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400',
    ARRAY['https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800'],
    0, 10.0, 'oz', 'JOG-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_jog_black'; cid2 := 'color_jog_grey'; cid3 := 'color_jog_olive';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Black', '#000000', 1),
    (pid, cid2, 'Grey',  '#808080', 2),
    (pid, cid3, 'Olive', '#556B2F', 3);

  sid1 := 'size_jog_s'; sid2 := 'size_jog_m'; sid3 := 'size_jog_l'; sid4 := 'size_jog_xl';
  INSERT INTO public.product_sizes (product_id, client_id, name, display_order) VALUES
    (pid, sid1, 'S',  1),
    (pid, sid2, 'M',  2),
    (pid, sid3, 'L',  3),
    (pid, sid4, 'XL', 4);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, size_id, size_name, price, msrp, stock_quantity, display_order)
  SELECT pid, 'var_jog_' || c.cid || '_' || s.sid, c.cid, c.cname, s.sid, s.sname, 39.99, 49.99, 120, row_number() OVER ()
  FROM (VALUES (cid1,'Black'),(cid2,'Grey'),(cid3,'Olive')) AS c(cid,cname),
       (VALUES (sid1,'S'),(sid2,'M'),(sid3,'L'),(sid4,'XL')) AS s(sid,sname);

  -- ============================================================
  -- 4. Leather Minimalist Wallet (Accessories — 3 colors, no sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Leather Minimalist Wallet', 29.99, 44.99,
    'Slim genuine leather wallet with RFID blocking. Holds 6 cards + cash.',
    'Accessories',
    'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
    ARRAY['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'],
    0, 2.5, 'oz', 'WAL-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_wal_brown'; cid2 := 'color_wal_black'; cid3 := 'color_wal_tan';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Brown', '#8B4513', 1),
    (pid, cid2, 'Black', '#000000', 2),
    (pid, cid3, 'Tan',   '#D2B48C', 3);

  -- Color-only variants (no sizes)
  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, price, msrp, stock_quantity, display_order) VALUES
    (pid, 'var_wal_brown', cid1, 'Brown', 29.99, 44.99, 500, 1),
    (pid, 'var_wal_black', cid2, 'Black', 29.99, 44.99, 500, 2),
    (pid, 'var_wal_tan',   cid3, 'Tan',   29.99, 44.99, 300, 3);

  -- ============================================================
  -- 5. Polarized Aviator Sunglasses (Accessories — 3 colors, no sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Polarized Aviator Sunglasses', 34.99, 59.99,
    'UV400 polarized lenses with lightweight metal frame.',
    'Accessories',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
    ARRAY['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800'],
    0, 1.2, 'oz', 'SUN-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_sun_gold'; cid2 := 'color_sun_silver'; cid3 := 'color_sun_black';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Gold/Green',   '#DAA520', 1),
    (pid, cid2, 'Silver/Blue',  '#C0C0C0', 2),
    (pid, cid3, 'Black/Grey',   '#333333', 3);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, price, msrp, stock_quantity, display_order) VALUES
    (pid, 'var_sun_gold',   cid1, 'Gold/Green',  34.99, 59.99, 600, 1),
    (pid, 'var_sun_silver', cid2, 'Silver/Blue', 34.99, 59.99, 600, 2),
    (pid, 'var_sun_black',  cid3, 'Black/Grey',  34.99, 59.99, 400, 3);

  -- ============================================================
  -- 6. Wireless Charging Pad (Electronics — 2 colors, no sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Wireless Charging Pad', 19.99, 29.99,
    '15W fast wireless charger compatible with all Qi-enabled devices. LED indicator.',
    'Electronics',
    'https://images.unsplash.com/photo-1622445275576-721325763afe?w=400',
    ARRAY['https://images.unsplash.com/photo-1622445275576-721325763afe?w=800'],
    0, 4.0, 'oz', 'CHG-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_chg_white'; cid2 := 'color_chg_black';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'White', '#FFFFFF', 1),
    (pid, cid2, 'Black', '#000000', 2);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, price, msrp, stock_quantity, display_order) VALUES
    (pid, 'var_chg_white', cid1, 'White', 19.99, 29.99, 1500, 1),
    (pid, 'var_chg_black', cid2, 'Black', 19.99, 29.99, 1500, 2);

  -- ============================================================
  -- 7. Bluetooth Speaker Mini (Electronics — 3 colors, no sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Bluetooth Speaker Mini', 44.99, 59.99,
    'Portable waterproof Bluetooth 5.0 speaker. 12-hour battery life.',
    'Electronics',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    ARRAY['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800'],
    0, 8.0, 'oz', 'SPK-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_spk_blue'; cid2 := 'color_spk_red'; cid3 := 'color_spk_sage';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Midnight Blue', '#191970', 1),
    (pid, cid2, 'Red',           '#DC143C', 2),
    (pid, cid3, 'Sage',          '#9DC183', 3);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, price, msrp, stock_quantity, display_order) VALUES
    (pid, 'var_spk_blue', cid1, 'Midnight Blue', 44.99, 59.99, 450, 1),
    (pid, 'var_spk_red',  cid2, 'Red',           44.99, 59.99, 450, 2),
    (pid, 'var_spk_sage', cid3, 'Sage',          44.99, 59.99, 300, 3);

  -- ============================================================
  -- 8. Scented Soy Candle Set (Home — no colors, no sizes, simple product)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Scented Soy Candle Set', 22.99, 34.99,
    'Set of 3 hand-poured soy candles. Lavender, Vanilla, and Cedar scents. 40hr burn time each.',
    'Home & Garden',
    'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=400',
    ARRAY['https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=800'],
    10000, 1.5, 'lb', 'CND-001', steven_id);
  -- No variants — stock is on the product row

  -- ============================================================
  -- 9. Ceramic Pour-Over Coffee Set (Home — 3 colors, no sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Ceramic Pour-Over Coffee Set', 38.99, 54.99,
    'Handmade ceramic dripper with matching mug and bamboo stand.',
    'Home & Garden',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    ARRAY['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
    0, 1.8, 'lb', 'COF-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_cof_white'; cid2 := 'color_cof_grey'; cid3 := 'color_cof_terra';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Matte White',    '#F5F5F5', 1),
    (pid, cid2, 'Speckled Grey',  '#A9A9A9', 2),
    (pid, cid3, 'Terracotta',     '#E2725B', 3);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, price, msrp, stock_quantity, display_order) VALUES
    (pid, 'var_cof_white', cid1, 'Matte White',   38.99, 54.99, 850, 1),
    (pid, 'var_cof_grey',  cid2, 'Speckled Grey',  38.99, 54.99, 850, 2),
    (pid, 'var_cof_terra', cid3, 'Terracotta',     38.99, 54.99, 500, 3);

  -- ============================================================
  -- 10. Stainless Steel Water Bottle (Fitness — 4 colors, no sizes)
  -- ============================================================
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, weight, weight_unit, sku, seller_id)
  VALUES ('Stainless Steel Water Bottle', 16.99, 24.99,
    'Double-wall vacuum insulated. Keeps drinks cold 24hrs or hot 12hrs. 32oz.',
    'Sports',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
    0, 14.0, 'oz', 'BTL-001', steven_id)
  RETURNING id INTO pid;

  cid1 := 'color_btl_black'; cid2 := 'color_btl_white'; cid3 := 'color_btl_blue'; cid4 := 'color_btl_rose';
  INSERT INTO public.product_colors (product_id, client_id, name, hex_code, display_order) VALUES
    (pid, cid1, 'Matte Black', '#1C1C1C', 1),
    (pid, cid2, 'Arctic White', '#F8F8FF', 2),
    (pid, cid3, 'Ocean Blue',  '#0077BE', 3),
    (pid, cid4, 'Rose Gold',   '#B76E79', 4);

  INSERT INTO public.product_variants (product_id, client_id, color_id, color_name, price, msrp, stock_quantity, display_order) VALUES
    (pid, 'var_btl_black', cid1, 'Matte Black', 16.99, 24.99, 2000, 1),
    (pid, 'var_btl_white', cid2, 'Arctic White', 16.99, 24.99, 2000, 2),
    (pid, 'var_btl_blue',  cid3, 'Ocean Blue',  16.99, 24.99, 1500, 3),
    (pid, 'var_btl_rose',  cid4, 'Rose Gold',   16.99, 24.99, 1000, 4);

  RAISE NOTICE 'Done! Inserted 10 products with normalized variants for Steven (ID: %)', steven_id;
END $$;
