# JSONB Usage Audit & Scalability Review

## Overview

This document catalogs every JSONB column in the JaTango database, documents its shape and access patterns, and current status.

---

## JSONB Columns Inventory

| Table | Column | Shape | Status |
|-------|--------|-------|--------|
| `products` | `colors` | `ColorVariant[]` | ✅ **Normalized** → `product_colors` table |
| `products` | `sizes` | `SizeVariant[]` | ✅ **Normalized** → `product_sizes` table |
| `products` | `variants` | `ProductVariant[]` | ✅ **Normalized** → `product_variants` table |
| `orders` | `shipping_address` | `ShippingAddress` object | ✅ Keep as-is (correct pattern) |
| `notifications` | `data` | `{ orderId, totalAmount, itemCount }` | ✅ Keep as-is (correct pattern) |

---

## Normalized Tables (Completed)

The three product JSONB columns have been fully normalized into relational tables. All client and server code now reads from and writes to the normalized tables. The old JSONB columns remain on the `products` table as a rollback safety net but are no longer the source of truth.

### Migration file

`supabase-normalize-variants-migration.sql` — Creates tables, indexes, RLS policies, RPC functions, and migrates existing JSONB data.

### New Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `product_colors` | One row per color per product | `product_id`, `name`, `hex_code`, `image`, `price`, `stock_quantity`, `sku`, `display_order` |
| `product_sizes` | One row per size per product | `product_id`, `name`, `price`, `stock_quantity`, `sku`, `display_order` |
| `product_variants` | One row per color×size combo | `product_id`, `color_id`, `size_id`, `price`, `stock_quantity` (with `CHECK >= 0`), `sku`, `image`, `display_order` |

### Atomic Stock Decrement (Race Condition Fix)

Two Supabase RPC functions replace the old read→modify→write pattern:

- **`decrement_variant_stock(p_variant_id, p_quantity)`** — Atomic variant-level decrement with `CHECK (stock_quantity >= 0)` enforcement. Raises exception if insufficient stock.
- **`decrement_product_stock(p_product_id, p_quantity)`** — Atomic product-level decrement for non-variant products.

Called from `server/payments.ts` in both `/confirm` and `/pay-with-saved-card` endpoints.

### Client Code Changes

| File | Change |
|------|--------|
| `client/lib/supabase.ts` | Added `DbProductColorRow`, `DbProductSizeRow`, `DbProductVariantRow` types + `mapColorRow`, `mapSizeRow`, `mapVariantRow` functions |
| `client/services/products.ts` | All queries JOIN normalized tables; `createProduct`/`updateProduct` call `upsertNormalizedVariants` |
| `client/services/cart.ts` | Cart query JOINs normalized tables (JSONB fallback) |
| `client/services/savedProducts.ts` | Saved products query JOINs normalized tables (JSONB fallback) |
| `client/screens/StoreProfileScreen.tsx` | Store product query JOINs normalized tables (JSONB fallback) |

### Schema Files Updated

- `supabase-schema.sql` — New table definitions, indexes, RLS policies, RPC functions, realtime
- `supabase-schema-reset.sql` — Same (safe-to-rerun version)
- `supabase-seed-products.sql` — Normalization block at end populates new tables from JSONB
- `seed-products-steven.sql` — Same

### Remaining Cleanup

The old JSONB columns (`colors`, `sizes`, `variants`) on the `products` table can be dropped when ready:

```sql
ALTER TABLE products DROP COLUMN colors, DROP COLUMN sizes, DROP COLUMN variants;
```

---

## 4. `orders.shipping_address` — Address Snapshot

### Shape

```json
{
  "name": "John Doe",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4",
  "city": "Lorain",
  "state": "OH",
  "zip": "44052",
  "country": "US",
  "phone": "555-1234"
}
```

### Status: ✅ Keep as-is

This is a **correct use of JSONB**. The address is a point-in-time snapshot — it should NOT reference the `shipping_addresses` table because the buyer might change their address later. One object per order, ~200 bytes, write-once, never queried by inner fields. Standard e-commerce pattern.

---

## 5. `notifications.data` — Notification Payload

### Shape

```json
{
  "totalAmount": 52.02,
  "itemCount": 2,
  "orderId": "uuid-here"
}
```

### Status: ✅ Keep as-is

This is a **correct use of JSONB**. Notification payloads are flexible by nature — different notification types have different data shapes. One small object per notification, ~100 bytes, write-once, parsed client-side only.

If you ever need to query by `orderId`, add an index:

```sql
CREATE INDEX idx_notifications_data_order ON notifications ((data->>'orderId'));
```

---

## Summary

| Column | Original Risk | Current Status |
|--------|--------------|----------------|
| `products.variants` | 🔴 HIGH (race condition, overselling) | ✅ **Normalized** — atomic RPC stock decrement |
| `products.colors` | 🟡 MEDIUM (no indexing) | ✅ **Normalized** — relational table with indexes |
| `products.sizes` | 🟡 MEDIUM (no indexing) | ✅ **Normalized** — relational table with indexes |
| `orders.shipping_address` | 🟢 LOW | ✅ Keep as-is — correct pattern |
| `notifications.data` | 🟢 LOW | ✅ Keep as-is — correct pattern |
