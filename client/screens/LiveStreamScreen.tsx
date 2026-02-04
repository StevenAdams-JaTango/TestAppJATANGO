import React, { useState, useEffect } from "react";
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
import { LiveKitVideo } from "@/components/LiveKitVideo";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { mockLiveStreams } from "@/data/mockData";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { useStreaming } from "@/hooks/useStreaming";
import { useLiveChat, ChatMessage } from "@/hooks/useLiveChat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
  const { streamId } = route.params;
  const { user } = useAuth();

  // Check if this is a real LiveKit room (starts with "jatango-live-")
  const isRealRoom = streamId.startsWith("jatango-live-");
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCarousel(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRealRoom) {
      await streaming.disconnect();
    }
    navigation.goBack();
  };

  const handleProductPress = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProduct(product);
    setShowProductSheet(true);
  };

  const handleCloseProductSheet = () => {
    setShowProductSheet(false);
    setSelectedProduct(null);
  };

  const handleAddToCart = (product: Product) => {
    console.log("Add to cart:", product.id);
    handleCloseProductSheet();
  };

  const handleBuyNow = (product: Product) => {
    console.log("Buy now:", product.id);
    handleCloseProductSheet();
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    liveChat.sendMessage(newMessage.trim());
    setNewMessage("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  return (
    <View style={styles.container}>
      {/* For real rooms, show connecting state; for mock, show thumbnail */}
      {isRealRoom ? (
        <View style={styles.realStreamContainer}>
          {mobileUnsupported ? (
            <View style={styles.connectingContainer}>
              <Feather
                name="smartphone"
                size={48}
                color={Colors.light.primary}
              />
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
              <Feather name="wifi" size={48} color={Colors.light.primary} />
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
            <Feather name="x" size={24} color={Colors.light.buttonText} />
          </Pressable>
          <Animated.View entering={FadeIn.delay(200)} style={styles.sellerChip}>
            <View style={styles.sellerAvatar}>
              {stream.sellerAvatar ? (
                <Image
                  source={{ uri: stream.sellerAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Feather
                  name="user"
                  size={14}
                  color={Colors.light.buttonText}
                />
              )}
            </View>
            <ThemedText style={styles.sellerName}>
              {stream.sellerName}
            </ThemedText>
          </Animated.View>
          <View style={styles.rightTop}>
            <LiveBadge size="small" />
            <View style={styles.viewerCount}>
              <Feather name="eye" size={12} color={Colors.light.buttonText} />
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
            <Feather name="heart" size={24} color={Colors.light.buttonText} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          >
            <Feather name="share" size={24} color={Colors.light.buttonText} />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={toggleCarousel}>
            <Feather
              name="shopping-bag"
              size={24}
              color={
                showCarousel ? Colors.light.primary : Colors.light.buttonText
              }
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.chatInputContainer,
            {
              bottom: showCarousel ? 180 : insets.bottom + Spacing.sm,
            },
          ]}
        >
          <TextInput
            style={styles.chatInput}
            placeholder="Say something..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={handleSendMessage}
            testID="chat-input"
          />
          <Pressable onPress={handleSendMessage} style={styles.sendButton}>
            <Feather name="send" size={18} color={Colors.light.buttonText} />
          </Pressable>
        </View>

        <View
          style={[
            styles.chatSection,
            {
              bottom: showCarousel ? 240 : 70,
              maxHeight: showCarousel ? 120 : 180,
            },
          ]}
        >
          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            inverted={chatMessages.length > 0}
          />
        </View>

        <ProductCarousel
          products={carouselProducts}
          onProductPress={handleProductPress}
          visible={showCarousel}
        />
      </View>

      <ProductDetailSheet
        product={selectedProduct}
        visible={showProductSheet}
        onClose={handleCloseProductSheet}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
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
    borderColor: Colors.light.primary,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  sellerName: {
    color: Colors.light.buttonText,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  rightTop: {
    alignItems: "flex-end",
    gap: Spacing.xs,
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
    color: Colors.light.buttonText,
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
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  chatText: {
    color: Colors.light.buttonText,
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
    color: Colors.light.buttonText,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
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
    color: Colors.light.buttonText,
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
