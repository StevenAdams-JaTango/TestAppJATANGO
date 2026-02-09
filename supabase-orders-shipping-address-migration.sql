-- Add shipping_address JSONB column to orders table
-- Run this in your Supabase SQL Editor after the initial orders migration

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- The shipping_address column stores a snapshot of the address at time of purchase:
-- {
--   "name": "John Doe",
--   "addressLine1": "123 Main St",
--   "addressLine2": "Apt 4",
--   "city": "Lorain",
--   "state": "OH",
--   "zip": "44052",
--   "country": "US",
--   "phone": "555-1234"
-- }
