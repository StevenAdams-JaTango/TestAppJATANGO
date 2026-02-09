# Cart & Checkout Feature Documentation

## Overview

The cart feature allows users to add products to their shopping cart, with items automatically grouped by store (seller). The cart is persisted in Supabase and includes real-time inventory/stock validation to prevent overselling.

**Checkout is per-store only** — users must check out from one store at a time. Each store section in the cart has its own "Checkout" button. After completing a purchase for one store, items from other stores remain in the cart.

### User Actions

- **Add to Cart** (shopping bag icon) — Adds item to cart and shows confirmation
- **Buy Now** — Adds item to cart and navigates directly to Cart screen
- **Checkout** — Per-store button that navigates to the Checkout screen for that store only

---

## Architecture

### Data Flow

```
User Action → ProductDetailSheet → CartContext → CartService → Supabase
                                        ↓
                                   Stock Validation
                                        ↓
                                   Success/Error Response
```

### Checkout Flow

**Native (iOS/Android) — Stripe PaymentSheet:**
```
Cart (per-store "Checkout" button)
  → Checkout Screen (filtered to one store)
    → checkoutService.createPaymentIntent(storeCart)
      → Backend creates Stripe PaymentIntent
    → Stripe PaymentSheet presented
    → On success: checkoutService.confirmOrder()
      → Backend creates order + order_items in Supabase
    → clearStoreCart(sellerId) — only that store's items removed
    → Navigate to OrderConfirmation screen
```

**Web — Saved Card + Address Selection:**
```
Cart (per-store "Checkout" button)
  → Checkout Screen (filtered to one store)
    → Load saved cards (settingsService.fetchPaymentMethods)
    → Load saved addresses (settingsService.fetchAddresses)
    → User selects a card and shipping address
    → checkoutService.payWithSavedCard(storeCart, paymentMethodId)
      → Backend creates PaymentIntent, confirms it server-side,
        creates order + order_items, decrements stock, clears cart
    → clearStoreCart(sellerId)
    → Navigate to OrderConfirmation screen
```

### Key Design Decisions

1. **Cart grouped by store** — Each seller's products are in a separate section
2. **Single-store checkout** — Users can only check out one store at a time; each store has its own checkout button
3. **Variant tracking** — Selected color/size/variant is stored with each cart item
4. **Stock validation** — Checks inventory before adding and prevents exceeding available stock
5. **Database persistence** — Cart survives app restarts and syncs across devices via Supabase
6. **Row Level Security** — Users can only access their own cart items
7. **Stripe PaymentSheet** — PCI-compliant payment UI on native (iOS/Android)
8. **Web saved-card checkout** — On web, users select a saved card and address; payment is confirmed server-side via `payWithSavedCard`
9. **Theme-aware styling** — All cart and checkout screens use `theme.*` values for dark/light mode support

---

## Database Schema

### Table: `cart_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | Foreign key to `profiles.id` |
| `product_id` | UUID | Foreign key to `products.id` |
| `seller_id` | UUID | Foreign key to `profiles.id` (the store owner) |
| `quantity` | INTEGER | Number of items (must be > 0) |
| `selected_color_id` | TEXT | ID of selected color variant (nullable) |
| `selected_color_name` | TEXT | Name of selected color for display |
| `selected_size_id` | TEXT | ID of selected size variant (nullable) |
| `selected_size_name` | TEXT | Name of selected size for display |
| `selected_variant_id` | TEXT | ID of specific variant combination (nullable) |
| `unit_price` | DECIMAL(10,2) | Price at time of adding to cart |
| `created_at` | TIMESTAMPTZ | When item was added |
| `updated_at` | TIMESTAMPTZ | Last modification time |

### Table: `orders`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `profiles.id` |
| `stripe_payment_intent_id` | TEXT | Stripe PaymentIntent ID |
| `status` | TEXT | Order status (e.g. `paid`) |
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

### Constraints (cart_items)

- **Unique constraint**: `(user_id, product_id, selected_color_id, selected_size_id)` — Prevents duplicate items with same variant
- **Check constraint**: `quantity > 0` — Ensures valid quantities
- **Foreign keys**: Cascade delete when user, product, or seller is deleted

### Indexes

- `idx_cart_items_user_id` — Fast lookup by user
- `idx_cart_items_seller_id` — Fast grouping by store

### Row Level Security (RLS) Policies

```sql
-- Users can only view their own cart
CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert to their own cart
CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own cart
CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete from their own cart
CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);
```

