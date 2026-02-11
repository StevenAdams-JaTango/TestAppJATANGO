import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { OrderCard } from "@/components/OrderCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { checkoutService } from "@/services/checkout";
import { shippingService } from "@/services/shipping";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Order } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrdersScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadOrders = useCallback(
    async (showRefresh = false) => {
      if (!user?.id) return;

      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const data = await checkoutService.fetchOrders(user.id);
        setOrders(data);
      } catch (err: any) {
        console.error("[Orders] Failed to load orders:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const handleOrderPress = (order: Order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("OrderDetail", { orderId: order.id });
  };

  if (isLoading) {
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
          <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

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
        <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
        {orders.length > 0 ? (
          <Pressable
            style={styles.deleteAllButton}
            onPress={() => {
              Alert.alert(
                "Delete All Orders",
                "This will permanently delete all your orders. This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                      if (!user?.id) return;
                      setIsDeleting(true);
                      try {
                        await shippingService.deleteAllOrders(user.id);
                        setOrders([]);
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success,
                        );
                      } catch (err: any) {
                        Alert.alert(
                          "Error",
                          err.message || "Failed to delete orders",
                        );
                      } finally {
                        setIsDeleting(false);
                      }
                    },
                  },
                ],
              );
            }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Feather name="trash-2" size={20} color="#ef4444" />
            )}
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="package" size={48} color={theme.textSecondary} />
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
            No orders yet
          </ThemedText>
          <ThemedText
            style={[styles.emptySubtitle, { color: theme.textSecondary }]}
          >
            Your order history will appear here
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => loadOrders(true)}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <OrderCard order={item} onPress={() => handleOrderPress(item)} />
            </Animated.View>
          )}
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
  deleteAllButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  listContent: {
    padding: Spacing.md,
  },
});
