import React, { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  useIsFocused,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { LivePreview } from "@/components/LivePreview";
import { navigationRef } from "@/navigation/navigationRef";
import { useCart } from "@/contexts/CartContext";
import { useLiveRooms } from "@/hooks/useLiveRooms";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { supabase } from "@/lib/supabase";

interface Store {
  id: string;
  name: string;
  avatar_url: string | null;
  productCount: number;
}

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LIVE_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { totalItems } = useCart();
  const [refreshing, setRefreshing] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const { rooms: liveRooms, refetch: refetchRooms } = useLiveRooms({
    enabled: isFocused,
  });

  // Fetch stores that have products
  const fetchStores = useCallback(async () => {
    try {
      // Get all profiles with their product counts
      const { data, error } = await supabase.from("profiles").select(`
          id,
          name,
          avatar_url,
          products:products(count)
        `);

      if (error) throw error;

      // Filter client-side for profiles with products
      const storesWithProducts = (data || [])
        .filter((profile: any) => profile.products?.[0]?.count > 0)
        .map((profile: any) => ({
          id: profile.id,
          name: profile.name || "Unknown Store",
          avatar_url: profile.avatar_url,
          productCount: profile.products?.[0]?.count || 0,
        }));

      setStores(storesWithProducts);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchRooms();
    fetchStores();
    setTimeout(() => setRefreshing(false), 1500);
  }, [refetchRooms, fetchStores]);

  const handleLiveRoomPress = (roomName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("LiveStream", { streamId: roomName });
  };

  const handleGoLivePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Main", { screen: "ShowsTab" });
  };

  const hasLiveStreams = liveRooms.length > 0;
  const displayedRooms = liveRooms.slice(0, 4); // Max 4 live streams

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.secondary }]}>
          Live Now
        </ThemedText>
        {hasLiveStreams && (
          <View style={styles.liveCountBadge}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveCountText}>
              {liveRooms.length}
            </ThemedText>
          </View>
        )}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + Spacing.xl,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Live Streams Grid or Empty State */}
        {hasLiveStreams ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.liveGrid}
          >
            {displayedRooms.map((room, index) => (
              <Pressable
                key={room.name}
                style={styles.liveCard}
                onPress={() => handleLiveRoomPress(room.name)}
              >
                <View
                  style={[
                    styles.liveCardGradient,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  {room.thumbnailUrl ? (
                    <Image
                      source={{ uri: room.thumbnailUrl }}
                      style={styles.liveThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <LivePreview
                      roomName={room.name}
                      style={styles.livePreview}
                    />
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
                    style={styles.liveCardOverlay}
                  >
                    <View style={styles.liveCardBadge}>
                      <View style={styles.liveDotSmall} />
                      <ThemedText style={styles.liveCardBadgeText}>
                        LIVE
                      </ThemedText>
                    </View>
                    <View style={styles.liveCardFooter}>
                      <ThemedText
                        style={styles.liveCardTitle}
                        numberOfLines={1}
                      >
                        {room.title || "Live Show"}
                      </ThemedText>
                      <ThemedText style={styles.liveCardViewers}>
                        {room.numParticipants} watching
                      </ThemedText>
                    </View>
                  </LinearGradient>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: theme.backgroundTertiary },
                ]}
              >
                <Feather name="video" size={32} color={theme.secondary} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                No Live Streams
              </ThemedText>
              <ThemedText
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Check back soon or start your own stream!
              </ThemedText>
              <Pressable
                style={[
                  styles.emptyStartBtn,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleGoLivePress}
              >
                <Feather name="radio" size={16} color={theme.buttonText} />
                <ThemedText
                  style={[
                    styles.emptyStartBtnText,
                    { color: theme.buttonText },
                  ]}
                >
                  Go Live
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Stores Section */}
        {stores.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={styles.storesSection}
          >
            <ThemedText
              style={[
                styles.storesSectionTitle,
                { paddingHorizontal: Spacing.lg, color: theme.text },
              ]}
            >
              Stores
            </ThemedText>
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storesList}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.storeCard,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("StoreProfile", { storeId: item.id });
                  }}
                >
                  <View
                    style={[
                      styles.storeAvatar,
                      { backgroundColor: theme.backgroundTertiary },
                    ]}
                  >
                    {item.avatar_url ? (
                      <Image
                        source={{ uri: item.avatar_url }}
                        style={styles.storeAvatarImage}
                      />
                    ) : (
                      <Feather
                        name="shopping-bag"
                        size={24}
                        color={theme.textSecondary}
                      />
                    )}
                  </View>
                  <ThemedText
                    style={[styles.storeName, { color: theme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.name}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.storeProductCount,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item.productCount}{" "}
                    {item.productCount === 1 ? "product" : "products"}
                  </ThemedText>
                </Pressable>
              )}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      <TouchableOpacity
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // Haptics not supported
          }
          if (navigationRef.isReady()) {
            navigationRef.navigate("Cart");
          }
        }}
        activeOpacity={0.8}
        style={[
          styles.cartFab,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.md,
            ...Shadows.md,
          },
        ]}
      >
        <Feather name="shopping-cart" size={22} color="#fff" />
        {totalItems > 0 && (
          <View style={styles.cartFabBadge}>
            <ThemedText style={styles.cartFabBadgeText}>
              {totalItems > 99 ? "99+" : totalItems}
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  liveCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  liveCountText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  liveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  liveCard: {
    width: LIVE_CARD_WIDTH,
  },
  liveCardGradient: {
    height: LIVE_CARD_WIDTH * 1.3,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  livePreview: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  liveThumbnail: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  liveCardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  liveCardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.9)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    alignSelf: "flex-start",
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveCardBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  liveCardContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  liveCardViewers: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  liveCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  liveCardTitle: {
    flex: 1,
    marginRight: Spacing.sm,
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  liveCardJoin: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  emptyState: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
    minHeight: 180,
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: Spacing.xs,
    textAlign: "center",
    maxWidth: 280,
  },
  emptyStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  emptyStartBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  storesSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  storesSection: {
    paddingTop: Spacing.md,
  },
  storesList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  storeCard: {
    width: 140,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  storeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  storeAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  storeName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  storeProductCount: {
    fontSize: 11,
    textAlign: "center",
  },
  cartFab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 8,
  },
  cartFabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cartFabBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
