# Sales & Shipping Feature

## Overview

This feature adds a complete sales management and USPS shipping workflow to JaTango, powered by the **Shippo API**. Sellers can manage their sales, create multi-parcel shipments with item picking, purchase shipping labels, and track deliveries. Buyers see shipping rates at checkout and tracking info on their orders.

## Architecture

### Shipping Provider: Shippo

- **SDK**: `shippo` npm package (v2.15.0)
- **Test Mode**: Unlimited free test labels with test API token
- **Production**: 30 free labels/month, then $0.07/label
- **Environment Variable**: `SHIPPO_API_TOKEN`

### USPS Service Levels

Shippo returns all available USPS service levels when you request rates. The rates returned depend on parcel dimensions/weight and origin/destination. Common USPS services include:

- **USPS Priority Mail** — 1-3 business days
- **USPS Priority Mail Express** — 1-2 business days
- **USPS Ground Advantage** — 2-5 business days
- **USPS First-Class Mail** — 2-5 business days (under 13 oz)
- **USPS Media Mail** — 2-8 business days (media only)
- **USPS Parcel Select** — 2-9 business days

The app displays all available rates from Shippo and lets the user choose.

### Package Types

The Sale Detail screen offers four categories of packages via tabs:

#### Standard Boxes
| Size | Dimensions | Description |
|------|-----------|-------------|
| 6×4×4 | 6" × 4" × 4" | Extra Small |
| 8×6×4 | 8" × 6" × 4" | Small |
| 10×8×6 | 10" × 8" × 6" | Medium |
| 12×10×6 | 12" × 10" × 6" | Large |
| 14×10×6 | 14" × 10" × 6" | Large Wide |
| 16×12×8 | 16" × 12" × 8" | Extra Large |
| 18×14×8 | 18" × 14" × 8" | Oversized |
| 20×14×10 | 20" × 14" × 10" | Jumbo |

#### USPS Flat Rate
| Size | Dimensions |
|------|-----------|
| Flat Rate Envelope | 12.5" × 9.5" × 0.75" |
| Padded Flat Rate Envelope | 12.5" × 9.5" × 1" |
| Small Flat Rate Box | 8.625" × 5.375" × 1.625" |
| Medium Flat Rate Box | 11.25" × 8.75" × 5.5" |
| Large Flat Rate Box | 12.25" × 12.25" × 6" |

#### Poly Mailer
Custom dimensions — the seller enters their own L × W × H for poly bags/mailers.

#### My Packages (Saved)
Sellers can save any package configuration for reuse. Tap the bookmark icon next to the weight field to save the current package. Saved packages are stored in the database and persist across sessions. Long-press a saved package to delete it.

## Database Changes

Run both migrations in your Supabase SQL Editor:
1. `supabase-sales-shipping-migration.sql` — Store addresses, shipping fields, seller access
2. `supabase-saved-packages-migration.sql` — Saved packages table

### New columns on `profiles`

| Column | Type | Description |
|--------|------|-------------|
| `store_address_line1` | TEXT | Store street address |
| `store_address_line2` | TEXT | Suite/apt (optional) |
| `store_city` | TEXT | City |
| `store_state` | TEXT | State code (e.g. CA) |
| `store_zip` | TEXT | ZIP code |
| `store_country` | TEXT | Country code (default US) |
| `store_phone` | TEXT | Phone (optional) |

### New columns on `orders`

| Column | Type | Description |
|--------|------|-------------|
| `shipping_cost` | DECIMAL(10,2) | Shipping cost paid by buyer |
| `shipping_carrier` | TEXT | Carrier name (e.g. usps) |
| `shipping_service` | TEXT | Service level name |
| `tracking_number` | TEXT | Tracking number from label purchase |
| `label_url` | TEXT | PDF label download URL |
| `shippo_shipment_id` | TEXT | Shippo shipment reference |
| `seller_id` | UUID | FK to profiles — the seller for this order |
| `package_type` | TEXT | Package type used (e.g. 8x6x4, flat_rate_small, poly_mailer) |
| `package_length` | TEXT | Package length in inches |
| `package_width` | TEXT | Package width in inches |
| `package_height` | TEXT | Package height in inches |
| `package_weight` | TEXT | Package weight in lbs |

### New table: `saved_packages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `seller_id` | UUID | FK to profiles |
| `name` | TEXT | User-defined name |
| `package_type` | TEXT | "box" or "poly" |
| `length` | TEXT | Length in inches |
| `width` | TEXT | Width in inches |
| `height` | TEXT | Height in inches |
| `weight` | TEXT | Default weight in lbs (optional) |
| `is_default` | BOOLEAN | Default package flag |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

RLS: Users can only CRUD their own saved packages.

### RLS Policies

- Sellers can **view** orders containing their products
- Sellers can **update** orders for their products (mark shipped/delivered)

## API Endpoints

