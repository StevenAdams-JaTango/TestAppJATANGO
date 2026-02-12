# Navigation Feature Documentation

## Overview

JaTango uses React Navigation with a nested navigator structure: a root stack navigator wrapping a bottom tab navigator, which in turn contains stack navigators for each tab. Authentication state determines whether the user sees the auth screen or the main app.

---

## Architecture

### Navigator Hierarchy

```
NavigationContainer (App.tsx, uses navigationRef)
  └── RootStackNavigator
        ├── Auth (AuthScreen) — shown when not logged in
        └── Main (MainTabNavigator) — shown when logged in
              ├── HomeTab → HomeStackNavigator → HomeScreen
              ├── ExploreTab → ExploreStackNavigator → ExploreScreen
              ├── ShortsTab → ShortsStackNavigator → ShortsScreen
              ├── ShowsTab → ShowsStackNavigator → ShowsScreen
              └── ProfileTab → ProfileStackNavigator
                    ├── Profile (ProfileScreen)
                    └── StoreProfile (StoreProfileScreen)
        ├── LiveStream (fullScreenModal)
        ├── Broadcaster (fullScreenModal)
        ├── Settings
        ├── EndedShow
        ├── ShowSummary
        ├── Products
        ├── AddProduct (modal)
        ├── Cart
        ├── Checkout
        ├── OrderConfirmation (gestureEnabled: false)
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
        ├── SaleDetail
        └── Notifications
```

### RootStackParamList

**File:** `client/navigation/RootStackNavigator.tsx`

Defines all route names and their parameter types:

```typescript
export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: string; params?: unknown } | undefined;
  LiveStream: { streamId: string; showId?: string };
  Broadcaster: { draftId: string } | undefined;
  Settings: undefined;
  EndedShow: { showId: string };
  ShowSummary: { showId: string };
  Products: undefined;
  AddProduct: { productId?: string } | undefined;
  Cart: undefined;
  Checkout: { sellerId: string };
  OrderConfirmation: { orderId: string; totalAmount: number };
  SavedPaymentMethods: undefined;
  ShippingAddresses: undefined;
  AddAddress: { addressId?: string } | undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  UploadShort: undefined;
  StoreShortsViewer: { sellerId: string; initialIndex?: number };
  SavedProducts: undefined;
  StoreAddress: undefined;
  Sales: undefined;
  SaleDetail: { orderId: string };
  Notifications: undefined;
};
```

---

## Bottom Tab Navigator

**File:** `client/navigation/MainTabNavigator.tsx`

| Tab | Icon | Stack Navigator | Main Screen |
|-----|------|----------------|-------------|
| Live | `radio` | HomeStackNavigator | HomeScreen |
| Explore | `search` | ExploreStackNavigator | ExploreScreen |
| Shorts | `play-circle` | ShortsStackNavigator | ShortsScreen |
| Shows | `film` | ShowsStackNavigator | ShowsScreen |
| Profile | `user` | ProfileStackNavigator | ProfileScreen |

**Tab bar features:**
- iOS: Blur effect background
- Android: Solid background
- Profile tab: Red unread notification badge
- Shorts tab: Hidden tab bar (fullscreen experience)

---

## Global Navigation Ref

**File:** `client/navigation/navigationRef.ts`

```typescript
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
```

Used for navigation from outside React components:
- Push notification tap handler (RootStackNavigator)
- Cart FAB on HomeScreen
- Any service-level navigation needs

Wired to `NavigationContainer` in `App.tsx`:
```typescript
<NavigationContainer ref={navigationRef} linking={linking}>
```

---

## Deep Linking

**File:** `App.tsx` (linking config)

The app supports deep linking for navigating to specific screens via URL schemes.

---

## Screen Options

**File:** `client/hooks/useScreenOptions.ts`

Shared screen options hook that provides consistent header styling across all screens:
- Themed header colors
- Back button styling
- Header shadow/border

---

## Presentation Modes

| Screen | Presentation | Notes |
|--------|-------------|-------|
| LiveStream | `fullScreenModal` + `fade` | Immersive video |
| Broadcaster | `fullScreenModal` + `fade` | Immersive broadcast |
| AddProduct | `modal` | Slide-up form |
| AddAddress | `modal` | Slide-up form |
| UploadShort | `modal` | Slide-up upload |
| OrderConfirmation | Default + `gestureEnabled: false` | Prevents swipe-back |
| StoreShortsViewer | Default + `fade` | Smooth transition |
| Most others | Default (push) | Standard stack push |

---

## Auth Guard

In `RootStackNavigator`, the auth state determines screen visibility:

```typescript
{!user ? (
  <Stack.Screen name="Auth" ... />
) : (
  <>
    <Stack.Screen name="Main" ... />
    {/* all authenticated screens */}
  </>
)}
```

No authenticated screen is ever rendered when `user` is null.

---

## Notification Tap Navigation

`RootStackNavigator` registers a listener for push notification taps:

```typescript
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (data?.type === "new_sale" && data?.orderId) {
    navigationRef.navigate("SaleDetail", { orderId: data.orderId });
  }
});
```

---

## Files

| File | Purpose |
|------|---------|
| `App.tsx` | NavigationContainer + linking config |
| `client/navigation/RootStackNavigator.tsx` | Root stack with auth guard + all routes |
| `client/navigation/MainTabNavigator.tsx` | Bottom tab navigator |
| `client/navigation/HomeStackNavigator.tsx` | Home tab stack |
| `client/navigation/ExploreStackNavigator.tsx` | Explore tab stack |
| `client/navigation/ShortsStackNavigator.tsx` | Shorts tab stack |
| `client/navigation/ShowsStackNavigator.tsx` | Shows tab stack |
| `client/navigation/ProfileStackNavigator.tsx` | Profile tab stack |
| `client/navigation/navigationRef.ts` | Global navigation ref |
| `client/hooks/useScreenOptions.ts` | Shared screen options |
