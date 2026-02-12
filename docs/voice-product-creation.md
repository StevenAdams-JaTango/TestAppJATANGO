# AI Voice Product Upload

Create products hands-free using voice commands — during a live show or from the My Products page. A LiveKit voice agent powered by OpenAI listens to your speech, collects product details, saves them to the database, and optionally adds them to your live show carousel.

---

## How It Works

1. **You speak** → LiveKit streams your audio to a Python agent
2. **Agent listens** → OpenAI Whisper converts speech to text
3. **Agent understands** → GPT-4o-mini extracts product details
4. **Agent acts** → Inserts the product into Supabase via function tools
5. **Agent confirms** → OpenAI TTS-1 speaks back to you

```
You (mic) → LiveKit Room → Python Agent → Supabase DB
                ↑                ↓
            TTS audio      RPC to client
            (response)     (carousel update)
```

---

## Voice Commands

| Command | What It Does |
|---------|-------------|
| **"Add product"** | Starts the product creation flow |
| **"Add product to show"** | Adds the last created product to the live carousel |

The agent will walk you through each field one at a time:
1. **Product name** — e.g. "Blue cotton t-shirt"
2. **Weight** — e.g. "8 ounces"
3. **Price** — e.g. "$24.99"
4. **Quantity in stock** — e.g. "50"

---

## Using Voice Add During a Live Show

1. Start a live show from the Broadcaster screen
2. Tap the **mic button** (🎤) in the right-side controls — it appears once you're live
3. The agent joins your room and greets you
4. Say **"add product"** and follow the prompts
5. After the product is created, say **"add product to show"** to push it to the live carousel
6. All viewers see the product appear in real time
7. The mic button glows orange while the agent is active

## Using Voice Add from My Products

1. Go to **Profile → My Products**
2. Tap the **"Voice Add"** floating button at the bottom right
3. A temporary audio room is created and the agent joins
4. Say **"add product"** and follow the prompts
5. When done, tap the button again (now red, showing "Listening...") to disconnect
6. Your product list refreshes automatically

---

## Setup

### Prerequisites

- **Python 3.11+** installed
- **uv** package manager (installed automatically or via `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **OpenAI API key** (test key works — add to `.env` as `OPENAI_API_KEY=sk-...`)
- **LiveKit credentials** already configured in `.env` (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)

### Agent Environment Setup

The agent reads from `agent/.env.local`. Required variables:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

A template is provided at `agent/.env.local.example`.

### Install & Run

```bash
# Install Python dependencies (one-time)
cd agent
uv sync

# Download VAD models (one-time)
uv run agent.py download-files

# Start the agent in development mode
uv run agent.py dev
```

The agent must be running for voice product creation to work. It listens for dispatch requests from the server and joins rooms on demand.

---

## Architecture

### Files

| File | Purpose |
|------|---------|
| `agent/agent.py` | Python voice agent — STT/LLM/TTS pipeline + function tools |
| `agent/pyproject.toml` | Python dependencies |
| `agent/.env.local` | Agent environment variables |
| `server/streaming.ts` | `POST /api/streaming/dispatch-agent` endpoint |
| `client/hooks/useVoiceAgent.ts` | React hook for agent dispatch + RPC handling |
| `client/screens/BroadcasterScreen.tsx` | Voice toggle button + carousel auto-update |
| `client/screens/ProductsScreen.tsx` | Voice Add FAB button |

### Agent Function Tools

The agent has two tools it can call during conversation:

**`create_product(name, weight, price, quantity)`**
- Inserts a new product into the `products` table via Supabase REST API
- Uses the service role key for server-side access
- Sets the `seller_id` to the broadcaster's LiveKit participant identity

**`add_product_to_show(product_id)`**
- Sends an RPC call (`addProductToShow`) to the broadcaster's client
- The client fetches the full product, adds it to the carousel, and broadcasts to viewers

### Communication Flow

```
1. Client taps voice button
2. Client calls POST /api/streaming/dispatch-agent { roomName }
3. Server dispatches agent "jatango-voice-agent" to the room
4. Agent joins room, starts listening
5. User speaks → Agent processes → Agent calls create_product tool
6. Agent inserts product into Supabase
7. (If live show) Agent calls add_product_to_show → RPC to client
8. Client updates carousel → broadcasts to all viewers
```

---

## Cost

- **OpenAI GPT-4o-mini**: ~$0.15 per 1M input tokens
- **OpenAI Whisper STT**: ~$0.006 per minute of audio
- **OpenAI TTS-1**: ~$0.015 per 1K characters

A typical product creation conversation costs **less than $0.01**.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent doesn't respond | Make sure `uv run agent.py dev` is running in a terminal |
| "Agent dispatch client not configured" | Check LiveKit credentials in `.env` |
| Products not saving | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `agent/.env.local` |
| No audio from agent | Check that your device microphone is enabled and LiveKit room is connected |
| Agent joins but doesn't understand | Verify `OPENAI_API_KEY` is set and valid in `agent/.env.local` |
