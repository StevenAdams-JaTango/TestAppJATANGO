import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, Colors } from "@/constants/theme";
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
          ]}
          onPress={onPress}
          testID={`product-${product.id}`}
        >
          <View style={styles.gridImageContainer}>
            <Image source={{ uri: product.image }} style={styles.gridImage} />
            {product.quantityInStock !== undefined &&
              product.quantityInStock < 3 && (
                <View style={styles.lowStockBadge}>
                  <ThemedText style={styles.lowStockText}>
                    {product.quantityInStock === 0 ? "Sold Out" : "Low Stock"}
                  </ThemedText>
                </View>
              )}
          </View>

          <View style={styles.gridInfo}>
            <ThemedText style={styles.gridName} numberOfLines={1}>
              {product.name}
            </ThemedText>
            <ThemedText style={styles.gridPrice}>
              ${displayPrice.toFixed(2)}
            </ThemedText>

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
                      <ThemedText style={styles.variantCount}>
                        +{activeColors.length - 3}
                      </ThemedText>
                    )}
                  </View>
                )}
                {hasSizes && (
                  <ThemedText style={styles.sizeCount}>
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
        style={styles.listCard}
      >
        <View style={styles.listImageContainer}>
          <Image source={{ uri: product.image }} style={styles.listImage} />
          {hasVariants && (
            <View style={styles.variantBadge}>
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
            <ThemedText style={styles.listPrice}>
              ${displayPrice.toFixed(2)}
            </ThemedText>
            {product.quantityInStock !== undefined &&
              product.quantityInStock < 3 && (
                <View style={styles.stockBadge}>
                  <View
                    style={[
                      styles.stockDot,
                      {
                        backgroundColor:
                          product.quantityInStock > 0 ? "#F59E0B" : "#EF4444",
                      },
                    ]}
                  />
                  <ThemedText style={styles.stockText}>
                    {product.quantityInStock === 0
                      ? "Out of stock"
                      : `${product.quantityInStock} left`}
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
                  <View style={styles.moreIndicator}>
                    <ThemedText style={styles.moreText}>
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
                  <View key={size.id} style={styles.sizeChip}>
                    <ThemedText style={styles.sizeChipText}>
                      {size.name}
                    </ThemedText>
                  </View>
                ))}
                {activeSizes.length > 4 && (
                  <View style={styles.moreIndicator}>
                    <ThemedText style={styles.moreText}>
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
  gridImageContainer: {
    position: "relative",
    backgroundColor: "#F8F8F8",
  },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
  },
  gridInfo: {
    padding: Spacing.sm,
    gap: 2,
  },
  gridName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.primary,
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
    color: Colors.light.textSecondary,
    marginLeft: 2,
  },
  sizeCount: {
    fontSize: 10,
    color: Colors.light.textSecondary,
  },
  sellerRow: {
    marginTop: 4,
  },
  sellerName: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },

  // List variant styles
  listCard: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
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
    backgroundColor: Colors.light.primary,
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
    color: Colors.light.text,
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
    color: Colors.light.primary,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.backgroundTertiary,
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
    color: Colors.light.textSecondary,
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
    backgroundColor: Colors.light.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  sizeChipText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.light.text,
  },
  moreIndicator: {
    backgroundColor: Colors.light.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  moreText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
});
