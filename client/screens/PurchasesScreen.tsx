import React, { useState, useCallback, useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInRight } from "react-native-reanimated";

import { OrderCard } from "@/components/OrderCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { checkoutService } from "@/services/checkout";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Order } from "@/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fetched = await checkoutService.fetchOrders(user.id);
      setOrders(fetched);
    } catch (err) {
      console.error("[PurchasesScreen] Failed to load orders:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const renderItem = ({ item, index }: { item: Order; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
      <OrderCard order={item} onPress={() => {}} />
    </Animated.View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-purchases.png")}
      title="No Orders Yet"
      description="Your purchase history will appear here. Start shopping to see your orders!"
      actionLabel="Browse Products"
      onAction={() => navigation.navigate("Main", { screen: "ExploreTab" })}
    />
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
        orders.length === 0 && styles.emptyContent,
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flex: 1,
  },
});
