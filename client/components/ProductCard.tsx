import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  variant?: "grid" | "list";
  showSeller?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  index?: number;
}

export function ProductCard({
  product,
  onPress,
  variant = "grid",
  showSeller = true,
  showDelete = false,
  onDelete,
  index = 0,
}: ProductCardProps) {
  const { theme } = useTheme();

  // Filter out archived colors, sizes, and variants
  const activeColors = product.colors?.filter((c) => !c.isArchived) || [];
  const activeSizes = product.sizes?.filter((s) => !s.isArchived) || [];
  const activeVariants = product.variants?.filter((v) => !v.isArchived) || [];

  const hasColors = activeColors.length > 0;
  const hasSizes = activeSizes.length > 0;
  const hasVariants = activeVariants.length > 0;
  const isGrid = variant === "grid";

  // Standard stock calculation: variants > colors/sizes > product-level
  const getStockInfo = (): {
    total: number | undefined;
    label: string;
    color: string;
    dotColor: string;
  } => {
    let total: number | undefined;

    if (hasVariants) {
      // Sum stock across all active variant combinations
      const variantStocks = activeVariants
        .map((v) => v.stockQuantity)
        .filter((q): q is number => q !== undefined);
      if (variantStocks.length > 0) {
        total = variantStocks.reduce((sum, q) => sum + q, 0);
      }
    } else if (hasColors || hasSizes) {
      // Sum stock across color/size variants
      const colorStocks = activeColors
        .map((c) => c.stockQuantity)
        .filter((q): q is number => q !== undefined);
      const sizeStocks = activeSizes
        .map((s) => s.stockQuantity)
        .filter((q): q is number => q !== undefined);
      const allStocks = [...colorStocks, ...sizeStocks];
      if (allStocks.length > 0) {
        total = allStocks.reduce((sum, q) => sum + q, 0);
      }
    }

    // Fall back to product-level stock
    if (total === undefined) {
      total = product.quantityInStock;
    }

    if (total === undefined) {
      return { total: undefined, label: "", color: "", dotColor: "" };
    }
    if (total === 0) {
      return {
        total,
        label: "Sold Out",
        color: "#EF4444",
        dotColor: "#EF4444",
      };
    }
    if (total <= 5) {
      return {
        total,
        label: `${total} left`,
        color: "#F59E0B",
        dotColor: "#F59E0B",
      };
    }
    return {
      total,
      label: `${total} in stock`,
      color: theme.success,
      dotColor: theme.success,
    };
  };

  const stockInfo = getStockInfo();
  const isOutOfStock = stockInfo.total === 0;

  // Get display price - use first active variant price if product price is 0 and variants exist
  const getDisplayPrice = () => {
    if (product.price > 0) return product.price;
    if (hasVariants && activeVariants[0]?.price) {
      return activeVariants[0].price;
    }
    return product.price;
  };
  const displayPrice = getDisplayPrice();

  if (isGrid) {
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 30).springify()}
        style={styles.gridWrapper}
      >
        <Pressable
          style={[
            styles.gridCard,
            { backgroundColor: theme.backgroundDefault },
            isOutOfStock && styles.gridCardDisabled,
          ]}
          onPress={onPress}
          testID={`product-${product.id}`}
        >
          <View style={styles.gridImageContainer}>
            <Image
              source={{ uri: product.image }}
              style={[styles.gridImage, isOutOfStock && styles.imageGreyed]}
            />
            {isOutOfStock && (
              <View style={styles.soldOutOverlay}>
                <View style={styles.soldOutBadge}>
                  <ThemedText style={styles.soldOutText}>Sold Out</ThemedText>
                </View>
              </View>
            )}
          </View>

          <View style={styles.gridInfo}>
            <ThemedText style={styles.gridName} numberOfLines={1}>
              {product.name}
            </ThemedText>
            <ThemedText style={[styles.gridPrice, { color: theme.primary }]}>
              ${displayPrice.toFixed(2)}
            </ThemedText>

            {stockInfo.total !== undefined && stockInfo.total > 0 && (
              <View style={styles.gridStockRow}>
                <View
                  style={[
                    styles.gridStockDot,
                    { backgroundColor: stockInfo.dotColor },
                  ]}
                />
                <ThemedText
                  style={[styles.gridStockText, { color: stockInfo.color }]}
                  numberOfLines={1}
                >
                  {stockInfo.label}
                </ThemedText>
              </View>
            )}

            {(hasColors || hasSizes) && (
              <View style={styles.variantsIndicator}>
                {hasColors && (
                  <View style={styles.miniColorSwatches}>
                    {activeColors.slice(0, 3).map((color) => (
                      <View
                        key={color.id}
                        style={[
                          styles.miniColorSwatch,
                          { backgroundColor: color.hexCode || "#ccc" },
                        ]}
                      />
                    ))}
                    {activeColors.length > 3 && (
                      <ThemedText
                        style={[
                          styles.variantCount,
                          { color: theme.textSecondary },
                        ]}
                      >
                        +{activeColors.length - 3}
                      </ThemedText>
                    )}
                  </View>
                )}
                {hasSizes && (
                  <ThemedText
                    style={[styles.sizeCount, { color: theme.textSecondary }]}
                  >
                    {activeSizes.length} sizes
                  </ThemedText>
                )}
              </View>
            )}

            {showSeller && (
              <View style={styles.sellerRow}>
                <ThemedText
                  style={[styles.sellerName, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {product.sellerName || "Store"}
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // List variant
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={[
          styles.listCard,
          { backgroundColor: theme.backgroundSecondary },
          isOutOfStock && styles.listCardDisabled,
        ]}
      >
        <View style={styles.listImageContainer}>
          <Image
            source={{ uri: product.image }}
            style={[styles.listImage, isOutOfStock && styles.imageGreyed]}
          />
          {hasVariants && (
            <View
              style={[styles.variantBadge, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={styles.variantBadgeText}>
                {activeVariants.length} variants
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.listInfo}>
          <View style={styles.listHeader}>
            <ThemedText style={styles.listName} numberOfLines={1}>
              {product.name}
            </ThemedText>
            {showDelete && onDelete && (
              <Pressable
                style={styles.deleteBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Feather name="trash-2" size={16} color="#EF4444" />
              </Pressable>
            )}
          </View>

          <View style={styles.priceRow}>
            <ThemedText style={[styles.listPrice, { color: theme.primary }]}>
              ${displayPrice.toFixed(2)}
            </ThemedText>
            {stockInfo.total !== undefined && (
              <View
                style={[
                  styles.stockBadge,
                  { backgroundColor: theme.backgroundTertiary },
                ]}
              >
                <View
                  style={[
                    styles.stockDot,
                    { backgroundColor: stockInfo.dotColor },
                  ]}
                />
                <ThemedText
                  style={[styles.stockText, { color: theme.textSecondary }]}
                >
                  {stockInfo.label}
                </ThemedText>
              </View>
            )}
          </View>

          {hasColors && (
            <View style={styles.variantsRow}>
              <View style={styles.colorSwatches}>
                {activeColors.slice(0, 5).map((color) => (
                  <View
                    key={color.id}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color.hexCode || "#ccc" },
                    ]}
                  />
                ))}
                {activeColors.length > 5 && (
                  <View
                    style={[
                      styles.moreIndicator,
                      { backgroundColor: theme.backgroundTertiary },
                    ]}
                  >
                    <ThemedText
                      style={[styles.moreText, { color: theme.textSecondary }]}
                    >
                      +{activeColors.length - 5}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}

          {hasSizes && (
            <View style={styles.variantsRow}>
              <View style={styles.sizeChips}>
                {activeSizes.slice(0, 4).map((size) => (
                  <View
                    key={size.id}
                    style={[
                      styles.sizeChip,
                      { backgroundColor: theme.backgroundTertiary },
                    ]}
                  >
                    <ThemedText style={styles.sizeChipText}>
                      {size.name}
                    </ThemedText>
                  </View>
                ))}
                {activeSizes.length > 4 && (
                  <View
                    style={[
                      styles.moreIndicator,
                      { backgroundColor: theme.backgroundTertiary },
                    ]}
                  >
                    <ThemedText
                      style={[styles.moreText, { color: theme.textSecondary }]}
                    >
                      +{activeSizes.length - 4}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Grid variant styles
  gridWrapper: {
    flex: 1,
    maxWidth: "50%",
  },
  gridCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  gridCardDisabled: {
    opacity: 0.55,
  },
  gridImageContainer: {
    position: "relative",
    backgroundColor: "#F8F8F8",
  },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
  },
  imageGreyed: {
    opacity: 0.5,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  soldOutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  gridInfo: {
    padding: Spacing.sm,
    gap: 2,
  },
  gridName: {
    fontSize: 13,
    fontWeight: "600",
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  lowStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  lowStockText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  variantsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
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
    marginLeft: 2,
  },
  sizeCount: {
    fontSize: 10,
  },
  sellerRow: {
    marginTop: 4,
  },
  sellerName: {
    fontSize: 11,
  },
  gridStockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  gridStockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridStockText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },

  // List variant styles
  listCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  listCardDisabled: {
    opacity: 0.55,
  },
  listImageContainer: {
    position: "relative",
  },
  listImage: {
    width: 100,
    height: 120,
  },
  variantBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  variantBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  listInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  listPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "500",
  },
  variantsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  colorSwatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  sizeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  sizeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  sizeChipText: {
    fontSize: 11,
    fontWeight: "500",
  },
  moreIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  moreText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
