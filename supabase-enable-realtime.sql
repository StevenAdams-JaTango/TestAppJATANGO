-- Enable Supabase Realtime on tables used by the Profile screen badges.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- Skips tables that are already enabled.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    RAISE NOTICE 'Added orders to supabase_realtime';
  ELSE
    RAISE NOTICE 'orders already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
    RAISE NOTICE 'Added products to supabase_realtime';
  ELSE
    RAISE NOTICE 'products already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'shorts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shorts;
    RAISE NOTICE 'Added shorts to supabase_realtime';
  ELSE
    RAISE NOTICE 'shorts already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'saved_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE saved_products;
    RAISE NOTICE 'Added saved_products to supabase_realtime';
  ELSE
    RAISE NOTICE 'saved_products already in supabase_realtime — skipped';
  END IF;
END $$;
