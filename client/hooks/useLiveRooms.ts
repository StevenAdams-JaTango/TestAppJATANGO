import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/query-client";

interface UseLiveRoomsOptions {
  enabled?: boolean;
}

export interface LiveRoom {
  name: string;
  numParticipants: number;
  createdAt: number;
  metadata: string | null;
  title: string | null;
  thumbnailUrl: string | null;
}

function parseRoomMetadata(
  metadata: string | null,
): { title: string | null; thumbnailPath: string | null } | null {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as {
      title?: unknown;
      thumbnailPath?: unknown;
    };

    return {
      title: typeof parsed.title === "string" ? parsed.title : null,
      thumbnailPath:
        typeof parsed.thumbnailPath === "string" ? parsed.thumbnailPath : null,
    };
  } catch {
    return null;
  }
}

export function useLiveRooms(options: UseLiveRoomsOptions = {}) {
  const { enabled = true } = options;
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl().replace(/\/$/, "");
      const url = `${apiUrl}/api/streaming/rooms`;
      console.log("[useLiveRooms] Fetching from:", url);

      // Create abort controller with manual timeout (AbortSignal.timeout not supported in RN)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("[useLiveRooms] Response not OK:", response.status);
        throw new Error("Failed to fetch live rooms");
      }

      const data = await response.json();
      console.log("[useLiveRooms] Got rooms:", data.rooms?.length || 0);

      type RawRoom = Omit<LiveRoom, "title" | "thumbnailUrl"> & {
        metadata?: string | null;
      };

      const parsedRooms = ((data.rooms || []) as RawRoom[]).map(
        (room: RawRoom) => {
          const meta = parseRoomMetadata(room.metadata ?? null);
          const thumbnailUrl = meta?.thumbnailPath
            ? new URL(meta.thumbnailPath, apiUrl).href
            : null;

          return {
            name: room.name,
            numParticipants: room.numParticipants,
            createdAt: room.createdAt,
            metadata: room.metadata ?? null,
            title: meta?.title ?? null,
            thumbnailUrl,
          } satisfies LiveRoom;
        },
      );

      setRooms(parsedRooms);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Expected when component unmounts or request times out
        return;
      }
      console.error("[useLiveRooms] Error fetching rooms:", err);
      setRooms([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    fetchRooms();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms, enabled]);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchRooms,
    hasLiveRooms: rooms.length > 0,
  };
}
