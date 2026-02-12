# Live Streaming Feature Documentation

## Overview

JaTango's core feature is live shopping — sellers host real-time video streams where they showcase products, and viewers can browse, add to cart, and purchase during the show. Streaming is powered by **LiveKit** for WebRTC video/audio, with the Express server managing tokens, rooms, and metadata.

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Video/Audio Transport | LiveKit (WebRTC) |
| Server SDK | `livekit-server-sdk` (Node.js) |
| Client SDK | `@livekit/react-native` + `livekit-client` |
| Voice Agent | Python (`livekit-agents` framework + OpenAI) |
| Thumbnails | Base64 upload → static file serving |

### Server Endpoints — `server/streaming.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/streaming/token` | Generate LiveKit access token for host or viewer |
| GET | `/api/streaming/rooms` | List all active LiveKit rooms with metadata |
| PUT | `/api/streaming/rooms/:roomName/metadata` | Update room title and thumbnail |
| POST | `/api/streaming/rooms/:roomName/end` | Force-end a room (delete all participants) |
| POST | `/api/streaming/dispatch-agent` | Dispatch voice agent to a LiveKit room |
| POST | `/api/streaming/upload-thumbnail` | Upload base64 thumbnail image |

### Token Generation

```typescript
// Host token — can publish video/audio, admin room
{
  roomName, participantName,
  canPublish: true, canSubscribe: true,
  roomAdmin: true, roomCreate: true
}

// Viewer token — can only subscribe
{
  roomName, participantName,
  canPublish: false, canSubscribe: true,
  roomAdmin: false, roomCreate: false
}
```

Tokens expire after 24 hours. The `identity` is set to the participant name.

### Room Metadata

Room metadata is a JSON string stored on the LiveKit room:

```json
{
  "title": "Summer Collection Drop!",
  "thumbnailUrl": "/thumbnails/abc123.jpg"
}
```

Updated via `roomService.updateRoomMetadata()`.

---

## Client Screens

### `LiveStreamSetupScreen` (via ShowsTab)

Where sellers configure their live show before going live:
- Set show title
- Select products to feature
- Choose thumbnail
- Start broadcasting

### `BroadcasterScreen`

The host's view during a live stream:
- Camera preview with flip/mute controls
- Product carousel at the bottom (products featured in the show)
- Viewer count display
- Chat overlay
- Voice agent mic toggle (dispatches AI assistant)
- End show button → navigates to `ShowSummaryScreen`

### `LiveStreamScreen` (Viewer)

The viewer's experience:
- Full-screen video playback
- Product carousel — tap to view product details via `ProductDetailSheet`
- Add to cart during the stream
- Chat overlay
- Viewer count
- Leave button

### `HomeScreen` — Live Now Section

- Displays up to 4 active live rooms in a 2-column grid
- Each card shows: thumbnail (or live preview), "LIVE" badge, title, viewer count
- Tapping a card navigates to `LiveStreamScreen`
- Auto-refreshes when the HomeTab is focused via `useLiveRooms` hook

### `EndedShowScreen`

Shown when a viewer is in a stream that ends:
- Show summary (title, duration)
- Products that were featured
- Option to browse the seller's store

### `ShowSummaryScreen`

Post-show analytics for the host:
- Total sales revenue
- Number of orders
- Cart events (adds, removes)
- Product performance breakdown

---

## Show Analytics — `server/shows.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shows/:showId/summary` | Sales summary (revenue, orders, cart events) |
| POST | `/api/shows/batch-revenue` | Batch lookup of revenue for multiple shows |
| POST | `/api/shows/:showId/cart-event` | Log a cart event (add/remove) during a show |
| DELETE | `/api/reservations/cleanup` | Clean up expired product reservations |
| GET | `/api/reservations/quantities` | Get reserved quantities for products in a show |

### Cart Events

During a live show, cart actions are logged to `show_cart_events` for analytics:

| Column | Type | Description |
|--------|------|-------------|
| `show_id` | UUID | The live show |
| `user_id` | UUID | The viewer |
| `product_id` | UUID | Product added/removed |
| `event_type` | TEXT | `add_to_cart` or `remove_from_cart` |
| `quantity` | INTEGER | Number of items |

---

## Voice Agent — `agent/`

A Python-based AI voice assistant that can join LiveKit rooms:

- **Framework:** LiveKit Agents + OpenAI (GPT-4, Whisper STT, TTS-1)
- **Dispatch:** POST `/api/streaming/dispatch-agent` with `{ roomName, agentName: "jatango-voice-agent" }`
- **Capabilities:** Create products via voice, add products to show carousel
- **Integration:** Uses RPC (Remote Procedure Call) to communicate with the client

### Agent Files

| File | Purpose |
|------|---------|
| `agent/agent.py` | Voice agent with `create_product` and `add_product_to_show` function tools |
| `agent/pyproject.toml` | Python dependencies |
| `agent/.env.local` | Agent environment variables |

---

## Database Tables

### `shows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Show title |
| `description` | TEXT | Show description |
| `seller_id` | UUID | Host's profile ID |
| `status` | TEXT | `live`, `ended` |
| `livekit_room_name` | TEXT | LiveKit room identifier |
| `thumbnail_url` | TEXT | Show thumbnail |
| `created_at` | TIMESTAMPTZ | When the show started |
| `ended_at` | TIMESTAMPTZ | When the show ended |

### `show_cart_events`

Logs cart activity during live shows for analytics.

---

## Hooks

| Hook | File | Description |
|------|------|-------------|
| `useLiveRooms` | `client/hooks/useLiveRooms.ts` | Fetches active LiveKit rooms, auto-refreshes |
| `useVoiceAgent` | `client/hooks/useVoiceAgent.ts` | Dispatches voice agent + handles RPC |

---

## Files

| File | Purpose |
|------|---------|
| `server/streaming.ts` | LiveKit token, room management, agent dispatch, thumbnails |
| `server/shows.ts` | Show analytics, cart events, reservations |
| `client/screens/BroadcasterScreen.tsx` | Host broadcast UI |
| `client/screens/LiveStreamScreen.tsx` | Viewer stream UI |
| `client/screens/EndedShowScreen.tsx` | Post-show viewer screen |
| `client/screens/ShowSummaryScreen.tsx` | Post-show host analytics |
| `client/hooks/useLiveRooms.ts` | Active rooms hook |
| `client/hooks/useVoiceAgent.ts` | Voice agent hook |
| `client/components/LivePreview.tsx` | Live video preview component |
| `client/components/LiveBadge.tsx` | "LIVE" badge component |
| `client/components/ProductCarousel.tsx` | Product carousel for streams |
| `agent/agent.py` | Python voice agent |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `LIVEKIT_URL` | LiveKit WebSocket URL (wss://) |
| `OPENAI_API_KEY` | OpenAI key (for voice agent) |
