import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/contexts/CartContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { StoreCart, CartItem, getStoreTotal } from "@/types/cart";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { cart, updateQuantity, removeItem, clearStoreCart, totalItems } =
    useCart();

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

  const handleClearStore = (store: StoreCart) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDialog({
      visible: true,
      title: "Clear Cart",
      message: `Remove all items from ${store.sellerName}?`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, visible: false });
        const result = await clearStoreCart(store.sellerId);
        if (!result.success) {
          Alert.alert("Error", result.message || "Failed to clear cart");
        }
      },
    });
  };

  const handleVisitStore = (sellerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to store profile - using any to bypass type checking for now
    (navigation as any).navigate("StoreProfile", { sellerId });
  };

  const getItemPrice = (item: CartItem): number => {
    return (
      item.selectedVariant?.price ??
      item.selectedColor?.price ??
      item.selectedSize?.price ??
      item.product.price
    );
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  const renderCartItem = (store: StoreCart, item: CartItem) => {
    const price = getItemPrice(item);
    const variantText = [item.selectedColor?.name, item.selectedSize?.name]
      .filter(Boolean)
      .join(" / ");

    return (
      <View
        key={item.id}
        style={[
          styles.cartItem,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Product Image and Info Row */}
        <View style={styles.itemHeader}>
          <Image
            source={{ uri: item.product.image }}
            style={styles.itemImage}
          />
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemName} numberOfLines={2}>
              {item.product.name}
            </ThemedText>
            {variantText ? (
              <ThemedText
                style={[styles.itemVariant, { color: theme.textSecondary }]}
              >
                {variantText}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Price and Actions Row */}
        <View style={[styles.itemActions, { borderTopColor: theme.border }]}>
          <View style={styles.priceSection}>
            <ThemedText
              style={[styles.priceLabel, { color: theme.textSecondary }]}
            >
              PRICE
            </ThemedText>
            <ThemedText style={[styles.itemPrice, { color: theme.primary }]}>
              {formatPrice(price)}
            </ThemedText>
          </View>

          <View style={styles.quantitySection}>
            <ThemedText
              style={[styles.quantityLabel, { color: theme.textSecondary }]}
            >
              QTY
            </ThemedText>
            <View style={styles.quantityControls}>
              <Pressable
                style={[
                  styles.quantityButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => handleQuantityChange(store.sellerId, item, -1)}
              >
                <Feather name="minus" size={18} color={theme.text} />
              </Pressable>
              <ThemedText style={styles.quantityText}>
                {item.quantity}
              </ThemedText>
              <Pressable
                style={[
                  styles.quantityButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => handleQuantityChange(store.sellerId, item, 1)}
              >
                <Feather name="plus" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.totalSection}>
            <ThemedText
              style={[styles.totalLabel, { color: theme.textSecondary }]}
            >
              TOTAL
            </ThemedText>
            <ThemedText style={[styles.itemTotal, { color: theme.primary }]}>
              {formatPrice(price * item.quantity)}
            </ThemedText>
          </View>

          <Pressable
            style={[
              styles.removeButton,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={() => handleRemoveItem(store.sellerId, item)}
          >
            <Feather name="trash-2" size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderStoreSection = (store: StoreCart) => {
    const storeTotal = getStoreTotal(store);

    return (
      <View
        key={store.sellerId}
        style={[
          styles.storeSection,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.storeHeader,
            {
              backgroundColor: theme.backgroundRoot,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Pressable
            style={styles.storeInfo}
            onPress={() => handleVisitStore(store.sellerId)}
          >
            {store.sellerAvatar ? (
              <Image
                source={{ uri: store.sellerAvatar }}
                style={styles.storeAvatar}
              />
            ) : (
              <View
                style={[
                  styles.storeAvatar,
                  styles.storeAvatarPlaceholder,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="shopping-bag" size={16} color={theme.text} />
              </View>
            )}
            <View>
              <ThemedText style={styles.storeName}>
                {store.sellerName}
              </ThemedText>
              <ThemedText
                style={[styles.storeItemCount, { color: theme.textSecondary }]}
              >
                {store.items.length} item{store.items.length !== 1 ? "s" : ""}
              </ThemedText>
            </View>
          </Pressable>
          <Pressable
            style={styles.clearStoreButton}
            onPress={() => handleClearStore(store)}
          >
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.itemsList}>
          {store.items.map((item) => renderCartItem(store, item))}
        </View>

        <View style={[styles.storeFooter, { borderTopColor: theme.border }]}>
          <View style={styles.storeFooterRow}>
            <ThemedText
              style={[styles.subtotalLabel, { color: theme.textSecondary }]}
            >
              Subtotal
            </ThemedText>
            <ThemedText
              style={[styles.subtotalValue, { color: theme.primary }]}
            >
              {formatPrice(storeTotal)}
            </ThemedText>
          </View>
          <Button
            style={styles.storeCheckoutButton}
            onPress={() =>
              navigation.navigate("Checkout", { sellerId: store.sellerId })
            }
          >
            Checkout — {formatPrice(storeTotal)}
          </Button>
        </View>
      </View>
    );
  };

  if (totalItems === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Cart</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather
              name="shopping-cart"
              size={48}
              color={theme.textSecondary}
            />
          </View>
          <ThemedText style={styles.emptyTitle}>Your cart is empty</ThemedText>
          <ThemedText
            style={[styles.emptyMessage, { color: theme.textSecondary }]}
          >
            Browse products and add items to your cart
          </ThemedText>
          <Button
            style={styles.emptyButton}
            onPress={() =>
              (navigation as any).navigate("Main", { screen: "ExploreTab" })
            }
          >
            Start Shopping
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          MY CART ({totalItems})
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {cart.stores.map(renderStoreSection)}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  storeSection: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  storeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  storeAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  storeItemCount: {
    fontSize: 12,
  },
  clearStoreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  itemsList: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cartItem: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: "transparent",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  itemVariant: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  priceSection: {
    alignItems: "flex-start",
    minWidth: 60,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  quantitySection: {
    alignItems: "center",
    flex: 1,
  },
  quantityLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  totalSection: {
    alignItems: "flex-end",
    minWidth: 60,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  storeFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  storeFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  subtotalLabel: {
    fontSize: 14,
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  storeCheckoutButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: Spacing.xl,
  },
});