### Shipping

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/shipping/rates` | Get USPS shipping rates for a parcel |
| POST | `/api/shipping/buy-label` | Purchase a shipping label |
| GET | `/api/shipping/track/:trackingNumber` | Get tracking status |

### Sales Management

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sales/:sellerId` | Fetch all sales for a seller |
| PUT | `/api/sales/:orderId/status` | Update order status (shipped/delivered/cancelled) |

### Store Address

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/store-address/:sellerId` | Get seller's store address |
| PUT | `/api/store-address/:sellerId` | Update seller's store address |

### Saved Packages

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/saved-packages/:sellerId` | Fetch all saved packages for a seller |
| POST | `/api/saved-packages` | Create a new saved package |
| PUT | `/api/saved-packages/:packageId` | Update a saved package |
| DELETE | `/api/saved-packages/:packageId` | Delete a saved package |

### Order Cleanup

| Method | Route | Description |
|--------|-------|-------------|
| DELETE | `/api/orders/:userId` | Delete all orders for a user (dev/test cleanup) |

## Client Files

### Services

- **`client/services/shipping.ts`** — API client for all shipping/sales/store-address endpoints

### Screens

- **`StoreAddressScreen`** — Form to set/update the seller's store origin address (used for rate calculations)
- **`SalesScreen`** — List of all sales with status filters (All, Needs Shipping, Shipped, Delivered, Cancelled)
- **`SaleDetailScreen`** — Full sale details with multi-parcel shipping workflow

### Components

- **`ShippingRateSelector`** — Reusable radio-button list of shipping rates with loading/error states

### Navigation Routes

| Route | Screen | Params |
|-------|--------|--------|
| `StoreAddress` | StoreAddressScreen | none |
| `Sales` | SalesScreen | none |
| `SaleDetail` | SaleDetailScreen | `{ orderId: string }` |

## Multi-Parcel Shipping Flow

The seller can ship an order in **multiple parcels**, each with its own label:

1. **Open Sale Detail** — Navigate from My Sales to a specific order
2. **Add Parcel** — Tap "Add Parcel" to create a new package
3. **Pick Items** — Check which order items go in this parcel. Items already assigned to another parcel are grayed out
4. **Select Package** — Choose from four tabs:
   - **Boxes** — Standard shipping box sizes (6×4×4 through 20×14×10)
   - **Flat Rate** — USPS Flat Rate envelopes and boxes
   - **Poly Mailer** — Custom dimensions for poly bags
   - **My Packages** — Previously saved package configurations
5. **Enter Weight** — Set the parcel weight in lbs
6. **Save Package** (optional) — Tap the bookmark icon to save the current package for reuse
7. **Get Rates** — Fetch USPS rates for the selected package dimensions and weight
8. **Buy Label** — Purchase a label for the selected rate. The label PDF is downloadable
9. **Repeat** — Add more parcels for remaining items
10. **Mark Delivered** — Once all parcels are shipped, mark the order as delivered

### Cost Model

- Shipping label costs are **at the expense of the store/seller**
- Buyers pay the shipping rate selected at checkout (added to their total)
- The seller then purchases the actual label from their Shippo account

## Checkout Integration

The `CheckoutBottomSheet` now includes a **Shipping Method** section:

1. Buyer selects a shipping address
2. Buyer taps "Get Shipping Rates" — fetches rates from the seller's store address to the buyer's address
3. Buyer selects a rate (auto-selects cheapest)
4. Shipping cost is added to the order total
5. On payment confirmation, `shipping_cost`, `shipping_carrier`, and `shipping_service` are stored on the order

## Order Detail Updates

The buyer's `OrderDetailScreen` now shows:

- **Tracking section** with carrier and tracking number (when available)
- **Shipping cost** in the total breakdown (shows actual cost or "Free")

## Settings & Profile Integration

The `SettingsScreen` includes under "Payment & Shipping":

- **Store Address** — Set up the origin address for shipping

The `ProfileScreen` includes:

- **My Sales** — View and manage all sales (with orange badge showing count)

## Delete All Orders

The `OrdersScreen` header includes a trash icon button that:

1. Shows a confirmation alert
2. Deletes all `order_items` then `orders` for the current user
3. Useful for cleaning up test data during development

## Setup Instructions

1. **Run migrations**: Execute both SQL files in Supabase SQL Editor:
   - `supabase-sales-shipping-migration.sql`
   - `supabase-saved-packages-migration.sql`
2. **Set env var**: Add `SHIPPO_API_TOKEN` to your `.env` file (get a test token from [goshippo.com](https://goshippo.com))
3. **Install package**: `npm install shippo` (already in package.json)
4. **Set store address**: Go to Settings → Store Address and enter your origin address
5. **Test**: Place an order, then go to Profile → My Sales to view and ship it

## Test Mode Notes

- Shippo test mode generates **fake tracking numbers** and **test label PDFs**
- Labels are free and unlimited in test mode
- Rates returned are real USPS rates but labels won't actually work for shipping
- Switch to a live Shippo API token for production use
