import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Platform, useWindowDimensions } from "react-native";
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
  const audioElementsRef = useRef<HTMLMediaElement[]>([]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= 768 && windowWidth > windowHeight;

  const portraitStage = useMemo(() => {
    const targetAspect = 9 / 16;
    const viewportW = windowWidth;
    const viewportH = windowHeight;

    if (!isDesktopWeb) {
      return { width: "100%", height: "100%" } as const;
    }

    const viewportAspect = viewportW / viewportH;
    if (viewportAspect > targetAspect) {
      // Wide viewport (desktop): constrain by height
      return {
        width: viewportH * targetAspect,
        height: viewportH,
      } as const;
    }

    // Narrow viewport: constrain by width
    return {
      width: viewportW,
      height: viewportW / targetAspect,
    } as const;
  }, [isDesktopWeb, windowHeight, windowWidth]);

  // Handle native video + audio track subscription
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
          if (pub.track && pub.track.kind === Track.Kind.Audio) {
            console.log(
              "[LiveKitVideo] Native: Found audio track (auto-played)",
            );
          }
        });
      });
    };

    findAndSetVideoTrack();

    const handleTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        console.log("[LiveKitVideo] Native: Video track subscribed");
        setVideoTrack(track as RemoteVideoTrack);
      }
      if (track.kind === Track.Kind.Audio) {
        console.log(
          "[LiveKitVideo] Native: Audio track subscribed (auto-played)",
        );
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

    const requestHighQuality = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub: any) => {
          if (pub?.kind !== Track.Kind.Video) return;
          if (typeof pub.setVideoQuality === "function") {
            pub.setVideoQuality(VideoQuality.HIGH);
          }
        });
      });
    };

    const attachTrack = (track: RemoteTrack) => {
      console.log("[LiveKitVideo] Attempting to attach track:", track.kind);
      if (track.kind === Track.Kind.Video && videoRef.current) {
        console.log("[LiveKitVideo] Attaching video track to element");
        track.attach(videoRef.current);
        requestHighQuality();
      }
      if (track.kind === Track.Kind.Audio) {
        console.log("[LiveKitVideo] Attaching audio track");
        const audioEl = track.attach();
        audioEl.volume = 1.0;
        audioElementsRef.current.push(audioEl);
      }
    };

    const detachTrack = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
      }
      if (track.kind === Track.Kind.Audio) {
        const detached = track.detach();
        detached.forEach((el) => {
          const idx = audioElementsRef.current.indexOf(el);
          if (idx >= 0) audioElementsRef.current.splice(idx, 1);
        });
      }
    };

    // Attach existing tracks (both video and audio)
    requestHighQuality();
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
        if (pub.track) {
          attachTrack(pub.track as RemoteTrack);
        }
      });
    });

    // Some browsers/joins start in a lower layer; retry briefly to lock in HIGH.
    const retryInterval = setInterval(requestHighQuality, 750);
    const retryTimeout = setTimeout(() => clearInterval(retryInterval), 6000);

    // Listen for new tracks
    const handleTrackSubscribed = (track: RemoteTrack) => {
      console.log("[LiveKitVideo] Track subscribed:", track.kind);
      attachTrack(track);
      requestHighQuality();
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      console.log("[LiveKitVideo] Track unsubscribed:", track.kind);
      detachTrack(track);
    };

    // Also listen for participant connected
    const handleParticipantConnected = () => {
      console.log(
        "[LiveKitVideo] Participant connected, re-checking tracks...",
      );
      requestHighQuality();
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track) {
            attachTrack(pub.track as RemoteTrack);
          }
        });
      });
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      clearInterval(retryInterval);
      clearTimeout(retryTimeout);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      // Clean up audio elements
      audioElementsRef.current.forEach((el) => {
        el.pause();
        el.srcObject = null;
      });
      audioElementsRef.current = [];
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
        <div
          style={{
            width: portraitStage.width,
            height: portraitStage.height,
            backgroundColor: "#000",
            overflow: "hidden",
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
                objectFit: isDesktopWeb ? "contain" : "cover",
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
                willChange: "transform",
              } as React.CSSProperties
            }
          />
        </div>
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