---

## File Structure

```
client/
├── types/
│   └── cart.ts                # Cart type definitions & helpers
├── services/
│   ├── cart.ts                # CartService — Supabase operations & stock validation
│   └── checkout.ts            # CheckoutService — Stripe payment & order confirmation
├── contexts/
│   └── CartContext.tsx         # React context for global cart state
├── screens/
│   ├── CartScreen.tsx          # Cart view UI (per-store checkout buttons)
│   ├── CheckoutScreen.tsx      # Single-store checkout with Stripe PaymentSheet
│   └── OrderConfirmationScreen.tsx  # Post-payment confirmation
├── components/
│   ├── CartIcon.tsx            # Cart icon with badge
│   └── ProductDetailSheet.tsx  # Updated with Add to Cart / Buy Now
└── navigation/
    └── RootStackNavigator.tsx  # Cart, Checkout, OrderConfirmation routes

server/
└── payments.ts                # Stripe backend: PaymentIntents, orders, customers
```

---

## Type Definitions

### `client/types/cart.ts`

```typescript
// Individual cart item
interface CartItem {
  id: string;                    // Unique cart item ID (from DB)
  product: Product;              // Full product data
  quantity: number;              // Number of items
  selectedColor?: ColorVariant;  // Selected color (if applicable)
  selectedSize?: SizeVariant;    // Selected size (if applicable)
  selectedVariant?: ProductVariant; // Specific variant combination
  addedAt: number;               // Timestamp when added
}

// Items grouped by store
interface StoreCart {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
  items: CartItem[];
}

// Full cart structure
interface Cart {
  stores: StoreCart[];
  updatedAt: number;
}
```

### Helper Functions

```typescript
// Get total items across all stores
getTotalCartItems(cart: Cart): number

// Get total price for a single store
getStoreTotal(store: StoreCart): number

// Get cart total across all stores
getCartTotal(cart: Cart): number
```

---

## Cart Service API

### `client/services/cart.ts`

All methods return `Promise<{ success: boolean; message?: string }>` for error handling.

#### `initialize(): Promise<Cart>`
Loads cart from Supabase for the current user. Called once when app starts.

#### `addToCart(product, quantity, selectedColor?, selectedSize?, selectedVariant?)`
Adds item to cart with stock validation.

**Stock Validation Logic:**
1. Gets stock quantity from variant → color → size → product (in priority order)
2. Checks existing cart quantity for same item
3. Calculates if total requested exceeds available stock
4. Returns error message if stock insufficient

**Example responses:**
- `{ success: true }` — Item added successfully
- `{ success: false, message: "This item is out of stock" }`
- `{ success: false, message: "Only 3 more available (5 total in stock)" }`
- `{ success: false, message: "Maximum quantity (5) already in cart" }`

#### `updateQuantity(sellerId, cartItemId, quantity)`
Updates item quantity with stock validation.

#### `removeItem(sellerId, cartItemId)`
Removes item from cart.

#### `clearStoreCart(sellerId)`
Removes all items from a specific store. Called after successful checkout for that store.

#### `clearCart()`
Removes all items from the entire cart.

#### `checkStock(product, quantity, selectedColor?, selectedSize?, selectedVariant?)`
Validates stock availability without modifying cart.

Returns:
```typescript
{
  available: boolean;
  maxQuantity: number;
  message?: string;
}
```

---

## Checkout Service API

### `client/services/checkout.ts`

#### `createPaymentIntent(cart, userId, email?): Promise<CreatePaymentIntentResponse>`

Sends the cart items to the backend to create a Stripe PaymentIntent. The cart is filtered to a single store before calling this.

**Request payload:**
```typescript
{
  items: CartItemPayload[];  // Flattened cart items with prices
  userId: string;
  email?: string;
}
```

**Response:**
```typescript
{
  clientSecret: string;      // For Stripe PaymentSheet
  paymentIntentId: string;   // For order confirmation
  ephemeralKey: string;      // For saved cards support
  customerId: string;        // Stripe Customer ID
  amount: number;            // Total in cents
}
```

#### `confirmOrder(paymentIntentId, cart, userId): Promise<ConfirmOrderResponse>`

Called after successful Stripe payment (native flow). Creates the order and order items in the database.

**Response:**
```typescript
{
  orderId: string;
  status: string;
  totalAmount: number;
}
```

#### `payWithSavedCard(cart, userId, paymentMethodId, email?): Promise<ConfirmOrderResponse & { paymentIntentId }>`

