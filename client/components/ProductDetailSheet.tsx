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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { Product, ColorVariant, SizeVariant } from "@/types";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { ExploreStackParamList } from "@/navigation/ExploreStackNavigator";

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
}

export function ProductDetailSheet({
  product,
  visible,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeVariant | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<FlatList>(null);

  if (!product) return null;

  // Filter out archived variants, colors, and sizes - only show active ones to customers
  const activeVariants = product.variants?.filter((v) => !v.isArchived) || [];

  // Show colors that are not archived AND have at least one active variant using them
  const activeColors =
    product.colors?.filter(
      (c) =>
        !c.isArchived &&
        (activeVariants.some((v) => v.colorId === c.id) ||
          !product.variants?.length),
    ) || [];

  // Show sizes that are not archived AND have at least one active variant using them
  const activeSizes =
    product.sizes?.filter(
      (s) =>
        !s.isArchived &&
        (activeVariants.some((v) => v.sizeId === s.id) ||
          !product.variants?.length),
    ) || [];

  const hasColors = activeColors.length > 0;
  const hasSizes = activeSizes.length > 0;

  // Get available sizes for the selected color (only sizes with active variants for this color)
  const availableSizesForColor = selectedColor
    ? activeSizes.filter((s) =>
        activeVariants.some(
          (v) => v.colorId === selectedColor.id && v.sizeId === s.id,
        ),
      )
    : activeSizes;

  // Get available colors for the selected size (only colors with active variants for this size)
  const availableColorsForSize = selectedSize
    ? activeColors.filter((c) =>
        activeVariants.some(
          (v) => v.sizeId === selectedSize.id && v.colorId === c.id,
        ),
      )
    : activeColors;

  // Get the current variant based on selected color and size
  const currentVariant = activeVariants.find(
    (v) => v.colorId === selectedColor?.id && v.sizeId === selectedSize?.id,
  );

  // Check if an image URL is valid (not a blob URL or empty)
  const isValidImageUrl = (url?: string) => {
    if (!url) return false;
    // Blob URLs are temporary and may have expired
    if (url.startsWith("blob:")) return false;
    return true;
  };

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

  const handleAddToCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddToCart?.(product);
  };

  const handleBuyNow = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
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
            contentContainerStyle={styles.scrollContent}
          >
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
                      style={[styles.carouselNavBtn, styles.carouselNavBtnLeft]}
                      onPress={() => {
                        const newIndex = currentImageIndex - 1;
                        imageScrollRef.current?.scrollToIndex({
                          index: newIndex,
                          animated: true,
                        });
                        setCurrentImageIndex(newIndex);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                        <Feather name="chevron-right" size={24} color="#fff" />
                      </Pressable>
                    )}
                </>
              )}
              <View style={styles.handle} />
            </View>

            <View style={styles.content}>
              <View style={styles.header}>
                <ThemedText style={styles.price}>
                  ${product.price.toFixed(2)}
                </ThemedText>
                <View style={styles.ratingContainer}>
                  <Feather name="star" size={14} color={Colors.light.primary} />
                  <ThemedText style={styles.rating}>4.8</ThemedText>
                  <ThemedText
                    style={[styles.reviews, { color: theme.textSecondary }]}
                  >
                    (128 reviews)
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.name}>{product.name}</ThemedText>

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
                  style={[styles.sellerName, { color: theme.textSecondary }]}
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

              {/* Color Variants */}
              {hasColors && (
                <>
                  <ThemedText style={styles.sectionTitle}>Color</ThemedText>
                  <View style={styles.colorOptions}>
                    {availableColorsForSize.map((color) => (
                      <Pressable
                        key={color.id}
                        onPress={() => handleColorSelect(color)}
                        style={[
                          styles.colorOption,
                          selectedColor?.id === color.id &&
                            styles.colorOptionSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color.hexCode || "#ccc" },
                          ]}
                        />
                        <ThemedText
                          style={[
                            styles.colorName,
                            selectedColor?.id === color.id &&
                              styles.colorNameSelected,
                          ]}
                        >
                          {color.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {/* Size Variants */}
              {hasSizes && (
                <>
                  <ThemedText style={styles.sectionTitle}>Size</ThemedText>
                  <View style={styles.sizeOptions}>
                    {availableSizesForColor.map((size) => (
                      <Pressable
                        key={size.id}
                        onPress={() => handleSizeSelect(size)}
                        style={[
                          styles.sizeOption,
                          selectedSize?.id === size.id &&
                            styles.sizeOptionSelected,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.sizeName,
                            selectedSize?.id === size.id &&
                              styles.sizeNameSelected,
                          ]}
                        >
                          {size.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              <ThemedText style={styles.sectionTitle}>Description</ThemedText>
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
                      { backgroundColor: Colors.light.primary + "15" },
                    ]}
                  >
                    <Feather
                      name="truck"
                      size={18}
                      color={Colors.light.primary}
                    />
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
                      { backgroundColor: Colors.light.secondary + "15" },
                    ]}
                  >
                    <Feather
                      name="refresh-cw"
                      size={18}
                      color={Colors.light.secondary}
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
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.cartButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={handleAddToCart}
            >
              <Feather
                name="shopping-bag"
                size={22}
                color={Colors.light.primary}
              />
            </Pressable>
            <Button style={styles.buyButton} onPress={handleBuyNow}>
              Buy Now
            </Button>
          </View>
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
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: "hidden",
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
    color: Colors.light.primary,
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
  },
  cartButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButton: {
    flex: 1,
    height: 56,
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
  colorOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + "10",
  },
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
    color: Colors.light.primary,
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
  sizeOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + "10",
  },
  sizeName: {
    fontSize: 14,
    fontWeight: "600",
  },
  sizeNameSelected: {
    color: Colors.light.primary,
  },
});
