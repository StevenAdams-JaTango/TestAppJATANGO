# Orders Feature Documentation

## Overview

The orders feature allows customers to view their order history and drill into individual order details. Orders are created automatically after a successful checkout (via Stripe PaymentSheet on native or saved-card payment on web) and stored in Supabase.

### User Actions

- **View Orders** — Profile → "My Orders" shows a chronological list of all orders
- **View Order Details** — Tap any order to see full details: status, items, variants, pricing

---

## Architecture

### Data Flow

```
Successful Checkout
  → Backend creates order + order_items in Supabase
  → Backend decrements product stock
  → Client navigates to OrderConfirmation

Later:
  Profile → My Orders → OrdersScreen
    → checkoutService.fetchOrders(userId)
      → GET /api/orders/:userId
      → Returns orders with nested order_items
    → Tap order → OrderDetailScreen
```

### Key Design Decisions

1. **Server-side order creation** — Orders are created by the backend after payment verification, not by the client
2. **Nested order items** — The `GET /api/orders/:userId` endpoint returns orders with their items pre-joined
3. **Product snapshots** — `product_name` and `product_image` are stored on `order_items` so orders remain accurate even if products are later edited or deleted
4. **Reusable OrderCard** — The `OrderCard` component is shared and can be used anywhere orders need to be displayed
5. **Theme-aware** — Both screens use `theme.*` values for dark/light mode support

---

## Database Schema

### Table: `orders`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `profiles.id` |
| `stripe_payment_intent_id` | TEXT | Stripe PaymentIntent ID |
| `status` | TEXT | Order status: `pending`, `paid`, `shipped`, `delivered`, `cancelled` |
| `total_amount` | DECIMAL(10,2) | Total order amount |
| `currency` | TEXT | Currency code (default `usd`) |
| `created_at` | TIMESTAMPTZ | When order was created |
| `updated_at` | TIMESTAMPTZ | Last modification time |

### Table: `order_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | Foreign key to `orders.id` |
| `product_id` | UUID | Product ID |
| `seller_id` | UUID | Seller ID |
| `quantity` | INTEGER | Quantity purchased |
| `unit_price` | DECIMAL(10,2) | Price per unit at time of purchase |
| `selected_color_id` | TEXT | Color variant ID (nullable) |
| `selected_color_name` | TEXT | Color name (nullable) |
| `selected_size_id` | TEXT | Size variant ID (nullable) |
| `selected_size_name` | TEXT | Size name (nullable) |
| `selected_variant_id` | TEXT | Variant ID (nullable) |
| `product_name` | TEXT | Product name snapshot |
| `product_image` | TEXT | Product image URL snapshot |
| `created_at` | TIMESTAMPTZ | When item was created |

---

## File Structure

```
client/
├── types/
│   └── index.ts               # Order and OrderItem interfaces
├── services/
│   └── checkout.ts            # fetchOrders() — API call to load orders
├── components/
│   └── OrderCard.tsx          # Reusable order list item component
├── screens/
│   ├── OrdersScreen.tsx       # Order list screen
│   └── OrderDetailScreen.tsx  # Single order detail screen
└── navigation/
    └── RootStackNavigator.tsx # Orders and OrderDetail routes

server/
└── payments.ts               # GET /api/orders/:userId endpoint
```

---

## Type Definitions

### `client/types/index.ts`

```typescript
interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  selectedColorId?: string;
  selectedColorName?: string;
  selectedSizeId?: string;
  selectedSizeName?: string;
  selectedVariantId?: string;
  productName: string;
  productImage?: string;
  createdAt?: string;
}

interface OrderPaymentCard {
  brand: string;     // e.g. "visa", "mastercard"
  last4: string;     // e.g. "4242"
  expMonth: number;  // e.g. 4
  expYear: number;   // e.g. 2042
}

interface Order {
  id: string;
  userId: string;
  stripePaymentIntentId?: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  paymentCard?: OrderPaymentCard | null;  // Card used for payment
  sellerNames?: Record<string, string>;   // sellerId → store name
  shippingAddress?: {                     // Address snapshot at time of purchase
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Service API

### `client/services/checkout.ts`

#### `fetchOrders(userId): Promise<Order[]>`

Fetches all orders for a user, sorted by most recent first. Each order includes its nested `order_items`, enriched with payment card details and seller names.

**Backend endpoint:** `GET /api/orders/:userId`

**Response mapping:** Snake_case DB columns are mapped to camelCase client types (e.g. `user_id` → `userId`, `unit_price` → `unitPrice`, `order_items` → `items`, `payment_card` → `paymentCard`, `seller_names` → `sellerNames`, `shipping_address` → `shippingAddress`).

---

## UI Components

### OrderCard (`client/components/OrderCard.tsx`)

A reusable, animated card for displaying an order in a list.

**Props:**
- `order: Order` — The order to display
- `onPress: () => void` — Callback when tapped

**Features:**
- Product thumbnail (first item's image, or package icon placeholder)
- Product name with "+N more" for multi-item orders
- Total amount and item count
- Color-coded status badge with icon:
  - **Paid** — blue, credit-card icon
  - **Shipped** — blue, truck icon
  - **Delivered** — green, check-circle icon
  - **Pending** — gray, clock icon
  - **Cancelled** — red, x-circle icon
- Formatted date
- Press animation (spring scale)
- Chevron-right indicator

### OrdersScreen (`client/screens/OrdersScreen.tsx`)

Full-screen order list accessible from Profile → "My Orders".

**Features:**
- Fetches orders on screen focus (refreshes when navigating back)
- Pull-to-refresh
- Staggered fade-in animation for each card
- Loading spinner on initial load
- Empty state with "No orders yet" message
- Tapping an order navigates to `OrderDetail`
- Theme-aware (dark/light mode)

### OrderDetailScreen (`client/screens/OrderDetailScreen.tsx`)

Full order detail view showing all information about a single order.

**Route params:** `{ orderId: string }`

**Features:**
- **Status card** — Color-coded status badge, order ID (truncated), date/time, item count
- **Payment info** — Card brand (capitalized), last 4 digits (•••• 4242), expiration date
- **Store section** — Store name(s) the order was placed from, with shopping-bag icon
- **Shipping address** — Recipient name, full address, phone number (if provided), with map-pin icon
- **Items list** — Each item with product image, name, variant (color/size), unit price × quantity, line total
- **Totals card** — Subtotal, shipping (free), grand total
- Loading and error states
- Theme-aware (dark/light mode)

---

## Navigation

### Routes in `RootStackNavigator`

```tsx
// In RootStackParamList
Orders: undefined;
OrderDetail: { orderId: string };
```

### Navigating

```tsx
// To orders list (from ProfileScreen)
navigation.navigate("Orders");

