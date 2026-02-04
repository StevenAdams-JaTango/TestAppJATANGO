import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Product } from "@/types";

interface ProductCarouselProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  visible: boolean;
}

interface CarouselItemProps {
  product: Product;
  onPress: () => void;
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CarouselItem({ product, onPress, index }: CarouselItemProps) {
  const scale = useSharedValue(1);
  const [imageError, setImageError] = React.useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Check if image URL is valid (not a blob URL which won't work across clients)
  const hasValidImage =
    product.image && !product.image.startsWith("blob:") && !imageError;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.itemWrapper}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.item, animatedStyle]}
        testID={`carousel-product-${product.id}`}
      >
        {hasValidImage ? (
          <Image
            source={{ uri: product.image }}
            style={styles.itemImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Feather name="package" size={32} color={Colors.light.secondary} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <ThemedText style={styles.itemPrice}>
            ${product.price.toFixed(2)}
          </ThemedText>
          <ThemedText style={styles.itemName} numberOfLines={1}>
            {product.name}
          </ThemedText>
        </View>
        <View style={styles.buyButton}>
          <Feather
            name="shopping-cart"
            size={14}
            color={Colors.light.buttonText}
          />
          <ThemedText style={styles.buyText}>Buy</ThemedText>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function ProductCarousel({
  products,
  onProductPress,
  visible,
}: ProductCarouselProps) {
  const translateY = useSharedValue(100);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 100, {
      damping: 15,
      stiffness: 100,
    });
  }, [translateY, visible]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
  }));

  if (products.length === 0) return null;

  return (
    <Animated.View
      style={[styles.containerWrapper, animatedContainerStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <BlurView intensity={15} tint="light" style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {products.map((product, index) => (
            <CarouselItem
              key={product.id}
              product={product}
              onPress={() => onProductPress(product)}
              index={index}
            />
          ))}
        </ScrollView>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  containerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingVertical: Spacing.md,
    ...Shadows.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  itemWrapper: {
    marginRight: Spacing.sm,
  },
  item: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    width: 130,
    ...Shadows.md,
  },
  itemImage: {
    width: "100%",
    height: 100,
  },
  itemInfo: {
    padding: Spacing.xs,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  itemName: {
    fontSize: 11,
    color: Colors.light.text,
    marginTop: 2,
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  buyText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.buttonText,
  },
  itemImagePlaceholder: {
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
