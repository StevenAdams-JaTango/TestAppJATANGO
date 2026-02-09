import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/contexts/CartContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { StoreCart, CartItem, getStoreTotal, getCartTotal } from "@/types/cart";

interface CartBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCheckout?: () => void;
  onStoreCheckout?: (sellerId: string) => void;
}

export function CartBottomSheet({
  visible,
  onClose,
  onCheckout,
  onStoreCheckout,
}: CartBottomSheetProps) {
  const { theme } = useTheme();
  const { cart, updateQuantity, removeItem, totalItems } = useCart();
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const handleQuantityChange = async (
    sellerId: string,
    item: CartItem,
    delta: number,
  ) => {
    const newQuantity = item.quantity + delta;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newQuantity <= 0) {
      setConfirmDialog({
        visible: true,
        title: "Remove Item",
        message: "Remove this item from your cart?",
        onConfirm: async () => {
          setConfirmDialog({ ...confirmDialog, visible: false });
          const result = await removeItem(sellerId, item.id);
          if (!result.success) {
            Alert.alert("Error", result.message || "Failed to remove item");
          }
        },
      });
    } else {
      const result = await updateQuantity(sellerId, item.id, newQuantity);
      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to update quantity");
      }
    }
  };

  const handleRemoveItem = (sellerId: string, item: CartItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDialog({
      visible: true,
      title: "Remove Item",
      message: `Remove ${item.product.name} from your cart?`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, visible: false });
        const result = await removeItem(sellerId, item.id);
        if (!result.success) {
          Alert.alert("Error", result.message || "Failed to remove item");
        }
      },
    });
  };

  const getItemPrice = (item: CartItem): number => {
    return (
      item.selectedVariant?.price ??
      item.selectedColor?.price ??
      item.selectedSize?.price ??
      item.product.price
    );
  };

  const renderCartItem = (item: CartItem, sellerId: string) => {
    const price = getItemPrice(item);
    const variantInfo = [item.selectedColor?.name, item.selectedSize?.name]
      .filter(Boolean)
      .join(" / ");

    return (
      <View
        key={item.id}
        style={[
          styles.cartItem,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Product Info Row */}
        <View style={styles.itemHeader}>
          <Image
            source={{ uri: item.product.image }}
            style={[
              styles.itemImage,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          />
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemName} numberOfLines={2}>
              {item.product.name}
            </ThemedText>
            {variantInfo ? (
              <ThemedText
                style={[styles.itemVariant, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {variantInfo}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Price and Actions Row */}
        <View style={[styles.itemActions, { borderTopColor: theme.border }]}>
          <View style={styles.priceSection}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Price
            </ThemedText>
            <ThemedText style={[styles.itemPrice, { color: theme.primary }]}>
              ${price.toFixed(2)}
            </ThemedText>
          </View>

          <View style={styles.quantitySection}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Qty
            </ThemedText>
            <View style={styles.quantityControls}>
              <Pressable
                style={[
                  styles.quantityButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
                onPress={() => handleQuantityChange(sellerId, item, -1)}
              >
                <Feather name="minus" size={14} color={theme.text} />
              </Pressable>
              <ThemedText style={styles.quantity}>{item.quantity}</ThemedText>
              <Pressable
                style={[
                  styles.quantityButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
                onPress={() => handleQuantityChange(sellerId, item, 1)}
              >
                <Feather name="plus" size={14} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.totalSection}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Total
            </ThemedText>
            <ThemedText style={[styles.itemTotal, { color: theme.primary }]}>
              ${(price * item.quantity).toFixed(2)}
            </ThemedText>
          </View>

          <Pressable
            style={[styles.removeButton, { backgroundColor: "#fef2f2" }]}
            onPress={() => handleRemoveItem(sellerId, item)}
          >
            <Feather name="trash-2" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderStoreSection = (store: StoreCart) => {
    const storeTotal = getStoreTotal(store);

    return (
      <View key={store.sellerId} style={styles.storeSection}>
        <View style={styles.storeHeader}>
          <ThemedText style={styles.storeName}>{store.sellerName}</ThemedText>
          <ThemedText style={[styles.storeTotal, { color: theme.primary }]}>
            ${storeTotal.toFixed(2)}
          </ThemedText>
        </View>
        {store.items.map((item) => renderCartItem(item, store.sellerId))}
        {onStoreCheckout && (
          <Pressable
            style={[
              styles.storeCheckoutButton,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStoreCheckout(store.sellerId);
              onClose();
            }}
          >
            <Feather name="credit-card" size={16} color="#fff" />
            <ThemedText style={styles.storeCheckoutText}>
              Checkout ${storeTotal.toFixed(2)}
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  if (!visible) return null;

  const cartTotal = getCartTotal(cart);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <Animated.View
        entering={SlideInDown.springify()}
        exiting={SlideOutDown.springify()}
        style={[styles.sheet, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Cart ({totalItems})</ThemedText>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        {totalItems === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather
              name="shopping-cart"
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText style={styles.emptyText}>Your cart is empty</ThemedText>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {cart.stores.map(renderStoreSection)}
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderTopColor: theme.border,
                },
              ]}
            >
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Total</ThemedText>
                <ThemedText
                  style={[styles.totalAmount, { color: theme.primary }]}
                >
                  ${cartTotal.toFixed(2)}
                </ThemedText>
              </View>
              <Button
                style={styles.checkoutButton}
                onPress={() => {
                  onCheckout?.();
                  onClose();
                }}
              >
                Checkout
              </Button>
            </View>
          </>
        )}
      </Animated.View>

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    ...Shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  storeSection: {
    marginBottom: Spacing.md,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  storeTotal: {
    fontSize: 15,
    fontWeight: "700",
  },
  cartItem: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  itemHeader: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 12,
    lineHeight: 16,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  priceSection: {
    alignItems: "center",
  },
  quantitySection: {
    flex: 1,
    alignItems: "center",
  },
  totalSection: {
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  checkoutButton: {
    width: "100%",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  storeCheckoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  storeCheckoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
