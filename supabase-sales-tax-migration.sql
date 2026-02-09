-- Sales Tax Migration
-- Run this in your Supabase SQL Editor to add sales tax tracking to orders

-- Add subtotal and sales_tax columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sales_tax DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0;

-- Backfill existing orders: set subtotal = total_amount, sales_tax = 0
UPDATE public.orders
SET subtotal = total_amount, sales_tax = 0, tax_rate = 0
WHERE subtotal IS NULL;
 