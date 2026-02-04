import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteVideoTrack,
  VideoQuality,
} from "livekit-client";

// Conditionally import native VideoView
let VideoView: React.ComponentType<any> | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const liveKitNative = require("@livekit/react-native");
    VideoView = liveKitNative.VideoView;
  } catch (e) {
    console.warn("[LiveKitVideo] Failed to import native VideoView:", e);
  }
}

interface LiveKitVideoProps {
  room: Room | null;
  style?: object;
}

export function LiveKitVideo({ room, style }: LiveKitVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoTrack, setVideoTrack] = useState<RemoteVideoTrack | null>(null);

  // Handle native video track subscription
  useEffect(() => {
    if (Platform.OS === "web" || !room) return;

    console.log("[LiveKitVideo] Native: Room connected, checking participants");

    const findAndSetVideoTrack = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Video) {
            console.log("[LiveKitVideo] Native: Found video track");
            setVideoTrack(pub.track as RemoteVideoTrack);
          }
        });
      });
    };

    findAndSetVideoTrack();

    const handleTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        console.log("[LiveKitVideo] Native: Track subscribed");
        setVideoTrack(track as RemoteVideoTrack);
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        setVideoTrack(null);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, findAndSetVideoTrack);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, findAndSetVideoTrack);
    };
  }, [room]);

  // Handle web video track attachment
  useEffect(() => {
    if (Platform.OS !== "web" || !room) return;

    console.log("[LiveKitVideo] Room connected, checking for participants...");
    console.log(
      "[LiveKitVideo] Remote participants:",
      room.remoteParticipants.size,
    );

    const attachVideo = (track: RemoteTrack) => {
      console.log("[LiveKitVideo] Attempting to attach track:", track.kind);
      if (track.kind === Track.Kind.Video && videoRef.current) {
        console.log("[LiveKitVideo] Attaching video track to element");
        track.attach(videoRef.current);
        // Request highest quality layer immediately via track publication
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.track === track && pub.videoTrack) {
              pub.setVideoQuality(VideoQuality.HIGH);
            }
          });
        });
      }
    };

    const detachVideo = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
      }
    };

    // Attach existing tracks
    room.remoteParticipants.forEach((participant) => {
      console.log("[LiveKitVideo] Participant:", participant.identity);
      console.log(
        "[LiveKitVideo] Track publications:",
        participant.trackPublications.size,
      );
      participant.trackPublications.forEach((pub) => {
        console.log(
          "[LiveKitVideo] Publication:",
          pub.kind,
          "subscribed:",
          pub.isSubscribed,
        );
        if (pub.track && pub.track.kind === Track.Kind.Video) {
          attachVideo(pub.track as RemoteTrack);
        }
      });
    });

    // Listen for new tracks
    const handleTrackSubscribed = (track: RemoteTrack) => {
      console.log("[LiveKitVideo] Track subscribed:", track.kind);
      attachVideo(track);
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      console.log("[LiveKitVideo] Track unsubscribed:", track.kind);
      detachVideo(track);
    };

    // Also listen for participant connected
    const handleParticipantConnected = () => {
      console.log(
        "[LiveKitVideo] Participant connected, re-checking tracks...",
      );
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Video) {
            attachVideo(pub.track as RemoteTrack);
          }
        });
      });
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room]);

  // Native: render using LiveKit's VideoView
  if (Platform.OS !== "web") {
    if (!VideoView) {
      return (
        <View style={[styles.container, styles.centered, style]}>
          <View style={styles.errorContainer}>
            <View style={styles.errorText}>
              {/* VideoView not available */}
            </View>
          </View>
        </View>
      );
    }

    if (!videoTrack) {
      return (
        <View style={[styles.container, styles.centered, style]}>
          <View style={styles.loadingContainer}>{/* Loading video... */}</View>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <VideoView
          videoTrack={videoTrack}
          style={styles.nativeVideo}
          objectFit="cover"
        />
      </View>
    );
  }

  // Web-only: render actual video element
  return (
    <View style={[styles.container, style]}>
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          style={
            {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              imageRendering: "crisp-edges",
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
              willChange: "transform",
              filter: "contrast(1.05) saturate(1.1)",
            } as React.CSSProperties
          }
        />
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    padding: 20,
  },
  errorText: {},
  loadingContainer: {
    padding: 20,
  },
  nativeVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
