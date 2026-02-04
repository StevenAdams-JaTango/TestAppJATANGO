import { useState, useCallback, useEffect } from "react";
import { Room, ConnectionState, RoomEvent } from "livekit-client";
import { streamingService, StreamConfig } from "@/services/streaming";

export interface UseStreamingOptions {
  roomName: string;
  participantName: string;
  isHost: boolean;
  autoConnect?: boolean;
}

export interface UseStreamingReturn {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  error: string | null;
  viewerCount: number;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  endStream: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  switchCamera: () => Promise<void>;
}

export function useStreaming(options: UseStreamingOptions): UseStreamingReturn {
  const { roomName, participantName, isHost, autoConnect = false } = options;

  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  const connect = useCallback(async () => {
    console.log("[useStreaming] connect() called, isConnecting:", isConnecting);
    if (isConnecting || streamingService.isConnected()) {
      console.log("[useStreaming] Already connecting or connected, skipping");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const config: StreamConfig = {
        roomName,
        participantName,
        isHost,
      };

      console.log("[useStreaming] Getting token...");
      const { token, wsUrl } = await streamingService.getToken(config);

      console.log("[useStreaming] Connecting to room...");
      const connectedRoom = await streamingService.connect(token, wsUrl);

      console.log("[useStreaming] Connected! Setting room state...");
      setRoom(connectedRoom);
      setConnectionState(ConnectionState.Connected);

      if (isHost) {
        console.log("[useStreaming] Publishing tracks...");
        await streamingService.publishTracks(true, true);
        console.log("[useStreaming] Tracks published!");
      }

      connectedRoom.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount(connectedRoom.remoteParticipants.size);
      });

      connectedRoom.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(connectedRoom.remoteParticipants.size);
      });

      connectedRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[useStreaming] Connection state changed:", state);
        setConnectionState(state);
      });

      setViewerCount(connectedRoom.remoteParticipants.size);
      console.log("[useStreaming] Go live complete!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to stream";
      setError(message);
      console.error("[useStreaming] Connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [roomName, participantName, isHost, isConnecting]);

  const disconnect = useCallback(async () => {
    await streamingService.disconnect();
    setRoom(null);
    setConnectionState(ConnectionState.Disconnected);
    setViewerCount(0);
  }, []);

  // End stream completely - disconnect and delete room from server
  const endStream = useCallback(async () => {
    console.log("[useStreaming] Ending stream for room:", roomName);
    await streamingService.disconnect();
    await streamingService.endRoom(roomName);
    setRoom(null);
    setConnectionState(ConnectionState.Disconnected);
    setViewerCount(0);
  }, [roomName]);

  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    await streamingService.setMicrophoneEnabled(enabled);
  }, []);

  const setCameraEnabled = useCallback(async (enabled: boolean) => {
    await streamingService.setCameraEnabled(enabled);
  }, []);

  const switchCamera = useCallback(async () => {
    await streamingService.switchCamera();
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  return {
    room,
    isConnected: connectionState === ConnectionState.Connected,
    isConnecting,
    connectionState,
    error,
    viewerCount,
    connect,
    disconnect,
    endStream,
    setMicrophoneEnabled,
    setCameraEnabled,
    switchCamera,
  };
}