Used on **web only**. Sends the cart and a saved payment method ID to the backend, which creates a PaymentIntent, confirms it server-side using the saved card, creates the order + order items, decrements stock, and clears cart items — all in one request.

**Request payload:**
```typescript
{
  items: CartItemPayload[];
  userId: string;
  paymentMethodId: string;
  email?: string;
}
```

**Response:**
```typescript
{
  orderId: string;
  status: string;
  totalAmount: number;
  paymentIntentId: string;
}
```

#### `fetchOrders(userId): Promise<Order[]>`

Fetches all orders for a user, including order items.

---

## Cart Context

### `client/contexts/CartContext.tsx`

Provides global cart state to the entire app.

#### Usage

```tsx
import { useCart } from "@/contexts/CartContext";

function MyComponent() {
  const {
    cart,           // Current cart state
    isLoading,      // Loading state
    totalItems,     // Total item count
    addToCart,      // Add item function
    updateQuantity, // Update quantity function
    removeItem,     // Remove item function
    clearStoreCart, // Clear store function
    clearCart,      // Clear all function
    getStoreCart,   // Get specific store's cart
    getStoreItemCount // Get item count for store
  } = useCart();

  // Add to cart with error handling
  const handleAdd = async () => {
    const result = await addToCart(product, 1, selectedColor, selectedSize);
    if (!result.success) {
      Alert.alert("Error", result.message);
    }
  };
}
```

---

## UI Components

### CartIcon (`client/components/CartIcon.tsx`)

A pressable cart icon with a badge showing total items.

**Props:**
- `color?: string` — Icon color (defaults to theme text color)
- `size?: number` — Icon size (default: 24)

**Features:**
- Shows red badge with item count
- Badge shows "99+" for counts over 99
- Navigates to Cart screen on press using `CommonActions.navigate()` for compatibility with nested navigators
- Haptic feedback on press
- Works from any screen in the app (Home, Explore, Shows, Profile, etc.)

**Implementation Note:**
Uses `navigation.dispatch(CommonActions.navigate({ name: "Cart" }))` instead of `navigation.navigate("Cart")` to ensure the cart screen can be accessed from deeply nested navigators.

**Usage:**
```tsx
<CartIcon />
<CartIcon color="#fff" size={28} />
```

**Placement:**
- Default header right component in `useScreenOptions.ts` (appears on most screens)
- Composed with other header buttons on HomeStack (alongside bell icon)
- Manually added to custom headers on StoreProfile, Products, and AddProduct screens

### CartScreen (`client/screens/CartScreen.tsx`)

Full-screen cart view with items grouped by store.

**Features:**
- Items grouped by store with store header (avatar, name, item count)
- Store name tappable to visit store profile
- Product image, name, variant info, price
- Quantity controls (+/- buttons) with confirmation dialog for removal
- Remove item button (trash icon)
- Clear store button (X icon)
- **Per-store subtotal and "Checkout" button** — each store has its own checkout button
- No global checkout footer — enforces single-store checkout
- Empty state with "Start Shopping" button
- Fully theme-aware (dark/light mode)

### CheckoutScreen (`client/screens/CheckoutScreen.tsx`)

Single-store checkout screen with platform-specific payment integration.

**Route params:** `{ sellerId: string }` — required, determines which store to check out

**Features:**
- Filters cart to only the specified store's items
- Order summary showing items, quantities, prices
- Subtotal, shipping (free), and grand total
- **Native**: Stripe PaymentSheet integration
- **Web**: Saved card and shipping address selection UI
- Test mode notice with test card info
- Loading states during payment initialization and processing
- On success: clears only that store's cart, navigates to OrderConfirmation
- Fully theme-aware (dark/light mode)

**Native checkout flow:**
1. Screen loads → `createPaymentIntent()` called with single-store cart
2. Stripe PaymentSheet initialized with `clientSecret`, `customerId`, `ephemeralKey`
3. User taps "Pay $X.XX" → PaymentSheet presented
4. On success → `confirmOrder()` called → order created in DB
5. `clearStoreCart(sellerId)` → only that store's items removed
6. Navigate to `OrderConfirmation` with `orderId` and `totalAmount`

