import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  SlideInDown,
  SlideOutDown,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ShippingRateSelector } from "@/components/ShippingRateSelector";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useStripe } from "@/hooks/useStripePayment";
import { checkoutService } from "@/services/checkout";
import { settingsService, SavedPaymentMethod } from "@/services/settings";
import { shippingService } from "@/services/shipping";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Cart, getStoreTotal } from "@/types/cart";
import { ShippingAddress, ShippingRate } from "@/types";

const isWeb = Platform.OS === "web";

interface CheckoutBottomSheetProps {
  visible: boolean;
  sellerId: string | null;
  onClose: () => void;
  onSuccess?: (orderId: string, totalAmount: number) => void;
}

export function CheckoutBottomSheet({
  visible,
  sellerId,
  onClose,
  onSuccess,
}: CheckoutBottomSheetProps) {
  const { theme } = useTheme();
  const { cart, clearStoreCart } = useCart();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    totalAmount: number;
  } | null>(null);

  // Web checkout state
  const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Shipping rate state
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShippingRate, setSelectedShippingRate] =
    useState<ShippingRate | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const store = sellerId
    ? cart.stores.find((s) => s.sellerId === sellerId)
    : null;
  const storeTotal = store ? getStoreTotal(store) : 0;
  const salesTaxRate = 0.08;
  const salesTax = Math.round(storeTotal * salesTaxRate * 100) / 100;
  const shippingCost = selectedShippingRate?.amount || 0;
  const grandTotal =
    Math.round((storeTotal + salesTax + shippingCost) * 100) / 100;
  const totalItems = store
    ? store.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  // Build a single-store cart for the checkout service
  const storeCart: Cart = {
    stores: store ? [store] : [],
    updatedAt: cart.updatedAt,
  };

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
      setOrderComplete(false);
      setOrderResult(null);
      setIsLoading(false);
      setSavedCards([]);
      setAddresses([]);
      setSelectedCardId(null);
      setSelectedAddressId(null);
      setIsLoadingData(false);
      setShippingRates([]);
      setSelectedShippingRate(null);
      setIsLoadingRates(false);
      setRatesError(null);
    }
  }, [visible]);

  // Load saved cards (web only) and addresses (all platforms)
  useEffect(() => {
    if (!visible || !user?.id || totalItems === 0) return;

    let cancelled = false;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Cards only needed on web; addresses needed everywhere
        const [cards, addrs] = await Promise.all([
          isWeb
            ? settingsService.fetchPaymentMethods(user.id)
            : Promise.resolve([]),
          settingsService.fetchAddresses(user.id),
        ]);

        if (cancelled) return;

        console.log(
          `[CheckoutSheet] Loaded ${cards.length} cards, ${addrs.length} addresses`,
        );
        setSavedCards(cards);
        setAddresses(addrs);

        // Auto-select defaults
        if (isWeb) {
          const defaultCard = cards.find((c) => c.isDefault) || cards[0];
          if (defaultCard) setSelectedCardId(defaultCard.id);
        }

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);

        if (isWeb) setIsInitialized(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[CheckoutSheet] Failed to load checkout data:", err);
        }
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [visible, user?.id, totalItems]);

  // Native: Mark as initialized once addresses are loaded
  // PaymentSheet is created on-demand when user taps Pay
  useEffect(() => {
    if (isWeb || !visible || !user?.id || totalItems === 0) return;
    if (!isLoadingData) {
      setIsInitialized(true);
    }
  }, [visible, user?.id, totalItems, isLoadingData]);

  // Web: pay with saved card
  const handleWebPay = async () => {
    if (!user?.id || !selectedCardId || !sellerId) return;

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
        selectedShippingRate?.amount,
        selectedShippingRate?.carrier,
        selectedShippingRate?.serviceName,
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await clearStoreCart(sellerId);

      setOrderResult({
        orderId: result.orderId,
        totalAmount: result.totalAmount,
      });
      setOrderComplete(true);

      setTimeout(() => {
        onSuccess?.(result.orderId, result.totalAmount);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error("[CheckoutSheet] Web payment error:", err);
      window.alert(err.message || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Native: init PaymentSheet on-demand, then present it
  const handleNativePay = async () => {
    if (!user?.id || !sellerId) return;

    if (addresses.length > 0 && !selectedAddressId) {
      Alert.alert("Address Required", "Please select a shipping address.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      // 1. Create PaymentIntent
      const {
        clientSecret,
        paymentIntentId: piId,
        ephemeralKey,
        customerId,
      } = await checkoutService.createPaymentIntent(
        storeCart,
        user.id,
        user.email || undefined,
        selectedShippingRate?.amount,
      );

      // 2. Init PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "JaTango",
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        defaultBillingDetails: { email: user.email },
      });

      if (initError) {
        console.error("[CheckoutSheet] PaymentSheet init error:", initError);
        Alert.alert("Error", "Failed to initialize payment. Please try again.");
        setIsLoading(false);
        return;
      }

      // 3. Present PaymentSheet
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === "Canceled") {
          setIsLoading(false);
          return;
        }
        console.error("[CheckoutSheet] Payment error:", error);
        Alert.alert("Payment Failed", error.message);
        setIsLoading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 4. Confirm order with selected address
      const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
      const result = await checkoutService.confirmOrder(
        piId,
        storeCart,
        user.id,
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
        selectedShippingRate?.amount,
        selectedShippingRate?.carrier,
        selectedShippingRate?.serviceName,
      );

      await clearStoreCart(sellerId);

      setOrderResult({
        orderId: result.orderId,
        totalAmount: result.totalAmount,
      });
      setOrderComplete(true);

      setTimeout(() => {
        onSuccess?.(result.orderId, result.totalAmount);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error("[CheckoutSheet] Native pay error:", err);
      Alert.alert(
        "Order Error",
        err.message || "Payment failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = isWeb ? handleWebPay : handleNativePay;

  const hasAddress = addresses.length === 0 || !!selectedAddressId;
  const canPay = isWeb
    ? !!selectedCardId && !!selectedAddressId && !isLoading && !isLoadingData
    : isInitialized && !isLoading && hasAddress;

  const getItemPrice = (item: any): number => {
    return (
      item.selectedVariant?.price ??
      item.selectedColor?.price ??
      item.selectedSize?.price ??
      item.product.price
    );
  };

  if (!visible) return null;

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
        {orderComplete && orderResult ? (
          <Animated.View entering={FadeIn} style={styles.successContainer}>
            <View
              style={[
                styles.successIcon,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Feather name="check-circle" size={48} color={theme.primary} />
            </View>
            <ThemedText style={styles.successTitle}>Order Placed!</ThemedText>
            <ThemedText
              style={[styles.successSubtitle, { color: theme.textSecondary }]}
            >
              ${orderResult.totalAmount.toFixed(2)} charged successfully
            </ThemedText>
          </Animated.View>
        ) : (
          <>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Checkout</ThemedText>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {!store || totalItems === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather
                  name="shopping-cart"
                  size={48}
                  color={theme.textSecondary}
                />
                <ThemedText style={styles.emptyText}>
                  No items to checkout
                </ThemedText>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Web: Payment Method Selection */}
                  {isWeb && (
                    <>
                      <ThemedText style={styles.sectionTitle}>
                        Payment Method
                      </ThemedText>
                      {isLoadingData ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.primary}
                          style={styles.sectionLoader}
                        />
                      ) : savedCards.length === 0 ? (
                        <View
                          style={[
                            styles.emptyCard,
                            {
                              backgroundColor: theme.backgroundDefault,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Feather
                            name="credit-card"
                            size={20}
                            color={theme.textSecondary}
                          />
                          <ThemedText
                            style={[
                              styles.emptyCardText,
                              { color: theme.textSecondary },
                            ]}
                          >
                            No saved cards — add one in Settings
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.selectionList}>
                          {savedCards.map((card) => (
                            <Pressable
                              key={card.id}
                              style={[
                                styles.selectionItem,
                                {
                                  backgroundColor: theme.backgroundDefault,
                                  borderColor:
                                    selectedCardId === card.id
                                      ? theme.primary
                                      : theme.border,
                                  borderWidth:
                                    selectedCardId === card.id ? 2 : 1,
                                },
                              ]}
                              onPress={() => setSelectedCardId(card.id)}
                            >
                              <Feather
                                name="credit-card"
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
                    </>
                  )}

                  {/* Shipping Address (all platforms) */}
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
                    <View
                      style={[
                        styles.emptyCard,
                        {
                          backgroundColor: theme.backgroundDefault,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Feather
                        name="map-pin"
                        size={20}
                        color={theme.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.emptyCardText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        No saved addresses — add one in Settings
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.selectionList}>
                      {addresses.map((addr) => (
                        <Pressable
                          key={addr.id}
                          style={[
                            styles.selectionItem,
                            {
                              backgroundColor: theme.backgroundDefault,
                              borderColor:
                                selectedAddressId === addr.id
                                  ? theme.primary
                                  : theme.border,
                              borderWidth:
                                selectedAddressId === addr.id ? 2 : 1,
                            },
                          ]}
                          onPress={() => setSelectedAddressId(addr.id)}
                        >
                          <Feather
                            name="map-pin"
                            size={20}
                            color={theme.text}
                          />
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
                              {`${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.zip}`}
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

                  {/* Shipping Rate Selection */}
                  {selectedAddressId && sellerId && (
                    <>
                      <ThemedText style={styles.sectionTitle}>
                        Shipping Method
                      </ThemedText>
                      {shippingRates.length === 0 &&
                      !isLoadingRates &&
                      !ratesError ? (
                        <Button
                          style={[
                            styles.getRatesButton,
                            { backgroundColor: theme.backgroundDefault },
                          ]}
                          onPress={async () => {
                            if (!sellerId || !user?.id) return;
                            setIsLoadingRates(true);
                            setRatesError(null);
                            try {
                              const storeAddr =
                                await shippingService.getStoreAddress(sellerId);
                              if (!storeAddr) {
                                setRatesError(
                                  "This seller hasn't set up shipping yet.",
                                );
                                setIsLoadingRates(false);
                                return;
                              }
                              const selectedAddr = addresses.find(
                                (a) => a.id === selectedAddressId,
                              );
                              if (!selectedAddr) {
                                setIsLoadingRates(false);
                                return;
                              }
                              const result = await shippingService.getRates(
                                {
                                  name: "Store",
                                  street1: storeAddr.addressLine1,
                                  street2: storeAddr.addressLine2,
                                  city: storeAddr.city,
                                  state: storeAddr.state,
                                  zip: storeAddr.zip,
                                  country: storeAddr.country || "US",
                                },
                                {
                                  name: selectedAddr.name,
                                  street1: selectedAddr.addressLine1,
                                  street2: selectedAddr.addressLine2,
                                  city: selectedAddr.city,
                                  state: selectedAddr.state,
                                  zip: selectedAddr.zip,
                                  country: selectedAddr.country || "US",
                                },
                                {
                                  length: "6",
                                  width: "4",
                                  height: "4",
                                  distanceUnit: "in",
                                  weight: "1",
                                  massUnit: "lb",
                                },
                              );
                              setShippingRates(result.rates);
                              if (result.rates.length > 0) {
                                setSelectedShippingRate(result.rates[0]);
                              }
                            } catch (err: any) {
                              setRatesError(
                                err.message || "Failed to get shipping rates",
                              );
                            } finally {
                              setIsLoadingRates(false);
                            }
                          }}
                        >
                          Get Shipping Rates
                        </Button>
                      ) : (
                        <ShippingRateSelector
                          rates={shippingRates}
                          selectedRateId={selectedShippingRate?.rateId || null}
                          onSelect={setSelectedShippingRate}
                          isLoading={isLoadingRates}
                          error={ratesError}
                        />
                      )}
                    </>
                  )}

                  {/* Order Summary */}
                  <ThemedText style={styles.sectionTitle}>
                    Order Summary
                  </ThemedText>
                  <View
                    style={[styles.storeSection, { borderColor: theme.border }]}
                  >
                    <View
                      style={[
                        styles.storeHeader,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <ThemedText style={styles.storeName}>
                        {store.sellerName}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.itemCount,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {totalItems} {totalItems === 1 ? "item" : "items"}
                      </ThemedText>
                    </View>

                    {store.items.map((item) => {
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
                            <ThemedText
                              style={styles.itemName}
                              numberOfLines={2}
                            >
                              {item.product.name}
                            </ThemedText>
                            {variantText ? (
                              <ThemedText
                                style={[
                                  styles.itemVariant,
                                  { color: theme.textSecondary },
                                ]}
                              >
                                {variantText}
                              </ThemedText>
                            ) : null}
                            <View style={styles.itemPriceRow}>
                              <ThemedText style={styles.itemPrice}>
                                ${price.toFixed(2)}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.itemQty,
                                  { color: theme.textSecondary },
                                ]}
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

                  <View
                    style={[styles.totalSection, { borderColor: theme.border }]}
                  >
                    <View style={styles.totalRow}>
                      <ThemedText style={styles.totalLabel}>
                        Subtotal
                      </ThemedText>
                      <ThemedText style={styles.totalValue}>
                        ${storeTotal.toFixed(2)}
                      </ThemedText>
                    </View>
                    <View style={styles.totalRow}>
                      <ThemedText
                        style={[
                          styles.totalLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Shipping
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.totalValue,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {shippingCost > 0
                          ? `$${shippingCost.toFixed(2)}`
                          : selectedShippingRate
                            ? "Free"
                            : "—"}
                      </ThemedText>
                    </View>
                    <View style={styles.totalRow}>
                      <ThemedText
                        style={[
                          styles.totalLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Sales Tax (8%)
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.totalValue,
                          { color: theme.textSecondary },
                        ]}
                      >
                        ${salesTax.toFixed(2)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.border },
                      ]}
                    />
                    <View style={styles.totalRow}>
                      <ThemedText style={styles.grandTotalLabel}>
                        Total
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.grandTotalValue,
                          { color: theme.primary },
                        ]}
                      >
                        ${grandTotal.toFixed(2)}
                      </ThemedText>
                    </View>
                  </View>
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
                  {isLoading && !isInitialized && !isWeb ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <ThemedText
                        style={[
                          styles.loadingText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Setting up payment...
                      </ThemedText>
                    </View>
                  ) : null}
                  <Button
                    style={styles.payButton}
                    onPress={handlePay}
                    disabled={!canPay}
                  >
                    {isLoading
                      ? "Processing..."
                      : `Pay $${grandTotal.toFixed(2)}`}
                  </Button>
                </View>
              </>
            )}
          </>
        )}
      </Animated.View>
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
    maxHeight: "85%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
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
  getRatesButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  storeSection: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemCount: {
    fontSize: 13,
  },
  orderItem: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemVariant: {
    fontSize: 12,
  },
  itemPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemQty: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  totalSection: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
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
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["5xl"],
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 13,
  },
  payButton: {
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
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  successSubtitle: {
    fontSize: 15,
  },
});
