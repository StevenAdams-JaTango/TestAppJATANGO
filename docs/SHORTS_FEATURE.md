# Shorts Feature Documentation

## Overview

The Shorts feature allows sellers to upload short-form vertical videos (max 60 seconds) that users can browse in a TikTok-style fullscreen swipe feed. It includes video playback, likes, comments, view tracking, optional product attachment, and resume-from-progress functionality.

---

## Architecture

### Database (Supabase)

Four tables power the feature, defined in `supabase-shorts-migration.sql` and `supabase-shorts-comments-products-migration.sql`:

| Table | Purpose |
|-------|--------|
| `shorts` | Stores video metadata (URL, caption, duration, counts, optional product_id) |
| `short_likes` | Junction table tracking which users liked which shorts |
| `short_comments` | Comments on shorts with user references |
| `short_progress` | Tracks each user's last-watched short for feed resume |

**Key columns on `shorts`:**
- `seller_id` — References `profiles(id)`, the uploader
- `video_url` — Direct URL to the video file in Supabase Storage
- `thumbnail_url` — Optional cover image URL
- `caption` — Up to 200 characters
- `duration` — Video length in seconds (max 60)
- `view_count` / `like_count` / `comment_count` — Denormalized counters updated via RPC
- `product_id` — Optional reference to `products(id)`, allows attaching a product to a short

**Key columns on `short_comments`:**
- `short_id` — References `shorts(id)`
- `user_id` — References `profiles(id)`, the commenter
- `text` — Comment text (1–500 characters)

**RPC Functions:**
- `increment_short_views(short_id)` — Atomically increments view count
- `increment_short_likes(short_id)` — Atomically increments like count
- `decrement_short_likes(short_id)` — Atomically decrements like count
- `increment_short_comments(short_id)` — Atomically increments comment count
- `decrement_short_comments(short_id)` — Atomically decrements comment count

**RLS Policies:**
- Anyone can read shorts, likes, and comments
- Only authenticated users can create shorts (must be the seller)
- Only the seller can delete their own shorts
- Authenticated users can post comments; users can delete their own comments
- Users can only manage their own likes and progress

### Storage (Supabase Storage)

| Bucket | Content | Access |
|--------|---------|--------|
| `short-videos` | Raw video files (.mp4) | Public |
| `short-thumbnails` | Cover images | Public (via `product-images` bucket or dedicated) |

**⚠️ Important:** You must create the `short-videos` bucket manually in the Supabase dashboard before uploading. Set it to **public**.

---

## Video Storage & Streaming

### Current Implementation (Supabase Storage)

Videos are uploaded directly to Supabase Storage at the resolution captured by the device. The upload flow:

1. User picks a video via `expo-image-picker` (max 60s enforced)
2. `uploadVideo()` in `client/services/storage.ts` reads the file and uploads to the `short-videos` bucket
3. The raw `.mp4` URL is stored in the `shorts.video_url` column
4. `expo-av` `<Video>` component plays the URL directly

**What this means:**
- Single resolution per video (whatever the device recorded/selected)
- No adaptive bitrate streaming
- No server-side transcoding
- Free — uses existing Supabase Storage
- Quality depends on the original file and user's connection speed

### Future Enhancement: Adaptive Streaming (Mux)

For production at scale, consider integrating **Mux** for adaptive bitrate streaming (HLS):
- Upload video to Mux → auto-transcodes into multiple renditions (360p–1080p)
- Serve HLS manifest URL (`.m3u8`) instead of raw `.mp4`
- `expo-av` natively supports HLS — quality switches automatically based on bandwidth
- Mux pricing: pay-as-you-go (~$0.015/min encoding, ~$0.001/min streaming)

---

## File Structure

