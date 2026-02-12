"""
JaTango Voice Product Agent

A LiveKit voice agent that helps sellers create products by voice.
Uses OpenAI GPT-4o-mini for LLM, Whisper for STT, and TTS-1 for speech.

Usage:
    uv run agent.py download-files   # One-time: download VAD models
    uv run agent.py dev              # Development mode
    uv run agent.py start            # Production mode
"""

import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    RunContext,
    function_tool,
    get_job_context,
    room_io,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


async def supabase_insert_product(
    seller_id: str,
    name: str,
    weight: float,
    cost: float,
    quantity: int,
) -> dict[str, Any]:
    """Insert a product into the Supabase products table via REST API."""
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    payload = {
        "name": name,
        "price": cost,
        "weight": weight,
        "weight_unit": "oz",
        "quantity_in_stock": quantity,
        "seller_id": seller_id,
        "image": "",
        "description": f"{name} - added via voice",
        "images": [],
        "colors": [],
        "sizes": [],
        "variants": [],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        # Supabase returns a list when using Prefer: return=representation
        return data[0] if isinstance(data, list) else data


def get_seller_id_from_room() -> str | None:
    """Extract the seller's participant identity from the room.
    The broadcaster is the first non-agent participant."""
    try:
        ctx = get_job_context()
        for identity, participant in ctx.room.remote_participants.items():
            # Skip other agents
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
                continue
            return str(identity)
    except Exception:
        pass
    return None


class ProductAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are a product listing assistant for JaTango, a live shopping app. "
                "You help sellers add products using their voice.\n\n"
                "RULES:\n"
                "- Wait for the user to say 'add product' before starting the product creation flow.\n"
                "- Collect these 4 fields one at a time: product name, weight (in ounces), "
                "price (in USD), and quantity in stock.\n"
                "- Confirm each field as the user provides it.\n"
                "- When all 4 fields are collected, call the create_product tool.\n"
                "- After creating the product, tell the user it was created and ask if they "
                "want to 'add product to show' (to put it in the live carousel) or 'add product' "
                "to create another one.\n"
                "- If the user says 'add product to show', call the add_product_to_show tool "
                "with the product ID from the last created product.\n"
                "- Keep responses short and conversational — the user is likely on camera.\n"
                "- Do NOT use any formatting, emojis, or special characters in your speech.\n"
            ),
        )
        self._last_product_id: str | None = None
        self._last_product_name: str | None = None

    @function_tool()
    async def create_product(
        self,
        context: RunContext,
        name: str,
        weight: float,
        price: float,
        quantity: int,
    ) -> str:
        """Create a new product in the database.

        Args:
            name: The product name.
            weight: The weight in ounces.
            price: The price in USD.
            quantity: The quantity in stock.
        """
        seller_id = get_seller_id_from_room()
        if not seller_id:
            return "Error: Could not determine seller identity."

        try:
            product = await supabase_insert_product(
                seller_id=seller_id,
                name=name,
                weight=weight,
                cost=price,
                quantity=quantity,
            )
            product_id = product.get("id", "unknown")
            self._last_product_id = product_id
            self._last_product_name = name
            return (
                f"Product created successfully. "
                f"Name: {name}, Price: ${price:.2f}, Weight: {weight}oz, "
                f"Quantity: {quantity}. Product ID: {product_id}"
            )
        except Exception as e:
            return f"Error creating product: {e}"

    @function_tool()
    async def add_product_to_show(
        self,
        context: RunContext,
        product_id: str,
    ) -> str:
        """Add a recently created product to the current live show carousel.
        Call this when the user says 'add product to show'.

        Args:
            product_id: The ID of the product to add to the show.
        """
        try:
            ctx = get_job_context()
            room = ctx.room

            # Find the broadcaster (non-agent participant)
            broadcaster_identity: str | None = None
            for identity, participant in room.remote_participants.items():
                if participant.kind != rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
                    broadcaster_identity = str(identity)
                    break

            if not broadcaster_identity:
                return "Error: No broadcaster found in the room."

            # Send RPC to the broadcaster to add product to carousel
            payload = json.dumps({
                "productId": product_id,
                "name": self._last_product_name or "Product",
            })

            response = await room.local_participant.perform_rpc(
                destination_identity=broadcaster_identity,
                method="addProductToShow",
                payload=payload,
                response_timeout=10.0,
            )

            return f"Product added to the live show carousel. {response}"
        except Exception as e:
            return f"Error adding product to show: {e}"


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        stt="openai/whisper-1",
        llm="openai/gpt-4o-mini",
        tts="openai/tts-1",
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=ProductAssistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVC(),
            ),
        ),
    )

    await session.generate_reply(
        instructions="Greet the user briefly and tell them to say 'add product' whenever they want to create a new product."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