**Web checkout flow:**
1. Screen loads → saved cards and addresses fetched in parallel
2. Default card and address auto-selected
3. User can change selection (cards shown with brand/last4, addresses with full details)
4. If no cards/addresses exist, "Add a payment method" / "Add a shipping address" links navigate to Settings
5. User taps "Pay $X.XX" → `payWithSavedCard()` called server-side
6. Backend creates PaymentIntent, confirms with saved card, creates order, decrements stock
7. `clearStoreCart(sellerId)` → only that store's items removed
8. Navigate to `OrderConfirmation` with `orderId` and `totalAmount`

### OrderConfirmationScreen (`client/screens/OrderConfirmationScreen.tsx`)

Post-payment success screen.

**Route params:** `{ orderId: string; totalAmount: number }`

---

## ProductDetailSheet Integration

The `ProductDetailSheet` component has two cart actions:

### Add to Cart (Shopping Bag Icon)

Adds item to cart and shows a confirmation alert.

```tsx
const handleAddToCart = async () => {
  // Validate variant selection
  if (hasColors && !selectedColor) {
    Alert.alert("Select a color", "Please select a color before adding to cart.");
    return;
  }
  if (hasSizes && !selectedSize) {
    Alert.alert("Select a size", "Please select a size before adding to cart.");
    return;
  }

  const result = await addToCart(product, 1, selectedColor, selectedSize, currentVariant);

  if (result.success) {
    Alert.alert("Added to Cart", `${product.name} has been added to your cart.`);
  } else {
    Alert.alert("Cannot Add to Cart", result.message);
  }
};
```

### Buy Now Button

Adds item to cart and navigates directly to the Cart screen.

```tsx
const handleBuyNow = async () => {
  // Validate variant selection (same as Add to Cart)
  const result = await addToCart(product, 1, selectedColor, selectedSize, currentVariant);

  if (result.success) {
    onClose(); // Close the product sheet
    navigation.navigate("Cart"); // Go to cart to checkout
  } else {
    Alert.alert("Cannot Purchase", result.message);
  }
};
```

---

## Navigation

### Routes in `RootStackNavigator`

```tsx
// In RootStackParamList
Cart: undefined;
Checkout: { sellerId: string };
OrderConfirmation: { orderId: string; totalAmount: number };
```

### Navigating

```tsx
// To cart
navigation.navigate("Cart");

// To checkout for a specific store (from CartScreen)
navigation.navigate("Checkout", { sellerId: store.sellerId });

// To order confirmation (from CheckoutScreen, uses replace)
navigation.replace("OrderConfirmation", { orderId, totalAmount });
```

---

## Checkout Requirements & Constraints

1. **Single-store checkout only** — Users cannot check out items from multiple stores in one transaction. Each store has its own "Checkout" button in the cart.
2. **Authentication required** — User must be logged in (`user.id` required for PaymentIntent creation).
3. **Non-empty cart** — Checkout screen shows empty state if the store has no items.
4. **Platform-specific payment**:
   - **Native (iOS/Android)**: Stripe PaymentSheet with saved cards via `customerId` + `ephemeralKey`
   - **Web**: Select from saved cards + addresses, payment confirmed server-side via `payWithSavedCard`
5. **Saved cards required on web** — Users must have at least one saved card to check out on web. The "Add a payment method" link navigates to Settings.
6. **Shipping address required on web** — Users must select a shipping address on web checkout.
7. **Post-checkout cleanup** — Only the checked-out store's items are cleared; other stores' items remain.
8. **Order persistence** — Orders and order items are stored in Supabase (`orders` + `order_items` tables).
9. **Test mode** — Uses Stripe test keys. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

---

## Backend Endpoints

### `POST /api/checkout/create-payment-intent`

Creates a Stripe PaymentIntent for the cart items.

**Body:** `{ items: CartItemPayload[], userId: string, email?: string }`
**Response:** `{ clientSecret, paymentIntentId, ephemeralKey, customerId, amount }`

### `POST /api/checkout/confirm`

Confirms the order after successful payment (native flow). Creates `orders` and `order_items` rows.

**Body:** `{ paymentIntentId: string, userId: string, items: CartItemPayload[] }`
**Response:** `{ orderId, status, totalAmount }`

### `POST /api/checkout/pay-with-saved-card`

Charges a saved payment method server-side (web flow). Creates PaymentIntent, confirms it immediately with the saved card, creates order + order items, decrements stock, and clears cart items — all in one request.

**Body:** `{ items: CartItemPayload[], userId: string, email?: string, paymentMethodId: string }`
**Response:** `{ orderId, status, totalAmount, paymentIntentId }`

