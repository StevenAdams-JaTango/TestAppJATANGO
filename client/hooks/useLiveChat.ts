import { useState, useCallback, useEffect, useRef } from "react";
import { Room, RoomEvent } from "livekit-client";

export interface ChatMessage {
  id: string;
  senderName: string;
  senderId: string;
  message: string;
  timestamp: number;
}

interface ChatPayload {
  type: "chat";
  id: string;
  senderName: string;
  senderId: string;
  message: string;
  timestamp: number;
}

export interface UseLiveChatOptions {
  room: Room | null;
  participantName: string;
}

export interface UseLiveChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

export function useLiveChat(options: UseLiveChatOptions): UseLiveChatReturn {
  const { room, participantName } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const participantIdRef = useRef(`${participantName}-${Date.now()}`);

  // Handle incoming data messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant: { identity?: string } | undefined,
    ) => {
      try {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(payload);
        const data = JSON.parse(jsonStr) as ChatPayload;

        if (data.type === "chat") {
          const newMessage: ChatMessage = {
            id: data.id,
            senderName: data.senderName,
            senderId: data.senderId,
            message: data.message,
            timestamp: data.timestamp,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      } catch (err) {
        console.error("[useLiveChat] Failed to parse data message:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!room || !text.trim()) return;

      const chatPayload: ChatPayload = {
        type: "chat",
        id: `${participantIdRef.current}-${Date.now()}`,
        senderName: participantName,
        senderId: participantIdRef.current,
        message: text.trim(),
        timestamp: Date.now(),
      };

      // Add to local messages immediately
      const localMessage: ChatMessage = {
        id: chatPayload.id,
        senderName: chatPayload.senderName,
        senderId: chatPayload.senderId,
        message: chatPayload.message,
        timestamp: chatPayload.timestamp,
      };
      setMessages((prev) => [...prev, localMessage]);

      // Send to all participants
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(chatPayload));

      room.localParticipant
        .publishData(data, { reliable: true })
        .catch((err) => {
          console.error("[useLiveChat] Failed to send message:", err);
        });
    },
    [room, participantName],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
  };
}
