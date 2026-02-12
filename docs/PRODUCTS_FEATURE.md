# Products Feature Documentation

## Overview

Sellers can create, edit, and manage products with images, variants (colors/sizes), pricing, and stock levels. Products are discoverable via the Explore tab, store profiles, and live stream carousels. Product details are shown consistently via the `ProductDetailSheet` modal component.

---

## Architecture

### Database — `products` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Product name |
| `description` | TEXT | Product description |
| `price` | DECIMAL | Product price |
| `image` | TEXT | Primary image URL |
| `images` | TEXT[] | Array of additional image URLs |
| `category` | TEXT | Product category |
| `quantity_in_stock` | INTEGER | Available stock |
| `colors` | JSONB | Array of color variants `[{ id, name, hex }]` |
| `sizes` | JSONB | Array of size variants `[{ id, name }]` |
| `variants` | JSONB | Combined variant data |
| `seller_id` | UUID | References `profiles(id)` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Product Service

**File:** `client/services/products.ts`

| Method | Description |
|--------|-------------|
| `listAllProducts()` | Fetch all products (for Explore) |
| `listSellerProducts(sellerId)` | Fetch products by seller |
| `getProduct(id)` | Fetch single product |
| `createProduct(data)` | Create new product |
| `updateProduct(id, data)` | Update existing product |
| `deleteProduct(id)` | Delete product |

---

## Client Screens

### `ProductsScreen` — Seller's Product Management

**File:** `client/screens/ProductsScreen.tsx`

- Lists all products owned by the current user
- Each card shows: image, name, price, stock indicator, color swatches, size chips
- "Add Product" FAB button → navigates to `AddProductScreen`
- Long press or delete button to remove products
- Voice Add button — creates a temp LiveKit room, dispatches voice agent for hands-free product creation
- Pull-to-refresh

### `AddProductScreen` — Create/Edit Product

**File:** `client/screens/AddProductScreen.tsx`

- Modal presentation
- Fields: name, description, price, category, stock quantity
- Image picker (multiple images)
- Color variant editor (name + hex color picker)
- Size variant editor
- Edit mode: pre-fills fields when `productId` param is provided
- Image upload to Supabase Storage

### `ExploreScreen` — Product Discovery

**File:** `client/screens/ExploreScreen.tsx`

- Displays all products from other sellers (excludes current user's products)
- Search bar with text filtering
- Grid layout using `ProductCard` component
- Tap product → opens `ProductDetailSheet`
- Pull-to-refresh
- Cart icon in header

---

## Shared Components

### `ProductCard`

**File:** `client/components/ProductCard.tsx`

Reusable product card with two variants:
- **Grid variant** — Compact card for grid layouts (Explore, Store Profile)
- **List variant** — Wider card for list layouts (Products management)

Props: `product`, `onPress`, `variant`, `showSeller`, `showDelete`, `onDelete`

### `ProductDetailSheet`

**File:** `client/components/ProductDetailSheet.tsx`

Modal/bottom sheet for viewing product details. Used consistently across all screens:
- Product image carousel
- Name, price, description
- Color variant selector (visual swatches)
- Size variant selector (chips)
- Seller info with navigation to store profile
- "Add to Cart" and "Buy Now" buttons
- Stock availability indicator

**Used in:** ExploreScreen, StoreProfileScreen, LiveStreamScreen, EndedShowScreen

### `ProductCarousel`

**File:** `client/components/ProductCarousel.tsx`

Horizontal scrollable product list used during live streams. Shows featured products that viewers can tap to view details and add to cart.

---

## Saved Products

### Database — `saved_products` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who saved the product |
| `product_id` | UUID | The saved product |
| `created_at` | TIMESTAMPTZ | When saved |

### `SavedProductsScreen`

**File:** `client/screens/SavedProductsScreen.tsx`

- Lists products the user has saved/bookmarked
- Accessible from Profile menu ("Saved Products")
- Tap to view product details

---

## Image Upload

Product images are uploaded to **Supabase Storage** via `client/services/storage.ts`:

1. User picks image via `expo-image-picker`
2. Image is uploaded to Supabase Storage bucket
3. Public URL is stored in the `products.image` or `products.images` column

---

## Voice Product Creation

Sellers can create products hands-free using the voice agent:

1. Tap "Voice Add" button on ProductsScreen
2. Creates a temporary LiveKit room
3. Dispatches `jatango-voice-agent`
4. Speak product details (name, price, description, etc.)
5. Agent calls `create_product` function tool
6. Product is created in the database
7. Room is cleaned up after completion

See `docs/voice-product-creation.md` for full details.

---

## Stock Management

- `quantity_in_stock` is decremented when an order is confirmed
- Stock is checked during checkout to prevent overselling
- During live shows, product reservations temporarily hold stock for viewers with items in cart
- Expired reservations are cleaned up via `/api/reservations/cleanup`

---

## Files

| File | Purpose |
|------|---------|
| `client/screens/ProductsScreen.tsx` | Seller product management |
| `client/screens/AddProductScreen.tsx` | Create/edit product form |
| `client/screens/ExploreScreen.tsx` | Product discovery/search |
| `client/screens/SavedProductsScreen.tsx` | Saved/bookmarked products |
| `client/components/ProductCard.tsx` | Reusable product card |
| `client/components/ProductDetailSheet.tsx` | Product detail modal |
| `client/components/ProductCarousel.tsx` | Live stream product carousel |
| `client/services/products.ts` | Product API service |
| `client/services/storage.ts` | Image upload service |
| `client/hooks/useVoiceAgent.ts` | Voice agent for product creation |
