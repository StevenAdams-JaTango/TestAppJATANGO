import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { CartIcon } from "@/components/CartIcon";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { RingLightAvatar } from "@/components/RingLightAvatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { ExploreStackParamList } from "@/navigation/ExploreStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product, Short } from "@/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/lib/supabase";
import { shortsService } from "@/services/shorts";

type NavigationProp = NativeStackNavigationProp<
  HomeStackParamList & ExploreStackParamList & RootStackParamList
>;
type RouteType =
  | RouteProp<HomeStackParamList, "StoreProfile">
  | RouteProp<ExploreStackParamList, "StoreProfile">;

interface StoreProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  store_name: string | null;
}

type TabType = "products" | "shorts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_WIDTH = SCREEN_WIDTH / 2;

export default function StoreProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { storeId } = route.params;

  const { user } = useAuth();

  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [deleteShortId, setDeleteShortId] = useState<string | null>(null);

  const isOwnStore = user?.id === storeId;

  const tabIndicatorX = useSharedValue(0);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  const switchTab = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    tabIndicatorX.value = withTiming(tab === "products" ? 0 : TAB_WIDTH, {
      duration: 250,
    });
  };

  const fetchStoreData = useCallback(async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, store_name")
        .eq("id", storeId)
        .single();

      if (profileError) throw profileError;
      setStore(profileData);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", storeId)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      const mappedProducts: Product[] = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        images: p.images || [],
        description: p.description || "",
        category: p.category,
        quantityInStock: p.quantity_in_stock,
        colors: p.colors || [],
        sizes: p.sizes || [],
        variants: p.variants || [],
        sellerId: p.seller_id,
        sellerName: profileData?.name || "Unknown",
        sellerAvatar: profileData?.avatar_url || undefined,
      }));

      setProducts(mappedProducts);

      const storeShorts = await shortsService.fetchByStore(storeId, user?.id);
      setShorts(storeShorts);
    } catch (error) {
      console.error("Error fetching store data:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId, user?.id]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStoreData();
    setRefreshing(false);
  }, [fetchStoreData]);

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

  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={[styles.compactCard, { backgroundColor: theme.backgroundDefault }]}
      onPress={() => handleProductPress(item)}
    >
      <Image source={{ uri: item.image }} style={styles.compactImage} />
      <View style={styles.compactInfo}>
        <ThemedText style={styles.compactName} numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.compactPrice, { color: theme.primary }]}>
          ${item.price.toFixed(2)}
        </ThemedText>
      </View>
    </Pressable>
  );

  const handleDeleteShort = useCallback((shortId: string) => {
    setDeleteShortId(shortId);
  }, []);

  const confirmDeleteShort = useCallback(async () => {
    if (!deleteShortId) return;
    const success = await shortsService.deleteShort(deleteShortId);
    if (success) {
      setShorts((prev) => prev.filter((s) => s.id !== deleteShortId));
    }
    setDeleteShortId(null);
  }, [deleteShortId]);

  const renderShort = ({ item, index }: { item: Short; index: number }) => (
    <Pressable
      style={styles.shortCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        (navigation as any).navigate("StoreShortsViewer", {
          sellerId: storeId,
          initialIndex: index,
        });
      }}
      onLongPress={isOwnStore ? () => handleDeleteShort(item.id) : undefined}
    >
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.shortCardImage}
        />
      ) : (
        <View
          style={[
            styles.shortCardPlaceholder,
            { backgroundColor: theme.backgroundTertiary },
          ]}
        >
          <Feather name="play-circle" size={20} color={theme.textSecondary} />
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.shortCardOverlay}
      >
        <View style={styles.shortCardFooter}>
          {item.duration > 0 && (
            <View style={styles.shortDurationBadge}>
              <Feather name="clock" size={10} color="#fff" />
              <ThemedText style={styles.shortDurationText}>
                {Math.round(item.duration)}s
              </ThemedText>
            </View>
          )}
          <View style={styles.shortViewsBadge}>
            <Feather name="eye" size={10} color="#fff" />
            <ThemedText style={styles.shortViewsText}>
              {item.viewCount || 0}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );

  const ProfileHeader = () => (
    <Animated.View entering={FadeIn.duration(400)}>
      {/* Gradient hero */}
      <LinearGradient
        colors={["#7C3AED", "#9333EA", "#6D28D9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          {/* Avatar with ring light */}
          <RingLightAvatar avatar={store?.avatar_url ?? null} size={96} />

          <ThemedText style={styles.storeName}>
            {store?.store_name || store?.name || "Store"}
          </ThemedText>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>
                {products.length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Products</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{shorts.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Shorts</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>0</ThemedText>
              <ThemedText style={styles.statLabel}>Followers</ThemedText>
            </View>
          </View>

          {/* Follow / Upload button */}
          {isOwnStore ? (
            <Pressable
              style={styles.heroButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                (navigation as any).navigate("UploadShort");
              }}
            >
              <Feather name="plus" size={16} color="#7C3AED" />
              <ThemedText style={styles.heroButtonText}>
                Upload Short
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={styles.heroButton}
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
            >
              <Feather name="user-plus" size={16} color="#7C3AED" />
              <ThemedText style={styles.heroButtonText}>Follow</ThemedText>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.backgroundRoot }]}>
        <Pressable style={styles.tab} onPress={() => switchTab("products")}>
          <Feather
            name="grid"
            size={18}
            color={
              activeTab === "products" ? theme.secondary : theme.textSecondary
            }
          />
          <ThemedText
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "products"
                    ? theme.secondary
                    : theme.textSecondary,
              },
            ]}
          >
            Products
          </ThemedText>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => switchTab("shorts")}>
          <Feather
            name="play-circle"
            size={18}
            color={
              activeTab === "shorts" ? theme.secondary : theme.textSecondary
            }
          />
          <ThemedText
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "shorts"
                    ? theme.secondary
                    : theme.textSecondary,
              },
            ]}
          >
            Shorts
          </ThemedText>
        </Pressable>
        <Animated.View
          style={[
            styles.tabIndicator,
            { backgroundColor: theme.secondary },
            indicatorStyle,
          ]}
        />
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
      ]}
    >
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerActions}>
          <CartIcon />
        </View>
      </View>

      {activeTab === "products" ? (
        <FlatList
          key="products-grid"
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={4}
          columnWrapperStyle={styles.productRow}
          renderItem={renderProduct}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={<ProfileHeader />}
          ListEmptyComponent={
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={styles.emptyContainer}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="package" size={40} color={theme.textSecondary} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                No products yet
              </ThemedText>
              <ThemedText
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                This store hasn&apos;t added any products
              </ThemedText>
            </Animated.View>
          }
        />
      ) : (
        <FlatList
          key="shorts-grid"
          data={shorts}
          keyExtractor={(item) => item.id}
          numColumns={6}
          columnWrapperStyle={styles.shortsRow}
          renderItem={renderShort}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={<ProfileHeader />}
          ListEmptyComponent={
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={styles.emptyContainer}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather
                  name="play-circle"
                  size={40}
                  color={theme.textSecondary}
                />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                No shorts yet
              </ThemedText>
              <ThemedText
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                {isOwnStore
                  ? "Upload your first short video!"
                  : "This store hasn\u0027t posted any shorts"}
              </ThemedText>
              {isOwnStore && (
                <Pressable
                  style={[
                    styles.emptyUploadBtn,
                    { backgroundColor: theme.secondary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    (navigation as any).navigate("UploadShort");
                  }}
                >
                  <Feather name="plus" size={18} color="#fff" />
                  <ThemedText style={styles.emptyUploadText}>
                    Upload Short
                  </ThemedText>
                </Pressable>
              )}
            </Animated.View>
          }
        />
      )}

      <ProductDetailSheet
        product={selectedProduct}
        visible={showProductSheet}
        onClose={handleCloseProductSheet}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <ConfirmDialog
        visible={!!deleteShortId}
        title="Delete Short"
        message="Are you sure you want to delete this short? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteShort}
        onCancel={() => setDeleteShortId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Header bar (floating over gradient)
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: 48,
    paddingBottom: Spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  // Hero gradient
  heroGradient: {
    paddingTop: 80,
    paddingBottom: Spacing.xl,
  },
  heroContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },

  // Avatar
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  storeName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: Spacing.md,
    letterSpacing: 0.3,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // Hero button
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C3AED",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // List
  listContent: {
    paddingHorizontal: 0,
  },
  productRow: {
    gap: 1,
    marginBottom: 1,
    paddingHorizontal: 1,
  },

  // Compact product card (4-across)
  compactCard: {
    flex: 1,
    maxWidth: SCREEN_WIDTH / 4,
    borderRadius: 8,
    overflow: "hidden",
    margin: 0.5,
  },
  compactImage: {
    width: "100%",
    aspectRatio: 1,
  },
  compactInfo: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 1,
  },
  compactName: {
    fontSize: 10,
    fontWeight: "600",
  },
  compactPrice: {
    fontSize: 11,
    fontWeight: "800",
  },

  // Shorts grid (6-across)
  shortsRow: {
    gap: 1,
  },
  shortCard: {
    flex: 1,
    aspectRatio: 9 / 16,
    maxWidth: SCREEN_WIDTH / 6,
    position: "relative",
    overflow: "hidden",
    margin: 0.5,
  },
  shortCardImage: {
    width: "100%",
    height: "100%",
  },
  shortCardPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  shortCardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    justifyContent: "flex-end",
    paddingHorizontal: 3,
    paddingBottom: 3,
  },
  shortCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shortDurationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  shortDurationText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "600",
  },
  shortViewsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  shortViewsText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "600",
  },

  // Empty states
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyUploadText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
