import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import { EmptyState } from "@/components/EmptyState";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { ProductCard } from "@/components/ProductCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { productsService } from "@/services/products";
import { Product } from "@/types";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await productsService.listAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

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

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    return (
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        variant="grid"
        showSeller={true}
        index={index}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      );
    }
    return (
      <EmptyState
        image={require("../../assets/images/empty-purchases.png")}
        title="No Products Found"
        description={
          searchQuery
            ? "Try a different search term"
            : "Products will appear here when sellers add them"
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: headerHeight + Spacing.sm,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: Colors.light.border,
            },
          ]}
        >
          <Feather name="search" size={20} color={Colors.light.secondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search products..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          filteredProducts.length === 0 && styles.emptyContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
            colors={[Colors.light.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyContent: {
    flex: 1,
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
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  productImageContainer: {
    position: "relative",
    backgroundColor: "#F8F8F8",
  },
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
    lineHeight: 16,
    color: Colors.light.text,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerName: {
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  lowStockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowStockText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.primary,
    marginBottom: 4,
  },
  variantsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  miniColorSwatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  miniColorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  variantCount: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginLeft: 2,
  },
  sizeCount: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
});
