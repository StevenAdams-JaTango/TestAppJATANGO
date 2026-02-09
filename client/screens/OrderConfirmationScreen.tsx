import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, BounceIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, "OrderConfirmation">;

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { theme } = useTheme();
  const { orderId, totalAmount } = route.params;

  React.useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleViewOrder = () => {
    navigation.navigate("OrderDetail", { orderId });
  };

  const handleViewOrders = () => {
    navigation.navigate("Orders");
  };

  const handleContinueShopping = () => {
    navigation.navigate("Main", { screen: "ExploreTab" });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View entering={BounceIn.delay(200)} style={styles.iconWrap}>
          <Feather name="check-circle" size={72} color={theme.success} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500)} style={styles.textWrap}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Order Confirmed!
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your payment of ${totalAmount.toFixed(2)} was successful.
          </ThemedText>
          <View
            style={[
              styles.orderIdRow,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[styles.orderIdLabel, { color: theme.textSecondary }]}
            >
              Order ID
            </ThemedText>
            <ThemedText
              style={[styles.orderIdValue, { color: theme.primary }]}
              numberOfLines={1}
            >
              {orderId.slice(0, 8).toUpperCase()}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800)} style={styles.actions}>
          <Button
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleViewOrder}
          >
            View Order Details
          </Button>
          <Button
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={handleViewOrders}
          >
            <ThemedText
              style={[styles.secondaryButtonText, { color: theme.text }]}
            >
              View All Orders
            </ThemedText>
          </Button>
          <Button
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={handleContinueShopping}
          >
            <ThemedText
              style={[styles.secondaryButtonText, { color: theme.text }]}
            >
              Continue Shopping
            </ThemedText>
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    marginBottom: Spacing.lg,
  },
  textWrap: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  orderIdLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  orderIdValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    width: "100%",
    gap: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
