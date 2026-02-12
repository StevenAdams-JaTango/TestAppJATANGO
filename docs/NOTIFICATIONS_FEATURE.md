# Notifications Feature Documentation

## Overview

JaTango uses a dual notification delivery system: **push notifications** on mobile (via Expo Push API + FCM) and a **web notification center** (via Supabase `notifications` table). When a sale occurs, both mechanisms fire — a push notification is sent to the seller's device AND a row is inserted into the database for the in-app notification list.

---

## Architecture

### Delivery Mechanisms

| Platform | Mechanism | Entry Points |
|----------|-----------|-------------|
| **Mobile (iOS/Android)** | Expo Push API → FCM/APNs | System notification tray, lock screen |
| **Web / In-App** | Supabase `notifications` table polling | Bell icon (HomeScreen header), Profile menu, Profile tab badge |

### Notification Types

| Type | Trigger | Data Payload | Navigation Target |
|------|---------|-------------|-------------------|
| `new_sale` | Buyer completes purchase | `{ totalAmount, itemCount, orderId }` | `SaleDetail` screen |

---

## Server Side

### `notifySellerOfSale()` — `server/payments.ts`

Called from both `/api/checkout/confirm` and `/api/checkout/pay-with-saved-card` endpoints.

**Parameters:** `sellerId`, `totalAmount`, `itemCount`, `orderId`

**Steps:**
1. Insert notification row into `notifications` table with `orderId` in `data` JSONB
2. Query seller's `push_token` from `profiles` table
3. If push token exists, send push via Expo Push API (`https://exp.host/--/api/v2/push/send`)
4. Push payload includes `channelId: "sales"` for Android notification channel

```typescript
// Push message structure
{
  to: sellerProfile.push_token,
  sound: "default",
  title: "New Sale! 🎉",
  body: "You just sold 2 items for $52.02",
  data: { type: "new_sale", orderId: "uuid-here" },
  channelId: "sales"
}
```

---

## Client Side

### Push Token Registration

**File:** `client/services/notifications.ts`

- Called automatically on sign-in from `AuthContext`
- Checks: physical device, not web, permissions granted
- Sets up Android notification channel "sales" (HIGH importance, vibration, orange light)
- Gets Expo push token using `projectId` from EAS config
- Saves token to `profiles.push_token` in Supabase
- Requires `google-services.json` in project root for Android FCM

### Foreground Notification Handler

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

This ensures notifications are visible even when the app is in the foreground.

### Notification Tap Handler

**File:** `client/navigation/RootStackNavigator.tsx`

Listens for `addNotificationResponseReceivedListener` — when a user taps a push notification:
- Reads `data.type` and `data.orderId` from the notification
- If `type === "new_sale"` and `orderId` exists, navigates to `SaleDetail` screen
- Uses the global `navigationRef` for navigation

### Unread Count Hook

**File:** `client/hooks/useUnreadNotifications.ts`

Shared hook used by HomeScreen, ProfileScreen, and MainTabNavigator:
- Queries `notifications` table for `read = false` count
- Polls every 30 seconds
- Exposes `{ unreadCount, refresh }` — `refresh` can be called manually on pull-to-refresh

### Notifications Screen

**File:** `client/screens/NotificationsScreen.tsx`

Full notification list accessible from Profile menu and HomeScreen bell icon:
- Fetches last 50 notifications ordered by `created_at DESC`
- Each card shows: type icon, title, body, time-ago timestamp, read/unread indicator
- Tapping a `new_sale` notification → marks as read → navigates to `SaleDetail`
- "Mark all read" button in header when unread notifications exist
- Pull-to-refresh
- Empty state with "No notifications yet" message

### Notification Entry Points (3)

1. **HomeScreen header** — Bell icon (top-right) with red unread badge
2. **Profile menu** — "Notifications" menu item with unread count badge
3. **Profile tab** — Red badge on the Profile tab icon in bottom tab bar

---

## Database

### `notifications` Table

Defined in `supabase-notifications-migration.sql`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `profiles(id)` |
| `type` | TEXT | Notification type (e.g., `new_sale`) |
| `title` | TEXT | Display title |
| `body` | TEXT | Display body text |
| `data` | JSONB | Structured payload (e.g., `{ orderId, totalAmount }`) |
| `read` | BOOLEAN | Whether the user has seen it (default: `false`) |
| `created_at` | TIMESTAMPTZ | Timestamp |

**Indexes:**
- `idx_notifications_user_id` — Fast lookup by user
- `idx_notifications_created_at` — Ordered listing
- `idx_notifications_unread` — Partial index for unread count queries

**RLS Policies:**
- Users can SELECT their own notifications
- Users can UPDATE their own notifications (mark as read)
- Service role can INSERT for any user (server-side)

### `profiles.push_token` Column

- Added by the notifications migration
- Stores the Expo push token string (e.g., `ExponentPushToken[L4Wd29F2-Voi6uSpTYXkGn]`)
- Indexed with partial index (WHERE push_token IS NOT NULL)

---

## Fulfillment Tracking

Notifications link to orders via `data.orderId`. The `orders.status` column tracks fulfillment:

| Status | Meaning |
|--------|---------|
| `paid` | Order placed, needs shipping ("Needs Shipping" in UI) |
| `shipped` | Seller purchased shipping label |
| `delivered` | Package delivered |
| `cancelled` | Order cancelled |

When a seller opens a sale notification (from push or web), they land on `SaleDetailScreen` which shows the current order status. If they already fulfilled from their phone, the web view reflects the updated status.

---

## Files

| File | Purpose |
|------|---------|
| `server/payments.ts` | `notifySellerOfSale()` — dual delivery (DB + push) |
| `client/services/notifications.ts` | Push token registration, foreground handler |
| `client/hooks/useUnreadNotifications.ts` | Shared unread count hook |
| `client/screens/NotificationsScreen.tsx` | Notification list UI |
| `client/navigation/RootStackNavigator.tsx` | Push notification tap handler |
| `client/screens/HomeScreen.tsx` | Bell icon with badge in header |
| `client/screens/ProfileScreen.tsx` | Bell menu item with badge |
| `client/navigation/MainTabNavigator.tsx` | Profile tab badge |
| `supabase-notifications-migration.sql` | Database schema |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `google-services.json` | Firebase config file for Android FCM (in project root) |
| EAS Project ID | `849ebd1d-fc37-4fd5-87cd-e819d7977bba` (in `app.json`) |

---

## Android Notification Channel

| Property | Value |
|----------|-------|
| Channel ID | `sales` |
| Name | "Sales" |
| Importance | HIGH |
| Vibration | `[0, 250, 250, 250]` |
| Light Color | `#FF6B35` |