**Error handling:**
- Returns `400` for Stripe card errors (e.g. declined card) with the Stripe error message
- Returns `400` if order total is less than $0.50
- Returns `500` for unexpected server errors

### `GET /api/orders/:userId`

Fetches all orders for a user with their order items.

### Stripe Customer Management

- `getOrCreateStripeCustomer(userId, email)` — Creates or retrieves a Stripe Customer, stores `stripe_customer_id` in profiles table
- Fallback: searches Stripe by metadata if profile update was blocked by RLS

---

## Stock Validation Flow

```
1. User taps "Add to Cart"
   ↓
2. Check if color/size selection required
   ↓
3. CartService.checkStock() called
   ↓
4. Get stock quantity:
   - selectedVariant?.stockQuantity
   - OR selectedColor?.stockQuantity
   - OR selectedSize?.stockQuantity
   - OR product.quantityInStock
   - OR 0 (out of stock)
   ↓
5. Check existing cart quantity for same item
   ↓
6. Calculate: totalRequested = existingQty + newQty
   ↓
7. If totalRequested > stockQuantity:
   - Return error with helpful message
   ↓
8. If stock available:
   - Upsert to Supabase (insert or update quantity)
   - Reload cart from DB
   - Return success
```

---

## Setup Instructions

### 1. Run Database Migrations

Run the following SQL files in your Supabase SQL Editor (`https://supabase.com/dashboard/project/YOUR_PROJECT/sql`):

1. `supabase-cart-migration.sql` — Creates `cart_items` table
2. `supabase-orders-migration.sql` — Creates `orders` and `order_items` tables
3. `supabase-addresses-migration.sql` — Creates `shipping_addresses` table and adds `stripe_customer_id` to profiles

### 2. Environment Variables

Ensure the following are set in your `.env`:

```
STRIPE_SECRET_KEY=sk_test_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
SUPABASE_SERVICE_ROLE_KEY=...  # Required for server-side profile updates (bypasses RLS)
```

### 3. Verify Tables Created

Check that `cart_items`, `orders`, and `order_items` tables exist in your Supabase dashboard.

### 4. Test the Feature

1. Open the app and navigate to Explore
2. Tap a product to open ProductDetailSheet
3. Select color/size if required
4. Tap the cart icon (shopping bag) to add to cart
5. Open cart (tap cart icon in header)
6. Tap "Checkout" on a store section
7. Complete payment with test card `4242 4242 4242 4242`
8. Verify order confirmation screen appears
9. Verify only that store's items were cleared from cart

---

## Future Enhancements

- [x] **Checkout flow** — Per-store Stripe checkout implemented
- [x] **Saved payment methods** — Via Stripe PaymentSheet + SetupIntent
- [x] **Shipping addresses** — CRUD in Settings
- [ ] **Cart persistence for guests** — Use AsyncStorage as fallback
- [ ] **Real-time stock updates** — Subscribe to product changes
- [ ] **Save for later** — Move items out of active cart
- [ ] **Cart sharing** — Share cart link with others
- [ ] **Price change notifications** — Alert when prices change
- [ ] **Estimated shipping** — Show shipping costs per store
- [ ] **Promo codes** — Apply discounts at cart level
- [ ] **Multi-store checkout** — Allow checking out all stores at once (currently single-store only)

---

## Troubleshooting

### "Please log in to add items to cart"
User is not authenticated. Ensure they're logged in before adding to cart.

### "This item is out of stock"
Product's `quantityInStock` is 0. Check inventory in seller dashboard.

### "Only X more available"
User is trying to add more than available stock. The message shows how many more can be added.

### Cart not loading
1. Check Supabase connection
2. Verify RLS policies are correct
3. Check browser console for errors
4. Ensure `cart_items` table exists

### Items disappearing
If a product or seller is deleted, cart items referencing them are cascade deleted. This is expected behavior.

### Payment not initializing
1. Check that `STRIPE_SECRET_KEY` is set in server `.env`
2. Check that `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
3. Check server logs for `[Payments]` or `[Checkout]` errors
4. Ensure the backend is running (`server/payments.ts` endpoints)

### Cards not saving / stripe_customer_id not persisting
1. Set `SUPABASE_SERVICE_ROLE_KEY` in server `.env` to bypass RLS for profile updates
2. The system has fallback logic that searches Stripe by metadata if the profile update fails

### Checkout button not appearing
Each store section has its own "Checkout" button in the footer. There is no global checkout button — this is by design (single-store checkout).
