import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Room, RoomEvent, Track, RemoteTrack } from "livekit-client";
import { Feather } from "@expo/vector-icons";

import { getApiUrl } from "@/lib/query-client";

interface LivePreviewProps {
  roomName: string;
  style?: object;
}

export function LivePreview({ roomName, style }: LivePreviewProps) {
  const [hasVideo, setHasVideo] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setIsConnecting(false);
      return;
    }

    let mounted = true;

    const connectToRoom = async () => {
      try {
        const apiUrl = getApiUrl().replace(/\/$/, "");
        const response = await fetch(`${apiUrl}/api/streaming/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName,
            participantName: `preview-${Date.now()}`,
            isHost: false,
          }),
        });

        if (!response.ok || !mounted) return;

        const { token, wsUrl } = await response.json();

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video && videoRef.current && mounted) {
            track.attach(videoRef.current);
            setHasVideo(true);
          }
        });

        await room.connect(wsUrl, token);
        if (mounted) setIsConnecting(false);
      } catch (err) {
        console.error("[LivePreview] Error:", err);
        if (mounted) setIsConnecting(false);
      }
    };

    connectToRoom();

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomName]);

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.placeholder, style]}>
        <Feather name="video" size={32} color="rgba(255,255,255,0.4)" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {isConnecting ? (
        <View style={styles.placeholder}>
          <Feather name="loader" size={24} color="rgba(255,255,255,0.4)" />
        </View>
      ) : hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 16,
          }}
        />
      ) : (
        <View style={styles.placeholder}>
          <Feather name="video" size={32} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