```
client/
├── components/
│   ├── ShortCard.tsx              # Fullscreen video card with overlays
│   └── ShortCommentsSheet.tsx     # Comments bottom sheet modal
├── screens/
│   ├── ShortsScreen.tsx           # Main feed (vertical swipe, pagination, resume)
│   ├── UploadShortScreen.tsx      # Upload flow (video picker, thumbnail, caption)
│   └── StoreShortsScreen.tsx      # Store-specific shorts viewer
├── navigation/
│   ├── ShortsStackNavigator.tsx   # Stack navigator for Shorts tab
│   ├── MainTabNavigator.tsx       # (modified) Added ShortsTab
│   ├── RootStackNavigator.tsx     # (modified) Added UploadShort, StoreShortsViewer
│   └── linking.ts                 # (modified) Added deep link routes
├── services/
│   ├── shorts.ts                  # Shorts CRUD, likes, progress, view tracking
│   └── storage.ts                 # (modified) Added uploadVideo()
└── types/
    └── index.ts                   # (modified) Added Short, ShortLike, ShortProgress

supabase-shorts-migration.sql      # Database schema, RLS, triggers, RPCs
```

---

## Components

### ShortCard (`client/components/ShortCard.tsx`)

Fullscreen video player card rendered inside the feed. Features:

- **Video playback** via `expo-av` with auto-play when visible, pause when off-screen
- **Tap to play/pause** with play icon overlay
- **Mute toggle** button
- **Like button** with optimistic UI (instant count update, async API call)
- **Comment button** — opens `ShortCommentsSheet` bottom sheet with comment count
- **View count** display
- **Product card overlay** — if a product is attached, shows a tappable card with image, name, and price that opens `ProductDetailSheet`
- **Seller info** — avatar + name, tappable to navigate to store profile
- **Caption** overlay at the bottom
- **Error recovery** — auto-retry on playback failure, tap-to-retry overlay

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `short` | `Short` | The short data object |
| `isVisible` | `boolean` | Whether this card is currently on-screen |
| `currentUserId` | `string?` | Current user ID (for delete button visibility) |
| `onLike` | `(shortId: string) => void` | Like callback |
| `onUnlike` | `(shortId: string) => void` | Unlike callback |
| `onDelete` | `(shortId: string) => void?` | Delete callback (owner only) |

### ShortCommentsSheet (`client/components/ShortCommentsSheet.tsx`)

Bottom sheet modal for viewing and posting comments on a short. Features:

- **Comment list** — Scrollable list with user avatars, names, timestamps
- **Post comment** — Text input with send button
- **Delete own comments** — Trash icon on user's own comments
- **Optimistic count** — Updates parent's comment count via callback

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Whether the sheet is visible |
| `shortId` | `string` | The short to show comments for |
| `onClose` | `() => void` | Close callback |
| `onCommentCountChange` | `(delta: number) => void?` | Callback when comment count changes |

### ShortsScreen (`client/screens/ShortsScreen.tsx`)

The main Shorts feed, accessible from the bottom tab bar. Features:

- **Vertical swipe** — FlatList with paging, snap-to-item
- **Pagination** — Loads 10 shorts at a time, fetches more on scroll
- **Resume from progress** — On mount, checks `short_progress` for the user's last-watched short and scrolls to it
- **Progress saving** — Saves current short ID to `short_progress` as user swipes
- **View tracking** — Increments view count when a short becomes visible
- **Empty state** — Shown when no shorts exist

### UploadShortScreen (`client/screens/UploadShortScreen.tsx`)

Modal screen for uploading a new short. Features:

- **Video picker** — Uses `expo-image-picker` with `mediaTypes: ["videos"]` and `videoMaxDuration: 60`
- **Video preview** — Shows selected video with duration badge and change button
- **Thumbnail picker** — Optional cover image (9:16 aspect ratio)
- **Caption input** — Multiline, 200 character limit with counter
- **Product picker** — Horizontal scrollable list of seller's products; tap to attach, tap X to remove
- **Upload flow** — Uploads video → uploads thumbnail (if any) → creates DB record with optional product_id
- **Discard confirmation** — Warns before navigating away with unsaved video
- **Post-upload navigation** — Navigates to Profile tab after successful upload

### StoreShortsScreen (`client/screens/StoreShortsScreen.tsx`)

Store-specific shorts viewer, opened from store profile or "My Shorts" in profile. Same vertical swipe mechanic as the main feed but filtered to a single seller's shorts.

