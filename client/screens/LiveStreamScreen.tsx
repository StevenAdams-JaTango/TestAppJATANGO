import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { RoomEvent, DataPacket_Kind } from "livekit-client";

import { ThemedText } from "@/components/ThemedText";
import { LiveBadge } from "@/components/LiveBadge";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { CartBottomSheet } from "@/components/CartBottomSheet";
import { CheckoutBottomSheet } from "@/components/CheckoutBottomSheet";
import { LiveKitVideo } from "@/components/LiveKitVideo";
import { BorderRadius, Spacing } from "@/constants/theme";
import { mockLiveStreams } from "@/data/mockData";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { useStreaming } from "@/hooks/useStreaming";
import { useLiveChat, ChatMessage } from "@/hooks/useLiveChat";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import { productsService } from "@/services/products";

// Generate a random guest name for chat (fallback)
const generateGuestName = () => {
  const adjectives = ["Happy", "Swift", "Bright", "Cool", "Lucky"];
  const nouns = ["Panda", "Tiger", "Eagle", "Fox", "Bear"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, "LiveStream">;

export default function LiveStreamScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { streamId, showId: routeShowId } = route.params;
  const { user } = useAuth();

  // Check if this is a real LiveKit room (starts with "jatango-live-")
  const isRealRoom = streamId.startsWith("jatango-live-");

  // Extract show ID: prefer explicit param, fallback to parsing room name
  // Room name format: jatango-live-{showId}-{timestamp}
  const showId =
    routeShowId ||
    (() => {
      const match = streamId.match(/^jatango-live-(.+)-\d+$/);
      return match?.[1] || undefined;
    })();
  const [userName, setUserName] = useState<string>(generateGuestName());
  // const isWeb = Platform.OS === "web"; // No longer needed - dev build supports mobile

  // Fetch user's actual name from profile
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        if (data?.name) {
          setUserName(data.name);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    fetchUserName();
  }, [user]);

  // Connect to real LiveKit room as viewer (works on web and dev builds)
  const streaming = useStreaming({
    roomName: streamId,
    participantName: userName,
    isHost: false,
    autoConnect: isRealRoom, // Auto-connect on all platforms with dev build
  });

  // Real-time chat via LiveKit data messages
  const liveChat = useLiveChat({
    room: streaming.room,
    participantName: userName,
  });

  // With dev build, mobile is now supported
  const mobileUnsupported = false;

  const stream =
    mockLiveStreams.find((s) => s.id === streamId) || mockLiveStreams[0];
  const [carouselProducts, setCarouselProducts] = useState<Product[]>([]);
  const [showCarousel, setShowCarousel] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [viewerCount, setViewerCount] = useState(
    isRealRoom ? streaming.viewerCount : stream.viewerCount,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [checkoutSellerId, setCheckoutSellerId] = useState<string | null>(null);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState(false);
  const { totalItems } = useCart();
  const chatListRef = useRef<FlatList>(null);
  const chatInputRef = useRef<TextInput>(null);

  const isHostViewer =
    !!user?.id && carouselProducts.some((p) => p.sellerId === user.id);

  // Listen for carousel updates from broadcaster
  useEffect(() => {
    if (!streaming.room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: any,
      kind?: DataPacket_Kind,
    ) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      try {
        const data = JSON.parse(message);
        if (data.type === "carousel_update") {
          console.log(
            "[LiveStreamScreen] Received carousel_update:",
            (data.products || []).length,
            "visible:",
            data.visible,
          );
          setCarouselProducts(data.products || []);
          setShowCarousel(data.visible);
        }
      } catch (error) {
        console.error("Failed to parse data message:", error);
      }
    };

    streaming.room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      streaming.room?.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [streaming.room]);

  // Late-joiner handshake: ask the host for the latest carousel state after connecting.
  // Retry a few times with increasing delays to handle the race where the host's
  // DataReceived listener isn't registered yet when the viewer first connects.
  const carouselReceivedRef = useRef(false);
  useEffect(() => {
    carouselReceivedRef.current = carouselProducts.length > 0;
  }, [carouselProducts]);

  useEffect(() => {
    if (!streaming.room) return;
    if (!streaming.isConnected) return;

    let cancelled = false;
    const delays = [500, 1500, 3000, 5000, 8000]; // ms

    const sendRequest = () => {
      if (cancelled || carouselReceivedRef.current) return;
      console.log("[LiveStreamScreen] Sending carousel_request");
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "carousel_request" }));
      streaming.room?.localParticipant
        .publishData(data, { reliable: true })
        .catch((err) =>
          console.error("Failed to request carousel state:", err),
        );
    };

    // Send immediately + schedule retries
    sendRequest();
    const timers = delays.map((ms) =>
      setTimeout(() => {
        if (!carouselReceivedRef.current) sendRequest();
      }, ms),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [streaming.room, streaming.isConnected]);

  // Update viewer count from real stream
  useEffect(() => {
    if (isRealRoom) {
      setViewerCount(streaming.viewerCount + 1); // +1 for self
    }
  }, [isRealRoom, streaming.viewerCount]);

  // Only simulate viewer count changes for mock streams
  useEffect(() => {
    if (isRealRoom) return;
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 10) - 4);
    }, 3000);
    return () => clearInterval(interval);
  }, [isRealRoom]);

  // Show carousel whenever products are received
  useEffect(() => {
    if (carouselProducts.length > 0) {
      setShowCarousel(true);
    }
  }, [carouselProducts]);

  const handleBack = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRealRoom) {
      await streaming.disconnect();
    }
    navigation.goBack();
  };

  const handleProductPress = async (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Viewers receive minimal product cards from the host; fetch full product for variants
    const fullProduct = await productsService.getProduct(product.id);
    setSelectedProduct(fullProduct || product);
    setShowProductSheet(true);
  };

  const handleCloseProductSheet = () => {
    setShowProductSheet(false);
    setSelectedProduct(null);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    liveChat.sendMessage(newMessage.trim());
    setNewMessage("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Keep focus on input so user can type multiple messages
    setTimeout(() => chatInputRef.current?.focus(), 50);
  };

  const toggleCarousel = () => {
    setShowCarousel(!showCarousel);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <Animated.View
      entering={FadeInRight.springify()}
      style={styles.chatMessage}
    >
      <ThemedText style={styles.chatUserName}>{item.senderName}</ThemedText>
      <ThemedText style={styles.chatText}>{item.message}</ThemedText>
    </Animated.View>
  );

  // Use real chat messages for real rooms, empty for mock
  const chatMessages = isRealRoom ? liveChat.messages : [];

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  return (
    <View style={styles.container}>
      {/* For real rooms, show connecting state; for mock, show thumbnail */}
      {isRealRoom ? (
        <View style={styles.realStreamContainer}>
          {mobileUnsupported ? (
            <View style={styles.connectingContainer}>
              <Feather name="smartphone" size={48} color="#FF6B35" />
              <ThemedText style={styles.connectedText}>
                Live Stream Available
              </ThemedText>
              <ThemedText style={styles.connectingText}>
                Watching live streams on mobile requires an Expo development
                build. View this stream on web or install the dev build.
              </ThemedText>
            </View>
          ) : streaming.isConnecting ? (
            <View style={styles.connectingContainer}>
              <Feather name="wifi" size={48} color="#FF6B35" />
              <ThemedText style={styles.connectingText}>
                Connecting to stream...
              </ThemedText>
            </View>
          ) : streaming.isConnected ? (
            <LiveKitVideo room={streaming.room} style={styles.liveVideo} />
          ) : (
            <View style={styles.connectingContainer}>
              <Feather name="wifi-off" size={48} color="#ef4444" />
              <ThemedText style={styles.connectingText}>
                {streaming.error || "Stream ended"}
              </ThemedText>
            </View>
          )}
        </View>
      ) : (
        <Image
          source={{ uri: stream.thumbnail }}
          style={styles.video}
          resizeMode="cover"
        />
      )}
      {/* Subtle gradient overlays for readability without blocking video */}
      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "transparent"]}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      <View style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <Animated.View entering={FadeIn.delay(200)} style={styles.sellerChip}>
            <View style={styles.sellerAvatar}>
              {stream.sellerAvatar ? (
                <Image
                  source={{ uri: stream.sellerAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Feather name="user" size={14} color="#FFFFFF" />
              )}
            </View>
            <ThemedText style={styles.sellerName}>
              {stream.sellerName}
            </ThemedText>
          </Animated.View>
          <View style={styles.rightTop}>
            <Pressable
              style={styles.cartButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCartSheet(true);
              }}
            >
              <Feather name="shopping-cart" size={20} color="#FFFFFF" />
              {totalItems > 0 && (
                <View style={styles.cartBadge}>
                  <ThemedText style={styles.cartBadgeText}>
                    {totalItems > 99 ? "99+" : totalItems}
                  </ThemedText>
                </View>
              )}
            </Pressable>
            <LiveBadge size="small" />
            <View style={styles.viewerCount}>
              <Feather name="eye" size={12} color="#FFFFFF" />
              <ThemedText style={styles.viewerText}>
                {viewerCount.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actionBar}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          >
            <Feather name="heart" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          >
            <Feather name="share" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={toggleCarousel}>
            <Feather
              name="shopping-bag"
              size={24}
              color={showCarousel ? "#FF6B35" : "#FFFFFF"}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.chatInputContainer,
            {
              bottom: showCarousel ? 230 : insets.bottom + Spacing.sm,
            },
          ]}
        >
          <TextInput
            ref={chatInputRef}
            style={styles.chatInput}
            placeholder="Say something..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
            returnKeyType="send"
            testID="chat-input"
          />
          <Pressable onPress={handleSendMessage} style={styles.sendButton}>
            <Feather name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View
          style={[
            styles.chatSection,
            {
              bottom: showCarousel ? 290 : 70,
              maxHeight: showCarousel ? 140 : 200,
            },
          ]}
        >
          <FlatList
            ref={chatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <ProductCarousel
          products={carouselProducts}
          onProductPress={handleProductPress}
          visible={showCarousel}
          showBuyButton={!isHostViewer}
        />
      </View>

      <ProductDetailSheet
        product={selectedProduct}
        visible={showProductSheet}
        onClose={handleCloseProductSheet}
        compact
        hidePurchaseActions={isHostViewer}
        keepOpenOnAdd
        showId={showId}
        onBuyNow={() => {
          handleCloseProductSheet();
          setShowCartSheet(true);
        }}
      />

      <CartBottomSheet
        visible={showCartSheet}
        onClose={() => setShowCartSheet(false)}
        onStoreCheckout={(sellerId) => {
          setShowCartSheet(false);
          setCheckoutSellerId(sellerId);
          setShowCheckoutSheet(true);
        }}
      />

      <CheckoutBottomSheet
        visible={showCheckoutSheet}
        sellerId={checkoutSellerId}
        onClose={() => {
          setShowCheckoutSheet(false);
          setCheckoutSellerId(null);
        }}
        onSuccess={() => {
          setShowCheckoutSheet(false);
          setCheckoutSellerId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sellerChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    marginHorizontal: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sellerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    overflow: "hidden",
    borderWidth: 2,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  sellerName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  rightTop: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  viewerCount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  viewerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionBar: {
    position: "absolute",
    right: Spacing.sm,
    top: "50%",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  chatSection: {
    position: "absolute",
    left: 0,
    right: 70,
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
  chatInputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  realStreamContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0a0f",
  },
  connectingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  connectingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginTop: Spacing.lg,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  connectedText: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.md,
  },
  roomNameText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  liveVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
});
