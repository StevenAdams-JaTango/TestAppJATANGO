import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Order } from "@/types";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const statusColor = getStatusColor(order.status, theme);
  const statusIcon = getStatusIcon(order.status);

  // Use first item's image as the order thumbnail
  const firstItem = order.items[0];
  const thumbnailUri = firstItem?.productImage;
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const displayName =
    order.items.length === 1
      ? firstItem?.productName
      : `${firstItem?.productName} +${order.items.length - 1} more`;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
      testID={`order-card-${order.id}`}
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.image,
            styles.imagePlaceholder,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="package" size={28} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {displayName}
        </ThemedText>
        <ThemedText style={[styles.price, { color: theme.primary }]}>
          ${order.totalAmount.toFixed(2)}
          <ThemedText
            style={[styles.itemCount, { color: theme.textSecondary }]}
          >
            {" "}
            · {itemCount} item{itemCount !== 1 ? "s" : ""}
          </ThemedText>
        </ThemedText>
        <View style={styles.statusRow}>
          <Feather name={statusIcon} size={14} color={statusColor} />
          <ThemedText style={[styles.status, { color: statusColor }]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </ThemedText>
          <ThemedText style={[styles.date, { color: theme.textSecondary }]}>
            {formatDate(order.createdAt)}
          </ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
  date: {
    fontSize: 12,
    marginLeft: "auto",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemCount: {
    fontSize: 12,
    fontWeight: "400",
  },
});
