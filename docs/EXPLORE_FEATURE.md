# Explore & Discovery Feature Documentation

## Overview

The Explore tab is the primary product discovery surface in JaTango. It displays all products from sellers (excluding the current user's own), with search filtering, grid layout, and a consistent product detail modal. The HomeScreen complements this with a live streams section and a store directory.

---

## Architecture

### Explore Screen

**File:** `client/screens/ExploreScreen.tsx`

| Feature | Implementation |
|---------|---------------|
| Product listing | `productsService.listAllProducts()` via Supabase |
| Self-filtering | Excludes products where `sellerId === user.id` |
| Search | Client-side text filter on product name |
| Layout | 2-column grid using `FlatList` with `ProductCard` |
| Product detail | `ProductDetailSheet` modal on tap |
| Cart access | `CartIcon` component in header |
| Refresh | Pull-to-refresh reloads all products |

### HomeScreen

**File:** `client/screens/HomeScreen.tsx`

The landing page with three sections:

#### 1. Live Now Section
- Fetches active LiveKit rooms via `useLiveRooms` hook
- Displays up to 4 live streams in a 2-column grid
- Each card shows: thumbnail/live preview, "LIVE" badge, title, viewer count
- Tap → navigates to `LiveStreamScreen`
- Empty state with "Go Live" CTA when no streams are active

#### 2. Notification Bell
- Top-right bell icon with red unread badge
- Uses `useUnreadNotifications` hook
- Tap → navigates to `NotificationsScreen`

#### 3. Stores Section
- Horizontal scrollable list of stores (profiles with products)
- Each card shows: avatar, store name, product count
- Fetched via Supabase query on `profiles` with product count join
- Tap → navigates to `StoreProfileScreen`

#### 4. Cart FAB
- Floating action button (bottom-right) with cart icon
- Badge shows total cart item count
- Tap → navigates to `CartScreen`

---

## Store Discovery

### Store Cards (HomeScreen)

```
profiles → LEFT JOIN products(count)
  → Filter: productCount > 0
  → Display: avatar, name, product count
```

### Store Profile Navigation

From any product card or store card, users can navigate to a seller's full store profile (`StoreProfileScreen`), which shows all their products and shorts.

---

## Search

The Explore screen implements client-side search:

```typescript
const filtered = products.filter(p =>
  p.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

- Search bar at the top of the Explore screen
- Filters in real-time as the user types
- Clear button to reset search
- No server-side search (all products loaded upfront)

---

## Components Used

| Component | Usage |
|-----------|-------|
| `ProductCard` | Grid product cards with image, name, price, color swatches, sizes |
| `ProductDetailSheet` | Modal for full product details, variant selection, add to cart |
| `CartIcon` | Header cart icon with badge count |
| `EmptyState` | Shown when no products match search |
| `LivePreview` | Live video preview in stream cards |
| `ThemedText` | Themed text throughout |

---

## Navigation

### Tab Structure

```
MainTabNavigator
  ├── HomeTab → HomeStackNavigator → HomeScreen
  ├── ExploreTab → ExploreStackNavigator → ExploreScreen
  ├── ShortsTab → ShortsStackNavigator
  ├── ShowsTab → ShowsStackNavigator
  └── ProfileTab → ProfileStackNavigator
```

### HomeStackNavigator

**File:** `client/navigation/HomeStackNavigator.tsx`

```
HomeStack
  └── Home (HomeScreen)
```

### ExploreStackNavigator

**File:** `client/navigation/ExploreStackNavigator.tsx`

```
ExploreStack
  └── Explore (ExploreScreen)
```

Store profiles and product details are accessed via the `RootStackNavigator` (modal presentations).

---

## Data Flow

```
App opens → HomeTab focused
  → useLiveRooms fetches active rooms from /api/streaming/rooms
  → fetchStores queries profiles with product counts
  → useUnreadNotifications polls unread count

User switches to ExploreTab
  → loadProducts fetches all products via productsService
  → Products filtered to exclude own
  → Displayed in grid

User taps product
  → ProductDetailSheet opens with full details
  → User can select variants, add to cart

User taps store card
  → StoreProfileScreen opens with seller's products + shorts
```

---

## Files

| File | Purpose |
|------|---------|
| `client/screens/HomeScreen.tsx` | Landing page with live streams, stores, bell icon |
| `client/screens/ExploreScreen.tsx` | Product discovery with search |
| `client/screens/StoreProfileScreen.tsx` | Public seller store page |
| `client/components/ProductCard.tsx` | Reusable product card |
| `client/components/ProductDetailSheet.tsx` | Product detail modal |
| `client/components/CartIcon.tsx` | Cart icon with badge |
| `client/components/LivePreview.tsx` | Live stream preview |
| `client/components/EmptyState.tsx` | Empty state component |
| `client/hooks/useLiveRooms.ts` | Active rooms hook |
| `client/hooks/useUnreadNotifications.ts` | Unread notification count |
| `client/services/products.ts` | Product API service |
| `client/navigation/HomeStackNavigator.tsx` | Home tab navigation |
| `client/navigation/ExploreStackNavigator.tsx` | Explore tab navigation |
