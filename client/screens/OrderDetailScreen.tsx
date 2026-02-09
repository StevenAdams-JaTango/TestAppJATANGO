import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { checkoutService } from "@/services/checkout";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Order, OrderItem } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRouteProp = RouteProp<RootStackParamList, "OrderDetail">;

const getStatusColor = (
  status: Order["status"],
  theme: Record<string, string>,
) => {
  switch (status) {
    case "delivered":
      return theme.success;
    case "paid":
    case "shipped":
      return theme.secondary;
    case "pending":
      return theme.textSecondary;
    case "cancelled":
      return "#ef4444";
    default:
      return theme.textSecondary;
  }
};

const getStatusIcon = (
  status: Order["status"],
): keyof typeof Feather.glyphMap => {
  switch (status) {
    case "delivered":
      return "check-circle";
    case "shipped":
      return "truck";
    case "paid":
      return "credit-card";
    case "cancelled":
      return "x-circle";
    case "pending":
      return "clock";
    default:
      return "clock";
  }
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { user } = useAuth();

  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      try {
        const orders = await checkoutService.fetchOrders(user.id);
        if (cancelled) return;
        const found = orders.find((o) => o.id === orderId);
        setOrder(found || null);
      } catch (err: any) {
        console.error("[OrderDetail] Failed to load order:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, orderId]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
        ]}
      >
        <Header theme={theme} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
        ]}
      >
        <Header theme={theme} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.emptyText}>Order not found</ThemedText>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status, theme);
  const statusIcon = getStatusIcon(order.status);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const storeNames = Object.values(order.sellerNames || {});

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, paddingTop: insets.top },
      ]}
    >
      <Header theme={theme} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "18" },
              ]}
            >
              <Feather name={statusIcon} size={16} color={statusColor} />
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Order ID
            </ThemedText>
            <ThemedText style={styles.infoValue} numberOfLines={1}>
              {order.id.slice(0, 8)}...
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Date
            </ThemedText>
            <ThemedText style={styles.infoValue}>
              {formatDate(order.createdAt)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Items
            </ThemedText>
            <ThemedText style={styles.infoValue}>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          {order.paymentCard && (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <View style={styles.infoRow}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Payment
                </ThemedText>
                <View style={styles.cardInfo}>
                  <Feather
                    name="credit-card"
                    size={14}
                    color={theme.textSecondary}
                  />
                  <ThemedText style={styles.infoValue}>
                    {order.paymentCard.brand.charAt(0).toUpperCase() +
                      order.paymentCard.brand.slice(1)}{" "}
                    •••• {order.paymentCard.last4}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.infoRow}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Expires
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {order.paymentCard.expMonth}/{order.paymentCard.expYear}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        {/* Store */}
        {storeNames.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Store</ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              {storeNames.map((name, idx) => (
                <React.Fragment key={name}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.border },
                      ]}
                    />
                  )}
                  <View style={styles.storeRow}>
                    <Feather
                      name="shopping-bag"
                      size={16}
                      color={theme.primary}
                    />
                    <ThemedText style={styles.storeName}>{name}</ThemedText>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <>
            <ThemedText style={styles.sectionTitle}>
              Shipping Address
            </ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.addressRow}>
                <Feather name="map-pin" size={16} color={theme.primary} />
                <View style={styles.addressText}>
                  <ThemedText style={styles.addressName}>
                    {order.shippingAddress.name}
                  </ThemedText>
                  <ThemedText
                    style={[styles.addressLine, { color: theme.textSecondary }]}
                  >
                    {order.shippingAddress.addressLine1}
                  </ThemedText>
                  {order.shippingAddress.addressLine2 ? (
                    <ThemedText
                      style={[
                        styles.addressLine,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {order.shippingAddress.addressLine2}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    style={[styles.addressLine, { color: theme.textSecondary }]}
                  >
                    {`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}`}
                  </ThemedText>
                  {order.shippingAddress.phone ? (
                    <ThemedText
                      style={[
                        styles.addressLine,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {order.shippingAddress.phone}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Items */}
        <ThemedText style={styles.sectionTitle}>Items</ThemedText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          {order.items.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && (
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              )}
              <ItemRow item={item} theme={theme} />
            </React.Fragment>
          ))}
        </View>

        {/* Total */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Subtotal
            </ThemedText>
            <ThemedText style={styles.infoValue}>
              ${order.totalAmount.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Shipping
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.success }]}>
              Free
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={[styles.totalValue, { color: theme.primary }]}>
              ${order.totalAmount.toFixed(2)}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ theme, onBack }: { theme: any; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Feather name="arrow-left" size={24} color={theme.text} />
      </Pressable>
      <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function ItemRow({ item, theme }: { item: OrderItem; theme: any }) {
  const variantText = [item.selectedColorName, item.selectedSizeName]
    .filter(Boolean)
    .join(" / ");

  const lineTotal = item.unitPrice * item.quantity;

  return (
    <View style={styles.itemRow}>
      {item.productImage ? (
        <Image source={{ uri: item.productImage }} style={styles.itemImage} />
      ) : (
        <View
          style={[
            styles.itemImage,
            styles.itemImagePlaceholder,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="package" size={20} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <ThemedText style={styles.itemName} numberOfLines={2}>
          {item.productName}
        </ThemedText>
        {variantText ? (
          <ThemedText
            style={[styles.itemVariant, { color: theme.textSecondary }]}
          >
            {variantText}
          </ThemedText>
        ) : null}
        <View style={styles.itemPriceRow}>
          <ThemedText
            style={[styles.itemPrice, { color: theme.textSecondary }]}
          >
            ${item.unitPrice.toFixed(2)} × {item.quantity}
          </ThemedText>
          <ThemedText style={styles.itemTotal}>
            ${lineTotal.toFixed(2)}
          </ThemedText>
        </View>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  itemImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "space-between",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "600",
  },
  addressRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  addressText: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 13,
    lineHeight: 18,
  },
});
