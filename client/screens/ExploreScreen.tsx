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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import { EmptyState } from "@/components/EmptyState";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { ProductCard } from "@/components/ProductCard";
import { CartIcon } from "@/components/CartIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { productsService } from "@/services/products";
import { Product } from "@/types";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
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

  const handleAddToCart = () => {
    // Cart is handled by ProductDetailSheet via CartContext
    handleCloseProductSheet();
  };

  const handleBuyNow = () => {
    // Buy now not implemented yet - just close sheet for now
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
        <View
          style={[
            styles.searchContainer,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <ActivityIndicator size="large" color={theme.primary} />
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
            paddingTop: Math.max(insets.top, Spacing.lg) + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="search" size={20} color={theme.secondary} />
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
        <CartIcon />
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
            tintColor={theme.primary}
            colors={[theme.primary]}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
});
