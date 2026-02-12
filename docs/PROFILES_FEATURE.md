# Profiles & Seller Feature Documentation

## Overview

Every JaTango user has a profile. Users can optionally become sellers, which unlocks product management, live streaming, sales tracking, and the ring light avatar effect. Profiles include avatar upload, display name editing, follower/following counts, and a store address for shipping.

---

## Architecture

### Database — `profiles` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Matches Supabase Auth user ID |
| `name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile picture URL (Supabase Storage) |
| `bio` | TEXT | User bio |
| `isSeller` | BOOLEAN | Whether the user is a seller |
| `push_token` | TEXT | Expo push token for notifications |
| `stripe_customer_id` | TEXT | Stripe Customer ID for saved cards |
| `store_address` | JSONB | Seller's shipping origin address |
| `followers` | INTEGER | Follower count |
| `following` | INTEGER | Following count |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |

---

## Client Screens

### `ProfileScreen` — Current User's Profile

**File:** `client/screens/ProfileScreen.tsx`

The user's own profile page with:

- **Avatar section** — Ring light avatar for sellers (glowing white ring), plain avatar for non-sellers
- **Name editing** — Inline edit with pencil icon, saves to Supabase
- **Avatar upload** — Tap avatar to pick image, uploads to Supabase Storage
- **Stats row** — Followers, following counts
- **Menu items** with live badge counts:
  - View My Store → `StoreProfileScreen`
  - My Orders → `OrdersScreen` (badge: order count)
  - My Cart → `CartScreen` (badge: cart item count)
  - My Products → `ProductsScreen` (badge: product count)
  - My Shorts → `StoreShortsViewer` (badge: shorts count, sellers only)
  - My Sales → `SalesScreen` (badge: sales count, sellers only)
  - Saved Products → `SavedProductsScreen` (badge: saved count)
  - Notifications → `NotificationsScreen` (badge: unread count)
  - Settings → `SettingsScreen`
  - Sign Out

- **Real-time badge updates** — Supabase Realtime subscriptions on `orders`, `order_items`, `products`, `saved_products`, `shorts` tables
- **Pull-to-refresh** — Reloads profile data and notification count

### `StoreProfileScreen` — Public Store View

**File:** `client/screens/StoreProfileScreen.tsx`

Public-facing store page for any seller:

- **Ring light avatar** with seller's profile picture
- **Store name** and bio
- **Follower/following counts**
- **Tabs:**
  - Products tab — Grid of seller's products using `ProductCard`
  - Shorts tab — Grid of seller's short videos
- **Product tap** → Opens `ProductDetailSheet`
- **Short tap** → Opens `StoreShortsViewer`

### `StoreAddressScreen` — Seller Address

**File:** `client/screens/StoreAddressScreen.tsx`

Where sellers set their shipping origin address (used for shipping rate calculations):
- Street, city, state, zip, country fields
- Saves to `profiles.store_address` JSONB column
- Required before purchasing shipping labels

---

## Ring Light Avatar

**File:** `client/components/RingLightAvatar.tsx`

Shared component used on both `ProfileScreen` and `StoreProfileScreen`:

- Bright white ring (`#FAFAFA`) with dark borders (`#222`)
- Soft white glow effect (shadow radius 12-16)
- Profile picture centered inside the ring
- Fallback: Feather "user" icon if no avatar
- Props: `avatar: string | null`, `size?: number` (default 128)

The ring light effect visually distinguishes sellers from regular users.

---

## Avatar Upload Flow

1. User taps avatar on ProfileScreen
2. `expo-image-picker` opens (camera or gallery)
3. Image uploaded to Supabase Storage via `uploadImage()` from `client/services/storage.ts`
4. Public URL saved to `profiles.avatar_url`
5. UI updates immediately

---

## Seller Features

When `isSeller` is true, the user gets access to:

| Feature | Screen | Description |
|---------|--------|-------------|
| Product Management | `ProductsScreen` | Create, edit, delete products |
| Live Streaming | `BroadcasterScreen` | Host live shopping shows |
| Sales Dashboard | `SalesScreen` | View incoming orders |
| Sale Fulfillment | `SaleDetailScreen` | Ship orders, purchase labels |
| Short Videos | `UploadShortScreen` | Upload product showcase videos |
| Store Address | `StoreAddressScreen` | Set shipping origin |
| Voice Agent | `ProductsScreen` | Create products via voice |
| Ring Light Avatar | Profile/Store | Visual seller indicator |

---

## Navigation

Profiles use a nested stack navigator:

**File:** `client/navigation/ProfileStackNavigator.tsx`

```
ProfileTab (bottom tab)
  └── ProfileStack
        ├── Profile (ProfileScreen)
        └── StoreProfile (StoreProfileScreen)
```

Other profile-related screens (Settings, Products, Sales, etc.) are in the `RootStackNavigator` and accessible from the profile menu.

---

## Files

| File | Purpose |
|------|---------|
| `client/screens/ProfileScreen.tsx` | User's own profile with menu |
| `client/screens/StoreProfileScreen.tsx` | Public store profile |
| `client/screens/StoreAddressScreen.tsx` | Seller address form |
| `client/components/RingLightAvatar.tsx` | Glowing ring avatar for sellers |
| `client/navigation/ProfileStackNavigator.tsx` | Profile tab navigation |
| `client/services/storage.ts` | Avatar image upload |
| `client/contexts/AuthContext.tsx` | User state management |