**Route params:**
| Param | Type | Description |
|-------|------|-------------|
| `sellerId` | `string` | The seller's profile ID |
| `initialIndex` | `number` (optional) | Which short to start on |

---

## Services

### shorts.ts (`client/services/shorts.ts`)

| Function | Description |
|----------|-------------|
| `fetchFeed(userId, page, limit)` | Fetches paginated feed of all shorts with like status and product joins |
| `fetchByStore(sellerId, userId?)` | Fetches all shorts for a specific store |
| `createShort({videoUrl, thumbnailUrl?, caption, duration, productId?})` | Creates a new short with optional product attachment |
| `deleteShort(shortId)` | Deletes a short (seller only) |
| `likeShort(shortId, userId)` | Likes a short + increments count via RPC |
| `unlikeShort(shortId, userId)` | Unlikes a short + decrements count via RPC |
| `incrementViewCount(shortId)` | Increments view count via RPC |
| `getProgress(userId)` | Gets the last-watched short ID |
| `saveProgress(userId, shortId)` | Upserts the user's last-watched short |
| `fetchComments(shortId)` | Fetches all comments for a short with user profiles |
| `postComment(shortId, text)` | Posts a comment + increments count via RPC |
| `deleteComment(commentId, shortId)` | Deletes a comment + decrements count via RPC |

### storage.ts additions

| Function | Description |
|----------|-------------|
| `uploadVideo(uri)` | Uploads a video file to the `short-videos` bucket, returns public URL |

---

## Navigation

### Tab Order

```
Live · Explore · Shorts · Shows · Profile
```

The Shorts tab uses the `play-circle` Feather icon.

### Routes

| Route | Navigator | Screen | Presentation |
|-------|-----------|--------|-------------|
| `ShortsTab > Shorts` | ShortsStackNavigator | ShortsScreen | Tab |
| `UploadShort` | RootStackNavigator | UploadShortScreen | Modal |
| `StoreShortsViewer` | RootStackNavigator | StoreShortsScreen | Fade transition |

### Deep Links

| Path | Route |
|------|-------|
| `/shorts` | Shorts tab |
| `/upload-short` | Upload short modal |
| `/store-shorts/:sellerId` | Store shorts viewer |

---

## Integration Points

### StoreProfileScreen
- Displays a horizontal row of short thumbnails below the store info
- Shows an "Upload" button if viewing your own store
- Tapping a thumbnail opens `StoreShortsViewer` at that index

### ProfileScreen
- "My Shorts" menu item (sellers only) navigates to `StoreShortsViewer` with the user's own seller ID

---

## Data Types

```typescript
interface Short {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
  productId?: string | null;
  productName?: string | null;
  productImage?: string | null;
  productPrice?: number | null;
}

interface ShortComment {
  id: string;
  shortId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
}

interface ShortLike {
  id: string;
  shortId: string;
  userId: string;
  createdAt: string;
}

interface ShortProgress {
  userId: string;
  lastShortId: string | null;
  updatedAt: string;
}
```

---

## Setup Checklist

1. ✅ Install `expo-av`: `npx expo install expo-av`
2. ⬜ Run `supabase-shorts-migration.sql` in Supabase SQL Editor
3. ⬜ Run `supabase-shorts-comments-products-migration.sql` in Supabase SQL Editor
4. ⬜ Create `short-videos` storage bucket in Supabase (set to **public**)
5. ⬜ (Optional) Create `short-thumbnails` bucket or reuse `product-images`

---

## Future Enhancements

- [ ] **Adaptive streaming** — Integrate Mux/Cloudflare Stream for HLS multi-resolution playback
- [x] **Comments** — Comment thread per short with post/delete
- [x] **Product attachment** — Optionally attach a product to a short, shown as tappable overlay
- [ ] **Share** — Deep link sharing to specific shorts
- [ ] **Analytics** — Watch time tracking, completion rate
- [ ] **Moderation** — Content review before publishing
- [ ] **Video compression** — Client-side compression before upload (e.g., `ffmpeg-kit-react-native`)
- [ ] **Infinite scroll optimization** — Recycle video players for memory efficiency
- [ ] **Sound indicator** — Show audio waveform or music attribution
