-- Add client_id columns to normalized tables to preserve original client-side IDs
-- This ensures variant→color/size cross-references work after round-tripping through the DB

ALTER TABLE public.product_colors ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Backfill: set client_id = id::text for any existing rows that don't have one
UPDATE public.product_colors SET client_id = id::text WHERE client_id IS NULL;
UPDATE public.product_sizes SET client_id = id::text WHERE client_id IS NULL;
UPDATE public.product_variants SET client_id = id::text WHERE client_id IS NULL;