// To order detail (from OrdersScreen)
navigation.navigate("OrderDetail", { orderId: order.id });
```

### Entry Point

The "My Orders" menu item is in the **Profile** tab under the **Account** section, using the `shopping-bag` icon.

---

## Backend Endpoint

### `GET /api/orders/:userId`

Fetches all orders for a user with their order items pre-joined, enriched with payment card details from Stripe and seller names from profiles.

**Query:**
```sql
SELECT *, order_items(*) FROM orders
WHERE user_id = :userId
ORDER BY created_at DESC
```

**Enrichment (server-side):**
- For each order, retrieves the PaymentIntent from Stripe, then the PaymentMethod to get card `brand`, `last4`, `exp_month`, `exp_year`
- Collects unique `seller_id` values from order items and looks up `store_name` / `name` from the `profiles` table
- `shipping_address` is stored as a JSONB snapshot on the order at checkout time (returned as-is)

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "stripe_payment_intent_id": "pi_...",
      "status": "paid",
      "total_amount": "24.00",
      "currency": "usd",
      "created_at": "2026-02-09T...",
      "updated_at": "2026-02-09T...",
      "payment_card": {
        "brand": "visa",
        "last4": "4242",
        "expMonth": 4,
        "expYear": 2042
      },
      "seller_names": {
        "seller-uuid": "Steven's Store"
      },
      "shipping_address": {
        "name": "John Doe",
        "addressLine1": "123 Main St",
        "addressLine2": "Apt 4",
        "city": "Lorain",
        "state": "OH",
        "zip": "44052",
        "country": "US",
        "phone": "555-1234"
      },
      "order_items": [
        {
          "id": "uuid",
          "order_id": "uuid",
          "product_id": "uuid",
          "seller_id": "uuid",
          "quantity": 2,
          "unit_price": "12.00",
          "selected_color_name": "Orange",
          "selected_size_name": "L",
          "product_name": "Test Product",
          "product_image": "https://..."
        }
      ]
    }
  ]
}
```

---

## Order Statuses

| Status | Description | Color | Icon |
|--------|-------------|-------|------|
| `pending` | Order created, payment not yet confirmed | Gray | clock |
| `paid` | Payment confirmed, awaiting shipment | Blue | credit-card |
| `shipped` | Order has been shipped | Blue | truck |
| `delivered` | Order delivered to customer | Green | check-circle |
| `cancelled` | Order was cancelled | Red | x-circle |

---

## Order Creation Flow

Orders are **not** created by the client directly. They are created server-side after payment verification:

1. **Native flow:** Client calls `POST /api/checkout/confirm` after PaymentSheet succeeds → backend verifies PaymentIntent status → creates order
2. **Web flow:** Client calls `POST /api/checkout/pay-with-saved-card` → backend creates PaymentIntent, confirms it, creates order — all in one request

Both paths:
- Create an `orders` row with `status: "paid"`, Stripe PaymentIntent ID, and `shipping_address` JSONB snapshot
- Create `order_items` rows with product snapshots (name, image, variant info, price)
- Decrement `quantity_in_stock` on each product
- Clear purchased items from the user's cart

The shipping address is stored as a JSONB snapshot at time of purchase so it remains accurate even if the user later edits or deletes the address.

---

## Setup

### Prerequisites

1. Run `supabase-orders-migration.sql` in your Supabase SQL Editor to create the `orders` and `order_items` tables
2. Run `supabase-orders-shipping-address-migration.sql` to add the `shipping_address` JSONB column to the `orders` table

### Testing

1. Complete a checkout (cart → checkout → pay with a selected address)
2. Navigate to Profile → My Orders
3. Verify the order appears with correct items, total, and status
4. Tap the order to see full details including:
   - Payment card brand and last 4 digits
   - Store name
   - Shipping address
   - All items with variants and pricing

---

## Future Enhancements

- [ ] **Order status updates** — Real-time status changes (shipped, delivered) via Supabase subscriptions
- [ ] **Order tracking** — Tracking number and carrier info
- [ ] **Order cancellation** — Allow cancelling orders before shipment
- [ ] **Refunds** — Stripe refund integration
- [ ] **Seller order management** — Sellers can view and manage incoming orders
- [ ] **Order receipts** — Email receipts via Stripe
- [ ] **Re-order** — Quick re-order from order detail
- [ ] **Order search/filter** — Filter by status, date range, store
