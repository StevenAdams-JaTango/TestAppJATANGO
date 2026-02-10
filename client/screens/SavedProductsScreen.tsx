import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Product } from "@/types";
import { savedProductsService } from "@/services/savedProducts";

export default function SavedProductsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const loadSaved = useCallback(async () => {
    const data = await savedProductsService.fetchSaved();
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSaved();
    setRefreshing(false);
  }, [loadSaved]);

  const handleProductPress = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProduct(product);
    setShowSheet(true);
  };

  const handleCloseSheet = () => {
    setShowSheet(false);
    setSelectedProduct(null);
    // Refresh list in case user unsaved something
    loadSaved();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            variant="grid"
            showSeller={false}
            index={index}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
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
              <Feather name="heart" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
              No saved products
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textSecondary }]}
            >
              Products you save will appear here
            </ThemedText>
          </Animated.View>
        }
      />

      <ProductDetailSheet
        product={selectedProduct}
        visible={showSheet}
        onClose={handleCloseSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.md,
  },
  row: {
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
});
