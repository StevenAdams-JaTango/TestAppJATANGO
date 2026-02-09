import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStripe } from "@/hooks/useStripePayment";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { checkoutService } from "@/services/checkout";
import { settingsService, SavedPaymentMethod } from "@/services/settings";
import { BorderRadius, Spacing } from "@/constants/theme";
import { StoreCart, Cart, getStoreTotal } from "@/types/cart";
import { ShippingAddress } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CheckoutRouteProp = RouteProp<RootStackParamList, "Checkout">;

const isWeb = Platform.OS === "web";

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckoutRouteProp>();
  const { cart, clearStoreCart } = useCart();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { sellerId } = route.params;
  const store = cart.stores.find((s) => s.sellerId === sellerId);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Web checkout state
  const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [isLoadingData, setIsLoadingData] = useState(false);

  const storeTotal = store ? getStoreTotal(store) : 0;
  const totalItems = store
    ? store.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  // Build a single-store cart for the checkout service
  const storeCart: Cart = {
    stores: store ? [store] : [],
    updatedAt: cart.updatedAt,
  };

  // Load saved cards and addresses for web checkout
  useEffect(() => {
    if (!isWeb || !user?.id || totalItems === 0) return;

    let cancelled = false;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [cards, addrs] = await Promise.all([
          settingsService.fetchPaymentMethods(user.id),
          settingsService.fetchAddresses(user.id),
        ]);

        if (cancelled) return;

        setSavedCards(cards);
        setAddresses(addrs);

        // Auto-select defaults
        const defaultCard = cards.find((c) => c.isDefault) || cards[0];
        if (defaultCard) setSelectedCardId(defaultCard.id);

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);

        setIsInitialized(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[Checkout] Failed to load checkout data:", err);
        }
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user?.id, totalItems]);

  // Initialize Stripe PaymentSheet for native
  useEffect(() => {
    if (isWeb || !user?.id || totalItems === 0) return;

    let cancelled = false;

    const init = async () => {
      try {
        setIsLoading(true);
        const {
          clientSecret,
          paymentIntentId: piId,
          ephemeralKey,
          customerId,
        } = await checkoutService.createPaymentIntent(
          storeCart,
          user.id,
          user.email || undefined,
        );

        if (cancelled) return;

        setPaymentIntentId(piId);

        const { error } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: "JaTango",
          customerId,
          customerEphemeralKeySecret: ephemeralKey,
          defaultBillingDetails: {
            email: user.email,
          },
        });

        if (error) {
          console.error("[Checkout] PaymentSheet init error:", error);
          Alert.alert(
            "Error",
            "Failed to initialize payment. Please try again.",
          );
        } else {
          setIsInitialized(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[Checkout] Init error:", err);
          Alert.alert(
            "Error",
            err.message || "Failed to set up payment. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email, totalItems]);

  // Web: pay with saved card
  const handleWebPay = async () => {
    if (!user?.id || !selectedCardId) return;

    if (!selectedAddressId) {
      window.alert("Please select a shipping address.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
      const result = await checkoutService.payWithSavedCard(
        storeCart,
        user.id,
        selectedCardId,
        user.email || undefined,
        selectedAddr
          ? {
              name: selectedAddr.name,
              addressLine1: selectedAddr.addressLine1,
              addressLine2: selectedAddr.addressLine2 || undefined,
              city: selectedAddr.city,
              state: selectedAddr.state,
              zip: selectedAddr.zip,
              country: selectedAddr.country,
              phone: selectedAddr.phone || undefined,
            }
          : undefined,
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await clearStoreCart(sellerId);

      navigation.replace("OrderConfirmation", {
        orderId: result.orderId,
        totalAmount: result.totalAmount,
      });
    } catch (err: any) {
      console.error("[Checkout] Web payment error:", err);
      window.alert(err.message || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Native: pay with PaymentSheet
  const handleNativePay = async () => {
    if (!isInitialized || !paymentIntentId || !user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === "Canceled") {
          setIsLoading(false);
          return;
        }
        console.error("[Checkout] Payment error:", error);
        Alert.alert("Payment Failed", error.message);
        setIsLoading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const result = await checkoutService.confirmOrder(
        paymentIntentId,
        storeCart,
        user.id,
        undefined, // shippingAddress — native flow doesn't select address yet
      );

      await clearStoreCart(sellerId);

      navigation.replace("OrderConfirmation", {
        orderId: result.orderId,
        totalAmount: result.totalAmount,
      });
    } catch (err: any) {
      console.error("[Checkout] Confirm error:", err);
      Alert.alert(
        "Order Error",
        err.message ||
          "Payment was processed but order creation failed. Please contact support.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = isWeb ? handleWebPay : handleNativePay;

  const canPay = isWeb
    ? !!selectedCardId && !!selectedAddressId && !isLoading
    : isInitialized && !isLoading;

  const getItemPrice = (item: any): number => {
    return (
      item.selectedVariant?.price ??
      item.selectedColor?.price ??
      item.selectedSize?.price ??
      item.product.price
    );
  };

  const getCardIcon = (_brand: string): "credit-card" => {
    return "credit-card";
  };

  const renderStoreSection = (storeSection: StoreCart) => {
    const total = getStoreTotal(storeSection);

    return (
      <View
        key={storeSection.sellerId}
        style={[
          styles.storeSection,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={[styles.storeHeader, { borderBottomColor: theme.border }]}>
          <ThemedText style={styles.storeName}>
            {storeSection.sellerName}
          </ThemedText>
          <ThemedText style={styles.storeTotal}>${total.toFixed(2)}</ThemedText>
        </View>

        {storeSection.items.map((item) => {
          const price = getItemPrice(item);
          const variantText = [
            item.selectedColor?.name,
            item.selectedSize?.name,
          ]
            .filter(Boolean)
            .join(" / ");

          return (
            <View key={item.id} style={styles.orderItem}>
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
                <View style={styles.itemPriceRow}>
                  <ThemedText style={styles.itemPrice}>
                    ${price.toFixed(2)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.itemQty, { color: theme.textSecondary }]}
                  >
                    x{item.quantity}
                  </ThemedText>
                  <ThemedText style={styles.itemTotal}>
                    ${(price * item.quantity).toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        })}
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
          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="shopping-cart" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.emptyText}>Your cart is empty</ThemedText>
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
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Web: Payment Method Selection */}
        {isWeb && (
          <>
            <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
            {isLoadingData ? (
              <ActivityIndicator
                size="small"
                color={theme.primary}
                style={styles.sectionLoader}
              />
            ) : savedCards.length === 0 ? (
              <Pressable
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.backgroundRoot,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => navigation.navigate("SavedPaymentMethods")}
              >
                <Feather name="plus-circle" size={20} color={theme.primary} />
                <ThemedText
                  style={[styles.emptyCardText, { color: theme.primary }]}
                >
                  Add a payment method
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.selectionList}>
                {savedCards.map((card) => (
                  <Pressable
                    key={card.id}
                    style={[
                      styles.selectionItem,
                      {
                        backgroundColor: theme.backgroundRoot,
                        borderColor:
                          selectedCardId === card.id
                            ? theme.primary
                            : theme.border,
                        borderWidth: selectedCardId === card.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedCardId(card.id)}
                  >
                    <Feather
                      name={getCardIcon(card.brand)}
                      size={20}
                      color={theme.text}
                    />
                    <View style={styles.selectionInfo}>
                      <ThemedText style={styles.selectionTitle}>
                        {card.brand} •••• {card.last4}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.selectionSubtitle,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Expires {card.expMonth}/{card.expYear}
                      </ThemedText>
                    </View>
                    {selectedCardId === card.id && (
                      <Feather
                        name="check-circle"
                        size={20}
                        color={theme.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            <ThemedText style={styles.sectionTitle}>
              Shipping Address
            </ThemedText>
            {isLoadingData ? (
              <ActivityIndicator
                size="small"
                color={theme.primary}
                style={styles.sectionLoader}
              />
            ) : addresses.length === 0 ? (
              <Pressable
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.backgroundRoot,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => navigation.navigate("ShippingAddresses")}
              >
                <Feather name="plus-circle" size={20} color={theme.primary} />
                <ThemedText
                  style={[styles.emptyCardText, { color: theme.primary }]}
                >
                  Add a shipping address
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.selectionList}>
                {addresses.map((addr) => (
                  <Pressable
                    key={addr.id}
                    style={[
                      styles.selectionItem,
                      {
                        backgroundColor: theme.backgroundRoot,
                        borderColor:
                          selectedAddressId === addr.id
                            ? theme.primary
                            : theme.border,
                        borderWidth: selectedAddressId === addr.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedAddressId(addr.id)}
                  >
                    <Feather name="map-pin" size={20} color={theme.text} />
                    <View style={styles.selectionInfo}>
                      <ThemedText style={styles.selectionTitle}>
                        {addr.name}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.selectionSubtitle,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {addr.addressLine1}, {addr.city}, {addr.state}{" "}
                        {addr.zip}
                      </ThemedText>
                    </View>
                    {selectedAddressId === addr.id && (
                      <Feather
                        name="check-circle"
                        size={20}
                        color={theme.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
        {storeCart.stores.map(renderStoreSection)}

        <View
          style={[
            styles.totalCard,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.totalRow}>
            <ThemedText
              style={[styles.totalLabel, { color: theme.textSecondary }]}
            >
              Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})
            </ThemedText>
            <ThemedText style={styles.totalValue}>
              ${storeTotal.toFixed(2)}
            </ThemedText>
          </View>
          <View style={styles.totalRow}>
            <ThemedText
              style={[styles.totalLabel, { color: theme.textSecondary }]}
            >
              Shipping
            </ThemedText>
            <ThemedText style={[styles.totalValue, { color: theme.success }]}>
              Free
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.totalRow}>
            <ThemedText style={styles.grandTotalLabel}>Total</ThemedText>
            <ThemedText
              style={[styles.grandTotalValue, { color: theme.primary }]}
            >
              ${storeTotal.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.testModeNotice}>
          <Feather name="info" size={16} color={theme.secondary} />
          <ThemedText
            style={[styles.testModeText, { color: theme.textSecondary }]}
          >
            Test mode — use card 4242 4242 4242 4242 with any future expiry and
            any CVC.
          </ThemedText>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <Button
          style={[styles.payButton, !canPay && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={!canPay}
        >
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <ThemedText style={styles.payButtonText}>
                Processing...
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.payButtonText}>
              Pay ${storeTotal.toFixed(2)}
            </ThemedText>
          )}
        </Button>
      </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  sectionLoader: {
    paddingVertical: Spacing.lg,
  },
  selectionList: {
    gap: Spacing.sm,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: "600",
  },
  storeSection: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  storeTotal: {
    fontSize: 15,
    fontWeight: "700",
  },
  orderItem: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: "transparent",
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemVariant: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "600",
  },
  itemQty: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: "auto",
  },
  totalCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  testModeNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  testModeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  payButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
