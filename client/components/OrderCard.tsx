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
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Order } from "@/types";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getStatusColor = (status: Order["status"]) => {
  switch (status) {
    case "delivered":
      return Colors.light.success;
    case "shipped":
      return Colors.light.secondary;
    case "pending":
      return Colors.light.textSecondary;
    default:
      return Colors.light.textSecondary;
  }
};

const getStatusIcon = (status: Order["status"]): keyof typeof Feather.glyphMap => {
  switch (status) {
    case "delivered":
      return "check-circle";
    case "shipped":
      return "truck";
    case "pending":
      return "clock";
    default:
      return "clock";
  }
};

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

  const statusColor = getStatusColor(order.status);
  const statusIcon = getStatusIcon(order.status);

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
      <Image
        source={{ uri: order.productImage }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {order.productName}
        </ThemedText>
        <ThemedText style={[styles.price, { color: theme.primary }]}>
          ${order.price.toFixed(2)}
        </ThemedText>
        <View style={styles.statusRow}>
          <Feather name={statusIcon} size={14} color={statusColor} />
          <ThemedText style={[styles.status, { color: statusColor }]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </ThemedText>
          <ThemedText style={[styles.date, { color: theme.textSecondary }]}>
            {order.date}
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
});
