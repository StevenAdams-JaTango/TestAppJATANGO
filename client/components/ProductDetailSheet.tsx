import React, { useState, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/contexts/CartContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Product, ColorVariant, SizeVariant } from "@/types";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { ExploreStackParamList } from "@/navigation/ExploreStackNavigator";

function useSafeBottomTabBarHeight(): number {
  try {
    return useBottomTabBarHeight();
  } catch {
    return 0;
  }
}

type NavigationProp =
  | NativeStackNavigationProp<HomeStackParamList>
  | NativeStackNavigationProp<ExploreStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ProductDetailSheetProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  compact?: boolean;
  hidePurchaseActions?: boolean;
  keepOpenOnAdd?: boolean;
  showId?: string;
}

export function ProductDetailSheet({
  product,
  visible,
  onClose,
  onAddToCart,
  onBuyNow,
  compact = false,
  hidePurchaseActions = false,
  keepOpenOnAdd = false,
  showId,
}: ProductDetailSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { addToCart } = useCart();
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeVariant | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const imageScrollRef = useRef<FlatList>(null);

  if (!product) return null;

  // Filter out archived variants, colors, and sizes - only show active ones to customers
  const activeVariants = product.variants?.filter((v) => !v.isArchived) || [];

  const variantMatchesColor = (
    v: (typeof activeVariants)[number],
    c: ColorVariant,
  ) =>
    (v.colorId !== undefined && v.colorId === c.id) ||
    (v.colorName !== undefined && v.colorName === c.name);

  const variantMatchesSize = (
    v: (typeof activeVariants)[number],
    s: SizeVariant,
  ) =>
    (v.sizeId !== undefined && v.sizeId === s.id) ||
    (v.sizeName !== undefined && v.sizeName === s.name);

  // Show colors that are not archived AND have at least one active variant using them
  const activeColors =
    product.colors?.filter(
      (c) =>
        !c.isArchived &&
        (activeVariants.some((v) => variantMatchesColor(v, c)) ||
          !product.variants?.length),
    ) || [];

  // Show sizes that are not archived AND have at least one active variant using them
  const activeSizes =
    product.sizes?.filter(
      (s) =>
        !s.isArchived &&
        (activeVariants.some((v) => variantMatchesSize(v, s)) ||
          !product.variants?.length),
    ) || [];

  const hasColors = activeColors.length > 0;
  const hasSizes = activeSizes.length > 0;
  const hasVariants = activeVariants.length > 0;

  // Check if required variants are selected
  const isVariantSelectionComplete =
    (!hasColors || selectedColor !== null) &&
    (!hasSizes || selectedSize !== null);

  // Check if a color has any active variant for the current size selection
  // If false, the combo is archived/doesn't exist — hide it entirely
  const isColorAvailable = (color: ColorVariant): boolean => {
    if (!hasVariants) return true;
    const matchingVariants = selectedSize
      ? activeVariants.filter(
          (v) =>
            variantMatchesColor(v, color) &&
            variantMatchesSize(v, selectedSize),
        )
      : activeVariants.filter((v) => variantMatchesColor(v, color));
    return matchingVariants.length > 0;
  };

  // Check if a color is out of stock (variant exists but stock is 0)
  const isColorOutOfStock = (color: ColorVariant): boolean => {
    if (!hasVariants) {
      return color.stockQuantity === 0;
    }
    const matchingVariants = selectedSize
      ? activeVariants.filter(
          (v) =>
            variantMatchesColor(v, color) &&
            variantMatchesSize(v, selectedSize),
        )
      : activeVariants.filter((v) => variantMatchesColor(v, color));
    if (matchingVariants.length === 0) return false; // no variant = hidden, not OOS
    const totalStock = matchingVariants.reduce(
      (sum, v) => sum + (v.stockQuantity ?? 0),
      0,
    );
    return totalStock === 0;
  };

  // Check if a size has any active variant for the current color selection
  const isSizeAvailable = (size: SizeVariant): boolean => {
    if (!hasVariants) return true;
    const matchingVariants = selectedColor
      ? activeVariants.filter(
          (v) =>
            variantMatchesSize(v, size) &&
            variantMatchesColor(v, selectedColor),
        )
      : activeVariants.filter((v) => variantMatchesSize(v, size));
    return matchingVariants.length > 0;
  };

  // Check if a size is out of stock (variant exists but stock is 0)
  const isSizeOutOfStock = (size: SizeVariant): boolean => {
    if (!hasVariants) {
      return size.stockQuantity === 0;
    }
    const matchingVariants = selectedColor
      ? activeVariants.filter(
          (v) =>
            variantMatchesSize(v, size) &&
            variantMatchesColor(v, selectedColor),
        )
      : activeVariants.filter((v) => variantMatchesSize(v, size));
    if (matchingVariants.length === 0) return false; // no variant = hidden, not OOS
    const totalStock = matchingVariants.reduce(
      (sum, v) => sum + (v.stockQuantity ?? 0),
      0,
    );
    return totalStock === 0;
  };

  // Get the current variant based on selected color and size
  const currentVariant = activeVariants.find(
    (v) =>
      (selectedColor ? variantMatchesColor(v, selectedColor) : !v.colorId) &&
      (selectedSize ? variantMatchesSize(v, selectedSize) : !v.sizeId),
  );

  // Stock info: variant-specific when selected, otherwise total
  const getStockInfo = (): {
    qty: number | undefined;
    label: string;
    color: string;
  } => {
    let qty: number | undefined;

    // If a specific variant combo is selected, show its stock
    if (currentVariant?.stockQuantity !== undefined) {
      qty = currentVariant.stockQuantity;
    } else if (selectedColor && hasSizes && hasVariants) {
      // Color selected but no size yet — sum stock for all variants with this color
      const stocks = activeVariants
        .filter((v) => v.colorId === selectedColor.id)
        .map((v) => v.stockQuantity)
        .filter((q): q is number => q !== undefined);
      if (stocks.length > 0) qty = stocks.reduce((a, b) => a + b, 0);
    } else if (selectedSize && hasColors && hasVariants) {
      // Size selected but no color yet — sum stock for all variants with this size
      const stocks = activeVariants
        .filter((v) => v.sizeId === selectedSize.id)
        .map((v) => v.stockQuantity)
        .filter((q): q is number => q !== undefined);
      if (stocks.length > 0) qty = stocks.reduce((a, b) => a + b, 0);
    } else if (selectedColor && !hasSizes) {
      // Only colors, no sizes — use color's stock directly
      qty = selectedColor.stockQuantity;
    } else if (selectedSize && !hasColors) {
      // Only sizes, no colors — use size's stock directly
      qty = selectedSize.stockQuantity;
    } else if (hasVariants) {
      // Nothing selected — sum across all active variants
      const stocks = activeVariants
        .map((v) => v.stockQuantity)
        .filter((q): q is number => q !== undefined);
      if (stocks.length > 0) qty = stocks.reduce((a, b) => a + b, 0);
    } else if (hasColors || hasSizes) {
      const cStocks = activeColors
        .map((c) => c.stockQuantity)
        .filter((q): q is number => q !== undefined);
      const sStocks = activeSizes
        .map((s) => s.stockQuantity)
        .filter((q): q is number => q !== undefined);
      const all = [...cStocks, ...sStocks];
      if (all.length > 0) qty = all.reduce((a, b) => a + b, 0);
    }

    if (qty === undefined) qty = product.quantityInStock;
    if (qty === undefined) {
      return { qty: undefined, label: "", color: "" };
    }
    if (qty === 0) return { qty, label: "Sold Out", color: "#EF4444" };
    if (qty <= 5) return { qty, label: `Only ${qty} left`, color: "#F59E0B" };
    return { qty, label: `${qty} in stock`, color: theme.success };
  };

  const stockInfo = getStockInfo();

  // Check if an image URL is valid (not a blob URL or empty)
  const isValidImageUrl = (url?: string) => {
    if (!url) return false;
    // Blob URLs are temporary and may have expired
    if (url.startsWith("blob:")) return false;
    return true;
  };

  const bottomOffset =
    Math.max(insets.bottom, Spacing.lg) +
    tabBarHeight +
    Spacing.lg +
    (Platform.OS === "android" ? Spacing["5xl"] : 0);

  const actionBarHeight = 56 + Spacing.md;

  // Determine which images to show - variant image takes priority (only if valid)
  const getDisplayImages = () => {
    // If a variant is selected and has a valid image, show it
    if (isValidImageUrl(currentVariant?.image)) {
      return [currentVariant!.image];
    }
    // If only color is selected and it has a valid image, show it
    if (isValidImageUrl(selectedColor?.image)) {
      return [selectedColor!.image];
    }
    // If only size is selected and it has a valid image, show it
    if (isValidImageUrl(selectedSize?.image)) {
      return [selectedSize!.image];
    }
    // Otherwise show product images
    return product.images && product.images.length > 0
      ? product.images
      : [product.image];
  };

  const images = getDisplayImages();
  const hasMultipleImages = images.length > 1;

  const handleColorSelect = (color: ColorVariant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(selectedColor?.id === color.id ? null : color);
    setCurrentImageIndex(0); // Reset to first image when variant changes
  };

  const handleSizeSelect = (size: SizeVariant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSize(selectedSize?.id === size.id ? null : size);
    setCurrentImageIndex(0); // Reset to first image when variant changes
  };

  const handleAddToCart = async () => {
    // Check if variant selection is required
    if (hasColors && !selectedColor) {
      Alert.alert(
        "Select a color",
        "Please select a color before adding to cart.",
      );
      return;
    }
    if (hasSizes && !selectedSize) {
      Alert.alert(
        "Select a size",
        "Please select a size before adding to cart.",
      );
      return;
    }

    setIsAddingToCart(true);
    console.log("[ProductDetailSheet] Adding to cart:", {
      productId: product.id,
      productName: product.name,
      selectedColor: selectedColor?.name,
      selectedSize: selectedSize?.name,
    });

    try {
      const result = await addToCart(
        product,
        1,
        selectedColor ?? undefined,
        selectedSize ?? undefined,
        currentVariant ?? undefined,
        showId,
      );

      console.log("[ProductDetailSheet] addToCart result:", result);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAddToCart?.(product);
        if (keepOpenOnAdd) {
          Alert.alert("Added!", `${product.name} was added to your cart.`);
        } else {
          onClose();
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Cannot Add to Cart",
          result.message || "Failed to add item to cart.",
        );
      }
    } catch (error) {
      console.error("[ProductDetailSheet] Error adding to cart:", error);
      Alert.alert("Error", "Failed to add item to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    console.log(
      "[ProductDetailSheet] Buy Now pressed, keepOpenOnAdd:",
      keepOpenOnAdd,
    );
    // Check if variant selection is required
    if (hasColors && !selectedColor) {
      Alert.alert("Select a color", "Please select a color before purchasing.");
      return;
    }
    if (hasSizes && !selectedSize) {
      Alert.alert("Select a size", "Please select a size before purchasing.");
      return;
    }

    setIsAddingToCart(true);
    try {
      const result = await addToCart(
        product,
        1,
        selectedColor ?? undefined,
        selectedSize ?? undefined,
        currentVariant ?? undefined,
        showId,
      );

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (keepOpenOnAdd) {
          Alert.alert("Added!", `${product.name} was added to your cart.`);
        } else {
          onClose();
          (navigation as any).navigate("Cart");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Cannot Purchase",
          result.message || "Failed to add item to cart.",
        );
      }
    } catch (error) {
      console.error("[ProductDetailSheet] Error with buy now:", error);
      Alert.alert("Error", "Failed to process. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
    onBuyNow?.(product);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={[styles.backdrop, compact && styles.backdropCompact]}
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: 0,
            },
            compact && styles.sheetCompact,
          ]}
        >
          <Pressable style={styles.closeButton} onPress={onClose}>
            <BlurView intensity={80} tint="dark" style={styles.closeBlur}>
              <Feather name="x" size={20} color="#fff" />
            </BlurView>
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomOffset + actionBarHeight },
            ]}
          >
            {/* Compact mode: small thumbnail + info row instead of full image carousel */}
            {compact ? (
              <View style={styles.compactHeader}>
                <Image
                  source={{ uri: images[0] }}
                  style={styles.compactThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.compactInfo}>
                  <ThemedText style={styles.price}>
                    ${product.price.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={styles.name} numberOfLines={2}>
                    {product.name}
                  </ThemedText>
                  {stockInfo.qty !== undefined && (
                    <View
                      style={[
                        styles.stockPill,
                        { backgroundColor: stockInfo.color + "15" },
                      ]}
                    >
                      <View
                        style={[
                          styles.stockPillDot,
                          { backgroundColor: stockInfo.color },
                        ]}
                      />
                      <ThemedText
                        style={[
                          styles.stockPillText,
                          { color: stockInfo.color },
                        ]}
                      >
                        {stockInfo.label}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.imageContainer}>
                <FlatList
                  ref={imageScrollRef}
                  data={images}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  bounces={false}
                  overScrollMode="never"
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  snapToInterval={SCREEN_WIDTH}
                  snapToAlignment="start"
                  disableIntervalMomentum
                  getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                    );
                    if (index >= 0 && index < images.length) {
                      setCurrentImageIndex(index);
                    }
                  }}
                  keyExtractor={(item, index) => `image-${index}`}
                  renderItem={({ item }) => (
                    <Image
                      source={{ uri: item }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  )}
                />
                {hasMultipleImages && (
                  <>
                    <View style={styles.imageIndicatorContainer}>
                      {images.map((_, index) => (
                        <Pressable
                          key={index}
                          onPress={() => {
                            imageScrollRef.current?.scrollToIndex({
                              index,
                              animated: true,
                            });
                            setCurrentImageIndex(index);
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                          }}
                          style={[
                            styles.imageIndicator,
                            index === currentImageIndex &&
                              styles.imageIndicatorActive,
                          ]}
                        />
                      ))}
                    </View>
                    {/* Left/Right Navigation Buttons - Desktop only */}
                    {Platform.OS === "web" && currentImageIndex > 0 && (
                      <Pressable
                        style={[
                          styles.carouselNavBtn,
                          styles.carouselNavBtnLeft,
                        ]}
                        onPress={() => {
                          const newIndex = currentImageIndex - 1;
                          imageScrollRef.current?.scrollToIndex({
                            index: newIndex,
                            animated: true,
                          });
                          setCurrentImageIndex(newIndex);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }}
                      >
                        <Feather name="chevron-left" size={24} color="#fff" />
                      </Pressable>
                    )}
                    {Platform.OS === "web" &&
                      currentImageIndex < images.length - 1 && (
                        <Pressable
                          style={[
                            styles.carouselNavBtn,
                            styles.carouselNavBtnRight,
                          ]}
                          onPress={() => {
                            const newIndex = currentImageIndex + 1;
                            imageScrollRef.current?.scrollToIndex({
                              index: newIndex,
                              animated: true,
                            });
                            setCurrentImageIndex(newIndex);
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                          }}
                        >
                          <Feather
                            name="chevron-right"
                            size={24}
                            color="#fff"
                          />
                        </Pressable>
                      )}
                  </>
                )}
                <View style={styles.handle} />
              </View>
            )}

            <View style={styles.content}>
              {!compact && (
                <>
                  <View style={styles.header}>
                    <ThemedText style={styles.price}>
                      ${product.price.toFixed(2)}
                    </ThemedText>
                    <View style={styles.ratingContainer}>
                      <Feather name="star" size={14} color={theme.primary} />
                      <ThemedText style={styles.rating}>4.8</ThemedText>
                      <ThemedText
                        style={[styles.reviews, { color: theme.textSecondary }]}
                      >
                        (128 reviews)
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.name}>{product.name}</ThemedText>

                  {stockInfo.qty !== undefined && (
                    <View
                      style={[
                        styles.stockPill,
                        { backgroundColor: stockInfo.color + "15" },
                      ]}
                    >
                      <View
                        style={[
                          styles.stockPillDot,
                          { backgroundColor: stockInfo.color },
                        ]}
                      />
                      <ThemedText
                        style={[
                          styles.stockPillText,
                          { color: stockInfo.color },
                        ]}
                      >
                        {stockInfo.label}
                      </ThemedText>
                    </View>
                  )}

                  <Pressable
                    style={styles.sellerRow}
                    onPress={() => {
                      if (product.sellerId) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onClose();
                        // @ts-ignore - navigation works from both HomeStack and ExploreStack
                        navigation.navigate("StoreProfile", {
                          storeId: product.sellerId,
                        });
                      }
                    }}
                  >
                    {product.sellerAvatar ? (
                      <Image
                        source={{ uri: product.sellerAvatar }}
                        style={styles.sellerAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.sellerAvatar,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                      >
                        <Feather
                          name="user"
                          size={14}
                          color={theme.textSecondary}
                        />
                      </View>
                    )}
                    <ThemedText
                      style={[
                        styles.sellerName,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {product.sellerName}
                    </ThemedText>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={theme.textSecondary}
                    />
                  </Pressable>

                  <View style={styles.divider} />
                </>
              )}

              {/* Color Variants */}
              {hasColors && (
                <>
                  <ThemedText style={styles.sectionTitle}>Color</ThemedText>
                  <View style={styles.colorOptions}>
                    {activeColors.filter(isColorAvailable).map((color) => {
                      const colorOOS = isColorOutOfStock(color);
                      return (
                        <Pressable
                          key={color.id}
                          onPress={
                            colorOOS
                              ? undefined
                              : () => handleColorSelect(color)
                          }
                          disabled={colorOOS}
                          style={[
                            styles.colorOption,
                            selectedColor?.id === color.id && {
                              borderColor: theme.primary,
                              backgroundColor: theme.primary + "10",
                            },
                            colorOOS && styles.variantOptionOOS,
                          ]}
                        >
                          <View style={{ position: "relative" }}>
                            <View
                              style={[
                                styles.colorSwatch,
                                { backgroundColor: color.hexCode || "#ccc" },
                              ]}
                            />
                            {colorOOS && (
                              <View style={styles.swatchStrikethrough} />
                            )}
                          </View>
                          <ThemedText
                            style={[
                              styles.colorName,
                              selectedColor?.id === color.id && {
                                color: theme.primary,
                                fontWeight: "600",
                              },
                              colorOOS && { color: theme.textSecondary },
                            ]}
                          >
                            {color.name}
                          </ThemedText>
                          {colorOOS && (
                            <View style={styles.optionStrikethrough} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {/* Size Variants */}
              {hasSizes && (
                <>
                  <ThemedText style={styles.sectionTitle}>Size</ThemedText>
                  <View style={styles.sizeOptions}>
                    {activeSizes.filter(isSizeAvailable).map((size) => {
                      const sizeOOS = isSizeOutOfStock(size);
                      return (
                        <Pressable
                          key={size.id}
                          onPress={
                            sizeOOS ? undefined : () => handleSizeSelect(size)
                          }
                          disabled={sizeOOS}
                          style={[
                            styles.sizeOption,
                            selectedSize?.id === size.id && {
                              borderColor: theme.primary,
                              backgroundColor: theme.primary + "10",
                            },
                            sizeOOS && styles.variantOptionOOS,
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.sizeName,
                              selectedSize?.id === size.id && {
                                color: theme.primary,
                              },
                              sizeOOS && { color: theme.textSecondary },
                            ]}
                          >
                            {size.name}
                          </ThemedText>
                          {sizeOOS && (
                            <View style={styles.optionStrikethrough} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {!compact && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Description
                  </ThemedText>
                  <ThemedText
                    style={[styles.description, { color: theme.textSecondary }]}
                  >
                    {product.description || "No description available."}
                  </ThemedText>

                  <View style={styles.features}>
                    <View style={styles.featureItem}>
                      <View
                        style={[
                          styles.featureIcon,
                          { backgroundColor: theme.primary + "15" },
                        ]}
                      >
                        <Feather name="truck" size={18} color={theme.primary} />
                      </View>
                      <View>
                        <ThemedText style={styles.featureTitle}>
                          Free Shipping
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.featureSubtitle,
                            { color: theme.textSecondary },
                          ]}
                        >
                          On orders over $50
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.featureItem}>
                      <View
                        style={[
                          styles.featureIcon,
                          { backgroundColor: theme.secondary + "15" },
                        ]}
                      >
                        <Feather
                          name="refresh-cw"
                          size={18}
                          color={theme.secondary}
                        />
                      </View>
                      <View>
                        <ThemedText style={styles.featureTitle}>
                          Easy Returns
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.featureSubtitle,
                            { color: theme.textSecondary },
                          ]}
                        >
                          30-day return policy
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {!hidePurchaseActions && (
            <View
              style={[
                styles.actions,
                {
                  paddingBottom: bottomOffset,
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.cartButton,
                  { backgroundColor: theme.backgroundSecondary },
                  (isAddingToCart || stockInfo.qty === 0) &&
                    styles.cartButtonDisabled,
                ]}
                onPress={handleAddToCart}
                disabled={isAddingToCart || stockInfo.qty === 0}
              >
                <Feather
                  name={isAddingToCart ? "loader" : "shopping-bag"}
                  size={22}
                  color={
                    stockInfo.qty === 0 ? theme.textSecondary : theme.primary
                  }
                />
              </Pressable>
              <Button
                style={[
                  styles.buyButton,
                  stockInfo.qty === 0 && styles.buyButtonDisabled,
                ]}
                onPress={handleBuyNow}
                disabled={
                  isAddingToCart ||
                  !isVariantSelectionComplete ||
                  stockInfo.qty === 0
                }
              >
                {stockInfo.qty === 0
                  ? "Out of Stock"
                  : isAddingToCart
                    ? "Adding..."
                    : "Buy Now"}
              </Button>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropCompact: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  sheet: {
    position: "relative",
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: "hidden",
    zIndex: 30,
    elevation: 30,
  },
  sheetCompact: {
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  compactHeader: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: "center",
  },
  compactThumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  compactInfo: {
    flex: 1,
    gap: 4,
  },
  imageContainer: {
    position: "relative",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 3,
    alignSelf: "center",
    position: "absolute",
    top: 10,
    zIndex: 10,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
  },
  closeBlur: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
  },
  carouselNavBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  carouselNavBtnLeft: {
    left: Spacing.md,
  },
  carouselNavBtnRight: {
    right: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
  },
  reviews: {
    fontSize: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  sellerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  stockPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stockPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  features: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },
  cartButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cartButtonDisabled: {
    opacity: 0.5,
  },
  buyButton: {
    flex: 1,
    height: 56,
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  imageIndicatorContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  imageIndicatorActive: {
    backgroundColor: "#fff",
    width: 20,
  },
  colorOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  colorOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  colorOptionSelected: {},
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  colorName: {
    fontSize: 14,
    fontWeight: "500",
  },
  colorNameSelected: {
    fontWeight: "600",
  },
  sizeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sizeOption: {
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  sizeOptionSelected: {},
  sizeName: {
    fontSize: 14,
    fontWeight: "600",
  },
  sizeNameSelected: {},
  variantOptionOOS: {
    opacity: 0.5,
  },
  variantNameOOS: {},
  swatchStrikethrough: {
    position: "absolute",
    top: 10,
    left: -2,
    width: 28,
    height: 2,
    backgroundColor: "#EF4444",
    transform: [{ rotate: "-45deg" }],
  },
  optionStrikethrough: {
    position: "absolute",
    top: "50%",
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: "#EF4444",
    borderRadius: 1,
    transform: [{ rotate: "-12deg" }],
  },
});
