# Payments Feature Documentation

## Overview

JaTango uses **Stripe** for all payment processing. The system supports one-time purchases via PaymentSheet, saved payment methods via SetupIntents, and automatic seller notifications on sale. All card data is handled by Stripe — no PCI-sensitive data is stored in the JaTango database.

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Payment Processing | Stripe (`stripe` Node.js SDK) |
| Client SDK | `@stripe/stripe-react-native` (PaymentSheet) |
| Customer Management | Stripe Customers API |
| Card Storage | Stripe (PCI-compliant, we only store `stripe_customer_id`) |

### Server Endpoints — `server/payments.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkout/create-payment-intent` | Create PaymentIntent + ephemeral key for PaymentSheet |
| POST | `/api/checkout/confirm` | Confirm order after successful payment |
| POST | `/api/checkout/pay-with-saved-card` | Charge a saved card (off-session) |
| POST | `/api/stripe/setup-intent` | Create SetupIntent for saving a card without charging |
| GET | `/api/stripe/payment-methods/:userId` | List saved cards for a user |
| DELETE | `/api/stripe/payment-methods/:paymentMethodId` | Detach (delete) a saved card |
| GET | `/api/orders/:userId` | Fetch user's order history |

---

## Payment Flows

### 1. Standard Checkout (PaymentSheet)

```
Client: POST /api/checkout/create-payment-intent
  → Server: getOrCreateStripeCustomer(userId, email)
  → Server: stripe.paymentIntents.create({ amount, currency, customer, setup_future_usage })
  → Server: stripe.ephemeralKeys.create({ customer })
  → Returns: { clientSecret, ephemeralKey, customerId }

Client: Opens Stripe PaymentSheet with clientSecret + ephemeralKey
  → User enters card / selects saved card
  → Stripe processes payment

Client: POST /api/checkout/confirm
  → Server: Creates order + order_items in Supabase
  → Server: Decrements product stock
  → Server: Clears cart items
  → Server: notifySellerOfSale(sellerId, totalAmount, itemCount, orderId)
  → Returns: { orderId, status: "paid", totalAmount }
```

### 2. Pay with Saved Card

```
Client: POST /api/checkout/pay-with-saved-card
  → Server: getOrCreateStripeCustomer(userId, email)
  → Server: stripe.paymentIntents.create({
      amount, currency, customer,
      payment_method: paymentMethodId,
      off_session: true, confirm: true
    })
  → Server: Creates order + order_items
  → Server: Decrements stock, clears cart
  → Server: notifySellerOfSale()
  → Returns: { orderId, status: "paid", totalAmount, paymentIntentId }
```

### 3. Save Card (SetupIntent)

```
Client: POST /api/stripe/setup-intent
  → Server: getOrCreateStripeCustomer(userId, email)
  → Server: stripe.setupIntents.create({ customer, usage: "off_session" })
  → Returns: { clientSecret, customerId }

Client: Confirms SetupIntent via Stripe SDK
  → Card is saved to the Stripe Customer for future use
```

---

## Stripe Customer Management

### `getOrCreateStripeCustomer(userId, email)`

1. Query `profiles.stripe_customer_id` for the user
2. If exists, return it
3. If not, create a new Stripe Customer with the user's email
4. Save `stripe_customer_id` to the profiles table
5. Return the customer ID

This ensures each user has exactly one Stripe Customer, and saved cards persist across sessions.

---

## Client Screens

### `CheckoutScreen`

**File:** `client/screens/CheckoutScreen.tsx`

- Displays cart items grouped by seller
- Shows subtotal, tax, shipping, total
- Opens Stripe PaymentSheet for payment
- Passes `customerId` + `ephemeralKey` for saved card support
- On success → confirms order → navigates to `OrderConfirmationScreen`

### `SavedPaymentMethodsScreen`

**File:** `client/screens/SavedPaymentMethodsScreen.tsx`

- Lists saved cards (brand, last 4 digits, expiry)
- "Add Card" button → creates SetupIntent → opens Stripe CardForm
- Swipe-to-delete or delete button → detaches payment method

### `OrderConfirmationScreen`

**File:** `client/screens/OrderConfirmationScreen.tsx`

- Success animation
- Order ID and total amount
- "Continue Shopping" button
- Gesture disabled (can't swipe back)

---

## Database

### `orders` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Buyer's profile ID |
| `stripe_payment_intent_id` | TEXT | Stripe PI ID (unique) |
| `status` | TEXT | `pending \| paid \| shipped \| delivered \| cancelled` |
| `total_amount` | DECIMAL(10,2) | Total charged |
| `currency` | TEXT | Default `usd` |
| `created_at` | TIMESTAMPTZ | Order timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

### `order_items` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | References `orders(id)` |
| `product_id` | UUID | References `products(id)` |
| `seller_id` | UUID | Seller's profile ID |
| `quantity` | INTEGER | Number of items |
| `unit_price` | DECIMAL(10,2) | Price per item |
| `selected_color_id/name` | TEXT | Selected variant color |
| `selected_size_id/name` | TEXT | Selected variant size |
| `product_name` | TEXT | Snapshot of product name at purchase time |
| `product_image` | TEXT | Snapshot of product image |

### `profiles.stripe_customer_id`

Added by `supabase-addresses-migration.sql`. Stores the Stripe Customer ID for saved cards.

### RLS Policies

- Buyers can SELECT/INSERT/UPDATE their own orders
- Buyers can SELECT/INSERT order items for their own orders
- Sellers can SELECT order items where `seller_id` matches

---

## Security

- **Card numbers are NEVER stored** in the JaTango database
- Stripe handles all PCI-compliant card storage
- Only `stripe_customer_id` is stored in profiles
- `setup_future_usage: "off_session"` on PaymentIntents saves cards automatically
- Ephemeral keys are short-lived and scoped to a single customer

---

## Files

| File | Purpose |
|------|---------|
| `server/payments.ts` | All Stripe endpoints, order creation, seller notification |
| `client/screens/CheckoutScreen.tsx` | Checkout UI with PaymentSheet |
| `client/screens/SavedPaymentMethodsScreen.tsx` | Manage saved cards |
| `client/screens/OrderConfirmationScreen.tsx` | Post-purchase confirmation |
| `client/services/checkout.ts` | API calls for payment intents |
| `client/services/settings.ts` | API calls for saved cards + addresses |
| `supabase-orders-migration.sql` | Orders + order_items tables |
| `supabase-addresses-migration.sql` | Addresses + stripe_customer_id |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |

---

## Stripe API Version

`2026-01-28.clover`
