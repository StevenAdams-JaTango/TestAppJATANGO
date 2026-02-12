# Authentication Feature Documentation

## Overview

JaTango uses Supabase Auth for user authentication with email/password sign-up and sign-in. The flow includes email verification with automatic polling, push notification registration on successful login, and session persistence via AsyncStorage.

---

## Architecture

### Auth Provider

**File:** `client/contexts/AuthContext.tsx`

The `AuthProvider` wraps the entire app and exposes:

| Method / State | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current Supabase user object |
| `session` | `Session \| null` | Current Supabase session |
| `loading` | `boolean` | True while checking initial session |
| `pendingVerification` | `boolean` | True after sign-up, waiting for email verification |
| `pendingEmail` | `string \| null` | Email address pending verification |
| `signUp(email, password)` | `Promise<{ error }>` | Creates account, sets pending verification state |
| `signIn(email, password)` | `Promise<{ error }>` | Signs in with email/password |
| `signOut()` | `Promise<void>` | Clears session, stops polling |
| `checkEmailVerification()` | `Promise<boolean>` | Checks if email has been verified |
| `cancelVerification()` | `void` | Cancels pending verification state |
| `resendVerificationEmail()` | `Promise<{ error }>` | Resends verification email |

### Auth Flow

```
User opens app
  → AuthProvider checks Supabase session (getSession)
  → If session exists + email confirmed → user is logged in
  → If no session → show AuthScreen

Sign Up:
  → supabase.auth.signUp({ email, password })
  → If user created but email not confirmed → pendingVerification = true
  → AuthScreen shows verification UI with polling
  → Poll every few seconds via checkEmailVerification()
  → On verification → SIGNED_IN event fires → registerForPushNotifications()

Sign In:
  → supabase.auth.signInWithPassword({ email, password })
  → On success → onAuthStateChange fires → user state updated

Sign Out:
  → supabase.auth.signOut()
  → Clears all state, stops polling
```

### Auth Screen

**File:** `client/screens/AuthScreen.tsx`

- Toggle between Login and Sign Up modes
- Email + password text inputs
- Loading state during auth operations
- Verification pending UI with:
  - "Check your email" message
  - Auto-polling for verification status
  - "Resend" button with cooldown
  - "Cancel" button to go back
- Animated entrance with `react-native-reanimated`

### Push Notification Registration

On successful sign-in (email confirmed), the auth provider calls:

```typescript
registerForPushNotifications(session.user.id)
```

This function (in `client/services/notifications.ts`):
1. Checks if running on a physical device
2. Requests notification permissions
3. Sets up Android notification channel ("sales")
4. Gets Expo push token via FCM
5. Saves token to `profiles.push_token` in Supabase

### Database

**Table:** `profiles`

The profiles table is auto-populated when a user signs up (via Supabase trigger or client-side insert). Key auth-related columns:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Matches Supabase Auth user ID |
| `name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile picture URL |
| `push_token` | TEXT | Expo push token for notifications |

### Session Persistence

Supabase JS client is initialized with `AsyncStorage` adapter in `client/lib/supabase.ts`, which automatically persists the session across app restarts.

### Navigation Guard

In `RootStackNavigator.tsx`, the auth state determines which screens are shown:

```typescript
{!user ? (
  <Stack.Screen name="Auth" component={AuthScreen} />
) : (
  <>
    <Stack.Screen name="Main" component={MainTabNavigator} />
    {/* ... all authenticated screens */}
  </>
)}
```

---

## Files

| File | Purpose |
|------|---------|
| `client/contexts/AuthContext.tsx` | Auth provider with all auth logic |
| `client/screens/AuthScreen.tsx` | Login/signup/verification UI |
| `client/services/notifications.ts` | Push token registration on login |
| `client/lib/supabase.ts` | Supabase client initialization with session persistence |
| `client/navigation/RootStackNavigator.tsx` | Navigation guard based on auth state |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
