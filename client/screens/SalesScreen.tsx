import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { shippingService } from "@/services/shipping";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Sale } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type StatusFilter = "all" | "paid" | "shipped" | "delivered" | "cancelled";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Needs Shipping" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const getStatusColor = (status: string, theme: Record<string, string>) => {
  switch (status) {
    case "delivered":
      return theme.success;
    case "paid":
      return theme.secondary;
    case "shipped":
      return theme.primary;
    case "cancelled":
      return "#ef4444";
    default:
      return theme.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "Needs Shipping";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

export default function SalesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const isFocused = useIsFocused();

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const loadSales = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await shippingService.fetchSales(user.id);
      setSales(data);
    } catch (err) {
      console.error("[Sales] Failed to load:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isFocused) {
      loadSales();
    }
  }, [isFocused, loadSales]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSales();
  };

  const filteredSales =
    filter === "all" ? sales : sales.filter((s) => s.status === filter);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderSaleItem = ({ item }: { item: Sale }) => {
    const statusColor = getStatusColor(item.status, theme);
    const itemCount = item.items.reduce((sum, i) => sum + i.quantity, 0);
    const firstItem = item.items[0];

    return (
      <Pressable
        style={[
          styles.saleCard,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: theme.border,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("SaleDetail", { orderId: item.id });
        }}
      >
        <View style={styles.saleHeader}>
          <View style={styles.saleHeaderLeft}>
            <ThemedText style={styles.buyerName}>
              {item.buyerName || "Unknown Buyer"}
            </ThemedText>
            <ThemedText
              style={[styles.saleDate, { color: theme.textSecondary }]}
            >
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18" },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.saleItems}>
          {firstItem?.productImage ? (
            <Image
              source={{ uri: firstItem.productImage }}
              style={styles.itemThumb}
            />
          ) : (
            <View
              style={[
                styles.itemThumb,
                styles.itemThumbPlaceholder,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="package" size={16} color={theme.textSecondary} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemName} numberOfLines={1}>
              {firstItem?.productName || "Item"}
            </ThemedText>
            {item.items.length > 1 && (
              <ThemedText
                style={[styles.moreItems, { color: theme.textSecondary }]}
              >
                +{item.items.length - 1} more item
                {item.items.length - 1 > 1 ? "s" : ""}
              </ThemedText>
            )}
          </View>
          <View style={styles.saleRight}>
            <ThemedText style={[styles.totalAmount, { color: theme.primary }]}>
              ${item.totalAmount.toFixed(2)}
            </ThemedText>
            <ThemedText
              style={[styles.itemCount, { color: theme.textSecondary }]}
            >
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </ThemedText>
          </View>
        </View>

        {item.trackingNumber && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.trackingRow}>
              <Feather name="truck" size={14} color={theme.textSecondary} />
              <ThemedText
                style={[styles.trackingText, { color: theme.textSecondary }]}
              >
                {item.trackingNumber}
              </ThemedText>
            </View>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>My Sales</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item: f }) => {
            const isActive = filter === f.key;
            return (
              <Pressable
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? theme.primary
                      : theme.backgroundRoot,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setFilter(f.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    { color: isActive ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredSales.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="inbox" size={48} color={theme.textSecondary} />
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            {filter === "all"
              ? "No sales yet"
              : `No ${getStatusLabel(filter).toLowerCase()} orders`}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          renderItem={renderSaleItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
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
  filterRow: {
    paddingBottom: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  saleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  saleHeaderLeft: {
    flex: 1,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  saleDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  saleItems: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  itemThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
  },
  moreItems: {
    fontSize: 12,
    marginTop: 2,
  },
  saleRight: {
    alignItems: "flex-end",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemCount: {
    fontSize: 12,
    marginTop: 2,
  },
  trackingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  trackingText: {
    fontSize: 12,
  },
});
