import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Product } from "@/types";

interface ProductSelectionSheetProps {
  visible: boolean;
  products: Product[];
  selectedIds: string[];
  onToggleProduct: (productId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

interface ProductItemProps {
  product: Product;
  isSelected: boolean;
  onToggle: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ProductItem({ product, isSelected, onToggle }: ProductItemProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.productItem,
        { backgroundColor: theme.backgroundDefault },
        isSelected && { borderColor: Colors.light.primary, borderWidth: 2 },
      ]}
      testID={`select-product-${product.id}`}
    >
      <Image
        source={{ uri: product.image }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText style={[styles.productPrice, { color: theme.primary }]}>
          ${product.price.toFixed(2)}
        </ThemedText>
      </View>
      <View
        style={[
          styles.checkbox,
          isSelected && { backgroundColor: Colors.light.primary },
          { borderColor: isSelected ? Colors.light.primary : theme.border },
        ]}
      >
        {isSelected ? (
          <Feather name="check" size={14} color={Colors.light.buttonText} />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export function ProductSelectionSheet({
  visible,
  products,
  selectedIds,
  onToggleProduct,
  onClose,
  onConfirm,
}: ProductSelectionSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Add Products</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Select products to show in your live stream
          </ThemedText>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ProductItem
                product={item}
                isSelected={selectedIds.includes(item.id)}
                onToggle={() => onToggleProduct(item.id)}
              />
            )}
          />
          <View style={styles.footer}>
            <Button onPress={onConfirm} style={styles.confirmButton}>
              Add {selectedIds.length} Products
            </Button>
          </View>
        </View>
      </Animated.View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
    ...Shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    position: "relative",
    ...Shadows.sm,
  },
  productImage: {
    width: 64,
    height: 64,
  },
  productInfo: {
    padding: Spacing.sm,
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  checkbox: {
    marginRight: Spacing.md,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  confirmButton: {
    width: "100%",
  },
});
