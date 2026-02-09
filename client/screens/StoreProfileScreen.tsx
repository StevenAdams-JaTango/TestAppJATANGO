import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { CartIcon } from "@/components/CartIcon";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { ProductCard } from "@/components/ProductCard";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { ExploreStackParamList } from "@/navigation/ExploreStackNavigator";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";

type NavigationProp =
  | NativeStackNavigationProp<HomeStackParamList>
  | NativeStackNavigationProp<ExploreStackParamList>;
type RouteType =
  | RouteProp<HomeStackParamList, "StoreProfile">
  | RouteProp<ExploreStackParamList, "StoreProfile">;

interface StoreProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  store_name: string | null;
}

export default function StoreProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { storeId } = route.params;

  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);

  const fetchStoreData = useCallback(async () => {
    try {
      // Fetch store profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, store_name")
        .eq("id", storeId)
        .single();

      if (profileError) throw profileError;
      setStore(profileData);

      // Fetch store's products
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
    } catch (error) {
      console.error("Error fetching store data:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

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

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    return (
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        variant="grid"
        showSeller={false}
        index={index}
      />
    );
  };

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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Store</ThemedText>
        <View style={styles.headerRight}>
          <CartIcon />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.profile}>
            <View style={styles.avatarContainer}>
              {store?.avatar_url ? (
                <Image
                  source={{ uri: store.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.backgroundTertiary },
                  ]}
                >
                  <Feather name="user" size={40} color={theme.textSecondary} />
                </View>
              )}
            </View>
            <ThemedText style={styles.storeName}>
              {store?.store_name || store?.name || "Store"}
            </ThemedText>
            <ThemedText
              style={[styles.productCount, { color: theme.textSecondary }]}
            >
              {products.length} {products.length === 1 ? "product" : "products"}
            </ThemedText>
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              No products yet
            </ThemedText>
          </View>
        }
      />

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
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    width: 40,
  },
  profile: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  productCount: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  row: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  productWrapper: {
    flex: 1,
    maxWidth: "50%",
  },
  productCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    ...Shadows.sm,
  },
  productImageContainer: {},

  productImage: {
    width: "100%",
    aspectRatio: 1,
  },
  productInfo: {
    padding: Spacing.sm,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  variantsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  colorSwatches: {
    flexDirection: "row",
    gap: 2,
  },
  colorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  sizeText: {
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
});
