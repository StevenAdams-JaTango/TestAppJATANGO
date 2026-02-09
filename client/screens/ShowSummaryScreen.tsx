import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  showSalesService,
  ShowSummaryData,
  ProductSalesItem,
} from "@/services/showSales";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "ShowSummary">;

export default function ShowSummaryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { showId } = route.params;

  const [data, setData] = useState<ShowSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const loadSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await showSalesService.fetchShowSummary(showId);
      setData(summary);
    } catch (err: any) {
      console.error("[ShowSummary] Error loading summary:", err);
      setError(err.message || "Failed to load show summary");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDuration = (startedAt: string | null, endedAt: string | null) => {
    if (!startedAt || !endedAt) return "N/A";
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText
            style={[styles.loadingText, { color: theme.textSecondary }]}
          >
            Loading show summary...
          </ThemedText>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.errorHeader, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.errorText}>
            {error || "Show not found"}
          </ThemedText>
          <Pressable
            onPress={loadSummary}
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const { show, summary, productBreakdown, recentOrders } = data;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with thumbnail */}
        <View style={styles.thumbnailContainer}>
          {show.thumbnailUrl ? (
            <Image
              source={{ uri: show.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.thumbnail,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            />
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.thumbnailGradient}
          />
          <View style={[styles.thumbnailOverlay, { paddingTop: insets.top }]}>
            <Pressable onPress={handleBack} style={styles.backButtonOverlay}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.thumbnailInfo}>
            <ThemedText style={styles.showTitle}>{show.title}</ThemedText>
            <View style={styles.showMeta}>
              <View style={styles.metaItem}>
                <Feather
                  name="calendar"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
                <ThemedText style={styles.metaText}>
                  {formatDate(show.endedAt || show.startedAt)}
                </ThemedText>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color="rgba(255,255,255,0.7)" />
                <ThemedText style={styles.metaText}>
                  {formatDuration(show.startedAt, show.endedAt)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View
          style={[
            styles.metricsCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.metricRow}>
            <MetricBox
              icon="dollar-sign"
              value={formatCurrency(summary.totalRevenue)}
              label="Revenue"
              theme={theme}
              highlight
            />
            <MetricBox
              icon="shopping-bag"
              value={String(summary.totalOrders)}
              label="Orders"
              theme={theme}
            />
          </View>
          <View style={styles.metricRow}>
            <MetricBox
              icon="package"
              value={String(summary.totalItemsSold)}
              label="Items Sold"
              theme={theme}
            />
            <MetricBox
              icon="users"
              value={String(summary.uniqueBuyers)}
              label="Buyers"
              theme={theme}
            />
          </View>
          <View style={styles.metricRow}>
            <MetricBox
              icon="shopping-cart"
              value={String(summary.addToCartEvents)}
              label="Add to Carts"
              theme={theme}
            />
            <MetricBox
              icon="clock"
              value={String(summary.activeReservations)}
              label="Active Holds"
              theme={theme}
            />
          </View>
        </View>

        {/* Product Breakdown */}
        {productBreakdown.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Product Performance
            </ThemedText>
            {productBreakdown.map((product) => (
              <ProductSalesCard
                key={product.productId}
                product={product}
                theme={theme}
              />
            ))}
          </View>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Recent Orders</ThemedText>
            {recentOrders.map((order) => (
              <Card key={order.id} elevation={1} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <ThemedText
                    style={[styles.orderAmount, { color: theme.primary }]}
                  >
                    {formatCurrency(order.totalAmount)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.orderDate, { color: theme.textSecondary }]}
                  >
                    {formatDate(order.createdAt)}
                  </ThemedText>
                </View>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.orderItem}>
                    {item.productImage && (
                      <Image
                        source={{ uri: item.productImage }}
                        style={[
                          styles.orderItemImage,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                      />
                    )}
                    <View style={styles.orderItemInfo}>
                      <ThemedText
                        style={styles.orderItemName}
                        numberOfLines={1}
                      >
                        {item.productName}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.orderItemDetail,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {formatCurrency(item.unitPrice)} x {item.quantity}
                        {item.colorName ? ` - ${item.colorName}` : ""}
                        {item.sizeName ? ` / ${item.sizeName}` : ""}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}

        {/* Empty state */}
        {summary.totalOrders === 0 && productBreakdown.length === 0 && (
          <View style={styles.emptySection}>
            <Feather name="bar-chart-2" size={48} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              No sales yet for this show
            </ThemedText>
            {summary.addToCartEvents > 0 && (
              <ThemedText
                style={[styles.emptySubtext, { color: theme.textSecondary }]}
              >
                {summary.addToCartEvents} items were added to carts
                {summary.activeReservations > 0
                  ? ` (${summary.activeReservations} still reserved)`
                  : ""}
              </ThemedText>
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

function MetricBox({
  icon,
  value,
  label,
  theme,
  highlight,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  theme: any;
  highlight?: boolean;
}) {
  return (
    <View
      style={[styles.metricBox, { backgroundColor: theme.backgroundSecondary }]}
    >
      <Feather
        name={icon}
        size={18}
        color={highlight ? theme.primary : theme.textSecondary}
      />
      <ThemedText
        style={[styles.metricValue, highlight && { color: theme.primary }]}
      >
        {value}
      </ThemedText>
      <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function ProductSalesCard({
  product,
  theme,
}: {
  product: ProductSalesItem;
  theme: any;
}) {
  return (
    <Card elevation={1} style={styles.productCard}>
      <View style={styles.productRow}>
        {product.productImage && (
          <Image
            source={{ uri: product.productImage }}
            style={[
              styles.productImage,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          />
        )}
        <View style={styles.productInfo}>
          <ThemedText style={styles.productName} numberOfLines={1}>
            {product.productName}
          </ThemedText>
          <View style={styles.productStats}>
            <ThemedText
              style={[styles.productStat, { color: theme.textSecondary }]}
            >
              {product.quantitySold} sold
            </ThemedText>
            <ThemedText
              style={[styles.productStat, { color: theme.textSecondary }]}
            >
              {product.uniqueBuyers} buyer
              {product.uniqueBuyers !== 1 ? "s" : ""}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.productRevenue, { color: theme.primary }]}>
          ${product.revenue.toFixed(2)}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  errorHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  thumbnailContainer: {
    height: 220,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonOverlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  showTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: Spacing.xs,
  },
  showMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  metricsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  metricRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  productCard: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
  },
  productStats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: 2,
  },
  productStat: {
    fontSize: 12,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: "700",
  },
  orderCard: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  orderDate: {
    fontSize: 12,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  orderItemImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "500",
  },
  orderItemDetail: {
    fontSize: 11,
    marginTop: 1,
  },
  emptySection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
