import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import type { CameraType } from "expo-camera";
import { RoomEvent, Track, LocalVideoTrack } from "livekit-client";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInRight,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductSelectionSheet } from "@/components/ProductSelectionSheet";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { productsService } from "@/services/products";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { useStreaming } from "@/hooks/useStreaming";
import { useLiveChat } from "@/hooks/useLiveChat";
import { showsService } from "@/services/shows";
import { streamingService } from "@/services/streaming";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BroadcasterRoute = RouteProp<RootStackParamList, "Broadcaster">;

let VideoView: React.ComponentType<any> | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const liveKitNative = require("@livekit/react-native");
    VideoView = liveKitNative.VideoView;
  } catch (e) {
    console.warn("[BroadcasterScreen] Failed to import VideoView:", e);
  }
}

export default function BroadcasterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BroadcasterRoute>();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const requestedOnceRef = useRef(false);
  const requestedMicOnceRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [hostName, setHostName] = useState<string>("Host");
  const [localVideoTrack, setLocalVideoTrack] =
    useState<LocalVideoTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webPreviewStreamRef = useRef<any>(null);
  const [webPreviewActive, setWebPreviewActive] = useState(false);

  const draftId = route.params?.draftId;
  const [showTitle, setShowTitle] = useState<string>("");
  const [thumbnailDataUri, setThumbnailDataUri] = useState<string>("");

  // Generate unique room name for this broadcast session
  const roomNameRef = useRef(
    `jatango-live-${draftId || "draft"}-${Date.now()}`,
  );

  // Fetch host's actual name from profile
  useEffect(() => {
    const fetchHostName = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        if (data?.name) {
          setHostName(data.name);
        }
      } catch (error) {
        console.error("Error fetching host profile:", error);
      }
    };
    fetchHostName();
  }, [user]);

  // Real LiveKit streaming hook
  const streaming = useStreaming({
    roomName: roomNameRef.current,
    participantName: hostName,
    isHost: true,
  });

  // Real-time chat via LiveKit data messages
  const liveChat = useLiveChat({
    room: streaming.room,
    participantName: hostName,
  });

  const isLive = streaming.isConnected;
  const viewerCount = streaming.viewerCount;

  const chatListRef = useRef<FlatList>(null);
  const carouselProductsRef = useRef<Product[]>([]);
  const showCarouselRef = useRef(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [carouselProducts, setCarouselProducts] = useState<Product[]>([]);
  const [showCarousel, setShowCarousel] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [userProducts, setUserProducts] = useState<Product[]>([]);

  // Attach local video track when streaming starts
  useEffect(() => {
    if (!streaming.room) {
      setLocalVideoTrack(null);
      return;
    }

    const updateLocalTrack = () => {
      const videoTrackPub =
        streaming.room?.localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
      setLocalVideoTrack((videoTrackPub?.track as LocalVideoTrack) ?? null);
    };

    updateLocalTrack();

    const handleLocalTrackPublished = () => updateLocalTrack();
    const handleLocalTrackUnpublished = () => setLocalVideoTrack(null);

    streaming.room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    streaming.room.on(
      RoomEvent.LocalTrackUnpublished,
      handleLocalTrackUnpublished,
    );

    const pollInterval = setInterval(updateLocalTrack, 500);
    const pollTimeout = setTimeout(() => clearInterval(pollInterval), 5000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(pollTimeout);
      streaming.room?.off(
        RoomEvent.LocalTrackPublished,
        handleLocalTrackPublished,
      );
      streaming.room?.off(
        RoomEvent.LocalTrackUnpublished,
        handleLocalTrackUnpublished,
      );
    };
  }, [streaming.room]);

  // Attach video track to HTML video element (web only)
  useEffect(() => {
    if (Platform.OS !== "web" || !localVideoTrack || !videoRef.current) return;

    if (webPreviewStreamRef.current && videoRef.current.srcObject) {
      try {
        const tracks = webPreviewStreamRef.current.getTracks?.() ?? [];
        tracks.forEach((t: any) => t.stop?.());
      } catch {
        // ignore
      }
      webPreviewStreamRef.current = null;
      videoRef.current.srcObject = null;
      setWebPreviewActive(false);
    }

    localVideoTrack.attach(videoRef.current);
    return () => {
      localVideoTrack.detach();
    };
  }, [localVideoTrack]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (cameraError) return;
    if (isLive) return;
    if (!videoRef.current) return;

    const videoEl = videoRef.current;

    let isMounted = true;

    const startPreview = async () => {
      try {
        const facingMode = facing === "front" ? "user" : "environment";
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        webPreviewStreamRef.current = stream;
        videoEl.srcObject = stream;
        setWebPreviewActive(true);
      } catch (err) {
        console.error("[BroadcasterScreen] Web preview error:", err);
        setWebPreviewActive(false);
        setCameraError(
          err instanceof Error ? err.message : "Failed to start camera preview",
        );
      }
    };

    startPreview();

    return () => {
      isMounted = false;
      if (webPreviewStreamRef.current) {
        try {
          const tracks = webPreviewStreamRef.current.getTracks?.() ?? [];
          tracks.forEach((t: any) => t.stop?.());
        } catch {
          // ignore
        }
        webPreviewStreamRef.current = null;
      }
      if (videoEl.srcObject) videoEl.srcObject = null;
      setWebPreviewActive(false);
    };
  }, [cameraError, facing, isLive]);

  useEffect(() => {
    (async () => {
      if (!draftId) {
        Alert.alert(
          "Show setup required",
          "Create a show with a title and thumbnail before going live.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
        return;
      }

      const draft = await showsService.getDraft(draftId);
      if (!draft) {
        Alert.alert("Show not found", "That show draft no longer exists.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setShowTitle(draft.title);
      setThumbnailDataUri(draft.thumbnailDataUri);
    })();
  }, [draftId, navigation]);

  const isCarouselVisible =
    isLive && showCarousel && carouselProducts.length > 0;
  const addProductsBottom = insets.bottom + (isCarouselVisible ? 240 : 120);

  useEffect(() => {
    if (!permission) return;
    if (permission.granted) return;
    if (requestedOnceRef.current) return;
    if (!permission.canAskAgain) return;

    requestedOnceRef.current = true;
    requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!micPermission) return;
    if (micPermission.granted) return;
    if (requestedMicOnceRef.current) return;
    if (!micPermission.canAskAgain) return;

    requestedMicOnceRef.current = true;
    requestMicPermission();
  }, [micPermission, requestMicPermission]);

  // Load user's products
  useEffect(() => {
    (async () => {
      const products = await productsService.listProducts();
      setUserProducts(products);
    })();
  }, []);

  const broadcastCarouselUpdate = useCallback(
    async (params?: { products?: Product[]; visible?: boolean }) => {
      if (!streaming.room) return;

      const products = params?.products ?? carouselProductsRef.current;
      const visible = params?.visible ?? showCarouselRef.current;

      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "carousel_update",
          // Keep payload small/reliable across clients. Viewers fetch full product by id when opening.
          products: products.map((p: Product) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            sellerId: p.sellerId,
            sellerName: p.sellerName,
            sellerAvatar: p.sellerAvatar,
          })),
          visible,
        }),
      );

      console.log(
        "[BroadcasterScreen] Broadcasting carousel_update:",
        products.length,
        "visible:",
        visible,
      );

      await streaming.room.localParticipant.publishData(data, {
        reliable: true,
      });
    },
    [streaming.room],
  );

  // Respond to viewer state requests. This is the most reliable way to support late joiners.
  useEffect(() => {
    if (!streaming.room) return;

    const handleDataReceived = async (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        const data = JSON.parse(message) as { type?: unknown };

        if (data.type === "carousel_request") {
          console.log("[BroadcasterScreen] Received carousel_request");
          if (carouselProductsRef.current.length === 0) return;
          await broadcastCarouselUpdate();
        }
      } catch {
        // ignore
      }
    };

    streaming.room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      streaming.room?.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [streaming.room, broadcastCarouselUpdate]);

  // Keep refs in sync for the late-joiner re-broadcast
  useEffect(() => {
    carouselProductsRef.current = carouselProducts;
  }, [carouselProducts]);
  useEffect(() => {
    showCarouselRef.current = showCarousel;
  }, [showCarousel]);

  // Re-broadcast carousel state when a new viewer joins (late joiners)
  useEffect(() => {
    if (!streaming.room) return;

    const handleParticipantConnected = async () => {
      const products = carouselProductsRef.current;
      if (products.length === 0) return;
      await broadcastCarouselUpdate();
    };

    streaming.room.on(
      RoomEvent.ParticipantConnected,
      handleParticipantConnected,
    );
    return () => {
      streaming.room?.off(
        RoomEvent.ParticipantConnected,
        handleParticipantConnected,
      );
    };
  }, [streaming.room, broadcastCarouselUpdate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndStreamPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowEndConfirm(true);
  };

  const confirmEndStream = async () => {
    setShowEndConfirm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Use endStream to properly disconnect AND delete the room from LiveKit
    await streaming.endStream();
    // Mark show as ended so it moves to Past Shows
    if (draftId) {
      await showsService.updateStatus(draftId, "ended");
      // Navigate to show summary so host sees sales recap
      navigation.replace("ShowSummary", { showId: draftId });
    } else {
      navigation.goBack();
    }
  };

  const cancelEndStream = () => {
    setShowEndConfirm(false);
  };

  const handleGoLive = async () => {
    if (isGoingLive || isLive) return;

    if (!draftId || !showTitle.trim() || !thumbnailDataUri) {
      Alert.alert(
        "Missing show info",
        "Please set a show title and thumbnail before going live.",
      );
      return;
    }

    setIsGoingLive(true);
    try {
      // thumbnailDataUri is already a Supabase URL from ShowSetupScreen
      // No need to re-upload, just use it directly
      const thumbnailPath = thumbnailDataUri;

      await streaming.connect();

      await streamingService.updateRoomMetadata({
        roomName: roomNameRef.current,
        title: showTitle.trim(),
        thumbnailPath,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to go live";
      Alert.alert("Stream Error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGoingLive(false);
    }
  };

  const handleSelectFacing = (next: CameraType) => {
    setFacing(next);
    setCameraError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleCamera = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    setCameraError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await streaming.setMicrophoneEnabled(!newMuted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleConfirmProducts = async () => {
    const products = userProducts.filter((p: Product) =>
      selectedProductIds.includes(p.id),
    );
    setCarouselProducts(products);
    setShowProductSheet(false);
    setShowCarousel(true);

    await broadcastCarouselUpdate({ products, visible: true });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleProductPress = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  if (Platform.OS !== "web") {
    if (!permission || !micPermission) {
      return <View style={styles.container} />;
    }

    if (!permission.granted || !micPermission.granted) {
      return (
        <View style={[styles.container, styles.permissionContainer]}>
          <Feather name="video-off" size={64} color={theme.textSecondary} />
          <ThemedText style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText style={styles.permissionText}>
            We need camera and microphone access to start your live stream
          </ThemedText>
          {!permission.granted ? (
            <Button onPress={requestPermission} style={styles.permissionButton}>
              Enable Camera
            </Button>
          ) : null}
          {!micPermission.granted ? (
            <Button
              onPress={requestMicPermission}
              style={styles.permissionButton}
            >
              Enable Microphone
            </Button>
          ) : null}
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      {cameraError ? (
        <View style={[styles.webPlaceholder, { backgroundColor: "#000" }]}>
          <Feather name="video-off" size={64} color={theme.textSecondary} />
          <ThemedText style={styles.webText}>
            {cameraError}
            {Platform.OS === "web"
              ? "\n\nOn web, camera access usually requires HTTPS or http://localhost."
              : ""}
          </ThemedText>
        </View>
      ) : Platform.OS === "web" ? (
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
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facing === "front" ? "scaleX(-1)" : "none",
            }}
          />
          {!localVideoTrack && !webPreviewActive ? (
            <View style={styles.webPlaceholder}>
              <Feather name="video" size={64} color={theme.textSecondary} />
              <ThemedText style={styles.webText}>
                {isLive ? "Starting camera..." : "Starting preview..."}
              </ThemedText>
            </View>
          ) : null}
        </div>
      ) : (
        <View style={[styles.camera, { backgroundColor: "#000" }]}>
          {isLive && localVideoTrack && VideoView ? (
            <View style={styles.nativeVideoContainer}>
              <VideoView
                videoTrack={localVideoTrack}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
              />
            </View>
          ) : !isLive ? (
            <CameraView style={StyleSheet.absoluteFill} facing={facing} />
          ) : (
            <View style={styles.webPlaceholder}>
              <Feather name="video" size={64} color={theme.textSecondary} />
              <ThemedText style={styles.webText}>
                {isLive ? "Starting camera..." : "Starting preview..."}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <View style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={handleEndStreamPress} style={styles.endButton}>
            <Feather name="x" size={20} color={theme.buttonText} />
            {isLive ? (
              <ThemedText style={styles.endText}>End</ThemedText>
            ) : null}
          </Pressable>

          {isLive ? (
            <Animated.View entering={FadeIn} style={styles.liveInfo}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveText}>LIVE</ThemedText>
              </View>
              <View style={styles.viewerBadge}>
                <Feather name="eye" size={12} color={theme.buttonText} />
                <ThemedText style={styles.viewerText}>
                  {viewerCount.toLocaleString()}
                </ThemedText>
              </View>
            </Animated.View>
          ) : null}

          <View style={styles.timerContainer}>
            <ThemedText style={styles.timer}>
              {formatTime(elapsedTime)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.sideControls}>
          {!isLive ? (
            <Pressable style={styles.controlButton} onPress={toggleCamera}>
              <Feather name="refresh-cw" size={22} color={theme.buttonText} />
            </Pressable>
          ) : null}
          <Pressable style={styles.controlButton} onPress={toggleMute}>
            <Feather
              name={isMuted ? "mic-off" : "mic"}
              size={22}
              color={isMuted ? theme.primary : theme.buttonText}
            />
          </Pressable>
          <Pressable
            style={styles.controlButton}
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          >
            <Feather name="sun" size={22} color={theme.buttonText} />
          </Pressable>
        </View>

        {isLive ? (
          <>
            {/* Live Chat Display */}
            <View
              style={[
                styles.chatSection,
                { bottom: isCarouselVisible ? 290 : 80 },
              ]}
            >
              <FlatList
                ref={chatListRef}
                data={liveChat.messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Animated.View
                    entering={FadeInRight.springify()}
                    style={styles.chatMessage}
                  >
                    <ThemedText style={styles.chatUserName}>
                      {item.senderName}
                    </ThemedText>
                    <ThemedText style={styles.chatText}>
                      {item.message}
                    </ThemedText>
                  </Animated.View>
                )}
                style={styles.chatList}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  chatListRef.current?.scrollToEnd({ animated: true })
                }
              />
            </View>
            <Pressable
              style={[styles.addProductFab, { bottom: addProductsBottom }]}
              onPress={() => setShowProductSheet(true)}
            >
              <Feather name="plus" size={22} color={theme.buttonText} />
            </Pressable>
          </>
        ) : null}

        <View
          style={[
            styles.bottomSection,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
        >
          {!isLive ? (
            <Animated.View
              entering={FadeInUp.delay(200)}
              style={styles.preLiveControls}
            >
              {Platform.OS !== "web" ? (
                <View style={styles.cameraPicker}>
                  <Pressable
                    style={[
                      styles.cameraOption,
                      facing === "back" ? styles.cameraOptionActive : null,
                    ]}
                    onPress={() => handleSelectFacing("back")}
                  >
                    <ThemedText
                      style={[
                        styles.cameraOptionText,
                        facing === "back"
                          ? styles.cameraOptionTextActive
                          : null,
                      ]}
                    >
                      Rear
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.cameraOption,
                      facing === "front" ? styles.cameraOptionActive : null,
                    ]}
                    onPress={() => handleSelectFacing("front")}
                  >
                    <ThemedText
                      style={[
                        styles.cameraOptionText,
                        facing === "front"
                          ? styles.cameraOptionTextActive
                          : null,
                      ]}
                    >
                      Front
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}

              <Pressable style={styles.goLiveButton} onPress={handleGoLive}>
                <ThemedText style={styles.goLiveText}>GO LIVE</ThemedText>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>

        {isLive ? (
          <ProductCarousel
            products={carouselProducts}
            onProductPress={handleProductPress}
            visible={showCarousel && carouselProducts.length > 0}
            showBuyButton={false}
          />
        ) : null}
      </View>

      <ProductSelectionSheet
        visible={showProductSheet}
        products={userProducts}
        selectedIds={selectedProductIds}
        onToggleProduct={handleToggleProduct}
        onClose={() => setShowProductSheet(false)}
        onConfirm={handleConfirmProducts}
      />

      <ConfirmDialog
        visible={showEndConfirm}
        title="End Show?"
        message="Are you sure you want to end this live show? This action cannot be undone."
        confirmText="End Show"
        cancelText="Keep Streaming"
        confirmColor="#ef4444"
        onConfirm={confirmEndStream}
        onCancel={cancelEndStream}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  cancelButton: {
    padding: Spacing.md,
  },
  cancelText: {
    fontSize: 14,
  },
  webPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  webText: {
    fontSize: 14,
    marginTop: Spacing.lg,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  nativeVideoContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  nativeVideoPlaceholder: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  endText: {
    fontSize: 13,
    fontWeight: "600",
  },
  liveInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  viewerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timerContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  timer: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  sideControls: {
    position: "absolute",
    right: Spacing.lg,
    top: "40%",
    gap: Spacing.md,
  },
  addProductFab: {
    position: "absolute",
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    ...Shadows.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  preLiveControls: {
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Platform.OS === "web" ? Spacing.xl : Spacing["3xl"],
  },
  cameraPicker: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: BorderRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    ...Shadows.md,
  },
  cameraOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  cameraOptionActive: {},
  cameraOptionText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cameraOptionTextActive: {},
  addProductSection: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    marginBottom: 120,
  },
  addProductButton: {
    width: "100%",
  },
  addProductContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  addIcon: {
    marginRight: Spacing.sm,
  },
  addProductText: {
    fontSize: 16,
    fontWeight: "600",
  },
  goLiveButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "web" ? Spacing.xl : Spacing["3xl"],
    ...Shadows.lg,
  },
  goLiveText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  chatSection: {
    position: "absolute",
    left: 0,
    right: 70,
    maxHeight: 120,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  chatMessage: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  chatUserName: {
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  chatText: {
    fontSize: 13,
    flexShrink: 1,
    lineHeight: 18,
  },
});
