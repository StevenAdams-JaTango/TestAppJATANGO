import { useState, useCallback, useEffect, useRef } from "react";
import { Room, RoomEvent } from "livekit-client";
import { getApiUrl } from "@/lib/query-client";
import { productsService } from "@/services/products";
import { Product } from "@/types";

export interface UseVoiceAgentOptions {
  room: Room | null;
  onProductCreated?: (product: Product) => void;
}

export interface UseVoiceAgentReturn {
  isAgentActive: boolean;
  isDispatching: boolean;
  dispatchAgent: (roomName: string) => Promise<void>;
  error: string | null;
}

export function useVoiceAgent(
  options: UseVoiceAgentOptions,
): UseVoiceAgentReturn {
  const { room, onProductCreated } = options;
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onProductCreatedRef = useRef(onProductCreated);

  // Keep ref in sync
  useEffect(() => {
    onProductCreatedRef.current = onProductCreated;
  }, [onProductCreated]);

  // Register RPC handler for when the agent creates a product and adds it to show
  useEffect(() => {
    if (!room) return;

    const handleRpc = async (data: {
      callerIdentity: string;
      payload: string;
      responseTimeout: number;
    }) => {
      try {
        const parsed = JSON.parse(data.payload);
        const productId = parsed.productId as string;

        if (!productId) return "Error: no productId";

        // Fetch the full product from the database
        const product = await productsService.getProduct(productId);
        if (product && onProductCreatedRef.current) {
          onProductCreatedRef.current(product);
        }

        return JSON.stringify({ success: true, productId });
      } catch (err) {
        console.error("[useVoiceAgent] RPC handler error:", err);
        return JSON.stringify({
          success: false,
          error: String(err),
        });
      }
    };

    room.localParticipant.registerRpcMethod("addProductToShow", handleRpc);

    return () => {
      // No unregister API — the room cleanup handles it
    };
  }, [room]);

  // Detect when agent participant joins/leaves
  useEffect(() => {
    if (!room) {
      setIsAgentActive(false);
      return;
    }

    const checkForAgent = () => {
      let found = false;
      for (const [, participant] of room.remoteParticipants) {
        // Agent participants have kind === 2 (AGENT) or their identity contains "agent"
        if (
          (participant as any).kind === 2 ||
          participant.identity?.toLowerCase().includes("agent")
        ) {
          found = true;
          break;
        }
      }
      setIsAgentActive(found);
    };

    checkForAgent();

    const onJoin = () => checkForAgent();
    const onLeave = () => checkForAgent();

    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);

    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room]);

  const dispatchAgent = useCallback(async (roomName: string) => {
    setIsDispatching(true);
    setError(null);

    try {
      const apiUrl = getApiUrl().replace(/\/$/, "");
      const response = await fetch(`${apiUrl}/api/streaming/dispatch-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to dispatch agent (${response.status})`,
        );
      }

      const result = await response.json();
      console.log("[useVoiceAgent] Agent dispatched:", result);
    } catch (err: any) {
      const msg = err.message || "Failed to dispatch voice agent";
      setError(msg);
      console.error("[useVoiceAgent] Dispatch error:", err);
    } finally {
      setIsDispatching(false);
    }
  }, []);

  return {
    isAgentActive,
    isDispatching,
    dispatchAgent,
    error,
  };
}
