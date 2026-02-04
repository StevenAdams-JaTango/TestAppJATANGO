import React, { useState, useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInRight } from "react-native-reanimated";

import { OrderCard } from "@/components/OrderCard";
import { EmptyState } from "@/components/EmptyState";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors } from "@/constants/theme";
import { mockOrders, mockProducts } from "@/data/mockData";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Order, Product } from "@/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleOrderPress = (order: Order) => {
    const product = mockProducts.find((p) => p.id === order.productId);
    if (product) {
      setSelectedProduct(product);
      setShowProductSheet(true);
    }
  };

  const handleCloseProductSheet = () => {
    setShowProductSheet(false);
    setSelectedProduct(null);
  };

  const handleAddToCart = (product: Product) => {
    console.log("Add to cart:", product.id);
    handleCloseProductSheet();
  };

  const handleBuyNow = (product: Product) => {
    console.log("Buy now:", product.id);
    handleCloseProductSheet();
  };

  const renderItem = ({ item, index }: { item: Order; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
      <OrderCard order={item} onPress={() => handleOrderPress(item)} />
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
          tintColor={Colors.light.primary}
          colors={[Colors.light.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <ProductDetailSheet
        product={selectedProduct}
        visible={showProductSheet}
        onClose={handleCloseProductSheet}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </FlatList>
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
