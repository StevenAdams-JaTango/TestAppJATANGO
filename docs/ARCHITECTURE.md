# JaTango — Master Architecture Document

> **Live Shopping Platform** — A mobile-first marketplace where sellers broadcast live shows, list products, and ship orders. Buyers discover products, watch live streams, browse shorts, and purchase with real-time checkout.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Client Architecture](#4-client-architecture)
5. [Server Architecture](#5-server-architecture)
6. [Database Schema (Supabase)](#6-database-schema-supabase)
7. [Voice Agent (LiveKit + OpenAI)](#7-voice-agent-livekit--openai)
8. [Feature Modules](#8-feature-modules)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Build & Deployment](#10-build--deployment)
11. [Environment Variables](#11-environment-variables)
12. [Design Principles](#12-design-principles)

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                            │
│              React Native (Expo SDK 54)                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│   │  Live    │ │ Explore  │ │  Shorts  │ │  Shows   │ │Profile│ │
│   │  (Home)  │ │          │ │          │ │          │ │       │ │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘ │
│        └─────────────┴───────────┴─────────────┴──────────┘     │
│                              │                                   │
│              React Navigation (Native Stack + Tabs)              │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
            ┌───────▼───────┐    ┌────────▼────────┐
            │  Express API  │    │    Supabase      │
            │  (Port 5000)  │    │  (Auth + DB +    │
            │               │    │   Storage)       │
            │  - Streaming  │    │                  │
            │  - Payments   │    │  PostgreSQL      │
            │  - Shipping   │    │  Row Level Sec.  │
            │  - Shows      │    │  Auth (JWT)      │
            │  - Notifs     │    │  Storage Buckets │
            └───────┬───────┘    └──────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼───┐ ┌────▼───┐ ┌────▼────┐
   │LiveKit │ │ Stripe │ │ Shippo  │
   │  Cloud │ │  API   │ │  API    │
   │        │ │        │ │         │
   │WebRTC  │ │Payment │ │Shipping │
   │Rooms   │ │Intent  │ │Labels   │
   │Agents  │ │Cards   │ │Rates    │
   └────────┘ └────────┘ └─────────┘
```

---

## 2. Tech Stack

### Client
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React Native 0.81 + Expo SDK 54 | Cross-platform mobile (Android/iOS/Web) |
| **Navigation** | React Navigation 7 (Native Stack + Bottom Tabs) | Screen routing, deep linking |
| **State** | React Query (TanStack) v5 | Server state, caching, background refetch |
| **Auth** | Supabase Auth + React Context | JWT sessions, persistent login via AsyncStorage |
| **Styling** | StyleSheet (inline) + Theme Context | 6 switchable color presets, light/dark mode |
| **Payments** | Stripe React Native SDK | PaymentSheet, saved cards, SetupIntents |
| **Streaming** | LiveKit React Native SDK | WebRTC video/audio, live chat via data channels |
| **Icons** | Feather (via @expo/vector-icons) | Consistent icon set |
| **Fonts** | Nunito (via @expo-google-fonts) | Brand typography |
| **Notifications** | expo-notifications | Push notifications via FCM (Android) / APNs (iOS) |

### Server
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js + TypeScript (tsx) | Express API server |
| **Framework** | Express 5 | REST API endpoints |
| **Database** | Supabase (PostgreSQL) | All persistent data, RLS for security |
| **Payments** | Stripe Node SDK | PaymentIntents, Customers, SetupIntents |
| **Shipping** | Shippo SDK | Rate quotes, label purchase, tracking |
| **Streaming** | LiveKit Server SDK | Room creation, token generation, agent dispatch |
| **Push** | Expo Push API | Sends push notifications via `exp.host/--/api/v2/push/send` |

### Voice Agent
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Python (uv package manager) | LiveKit Agents framework |
| **LLM** | OpenAI GPT-4o-mini | Conversational product creation |
| **STT** | OpenAI Whisper | Speech-to-text |
| **TTS** | OpenAI TTS-1 | Text-to-speech responses |
| **VAD** | Silero | Voice activity detection |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Supabase** | Auth, PostgreSQL database, file storage, RLS |
| **LiveKit Cloud** | WebRTC infrastructure, SFU, agent hosting |
| **Stripe** | Payment processing (test mode) |
| **Shippo** | Shipping rates & label generation |
| **Firebase (FCM only)** | Push notification delivery to Android (via Expo) |
| **EAS (Expo Application Services)** | Build pipeline, OTA updates, credentials |

---

## 3. Project Structure

```
TestAppJATANGO/
├── client/                          # React Native app
│   ├── App.tsx                      # Root component (providers tree)
│   ├── index.js                     # Entry point (registerRootComponent)
│   ├── components/                  # 36 reusable UI components
│   │   ├── ProductCard.tsx          #   Grid/list product card (consolidated)
│   │   ├── ProductDetailSheet.tsx   #   Bottom sheet for product details
│   │   ├── CartBottomSheet.tsx      #   Slide-up cart
│   │   ├── CheckoutBottomSheet.tsx  #   Checkout flow in bottom sheet
│   │   ├── ProductCarousel.tsx      #   Horizontal product scroller (live shows)
│   │   ├── ShortCard.tsx            #   TikTok-style short video card
│   │   ├── StreamCard.tsx           #   Live stream preview card
│   │   ├── OrderCard.tsx            #   Order summary card
│   │   ├── LiveBadge.tsx            #   "LIVE" indicator badge
│   │   ├── LivePreview.tsx          #   Stream thumbnail preview
│   │   ├── LiveKitVideo.tsx         #   WebRTC video renderer
│   │   ├── GoLiveButton.tsx         #   Animated go-live FAB
│   │   ├── EmptyState.tsx           #   Reusable empty state
│   │   ├── Button.tsx               #   Themed button
│   │   ├── Card.tsx                 #   Themed card wrapper
│   │   ├── ConfirmDialog.tsx        #   Confirmation modal
│   │   ├── ThemedText.tsx           #   Theme-aware text
│   │   ├── ThemedView.tsx           #   Theme-aware view
│   │   ├── AppHeader.tsx            #   Screen header with cart icon
│   │   ├── CartIcon.tsx             #   Cart badge icon
│   │   ├── HeaderTitle.tsx          #   Styled header title
│   │   ├── ColorPicker.tsx          #   Color wheel picker
│   │   ├── ImageCropperModal.tsx    #   Image crop/resize modal
│   │   ├── ShippingRateSelector.tsx #   Shipping rate picker
│   │   ├── ProductSelectionSheet.tsx#   Product picker for shows
│   │   ├── ShortCommentsSheet.tsx   #   Comments bottom sheet
│   │   ├── ErrorBoundary.tsx        #   React error boundary
│   │   ├── ErrorFallback.tsx        #   Error fallback UI
│   │   ├── Spacer.tsx               #   Layout spacer
│   │   ├── AddCardModal.tsx         #   Platform-split card add modal
│   │   ├── StripeProviderWrapper.tsx#   Platform-split Stripe provider
│   │   └── KeyboardAwareScrollViewCompat.tsx
│   │
│   ├── screens/                     # 30 screen components
│   │   ├── HomeScreen.tsx           #   Live streams feed (home tab)
│   │   ├── ExploreScreen.tsx        #   Product discovery grid
│   │   ├── ShortsScreen.tsx         #   TikTok-style vertical video feed
│   │   ├── ShowsScreen.tsx          #   Seller's show management
│   │   ├── ProfileScreen.tsx        #   User profile + store settings
│   │   ├── AuthScreen.tsx           #   Login / signup
│   │   ├── LiveStreamScreen.tsx     #   Viewer experience (WebRTC)
│   │   ├── BroadcasterScreen.tsx    #   Seller broadcast (WebRTC + controls)
│   │   ├── ShowSetupScreen.tsx      #   Configure show before going live
│   │   ├── ShowSummaryScreen.tsx    #   Post-show analytics
│   │   ├── EndedShowScreen.tsx      #   Replay ended show
│   │   ├── ProductsScreen.tsx       #   Seller's product inventory
│   │   ├── AddProductScreen.tsx     #   Create/edit product (full form)
│   │   ├── CartScreen.tsx           #   Shopping cart
│   │   ├── CheckoutScreen.tsx       #   Checkout with Stripe
│   │   ├── OrderConfirmationScreen.tsx  # Post-purchase confirmation
│   │   ├── OrdersScreen.tsx         #   Buyer's order history
│   │   ├── OrderDetailScreen.tsx    #   Single order details
│   │   ├── SalesScreen.tsx          #   Seller's sales dashboard
│   │   ├── SaleDetailScreen.tsx     #   Single sale (ship, track, label)
│   │   ├── PurchasesScreen.tsx      #   Buyer's purchases
│   │   ├── SettingsScreen.tsx       #   App settings (theme, payments, addresses)
│   │   ├── SavedPaymentMethodsScreen.tsx  # Manage saved cards
│   │   ├── ShippingAddressesScreen.tsx    # Manage shipping addresses
│   │   ├── AddAddressScreen.tsx     #   Add/edit address form
│   │   ├── StoreProfileScreen.tsx   #   Public store page
│   │   ├── StoreAddressScreen.tsx   #   Seller's return/ship-from address
│   │   ├── SavedProductsScreen.tsx  #   Buyer's saved/wishlisted products
│   │   ├── UploadShortScreen.tsx    #   Record/upload short video
│   │   └── StoreShortsScreen.tsx    #   Store's shorts viewer
│   │
│   ├── navigation/                  # Navigation configuration
│   │   ├── RootStackNavigator.tsx   #   Auth gate + all stack screens
│   │   ├── MainTabNavigator.tsx     #   5-tab bottom navigation
│   │   ├── HomeStackNavigator.tsx   #   Live tab stack
│   │   ├── ExploreStackNavigator.tsx#   Explore tab stack
│   │   ├── ShortsStackNavigator.tsx #   Shorts tab stack
│   │   ├── ShowsStackNavigator.tsx  #   Shows tab stack
│   │   ├── ProfileStackNavigator.tsx#   Profile tab stack
│   │   ├── PurchasesStackNavigator.tsx # Purchases stack
│   │   ├── linking.ts              #   Deep link configuration
│   │   └── navigationRef.ts        #   Global navigation ref
│   │
│   ├── contexts/                    # React Context providers
│   │   ├── AuthContext.tsx          #   Auth state, session, push token reg
│   │   ├── CartContext.tsx          #   Cart state (multi-seller)
│   │   └── ThemeContext.tsx         #   Theme mode + preset selection
│   │
│   ├── hooks/                       # 14 custom hooks
│   │   ├── useTheme.ts             #   Access current theme colors
│   │   ├── useInAppNotifications.ts#   Poll for in-app notifications
│   │   ├── useStreaming.ts         #   LiveKit room connection
│   │   ├── useLiveChat.ts         #   Live stream chat via data channels
│   │   ├── useLiveRooms.ts        #   Track active live rooms
│   │   ├── useVoiceAgent.ts       #   Voice agent dispatch + RPC
│   │   ├── useImagePicker.ts      #   Image selection + cropping
│   │   ├── useScreenOptions.ts    #   Themed screen options
│   │   ├── useTaxCategories.ts    #   Tax category management
│   │   ├── useStripePayment.ts    #   Platform-split Stripe hook
│   │   └── useColorScheme.ts      #   System color scheme detection
│   │
│   ├── services/                    # 12 API service modules
│   │   ├── cart.ts                 #   Cart CRUD (Supabase direct)
│   │   ├── checkout.ts            #   PaymentIntent creation
│   │   ├── notifications.ts       #   Push token registration
│   │   ├── products.ts            #   Product CRUD (Supabase direct)
│   │   ├── savedProducts.ts       #   Wishlist/saved products
│   │   ├── settings.ts            #   Payment methods + addresses API
│   │   ├── shipping.ts            #   Shipping rates + addresses
│   │   ├── shorts.ts              #   Shorts CRUD + likes + comments
│   │   ├── showSales.ts           #   Show sales data
│   │   ├── shows.ts               #   Show CRUD
│   │   ├── storage.ts             #   Supabase Storage uploads
│   │   └── streaming.ts           #   LiveKit token + room management
│   │
│   ├── lib/                         # Core libraries
│   │   ├── supabase.ts             #   Supabase client + DB type defs
│   │   └── query-client.ts         #   React Query client config
│   │
│   ├── constants/
│   │   └── theme.ts                #   6 theme presets (colors, light/dark)
│   │
│   ├── types/
│   │   ├── index.ts                #   All TypeScript interfaces
│   │   └── navigation.d.ts        #   Navigation type declarations
│   │
│   └── data/
│       └── categories.ts           #   Product category definitions
│
├── server/                          # Express API server
│   ├── index.ts                    #   Entry point (CORS, body parsing, static)
│   ├── routes.ts                   #   Route registration hub
│   ├── streaming.ts                #   LiveKit rooms, tokens, agent dispatch
│   ├── payments.ts                 #   Stripe payments, orders, addresses, push notifs
│   ├── shipping.ts                 #   Shippo rates, labels, tracking, sales
│   ├── shows.ts                    #   Show CRUD, live show carts, show sales
│   ├── notifications.ts           #   SSE notification endpoint (legacy)
│   ├── storage.ts                  #   File upload helpers
│   └── templates/
│       └── receipt.html            #   Email receipt template
│
├── agent/                           # Python voice agent
│   ├── agent.py                    #   LiveKit Agent (voice product creation)
│   ├── pyproject.toml              #   Python dependencies
│   └── .env.local                  #   Agent environment variables
│
├── shared/
│   └── schema.ts                   #   Shared Drizzle ORM schema (unused)
│
├── docs/                            # Documentation
│   └── ARCHITECTURE.md             #   This file
│
├── scripts/
│   └── build.js                    #   Static build script
│
├── assets/                          # App icons, splash screens
├── google-services.json            #   Firebase config (FCM for push notifs)
├── app.json                        #   Expo app configuration
├── eas.json                        #   EAS Build profiles
├── package.json                    #   Node dependencies + scripts
├── tsconfig.json                   #   TypeScript configuration
├── babel.config.js                 #   Babel config (module resolver)
├── eslint.config.js                #   ESLint configuration
├── drizzle.config.ts               #   Drizzle ORM config (unused)
│
└── supabase-*.sql                   # Database migrations (run in SQL Editor)
    ├── supabase-schema.sql          #   Core tables (profiles, products, shows)
    ├── supabase-schema-reset.sql    #   Full schema reset
    ├── supabase-orders-migration.sql#   Orders + order_items
    ├── supabase-cart-migration.sql  #   Cart tables
    ├── supabase-addresses-migration.sql      # Shipping addresses
    ├── supabase-notifications-migration.sql  # Notifications table
    ├── supabase-push-token-migration.sql     # Push token on profiles
    ├── supabase-shorts-migration.sql         # Shorts + likes
    ├── supabase-shorts-comments-products-migration.sql  # Comments + product links
    ├── supabase-live-show-cart-migration.sql  # Live show cart system
    ├── supabase-sales-shipping-migration.sql  # Sales + shipping fields
    ├── supabase-sales-tax-migration.sql       # Tax fields
    ├── supabase-saved-packages-migration.sql  # Saved shipping packages
    ├── supabase-saved-products-migration.sql  # Saved/wishlisted products
    ├── supabase-orders-shipping-address-migration.sql  # Shipping on orders
    └── supabase-enable-realtime.sql           # Realtime publication config
```

---

## 4. Client Architecture

### 4.1 Provider Tree

The app wraps all screens in a nested provider tree (see `client/App.tsx`):

```
ErrorBoundary
  └── ThemeProvider          (color presets + light/dark mode)
      └── StripeProviderWrapper  (platform-split Stripe SDK)
          └── QueryClientProvider    (React Query cache)
              └── AuthProvider           (Supabase auth session)
                  └── CartProvider           (multi-seller cart state)
                      └── SafeAreaProvider
                          └── GestureHandlerRootView
                              └── KeyboardProvider
                                  └── NavigationContainer
                                      └── RootStackNavigator
```

### 4.2 Navigation Architecture

```
RootStackNavigator (Native Stack)
│
├── Auth Screen (unauthenticated)
│
└── Authenticated Screens
    ├── Main (MainTabNavigator — Bottom Tabs)
    │   ├── HomeTab → HomeStackNavigator
    │   │   └── HomeScreen (live streams feed)
    │   │       └── StoreProfileScreen
    │   │
    │   ├── ExploreTab → ExploreStackNavigator
    │   │   └── ExploreScreen (product grid)
    │   │       └── StoreProfileScreen
    │   │
    │   ├── ShortsTab → ShortsStackNavigator
    │   │   └── ShortsScreen (vertical video feed)
    │   │
    │   ├── ShowsTab → ShowsStackNavigator
    │   │   └── ShowsScreen (seller's shows)
    │   │       └── ShowSetupScreen
    │   │
    │   └── ProfileTab → ProfileStackNavigator
    │       └── ProfileScreen
    │           └── StoreProfileScreen
    │
    ├── LiveStream (fullscreen modal — viewer)
    ├── Broadcaster (fullscreen modal — seller)
    ├── Settings
    ├── EndedShow
    ├── ShowSummary
    ├── Products (seller inventory)
    ├── AddProduct (modal)
    ├── Cart
    ├── Checkout
    ├── OrderConfirmation
    ├── SavedPaymentMethods
    ├── ShippingAddresses
    ├── AddAddress (modal)
    ├── Orders
    ├── OrderDetail
    ├── UploadShort (modal)
    ├── StoreShortsViewer
    ├── SavedProducts
    ├── StoreAddress
    ├── Sales
    └── SaleDetail
```

### 4.3 State Management

| State Type | Solution | Scope |
|-----------|---------|-------|
| **Auth** | `AuthContext` (React Context) | Global — user session, profile |
| **Cart** | `CartContext` (React Context) | Global — multi-seller cart items |
| **Theme** | `ThemeContext` (React Context) | Global — color preset + mode |
| **Server Data** | React Query (`@tanstack/react-query`) | Per-query — products, orders, shows, etc. |
| **Local UI** | `useState` / `useRef` | Per-component |

**React Query** handles all server data fetching with:
- Automatic background refetching
- Stale-while-revalidate caching
- Optimistic updates for cart operations
- Query invalidation on mutations

### 4.4 Theming System

6 color presets, each with light and dark variants:

| Preset | Primary | Secondary |
|--------|---------|-----------|
| **JaTango** (default) | `#FF6B35` (orange) | `#7C3AED` (purple) |
| **Ocean** | `#2563EB` (blue) | `#0891B2` (cyan) |
| **Sunset** | `#EA580C` (deep orange) | `#E11D48` (rose) |
| **Forest** | `#059669` (emerald) | `#0D9488` (teal) |
| **Rose** | `#E11D48` (rose) | `#DB2777` (pink) |
| **Midnight** | `#4F46E5` (indigo) | `#7C3AED` (violet) |

Persisted to AsyncStorage. Accessed via `useTheme()` hook everywhere.

### 4.5 Platform-Split Components

Some components have platform-specific implementations:

| Component | Files | Reason |
|-----------|-------|--------|
| `StripeProviderWrapper` | `.native.tsx`, `.web.tsx`, `.tsx` | Stripe SDK differs between native and web |
| `AddCardModal` | `.native.tsx`, `.web.tsx`, `.tsx` | Card input UI differs per platform |
| `useStripePayment` | `.native.ts`, `.web.ts`, `.ts` | Payment flow differs per platform |
| `useColorScheme` | `.ts`, `.web.ts` | System theme detection differs |

---

## 5. Server Architecture

### 5.1 Entry Point (`server/index.ts`)

The Express server handles:
- **CORS** — Permissive in dev, strict origin checking in production
- **Body Parsing** — JSON with raw body capture for Stripe webhooks
- **Request Logging** — Logs all API requests with method, path, status, duration
- **Static File Serving** — Serves Expo static builds with dynamic manifest routing
- **Route Registration** — Delegates to modular route files

### 5.2 Route Modules

All routes are registered via `server/routes.ts`:

```typescript
registerStreamingRoutes(app);   // LiveKit
registerPaymentRoutes(app);     // Stripe + Orders
registerShippingRoutes(app);    // Shippo + Sales
registerShowRoutes(app);        // Shows + Live Carts
registerNotificationRoutes(app);// SSE notifications
```

### 5.3 Module Breakdown

#### `server/streaming.ts` — LiveKit Integration
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/streaming/token` | POST | Generate LiveKit room token for viewer/broadcaster |
| `/api/streaming/rooms` | GET | List active LiveKit rooms |
| `/api/streaming/rooms/:roomName` | DELETE | End a live room |
| `/api/streaming/dispatch-agent` | POST | Dispatch voice agent to a room |

#### `server/payments.ts` — Stripe + Orders + Notifications
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/create-payment-intent` | POST | Create Stripe PaymentIntent + ephemeral key |
| `/api/stripe/confirm-payment` | POST | Confirm payment, create order, notify seller |
| `/api/stripe/setup-intent` | POST | Create SetupIntent for saving cards |
| `/api/stripe/payment-methods/:userId` | GET | List saved payment methods |
| `/api/stripe/payment-methods/:id` | DELETE | Detach a saved card |
| `/api/orders/:userId` | GET | Fetch user's orders |
| `/api/orders/:orderId` | GET | Fetch single order detail |
| `/api/addresses` | GET/POST | List/create shipping addresses |
| `/api/addresses/:id` | PUT/DELETE | Update/delete address |
| `/api/addresses/:id/default` | PUT | Set default address |

**Key function: `notifySellerOfSale()`**
1. Inserts notification into `notifications` table (for in-app polling)
2. Looks up seller's `push_token` from `profiles`
3. Sends push notification via Expo Push API (`exp.host/--/api/v2/push/send`)

#### `server/shipping.ts` — Shippo + Sales Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shipping/rates` | POST | Get shipping rate quotes |
| `/api/shipping/purchase-label` | POST | Purchase shipping label |
| `/api/shipping/tracking/:trackingNumber` | GET | Track a shipment |
| `/api/sales/:sellerId` | GET | Fetch seller's sales |
| `/api/sales/:orderId/items` | GET | Fetch sale items |
| `/api/sales/:orderId/status` | PUT | Update order status |
| `/api/store-address/:sellerId` | GET/PUT | Get/set store ship-from address |
| `/api/saved-packages/:sellerId` | GET/POST/PUT/DELETE | CRUD saved package presets |

#### `server/shows.ts` — Live Show Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shows` | GET/POST | List/create shows |
| `/api/shows/:id` | GET/PUT/DELETE | Show CRUD |
| `/api/shows/:id/start` | POST | Start a live show |
| `/api/shows/:id/end` | POST | End a live show |
| `/api/shows/:showId/cart` | GET/POST/DELETE | Live show cart operations |
| `/api/shows/:showId/sales` | GET | Show sales summary |

#### `server/notifications.ts` — SSE Notifications (Legacy)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications/stream` | GET | SSE stream for real-time notifications |
| `/api/notifications/test` | POST | Test notification trigger |

> **Note:** The SSE approach was superseded by polling + push notifications. The SSE endpoint remains functional but the client uses polling (`useInAppNotifications`) as the primary in-app mechanism and Expo Push for background notifications.

---

## 6. Database Schema (Supabase)

### 6.1 Core Tables

```
profiles
├── id (UUID, PK, FK → auth.users)
├── email, name, avatar_url
├── is_seller, store_name
├── push_token (Expo push token)
├── stripe_customer_id
├── store_address (JSONB)
└── created_at, updated_at

products
├── id (UUID, PK)
├── name, price, msrp, cost
├── image, images[]
├── description, category
├── weight, weight_unit, dimensions
├── barcode, sku
├── colors (JSONB[]), sizes (JSONB[]), variants (JSONB[])
├── shipping_profile, tax_category
├── seller_id (FK → profiles)
└── created_at, updated_at

shows
├── id (UUID, PK)
├── title, thumbnail_url
├── status (draft/scheduled/live/ended)
├── scheduled_at, started_at, ended_at
├── seller_id (FK → profiles)
├── stream_key, product_ids[]
└── created_at, updated_at

orders
├── id (UUID, PK)
├── user_id (FK → profiles)
├── stripe_payment_intent_id
├── status (pending/paid/shipped/delivered/cancelled)
├── total_amount, currency
├── payment_card (JSONB)
├── shipping_address (JSONB)
├── shipping_cost, shipping_carrier, shipping_service
├── tracking_number, label_url
└── created_at, updated_at

order_items
├── id (UUID, PK)
├── order_id (FK → orders)
├── product_id (FK → products)
├── seller_id (FK → profiles)
├── quantity, unit_price
├── selected_color_id/name, selected_size_id/name, selected_variant_id
├── product_name, product_image
└── created_at
```

### 6.2 Cart Tables

```
carts
├── id (UUID, PK)
├── user_id (FK → profiles, UNIQUE)
└── created_at, updated_at

cart_items
├── id (UUID, PK)
├── cart_id (FK → carts)
├── product_id (FK → products)
├── seller_id (FK → profiles)
├── quantity
├── selected_color_id/name, selected_size_id/name, selected_variant_id
└── created_at

live_show_carts (for live show purchases)
├── id (UUID, PK)
├── show_id (FK → shows)
├── user_id (FK → profiles)
├── product_id (FK → products)
├── quantity
├── selected_color_id/name, selected_size_id/name
└── created_at
```

### 6.3 Content Tables

```
shorts
├── id (UUID, PK)
├── seller_id (FK → profiles)
├── video_url, thumbnail_url
├── caption, duration
├── view_count, like_count, comment_count
├── product_id (FK → products, optional)
└── created_at

short_likes
├── id (UUID, PK)
├── short_id (FK → shorts)
├── user_id (FK → profiles)
└── created_at

short_comments
├── id (UUID, PK)
├── short_id (FK → shorts)
├── user_id (FK → profiles)
├── text
└── created_at
```

### 6.4 Supporting Tables

```
shipping_addresses
├── id (UUID, PK)
├── user_id (FK → profiles)
├── name, address_line_1/2, city, state, zip, country, phone
├── is_default
└── created_at, updated_at

saved_products (wishlist)
├── id (UUID, PK)
├── user_id (FK → profiles)
├── product_id (FK → products)
└── created_at

saved_packages (seller's shipping presets)
├── id (UUID, PK)
├── seller_id (FK → profiles)
├── name, package_type
├── length, width, height, weight
├── is_default
└── created_at

notifications
├── id (UUID, PK)
├── user_id (FK → profiles)
├── type, title, body
├── data (JSONB)
├── read (BOOLEAN, default false)
└── created_at
```

### 6.5 Row Level Security (RLS)

All tables have RLS enabled. Key policies:
- **profiles**: Users can read all profiles, update only their own
- **products**: Anyone can read, sellers can CRUD their own
- **orders**: Users can read their own orders
- **cart_items**: Users can CRUD their own cart
- **notifications**: Users can read/update their own notifications
- **shorts**: Anyone can read, sellers can CRUD their own

---

## 7. Voice Agent (LiveKit + OpenAI)

The voice agent (`agent/agent.py`) enables sellers to create products by voice:

```
Seller taps "Voice Add" → Temp LiveKit room created → Agent dispatched
    ↓
Agent: "What product would you like to create?"
Seller: "A red cotton t-shirt, size medium, $29.99"
    ↓
Agent calls function_tool: create_product(name, price, description, ...)
    → HTTP POST to Express server → Supabase insert
    ↓
Agent: "I've created 'Red Cotton T-Shirt' at $29.99. Anything else?"
```

**Function tools available to the agent:**
- `create_product` — Creates a new product via the Express API
- `add_product_to_show` — Adds a product to the current live show carousel (via RPC)

**Agent name:** `jatango-voice-agent`

---

## 8. Feature Modules

### 8.1 Live Streaming

```
Seller Flow:
ShowsScreen → ShowSetupScreen → BroadcasterScreen
                                    ├── Camera/mic controls
                                    ├── Product carousel management
                                    ├── Live chat
                                    ├── Viewer count
                                    └── Voice agent mic toggle

Viewer Flow:
HomeScreen (live feed) → LiveStreamScreen
                            ├── Video player (WebRTC)
                            ├── Live chat
                            ├── Product carousel
                            ├── Cart bottom sheet
                            └── Checkout bottom sheet
```

**Tech:** LiveKit WebRTC rooms. Server generates tokens with appropriate permissions. Data channels used for live chat messages.

### 8.2 Payments & Checkout

```
Cart → Checkout → Stripe PaymentSheet → Order Confirmation
                      ↓
              Server: create-payment-intent
                      ↓
              Stripe: PaymentIntent + EphemeralKey
                      ↓
              Client: PaymentSheet (saved cards, new card)
                      ↓
              Server: confirm-payment
                      ├── Create order + order_items
                      ├── Decrement stock
                      └── notifySellerOfSale()
                              ├── Insert notification (DB)
                              └── Expo Push API → FCM → Device
```

**Security:** Card numbers never touch our server. Stripe handles all PCI compliance. We store only `stripe_customer_id`.

### 8.3 Shipping

```
Seller receives sale → SaleDetailScreen
    ├── Select package preset (or enter custom dimensions)
    ├── Get shipping rates (Shippo API)
    ├── Select rate → Purchase label
    ├── Print label (PDF URL)
    └── Update order status (shipped + tracking number)

Buyer: OrderDetailScreen → Track shipment
```

### 8.4 Shorts (TikTok-style Videos)

```
Upload: UploadShortScreen → Pick video → Add caption → Link product (optional) → Upload to Supabase Storage

View: ShortsScreen → Vertical swipe feed
    ├── Auto-play video
    ├── Like / unlike
    ├── Comments (bottom sheet)
    ├── View linked product (ProductDetailSheet)
    └── Navigate to seller's store
```

### 8.5 Notifications

Two complementary systems:

**Push Notifications (primary — works when app is closed):**
```
Server (notifySellerOfSale)
    → Expo Push API (exp.host/--/api/v2/push/send)
        → Firebase Cloud Messaging (FCM)
            → Android device notification tray
```
Requires: `google-services.json` in project root, FCM V1 Service Account Key uploaded to Expo.

**In-App Polling (fallback — works on emulators, no FCM needed):**
```
useInAppNotifications hook (every 5 seconds)
    → Supabase query: notifications WHERE user_id = X AND read = false
        → Alert.alert() for each new notification
            → Mark as read
```

---

## 9. Data Flow Diagrams

### 9.1 Authentication Flow

```
App Launch
    → AuthContext checks Supabase session (AsyncStorage)
        → Session exists? → Set user, register push token
        → No session? → Show AuthScreen
            → Email/password sign up or sign in
                → Supabase Auth → JWT → AsyncStorage
                    → Set user → registerForPushNotifications()
                        → Save Expo push token to profiles.push_token
```

### 9.2 Product Purchase Flow

```
Buyer browses (Explore/LiveStream/Shorts)
    → Taps product → ProductDetailSheet
        → Select color/size → Add to Cart
            → CartContext → Supabase cart_items
    → Cart → Checkout
        → Select shipping address
        → Get shipping rates (Shippo)
        → Create PaymentIntent (Stripe)
        → PaymentSheet → Confirm
            → Server creates order + order_items
            → Stock decremented
            → Seller notified (push + in-app)
    → OrderConfirmation
```

### 9.3 Live Show Flow

```
Seller: ShowSetupScreen
    → Set title, select products, thumbnail
    → "Go Live" → Server creates LiveKit room
        → BroadcasterScreen (WebRTC publish)
            → Manage product carousel
            → Read live chat
            → Voice agent for adding products
    → "End Show" → ShowSummaryScreen (analytics)

Viewer: HomeScreen sees live badge
    → Tap → LiveStreamScreen (WebRTC subscribe)
        → Watch video, chat, browse carousel
        → Add to cart → Checkout (in-stream)
```

---

## 10. Build & Deployment

### 10.1 Development

```bash
# Start Express server
npm run server:dev

# Start Expo dev server (separate terminal)
npx expo start

# For Android emulator, also run:
adb reverse tcp:5000 tcp:5000
```

### 10.2 Android Build (Local)

```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
ANDROID_HOME=$HOME/Library/Android/sdk \
eas build --platform android --profile development --local --output ./build/jatango-dev.apk
```

### 10.3 Android Build (EAS Cloud)

```bash
eas build --platform android --profile development
```

### 10.4 Build Profiles (`eas.json`)

| Profile | Type | API URL | Use Case |
|---------|------|---------|----------|
| `development` | APK (debug) | `http://10.0.2.2:5000` | Dev builds for emulator |
| `preview` | APK | `http://10.0.2.2:5000` | Internal testing |
| `preview-apk` | APK | Production URL | Staging |
| `production` | AAB | Production URL | Play Store |

### 10.5 Key Scripts (`package.json`)

```bash
npm run server:dev      # Start dev server (tsx server/index.ts)
npm run server:build    # Bundle server (esbuild)
npm run server:prod     # Run production server
npm run lint            # ESLint
npm run lint:fix        # ESLint autofix
npm run format          # Prettier
npm run check:types     # TypeScript type check
```

---

## 11. Environment Variables

### Root `.env` (server + Expo dev)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |
| `EXPO_PUBLIC_API_URL` | Express server URL (LAN IP for dev) |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-only) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-safe) |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `LIVEKIT_URL` | LiveKit WebSocket URL |
| `SHIPPO_API_KEY` | Shippo API key |

### Agent `.env.local`

| Variable | Purpose |
|----------|---------|
| `LIVEKIT_URL` | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o-mini, Whisper, TTS) |
| `JATANGO_API_URL` | Express server URL (for product creation) |

---

## 12. Design Principles

### Component Reusability
- **Always check for existing components** before creating new ones
- **Use props for variations** — e.g., `ProductCard` has `variant: 'grid' | 'list'`
- **Composition over duplication** — build complex UIs from simple reusable pieces
- **ProductDetailSheet** is the standard for product details everywhere (not a full screen)

### Consolidated Components
| Component | Replaces | Used In |
|-----------|----------|---------|
| `ProductCard` | 3 duplicate implementations | ExploreScreen, StoreProfileScreen, ProductsScreen |
| `ProductDetailSheet` | ProductDetailScreen | All screens showing product details |
| `EmptyState` | Inline empty states | Multiple screens |

### Data Architecture
- **Supabase direct** for reads (products, cart, shows) — client has anon key
- **Express API** for writes requiring business logic (payments, shipping, notifications)
- **React Query** for all server state — no manual loading/error state management
- **RLS** enforces data access at the database level

### Security
- Card numbers never stored — Stripe handles PCI compliance
- Service role key server-only — never exposed to client
- RLS on all tables — even if client has anon key, data is scoped
- Push tokens stored per-user — notifications sent only to intended recipient

---

*Last updated: February 2025*
