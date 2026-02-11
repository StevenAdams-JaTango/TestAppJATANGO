-- Seed Products for steven
-- Run in Supabase SQL Editor
-- Deletes existing products first, then inserts 15 new random products

-- Delete dependent rows that reference steven's products first
-- (show_cart_events and order_items have ON DELETE SET NULL + NOT NULL conflicts)
DELETE FROM public.show_cart_events
WHERE product_id IN (
  SELECT id FROM public.products
  WHERE seller_id = (
    SELECT id FROM public.profiles
    WHERE name ILIKE '%steven%'
    LIMIT 1
  )
);

DELETE FROM public.order_items
WHERE product_id IN (
  SELECT id FROM public.products
  WHERE seller_id = (
    SELECT id FROM public.profiles
    WHERE name ILIKE '%steven%'
    LIMIT 1
  )
);

DELETE FROM public.products
WHERE seller_id = (
  SELECT id FROM public.profiles
  WHERE name ILIKE '%steven%'
  LIMIT 1
);

DO $$
DECLARE
  v_seller_id UUID;
BEGIN
  SELECT id INTO v_seller_id FROM public.profiles
  WHERE name ILIKE '%steven%'
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Could not find steven user.';
  END IF;

  -- ============================================================
  -- 1. Vintage Wash Henley (3 colors × 4 sizes)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, sizes, variants, seller_id
  ) VALUES (
    'Vintage Wash Henley', 32.99, 44.99,
    'https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=600',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600'
    ],
    'Garment-dyed henley with a lived-in feel. Three-button placket, relaxed fit. 100% ring-spun cotton.',
    'Clothing', 9, 'oz', 120, 'HEN-VINT',
    '[
      {"id":"c1-rust","name":"Rust","hexCode":"#B7410E","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":9,"weightUnit":"oz","stockQuantity":40},
      {"id":"c1-sage","name":"Sage","hexCode":"#9CAF88","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":32.99,"weight":9,"weightUnit":"oz","stockQuantity":40},
      {"id":"c1-sand","name":"Sand","hexCode":"#C2B280","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":9,"weightUnit":"oz","stockQuantity":40}
    ]'::jsonb,
    '[
      {"id":"s1-s","name":"S","price":32.99,"weight":8,"weightUnit":"oz","stockQuantity":30},
      {"id":"s1-m","name":"M","price":32.99,"weight":9,"weightUnit":"oz","stockQuantity":35},
      {"id":"s1-l","name":"L","price":32.99,"weight":9,"weightUnit":"oz","stockQuantity":35},
      {"id":"s1-xl","name":"XL","price":34.99,"weight":10,"weightUnit":"oz","stockQuantity":20}
    ]'::jsonb,
    '[
      {"id":"v1-rust-s","colorId":"c1-rust","colorName":"Rust","sizeId":"s1-s","sizeName":"S","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"HEN-RST-S"},
      {"id":"v1-rust-m","colorId":"c1-rust","colorName":"Rust","sizeId":"s1-m","sizeName":"M","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":9,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":12,"sku":"HEN-RST-M"},
      {"id":"v1-rust-l","colorId":"c1-rust","colorName":"Rust","sizeId":"s1-l","sizeName":"L","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":9,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":12,"sku":"HEN-RST-L"},
      {"id":"v1-rust-xl","colorId":"c1-rust","colorName":"Rust","sizeId":"s1-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":34.99,"weight":10,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"HEN-RST-XL"},
      {"id":"v1-sage-s","colorId":"c1-sage","colorName":"Sage","sizeId":"s1-s","sizeName":"S","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":32.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"HEN-SAG-S"},
      {"id":"v1-sage-m","colorId":"c1-sage","colorName":"Sage","sizeId":"s1-m","sizeName":"M","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":32.99,"weight":9,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":12,"sku":"HEN-SAG-M"},
      {"id":"v1-sage-l","colorId":"c1-sage","colorName":"Sage","sizeId":"s1-l","sizeName":"L","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":32.99,"weight":9,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":12,"sku":"HEN-SAG-L"},
      {"id":"v1-sage-xl","colorId":"c1-sage","colorName":"Sage","sizeId":"s1-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":34.99,"weight":10,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"HEN-SAG-XL"},
      {"id":"v1-sand-s","colorId":"c1-sand","colorName":"Sand","sizeId":"s1-s","sizeName":"S","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"HEN-SND-S"},
      {"id":"v1-sand-m","colorId":"c1-sand","colorName":"Sand","sizeId":"s1-m","sizeName":"M","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":9,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":11,"sku":"HEN-SND-M"},
      {"id":"v1-sand-l","colorId":"c1-sand","colorName":"Sand","sizeId":"s1-l","sizeName":"L","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":32.99,"weight":9,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":11,"sku":"HEN-SND-L"},
      {"id":"v1-sand-xl","colorId":"c1-sand","colorName":"Sand","sizeId":"s1-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400","price":34.99,"weight":10,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"HEN-SND-XL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 2. Cargo Utility Shorts (3 colors × 4 sizes)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, sizes, variants, seller_id
  ) VALUES (
    'Cargo Utility Shorts', 38.99, 54.99,
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600',
      'https://images.unsplash.com/photo-1565084888279-aca5ecc8f8e5?w=600'
    ],
    'Ripstop cargo shorts with six pockets. Relaxed fit with drawstring waist. Great for hiking or everyday wear.',
    'Clothing', 12, 'oz', 90, 'SHORT-CARGO',
    '[
      {"id":"c2-khaki","name":"Khaki","hexCode":"#C3B091","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":12,"weightUnit":"oz","stockQuantity":30},
      {"id":"c2-navy","name":"Navy","hexCode":"#1B2A4A","image":"https://images.unsplash.com/photo-1565084888279-aca5ecc8f8e5?w=400","price":38.99,"weight":12,"weightUnit":"oz","stockQuantity":30},
      {"id":"c2-olive","name":"Olive","hexCode":"#556B2F","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":12,"weightUnit":"oz","stockQuantity":30}
    ]'::jsonb,
    '[
      {"id":"s2-s","name":"S","price":38.99,"weight":11,"weightUnit":"oz","stockQuantity":20},
      {"id":"s2-m","name":"M","price":38.99,"weight":12,"weightUnit":"oz","stockQuantity":25},
      {"id":"s2-l","name":"L","price":38.99,"weight":12,"weightUnit":"oz","stockQuantity":25},
      {"id":"s2-xl","name":"XL","price":40.99,"weight":13,"weightUnit":"oz","stockQuantity":20}
    ]'::jsonb,
    '[
      {"id":"v2-kh-s","colorId":"c2-khaki","colorName":"Khaki","sizeId":"s2-s","sizeName":"S","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":11,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"SHT-KH-S"},
      {"id":"v2-kh-m","colorId":"c2-khaki","colorName":"Khaki","sizeId":"s2-m","sizeName":"M","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":12,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"SHT-KH-M"},
      {"id":"v2-kh-l","colorId":"c2-khaki","colorName":"Khaki","sizeId":"s2-l","sizeName":"L","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":12,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"SHT-KH-L"},
      {"id":"v2-kh-xl","colorId":"c2-khaki","colorName":"Khaki","sizeId":"s2-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":40.99,"weight":13,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"SHT-KH-XL"},
      {"id":"v2-nv-s","colorId":"c2-navy","colorName":"Navy","sizeId":"s2-s","sizeName":"S","image":"https://images.unsplash.com/photo-1565084888279-aca5ecc8f8e5?w=400","price":38.99,"weight":11,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"SHT-NV-S"},
      {"id":"v2-nv-m","colorId":"c2-navy","colorName":"Navy","sizeId":"s2-m","sizeName":"M","image":"https://images.unsplash.com/photo-1565084888279-aca5ecc8f8e5?w=400","price":38.99,"weight":12,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":9,"sku":"SHT-NV-M"},
      {"id":"v2-nv-l","colorId":"c2-navy","colorName":"Navy","sizeId":"s2-l","sizeName":"L","image":"https://images.unsplash.com/photo-1565084888279-aca5ecc8f8e5?w=400","price":38.99,"weight":12,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":9,"sku":"SHT-NV-L"},
      {"id":"v2-nv-xl","colorId":"c2-navy","colorName":"Navy","sizeId":"s2-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1565084888279-aca5ecc8f8e5?w=400","price":40.99,"weight":13,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"SHT-NV-XL"},
      {"id":"v2-ol-s","colorId":"c2-olive","colorName":"Olive","sizeId":"s2-s","sizeName":"S","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":11,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"SHT-OL-S"},
      {"id":"v2-ol-m","colorId":"c2-olive","colorName":"Olive","sizeId":"s2-m","sizeName":"M","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":12,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"SHT-OL-M"},
      {"id":"v2-ol-l","colorId":"c2-olive","colorName":"Olive","sizeId":"s2-l","sizeName":"L","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":38.99,"weight":12,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"SHT-OL-L"},
      {"id":"v2-ol-xl","colorId":"c2-olive","colorName":"Olive","sizeId":"s2-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400","price":40.99,"weight":13,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"SHT-OL-XL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 3. Quilted Puffer Vest (2 colors × 3 sizes)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, sizes, variants, seller_id
  ) VALUES (
    'Quilted Puffer Vest', 64.99, 89.99,
    'https://images.unsplash.com/photo-1544923246-77307dd270b1?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1544923246-77307dd270b1?w=600',
      'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600'
    ],
    'Lightweight quilted puffer vest with stand collar. Water-resistant shell, synthetic down fill. Packable design.',
    'Clothing', 16, 'oz', 60, 'VEST-PUFF',
    '[
      {"id":"c3-blk","name":"Black","hexCode":"#1A1A1A","image":"https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400","price":64.99,"weight":16,"weightUnit":"oz","stockQuantity":30},
      {"id":"c3-tan","name":"Tan","hexCode":"#D2B48C","image":"https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400","price":64.99,"weight":16,"weightUnit":"oz","stockQuantity":30}
    ]'::jsonb,
    '[
      {"id":"s3-m","name":"M","price":64.99,"weight":16,"weightUnit":"oz","stockQuantity":20},
      {"id":"s3-l","name":"L","price":64.99,"weight":17,"weightUnit":"oz","stockQuantity":20},
      {"id":"s3-xl","name":"XL","price":69.99,"weight":18,"weightUnit":"oz","stockQuantity":20}
    ]'::jsonb,
    '[
      {"id":"v3-blk-m","colorId":"c3-blk","colorName":"Black","sizeId":"s3-m","sizeName":"M","image":"https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400","price":64.99,"weight":16,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"VEST-BK-M"},
      {"id":"v3-blk-l","colorId":"c3-blk","colorName":"Black","sizeId":"s3-l","sizeName":"L","image":"https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400","price":64.99,"weight":17,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"VEST-BK-L"},
      {"id":"v3-blk-xl","colorId":"c3-blk","colorName":"Black","sizeId":"s3-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1544923246-77307dd270b1?w=400","price":69.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"VEST-BK-XL"},
      {"id":"v3-tan-m","colorId":"c3-tan","colorName":"Tan","sizeId":"s3-m","sizeName":"M","image":"https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400","price":64.99,"weight":16,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"VEST-TN-M"},
      {"id":"v3-tan-l","colorId":"c3-tan","colorName":"Tan","sizeId":"s3-l","sizeName":"L","image":"https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400","price":64.99,"weight":17,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"VEST-TN-L"},
      {"id":"v3-tan-xl","colorId":"c3-tan","colorName":"Tan","sizeId":"s3-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400","price":69.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":10,"sku":"VEST-TN-XL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 4. Linen Button-Down Shirt (3 colors × 4 sizes)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, sizes, variants, seller_id
  ) VALUES (
    'Linen Button-Down Shirt', 48.99, 68.00,
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=600'
    ],
    'Relaxed-fit linen shirt with a spread collar. Breathable and perfect for warm weather.',
    'Clothing', 7, 'oz', 70, 'SHIRT-LINEN',
    '[
      {"id":"c4-wht","name":"White","hexCode":"#FAFAFA","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":7,"weightUnit":"oz","stockQuantity":25},
      {"id":"c4-sky","name":"Sky Blue","hexCode":"#87CEEB","image":"https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=400","price":48.99,"weight":7,"weightUnit":"oz","stockQuantity":25},
      {"id":"c4-blush","name":"Blush","hexCode":"#DE5D83","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":7,"weightUnit":"oz","stockQuantity":20}
    ]'::jsonb,
    '[
      {"id":"s4-s","name":"S","price":48.99,"weight":6,"weightUnit":"oz","stockQuantity":15},
      {"id":"s4-m","name":"M","price":48.99,"weight":7,"weightUnit":"oz","stockQuantity":20},
      {"id":"s4-l","name":"L","price":48.99,"weight":7,"weightUnit":"oz","stockQuantity":20},
      {"id":"s4-xl","name":"XL","price":52.99,"weight":8,"weightUnit":"oz","stockQuantity":15}
    ]'::jsonb,
    '[
      {"id":"v4-wht-s","colorId":"c4-wht","colorName":"White","sizeId":"s4-s","sizeName":"S","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"LIN-WH-S"},
      {"id":"v4-wht-m","colorId":"c4-wht","colorName":"White","sizeId":"s4-m","sizeName":"M","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"LIN-WH-M"},
      {"id":"v4-wht-l","colorId":"c4-wht","colorName":"White","sizeId":"s4-l","sizeName":"L","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"LIN-WH-L"},
      {"id":"v4-wht-xl","colorId":"c4-wht","colorName":"White","sizeId":"s4-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":52.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"LIN-WH-XL"},
      {"id":"v4-sky-s","colorId":"c4-sky","colorName":"Sky Blue","sizeId":"s4-s","sizeName":"S","image":"https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=400","price":48.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"LIN-SK-S"},
      {"id":"v4-sky-m","colorId":"c4-sky","colorName":"Sky Blue","sizeId":"s4-m","sizeName":"M","image":"https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=400","price":48.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"LIN-SK-M"},
      {"id":"v4-sky-l","colorId":"c4-sky","colorName":"Sky Blue","sizeId":"s4-l","sizeName":"L","image":"https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=400","price":48.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"LIN-SK-L"},
      {"id":"v4-sky-xl","colorId":"c4-sky","colorName":"Sky Blue","sizeId":"s4-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=400","price":52.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"LIN-SK-XL"},
      {"id":"v4-blush-s","colorId":"c4-blush","colorName":"Blush","sizeId":"s4-s","sizeName":"S","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"LIN-BL-S"},
      {"id":"v4-blush-m","colorId":"c4-blush","colorName":"Blush","sizeId":"s4-m","sizeName":"M","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"LIN-BL-M"},
      {"id":"v4-blush-l","colorId":"c4-blush","colorName":"Blush","sizeId":"s4-l","sizeName":"L","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":48.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"LIN-BL-L"},
      {"id":"v4-blush-xl","colorId":"c4-blush","colorName":"Blush","sizeId":"s4-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400","price":52.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":3,"sku":"LIN-BL-XL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 5. Leather Crossbody Bag (3 colors, color-only)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, variants, seller_id
  ) VALUES (
    'Leather Crossbody Bag', 54.99, 79.00,
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600'
    ],
    'Compact crossbody with adjustable strap. Full-grain leather with brass hardware.',
    'Bags', 14, 'oz', 45, 'BAG-CROSS',
    '[
      {"id":"c5-cognac","name":"Cognac","hexCode":"#9A4E1C","image":"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400","price":54.99,"weight":14,"weightUnit":"oz","stockQuantity":15},
      {"id":"c5-blk","name":"Black","hexCode":"#1A1A1A","image":"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400","price":54.99,"weight":14,"weightUnit":"oz","stockQuantity":15},
      {"id":"c5-olive","name":"Olive","hexCode":"#556B2F","image":"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400","price":54.99,"weight":14,"weightUnit":"oz","stockQuantity":15}
    ]'::jsonb,
    '[
      {"id":"v5-cognac","colorId":"c5-cognac","colorName":"Cognac","image":"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400","price":54.99,"weight":14,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":15,"sku":"BAG-COG"},
      {"id":"v5-blk","colorId":"c5-blk","colorName":"Black","image":"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400","price":54.99,"weight":14,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":15,"sku":"BAG-BK"},
      {"id":"v5-olive","colorId":"c5-olive","colorName":"Olive","image":"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400","price":54.99,"weight":14,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":15,"sku":"BAG-OL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 6. Bluetooth Speaker (2 colors, color-only)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, variants, seller_id
  ) VALUES (
    'Portable Bluetooth Speaker', 39.99, 59.99,
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600',
      'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600'
    ],
    'Waterproof IPX7 portable speaker. 12-hour battery, deep bass, built-in mic for calls.',
    'Electronics', 18, 'oz', 40, 'SPK-BT',
    '[
      {"id":"c6-blk","name":"Charcoal","hexCode":"#36454F","image":"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400","price":39.99,"weight":18,"weightUnit":"oz","stockQuantity":20},
      {"id":"c6-teal","name":"Teal","hexCode":"#008080","image":"https://images.unsplash.com/photo-1589003077984-894e133dabab?w=400","price":39.99,"weight":18,"weightUnit":"oz","stockQuantity":20}
    ]'::jsonb,
    '[
      {"id":"v6-blk","colorId":"c6-blk","colorName":"Charcoal","image":"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400","price":39.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":20,"sku":"SPK-CH"},
      {"id":"v6-teal","colorId":"c6-teal","colorName":"Teal","image":"https://images.unsplash.com/photo-1589003077984-894e133dabab?w=400","price":39.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":20,"sku":"SPK-TL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 7. Fleece Pullover (3 colors × 3 sizes)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, sizes, variants, seller_id
  ) VALUES (
    'Half-Zip Fleece Pullover', 56.99, 75.00,
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600',
      'https://images.unsplash.com/photo-1578768079470-0a4536e2b2c3?w=600'
    ],
    'Midweight fleece pullover with half-zip and stand collar. Anti-pill finish.',
    'Clothing', 18, 'oz', 55, 'FLEECE-HZ',
    '[
      {"id":"c7-oat","name":"Oatmeal","hexCode":"#D4C5A9","image":"https://images.unsplash.com/photo-1578768079470-0a4536e2b2c3?w=400","price":56.99,"weight":18,"weightUnit":"oz","stockQuantity":20},
      {"id":"c7-forest","name":"Forest","hexCode":"#228B22","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":56.99,"weight":18,"weightUnit":"oz","stockQuantity":20},
      {"id":"c7-navy","name":"Navy","hexCode":"#1B2A4A","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":56.99,"weight":18,"weightUnit":"oz","stockQuantity":15}
    ]'::jsonb,
    '[
      {"id":"s7-m","name":"M","price":56.99,"weight":18,"weightUnit":"oz","stockQuantity":20},
      {"id":"s7-l","name":"L","price":56.99,"weight":19,"weightUnit":"oz","stockQuantity":20},
      {"id":"s7-xl","name":"XL","price":59.99,"weight":20,"weightUnit":"oz","stockQuantity":15}
    ]'::jsonb,
    '[
      {"id":"v7-oat-m","colorId":"c7-oat","colorName":"Oatmeal","sizeId":"s7-m","sizeName":"M","image":"https://images.unsplash.com/photo-1578768079470-0a4536e2b2c3?w=400","price":56.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"FLC-OAT-M"},
      {"id":"v7-oat-l","colorId":"c7-oat","colorName":"Oatmeal","sizeId":"s7-l","sizeName":"L","image":"https://images.unsplash.com/photo-1578768079470-0a4536e2b2c3?w=400","price":56.99,"weight":19,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"FLC-OAT-L"},
      {"id":"v7-oat-xl","colorId":"c7-oat","colorName":"Oatmeal","sizeId":"s7-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1578768079470-0a4536e2b2c3?w=400","price":59.99,"weight":20,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"FLC-OAT-XL"},
      {"id":"v7-for-m","colorId":"c7-forest","colorName":"Forest","sizeId":"s7-m","sizeName":"M","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":56.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"FLC-FOR-M"},
      {"id":"v7-for-l","colorId":"c7-forest","colorName":"Forest","sizeId":"s7-l","sizeName":"L","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":56.99,"weight":19,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"FLC-FOR-L"},
      {"id":"v7-for-xl","colorId":"c7-forest","colorName":"Forest","sizeId":"s7-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":59.99,"weight":20,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"FLC-FOR-XL"},
      {"id":"v7-nvy-m","colorId":"c7-navy","colorName":"Navy","sizeId":"s7-m","sizeName":"M","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":56.99,"weight":18,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"FLC-NVY-M"},
      {"id":"v7-nvy-l","colorId":"c7-navy","colorName":"Navy","sizeId":"s7-l","sizeName":"L","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":56.99,"weight":19,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"FLC-NVY-L"},
      {"id":"v7-nvy-xl","colorId":"c7-navy","colorName":"Navy","sizeId":"s7-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400","price":59.99,"weight":20,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"FLC-NVY-XL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 8. Canvas Tote Bag (no variants, simple product)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku, seller_id
  ) VALUES (
    'Waxed Canvas Tote', 28.99, 42.00,
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600'
    ],
    'Heavy-duty waxed canvas tote with leather handles. Interior zip pocket. Great for groceries or the beach.',
    'Bags', 20, 'oz', 50, 'TOTE-WAX',
    v_seller_id
  );

  -- ============================================================
  -- 9. Stainless Steel Watch (2 colors, color-only)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, variants, seller_id
  ) VALUES (
    'Minimalist Steel Watch', 79.99, 120.00,
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600',
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600'
    ],
    'Japanese quartz movement with sapphire crystal. 40mm case, 5ATM water resistance.',
    'Accessories', 5, 'oz', 30, 'WATCH-MIN',
    '[
      {"id":"c9-silver","name":"Silver","hexCode":"#C0C0C0","image":"https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400","price":79.99,"weight":5,"weightUnit":"oz","stockQuantity":15},
      {"id":"c9-gold","name":"Gold","hexCode":"#FFD700","image":"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400","price":84.99,"weight":5,"weightUnit":"oz","stockQuantity":15}
    ]'::jsonb,
    '[
      {"id":"v9-silver","colorId":"c9-silver","colorName":"Silver","image":"https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400","price":79.99,"weight":5,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":15,"sku":"WATCH-SLV"},
      {"id":"v9-gold","colorId":"c9-gold","colorName":"Gold","image":"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400","price":84.99,"weight":5,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":15,"sku":"WATCH-GLD"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 10. Graphic Print Tee (4 colors × 4 sizes)
  -- ============================================================
  INSERT INTO public.products (
    name, price, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, sizes, variants, seller_id
  ) VALUES (
    'Retro Graphic Tee', 26.99,
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'
    ],
    'Screen-printed retro graphic on soft-washed cotton. Unisex relaxed fit.',
    'Clothing', 7, 'oz', 100, 'TEE-RETRO',
    '[
      {"id":"c10-blk","name":"Black","hexCode":"#1A1A1A","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","stockQuantity":25},
      {"id":"c10-wht","name":"White","hexCode":"#FAFAFA","image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400","price":26.99,"weight":7,"weightUnit":"oz","stockQuantity":25},
      {"id":"c10-clay","name":"Clay","hexCode":"#B66A50","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","stockQuantity":25},
      {"id":"c10-slate","name":"Slate","hexCode":"#708090","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","stockQuantity":25}
    ]'::jsonb,
    '[
      {"id":"s10-s","name":"S","price":26.99,"weight":6,"weightUnit":"oz","stockQuantity":20},
      {"id":"s10-m","name":"M","price":26.99,"weight":7,"weightUnit":"oz","stockQuantity":30},
      {"id":"s10-l","name":"L","price":26.99,"weight":7,"weightUnit":"oz","stockQuantity":30},
      {"id":"s10-xl","name":"XL","price":28.99,"weight":8,"weightUnit":"oz","stockQuantity":20}
    ]'::jsonb,
    '[
      {"id":"v10-blk-s","colorId":"c10-blk","colorName":"Black","sizeId":"s10-s","sizeName":"S","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"RET-BK-S"},
      {"id":"v10-blk-m","colorId":"c10-blk","colorName":"Black","sizeId":"s10-m","sizeName":"M","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"RET-BK-M"},
      {"id":"v10-blk-l","colorId":"c10-blk","colorName":"Black","sizeId":"s10-l","sizeName":"L","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"RET-BK-L"},
      {"id":"v10-blk-xl","colorId":"c10-blk","colorName":"Black","sizeId":"s10-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":28.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":4,"sku":"RET-BK-XL"},
      {"id":"v10-wht-s","colorId":"c10-wht","colorName":"White","sizeId":"s10-s","sizeName":"S","image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400","price":26.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"RET-WH-S"},
      {"id":"v10-wht-m","colorId":"c10-wht","colorName":"White","sizeId":"s10-m","sizeName":"M","image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"RET-WH-M"},
      {"id":"v10-wht-l","colorId":"c10-wht","colorName":"White","sizeId":"s10-l","sizeName":"L","image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":8,"sku":"RET-WH-L"},
      {"id":"v10-wht-xl","colorId":"c10-wht","colorName":"White","sizeId":"s10-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400","price":28.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":4,"sku":"RET-WH-XL"},
      {"id":"v10-clay-s","colorId":"c10-clay","colorName":"Clay","sizeId":"s10-s","sizeName":"S","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"RET-CL-S"},
      {"id":"v10-clay-m","colorId":"c10-clay","colorName":"Clay","sizeId":"s10-m","sizeName":"M","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"RET-CL-M"},
      {"id":"v10-clay-l","colorId":"c10-clay","colorName":"Clay","sizeId":"s10-l","sizeName":"L","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"RET-CL-L"},
      {"id":"v10-clay-xl","colorId":"c10-clay","colorName":"Clay","sizeId":"s10-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":28.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"RET-CL-XL"},
      {"id":"v10-slate-s","colorId":"c10-slate","colorName":"Slate","sizeId":"s10-s","sizeName":"S","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":6,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":5,"sku":"RET-SL-S"},
      {"id":"v10-slate-m","colorId":"c10-slate","colorName":"Slate","sizeId":"s10-m","sizeName":"M","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"RET-SL-M"},
      {"id":"v10-slate-l","colorId":"c10-slate","colorName":"Slate","sizeId":"s10-l","sizeName":"L","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":26.99,"weight":7,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":7,"sku":"RET-SL-L"},
      {"id":"v10-slate-xl","colorId":"c10-slate","colorName":"Slate","sizeId":"s10-xl","sizeName":"XL","image":"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400","price":28.99,"weight":8,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":6,"sku":"RET-SL-XL"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 11. Insulated Tumbler (no variants)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku, seller_id
  ) VALUES (
    'Insulated Travel Tumbler 20oz', 18.99, 29.99,
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600',
      'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=600'
    ],
    'Double-wall vacuum insulated tumbler with slide lid. Fits standard cup holders.',
    'Accessories', 10, 'oz', 80, 'TUMBLER-20',
    v_seller_id
  );

  -- ============================================================
  -- 12. Beanie Hat (3 colors, color-only)
  -- ============================================================
  INSERT INTO public.products (
    name, price, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, variants, seller_id
  ) VALUES (
    'Ribbed Knit Beanie', 16.99,
    'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600',
      'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600'
    ],
    'Chunky ribbed knit beanie with fold-over cuff. Soft acrylic blend. One size fits most.',
    'Accessories', 3, 'oz', 120, 'BEANIE-RIB',
    '[
      {"id":"c12-blk","name":"Black","hexCode":"#1A1A1A","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400","price":16.99,"weight":3,"weightUnit":"oz","stockQuantity":40},
      {"id":"c12-cream","name":"Cream","hexCode":"#FFFDD0","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400","price":16.99,"weight":3,"weightUnit":"oz","stockQuantity":40},
      {"id":"c12-burg","name":"Burgundy","hexCode":"#800020","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400","price":16.99,"weight":3,"weightUnit":"oz","stockQuantity":40}
    ]'::jsonb,
    '[
      {"id":"v12-blk","colorId":"c12-blk","colorName":"Black","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400","price":16.99,"weight":3,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":40,"sku":"BNE-BK"},
      {"id":"v12-cream","colorId":"c12-cream","colorName":"Cream","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400","price":16.99,"weight":3,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":40,"sku":"BNE-CR"},
      {"id":"v12-burg","colorId":"c12-burg","colorName":"Burgundy","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400","price":16.99,"weight":3,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":40,"sku":"BNE-BG"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 13. Resistance Bands Set (no variants)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku, seller_id
  ) VALUES (
    'Resistance Bands Set (5-Pack)', 22.99, 34.99,
    'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600'
    ],
    'Set of 5 latex resistance bands (light to extra heavy). Includes carry bag and exercise guide.',
    'Fitness', 12, 'oz', 65, 'BAND-5PK',
    v_seller_id
  );

  -- ============================================================
  -- 14. Polarized Sunglasses (3 colors, color-only)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    colors, variants, seller_id
  ) VALUES (
    'Wayfarer Polarized Sunglasses', 24.99, 40.00,
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600'
    ],
    'Classic wayfarer frame with polarized UV400 lenses. Lightweight acetate construction.',
    'Accessories', 2, 'oz', 75, 'SUN-WAY',
    '[
      {"id":"c14-tort","name":"Tortoise","hexCode":"#8B4513","image":"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400","price":24.99,"weight":2,"weightUnit":"oz","stockQuantity":25},
      {"id":"c14-blk","name":"Matte Black","hexCode":"#1A1A1A","image":"https://images.unsplash.com/photo-1577803645773-f96470509666?w=400","price":24.99,"weight":2,"weightUnit":"oz","stockQuantity":25},
      {"id":"c14-clear","name":"Crystal Clear","hexCode":"#E8E8E8","image":"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400","price":24.99,"weight":2,"weightUnit":"oz","stockQuantity":25}
    ]'::jsonb,
    '[
      {"id":"v14-tort","colorId":"c14-tort","colorName":"Tortoise","image":"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400","price":24.99,"weight":2,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":25,"sku":"SUN-TORT"},
      {"id":"v14-blk","colorId":"c14-blk","colorName":"Matte Black","image":"https://images.unsplash.com/photo-1577803645773-f96470509666?w=400","price":24.99,"weight":2,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":25,"sku":"SUN-MBK"},
      {"id":"v14-clear","colorId":"c14-clear","colorName":"Crystal Clear","image":"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400","price":24.99,"weight":2,"weightUnit":"oz","dimensionUnit":"in","stockQuantity":25,"sku":"SUN-CLR"}
    ]'::jsonb,
    v_seller_id
  );

  -- ============================================================
  -- 15. Laptop Backpack (no variants, with dimensions)
  -- ============================================================
  INSERT INTO public.products (
    name, price, msrp, image, images, description, category,
    weight, weight_unit, quantity_in_stock, sku,
    length, width, height, dimension_unit,
    seller_id
  ) VALUES (
    'Tech Commuter Backpack', 59.99, 85.00,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    ARRAY[
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
      'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600'
    ],
    'Padded 16" laptop compartment with USB charging port. Water-resistant 900D polyester. Luggage pass-through.',
    'Bags', 32, 'oz', 30, 'PACK-TECH',
    19, 12, 8, 'in',
    v_seller_id
  );

  RAISE NOTICE 'Done! Inserted 15 products for seller %', v_seller_id;
END $$;
