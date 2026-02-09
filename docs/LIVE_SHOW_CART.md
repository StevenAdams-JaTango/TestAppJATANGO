# Live Show Cart Reservations & Sales Tracking

## Overview

When a buyer adds an item to their cart during a live show, the item is **reserved for 6 hours**. This prevents other buyers from purchasing the same stock while the original buyer completes checkout. After the show ends, the host sees a **sales summary** including orders placed, revenue, and per-product performance.

**Key behaviors:**
- Items added to cart during a live show get a 6-hour reservation (`reserved_until`)
- Reserved stock is subtracted from available stock shown on the Explore page and in stock checks
- Each add-to-cart during a show is logged as a `show_cart_event` for analytics
- Orders placed from show cart items are tagged with `show_id` for tracking
- After ending a show, the host is navigated to the **ShowSummary** screen
- Normal (non-show) cart and checkout behavior is completely unchanged

---

## Database Migration

**Run `supabase-live-show-cart-migration.sql` in your Supabase SQL Editor.**

This migration:

1. **Adds columns to `cart_items`:**
   - `show_id` (UUID, nullable) — links cart item to a live show
   - `reserved_until` (TIMESTAMPTZ, nullable) — reservation expiry timestamp

2. **Creates `show_cart_events` table** — logs every add-to-cart during a show for analytics

3. **Adds `show_id` column to `orders`** — tags orders that originated from a live show

4. **Creates helper functions:**
   - `cleanup_expired_reservations()` — removes expired cart reservations
   - `get_reserved_quantity(product_id)` — returns total reserved quantity for a product

5. **Creates views:**
   - `show_sales_summary` — aggregated sales stats per show
   - `show_product_sales` — per-product breakdown within a show
   - `products_with_availability` — products with effective available stock

---

## Architecture

### Flow: Buyer adds item during live show

```
LiveStreamScreen
  → ProductDetailSheet (receives showId prop)
    → CartContext.addToCart(..., showId)
      → CartService.addToCart(..., showId)
        → Inserts cart_item with show_id + reserved_until (now + 6hrs)
        → Logs show_cart_event via POST /api/shows/:showId/cart-event
```

### Flow: Stock visibility with reservations

```
ExploreScreen loads products
  → productsService.listAllProducts()
    → Fetches products from Supabase
    → Fetches GET /api/reservations/quantities (reserved qty per product)
    → Subtracts reserved quantities from displayed stock

CartService.checkStock() also fetches reserved quantities
  → Prevents adding more than (actual_stock - reserved) items
```

### Flow: Checkout with show items

```
CheckoutScreen → checkoutService.confirmOrder/payWithSavedCard
  → Cart items include showId in payload
  → Backend (payments.ts) extracts showId from items
  → Order is created with show_id column set
  → Cart items are deleted (reservation cleared)
```

### Flow: Host ends show → sees summary

```
BroadcasterScreen.confirmEndStream()
  → Ends LiveKit stream
  → Updates show status to "ended"
  → navigation.replace("ShowSummary", { showId })

ShowSummaryScreen
  → GET /api/shows/:showId/summary
  → Displays: revenue, orders, items sold, buyers, add-to-carts, active holds
  → Per-product breakdown with quantity sold and revenue
  → Recent orders list
```

---

## API Endpoints

### `GET /api/shows/:showId/summary`
Returns full sales summary for a show (for the host).

**Response:**
```json
{
  "show": { "id", "title", "thumbnailUrl", "status", "startedAt", "endedAt" },
  "summary": {
    "totalOrders": 5,
    "uniqueBuyers": 3,
    "totalRevenue": 149.95,
    "totalItemsSold": 8,
    "uniqueProductsSold": 4,
    "addToCartEvents": 12,
    "uniqueCartUsers": 7,
    "activeReservations": 2
  },
  "productBreakdown": [
    { "productId", "productName", "productImage", "quantitySold", "revenue", "uniqueBuyers" }
  ],
  "recentOrders": [
    { "id", "userId", "totalAmount", "createdAt", "items": [...] }
  ]
}
```

### `POST /api/shows/:showId/cart-event`
Logs a cart event for show-level tracking.

**Body:** `{ userId, productId, sellerId, quantity, unitPrice, eventType, ... }`

### `GET /api/reservations/quantities`
Returns a map of `product_id → reserved_quantity` for all active reservations.

**Response:**
```json
{
  "reservedQuantities": {
    "product-uuid-1": 3,
    "product-uuid-2": 1
  }
}
```

### `GET /api/shows/:showId/reservations`
Returns active reservations for a specific show.

### `POST /api/shows/:showId/cleanup-reservations`
Manually triggers cleanup of expired reservations for a show.

---

## Files Modified

### New Files
| File | Purpose |
|------|---------|
| `supabase-live-show-cart-migration.sql` | Database migration |
| `server/shows.ts` | Server endpoints for show sales & reservations |
| `client/services/showSales.ts` | Client API service for show summary |
| `client/screens/ShowSummaryScreen.tsx` | Post-show sales summary UI |

### Modified Files
| File | Changes |
|------|---------|
| `server/routes.ts` | Registers show routes |
| `server/payments.ts` | Tags orders with `show_id`, adds `showId` to `CartItemPayload` |
| `client/types/cart.ts` | Adds `showId` and `reservedUntil` to `CartItem` |
| `client/services/cart.ts` | Adds `showId` param to `addToCart`, logs show cart events, subtracts reservations in stock checks |
| `client/services/products.ts` | Fetches reserved quantities and subtracts from displayed stock in `listAllProducts` |
| `client/services/checkout.ts` | Passes `showId` through checkout payload |
| `client/contexts/CartContext.tsx` | Passes `showId` through `addToCart` |
| `client/components/ProductDetailSheet.tsx` | Accepts optional `showId` prop |
| `client/screens/LiveStreamScreen.tsx` | Extracts show ID from room name, passes to `ProductDetailSheet` |
| `client/screens/BroadcasterScreen.tsx` | Navigates to `ShowSummary` after ending stream |
| `client/screens/EndedShowScreen.tsx` | Shows real sales stats, links to `ShowSummary` |
| `client/navigation/RootStackNavigator.tsx` | Adds `ShowSummary` route, `showId` param to `LiveStream` |

---

## Reservation Lifecycle

1. **Created:** When buyer adds item to cart during a live show → `reserved_until = now + 6 hours`
2. **Visible:** Reserved stock is subtracted from displayed stock on Explore page and in stock checks
3. **Purchased:** When buyer checks out → cart item deleted, order tagged with `show_id`
4. **Expired:** After 6 hours without purchase → item remains in cart but reservation expires, stock becomes available again
5. **Cleanup:** Call `cleanup_expired_reservations()` SQL function or `POST /api/shows/:showId/cleanup-reservations` to remove expired items

---

## Notes

- **Normal cart behavior is unchanged.** Only items added via a live show (with `showId`) get reservations.
- The reservation is on the `cart_items` row itself — no separate reservation table needed.
- Stock subtraction happens at read time (not write time), so it's always accurate.
- The `show_cart_events` table is append-only for analytics; it doesn't affect cart behavior.
- Consider setting up a Supabase cron job to call `cleanup_expired_reservations()` periodically (e.g., every 30 minutes).
