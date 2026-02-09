-- Seed random products for user "steven" (jatangoautomationstore1)
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
  steven_id UUID;
BEGIN
  -- Find Jatangoautomation's profile
  SELECT id INTO steven_id FROM public.profiles
  WHERE store_name ILIKE '%jatangoautomation%' OR name ILIKE '%jatangoautomation%'
  LIMIT 1;

  IF steven_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Steven''s profile. Check the profiles table for the correct name.';
  END IF;

  RAISE NOTICE 'Found Steven with ID: %', steven_id;

  -- Insert 12 products across different categories
  INSERT INTO public.products (name, price, msrp, description, category, image, images, quantity_in_stock, seller_id, colors, sizes, weight, weight_unit, sku) VALUES

  -- Clothing
  ('Classic Crew Neck Tee', 24.99, 34.99, 'Soft cotton crew neck t-shirt. Perfect for everyday wear.', 'Clothing',
   'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
   9999, steven_id,
   '[{"id":"c1","name":"Black","hex":"#000000"},{"id":"c2","name":"White","hex":"#FFFFFF"},{"id":"c3","name":"Navy","hex":"#1E3A5F"},{"id":"c4","name":"Heather Grey","hex":"#B0B0B0"}]'::jsonb,
   '[{"id":"s1","name":"S"},{"id":"s2","name":"M"},{"id":"s3","name":"L"},{"id":"s4","name":"XL"}]'::jsonb,
   6.0, 'oz', 'TEE-001'),

  ('Vintage Wash Hoodie', 54.99, 74.99, 'Heavyweight vintage wash hoodie with kangaroo pocket and drawstring hood.', 'Clothing',
   'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'],
   7500, steven_id,
   '[{"id":"c1","name":"Washed Black","hex":"#2C2C2C"},{"id":"c2","name":"Forest Green","hex":"#228B22"},{"id":"c3","name":"Burgundy","hex":"#800020"}]'::jsonb,
   '[{"id":"s1","name":"S"},{"id":"s2","name":"M"},{"id":"s3","name":"L"},{"id":"s4","name":"XL"},{"id":"s5","name":"2XL"}]'::jsonb,
   14.0, 'oz', 'HOOD-001'),

  ('Slim Fit Joggers', 39.99, 49.99, 'Tapered joggers with elastic waistband and zippered pockets.', 'Clothing',
   'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400', ARRAY['https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800'],
   8000, steven_id,
   '[{"id":"c1","name":"Black","hex":"#000000"},{"id":"c2","name":"Grey","hex":"#808080"},{"id":"c3","name":"Olive","hex":"#556B2F"}]'::jsonb,
   '[{"id":"s1","name":"S"},{"id":"s2","name":"M"},{"id":"s3","name":"L"},{"id":"s4","name":"XL"}]'::jsonb,
   10.0, 'oz', 'JOG-001'),

  -- Accessories
  ('Leather Minimalist Wallet', 29.99, 44.99, 'Slim genuine leather wallet with RFID blocking. Holds 6 cards + cash.', 'Accessories',
   'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', ARRAY['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'],
   5000, steven_id,
   '[{"id":"c1","name":"Brown","hex":"#8B4513"},{"id":"c2","name":"Black","hex":"#000000"},{"id":"c3","name":"Tan","hex":"#D2B48C"}]'::jsonb,
   '[]'::jsonb,
   2.5, 'oz', 'WAL-001'),

  ('Polarized Aviator Sunglasses', 34.99, 59.99, 'UV400 polarized lenses with lightweight metal frame.', 'Accessories',
   'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', ARRAY['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800'],
   6000, steven_id,
   '[{"id":"c1","name":"Gold/Green","hex":"#DAA520"},{"id":"c2","name":"Silver/Blue","hex":"#C0C0C0"},{"id":"c3","name":"Black/Grey","hex":"#333333"}]'::jsonb,
   '[]'::jsonb,
   1.2, 'oz', 'SUN-001'),

  ('Canvas Weekender Bag', 64.99, 89.99, 'Waxed canvas duffle bag with leather handles. Perfect for weekend trips.', 'Accessories',
   'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
   3000, steven_id,
   '[{"id":"c1","name":"Olive","hex":"#556B2F"},{"id":"c2","name":"Navy","hex":"#1E3A5F"},{"id":"c3","name":"Charcoal","hex":"#36454F"}]'::jsonb,
   '[]'::jsonb,
   2.0, 'lb', 'BAG-001'),

  -- Electronics / Tech
  ('Wireless Charging Pad', 19.99, 29.99, '15W fast wireless charger compatible with all Qi-enabled devices. LED indicator.', 'Electronics',
   'https://images.unsplash.com/photo-1622445275576-721325763afe?w=400', ARRAY['https://images.unsplash.com/photo-1622445275576-721325763afe?w=800'],
   15000, steven_id,
   '[{"id":"c1","name":"White","hex":"#FFFFFF"},{"id":"c2","name":"Black","hex":"#000000"}]'::jsonb,
   '[]'::jsonb,
   4.0, 'oz', 'CHG-001'),

  ('Bluetooth Speaker Mini', 44.99, 59.99, 'Portable waterproof Bluetooth 5.0 speaker. 12-hour battery life.', 'Electronics',
   'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', ARRAY['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800'],
   4500, steven_id,
   '[{"id":"c1","name":"Midnight Blue","hex":"#191970"},{"id":"c2","name":"Red","hex":"#DC143C"},{"id":"c3","name":"Sage","hex":"#9DC183"}]'::jsonb,
   '[]'::jsonb,
   8.0, 'oz', 'SPK-001'),

  -- Home
  ('Scented Soy Candle Set', 22.99, 34.99, 'Set of 3 hand-poured soy candles. Lavender, Vanilla, and Cedar scents. 40hr burn time each.', 'Home',
   'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=400', ARRAY['https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=800'],
   10000, steven_id,
   '[]'::jsonb,
   '[]'::jsonb,
   1.5, 'lb', 'CND-001'),

  ('Ceramic Pour-Over Coffee Set', 38.99, 54.99, 'Handmade ceramic dripper with matching mug and bamboo stand.', 'Home',
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', ARRAY['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
   8500, steven_id,
   '[{"id":"c1","name":"Matte White","hex":"#F5F5F5"},{"id":"c2","name":"Speckled Grey","hex":"#A9A9A9"},{"id":"c3","name":"Terracotta","hex":"#E2725B"}]'::jsonb,
   '[]'::jsonb,
   1.8, 'lb', 'COF-001'),

  -- Sports / Fitness
  ('Resistance Band Set (5-Pack)', 18.99, 29.99, 'Latex-free resistance bands with 5 levels. Includes carrying pouch and exercise guide.', 'Fitness',
   'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400', ARRAY['https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800'],
   12000, steven_id,
   '[]'::jsonb,
   '[]'::jsonb,
   12.0, 'oz', 'FIT-001'),

  ('Stainless Steel Water Bottle', 16.99, 24.99, 'Double-wall vacuum insulated. Keeps drinks cold 24hrs or hot 12hrs. 32oz.', 'Fitness',
   'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
   20000, steven_id,
   '[{"id":"c1","name":"Matte Black","hex":"#1C1C1C"},{"id":"c2","name":"Arctic White","hex":"#F8F8FF"},{"id":"c3","name":"Ocean Blue","hex":"#0077BE"},{"id":"c4","name":"Rose Gold","hex":"#B76E79"}]'::jsonb,
   '[]'::jsonb,
   14.0, 'oz', 'BTL-001');

  RAISE NOTICE 'Successfully inserted 12 products for Steven (ID: %)', steven_id;
END $$;
