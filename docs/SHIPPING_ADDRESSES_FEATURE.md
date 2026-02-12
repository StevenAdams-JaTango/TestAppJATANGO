# Shipping Addresses Feature Documentation

## Overview

Buyers can save multiple shipping addresses for checkout, and sellers can set a store origin address for shipping label generation. Addresses support full CRUD operations with a "default" address system. Shipping rates are calculated via the Shippo API using the seller's origin and buyer's destination.

---

## Architecture

### Database — `shipping_addresses` Table

Defined in `supabase-addresses-migration.sql`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `profiles(id)` |
| `name` | TEXT | Recipient name |
| `street` | TEXT | Street address |
| `city` | TEXT | City |
| `state` | TEXT | State/province |
| `zip` | TEXT | Postal code |
| `country` | TEXT | Country code (default `US`) |
| `phone` | TEXT | Phone number |
| `is_default` | BOOLEAN | Whether this is the default address |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Trigger:** When an address is set as default, a trigger automatically unsets `is_default` on all other addresses for that user.

**RLS Policies:**
- Users can SELECT, INSERT, UPDATE, DELETE their own addresses

### Server Endpoints — `server/payments.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/addresses` | List all addresses for a user |
| POST | `/api/addresses` | Create a new address |
| PUT | `/api/addresses/:addressId` | Update an existing address |
| DELETE | `/api/addresses/:addressId` | Delete an address |
| PUT | `/api/addresses/:addressId/default` | Set an address as default |

### Shipping Rate Calculation — `server/shipping.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shipping/rates` | Get shipping rates for a package |
| POST | `/api/shipping/purchase-label` | Purchase a shipping label |
| GET | `/api/shipping/track/:trackingNumber` | Get tracking status |
| GET | `/api/sales` | List seller's orders with shipping info |
| PUT | `/api/sales/:orderId/status` | Update order status |

**Shippo Integration:**
- Rates are fetched from Shippo using seller's `store_address` as origin and buyer's shipping address as destination
- Package dimensions and weight are provided by the seller during fulfillment
- Labels are purchased via Shippo and the tracking number + label URL are saved to the order

---

## Client Screens

### `ShippingAddressesScreen`

**File:** `client/screens/ShippingAddressesScreen.tsx`

- Lists all saved addresses
- Default address highlighted with a badge
- Swipe-to-delete or delete button
- "Set as Default" action
- "Add Address" button → opens `AddAddressScreen`
- Accessible from Settings → "Payment & Shipping"

### `AddAddressScreen`

**File:** `client/screens/AddAddressScreen.tsx`

- Modal form for adding or editing an address
- Fields: name, street, city, state, zip, country, phone
- Edit mode: pre-fills fields when `addressId` param is provided
- Validates required fields before saving

### `StoreAddressScreen`

**File:** `client/screens/StoreAddressScreen.tsx`

- Seller's shipping origin address form
- Saves to `profiles.store_address` JSONB column
- Required before sellers can purchase shipping labels
- Fields: street, city, state, zip, country

---

## Seller's Store Address

The seller's origin address is stored differently from buyer addresses:

| Aspect | Buyer Addresses | Seller Store Address |
|--------|----------------|---------------------|
| Storage | `shipping_addresses` table | `profiles.store_address` JSONB |
| Multiple | Yes (with default) | One per seller |
| Used for | Checkout destination | Shipping label origin |

---

## Shipping Label Purchase Flow

1. Seller opens `SaleDetailScreen` for a paid order
2. Selects package type (standard boxes, flat rate, poly mailer, or saved package)
3. Enters package weight
4. Fetches shipping rates from Shippo via `/api/shipping/rates`
5. Selects a rate (carrier + service level)
6. Purchases label via `/api/shipping/purchase-label`
7. Order status updated to `shipped` with tracking number and label URL
8. Seller can download/print the label

---

## Client Service

**File:** `client/services/settings.ts`

| Method | Description |
|--------|-------------|
| `getAddresses(userId)` | Fetch all addresses |
| `createAddress(data)` | Create new address |
| `updateAddress(addressId, data)` | Update address |
| `deleteAddress(addressId)` | Delete address |
| `setDefaultAddress(addressId)` | Set as default |

**File:** `client/services/shipping.ts`

| Method | Description |
|--------|-------------|
| `getShippingRates(params)` | Fetch rates from Shippo |
| `purchaseLabel(params)` | Buy shipping label |
| `getTracking(trackingNumber, carrier)` | Get tracking info |

---

## Files

| File | Purpose |
|------|---------|
| `server/payments.ts` | Address CRUD endpoints |
| `server/shipping.ts` | Shipping rates, labels, tracking, sales |
| `client/screens/ShippingAddressesScreen.tsx` | Manage saved addresses |
| `client/screens/AddAddressScreen.tsx` | Add/edit address form |
| `client/screens/StoreAddressScreen.tsx` | Seller origin address |
| `client/screens/SaleDetailScreen.tsx` | Label purchase + fulfillment |
| `client/services/settings.ts` | Address API calls |
| `client/services/shipping.ts` | Shipping API calls |
| `client/components/ShippingRateSelector.tsx` | Rate selection UI |
| `supabase-addresses-migration.sql` | Database schema |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHIPPO_API_KEY` | Shippo API key for shipping rates and labels |
