import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LiveStreamScreen from "@/screens/LiveStreamScreen";
import BroadcasterScreen from "@/screens/BroadcasterScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import EndedShowScreen from "@/screens/EndedShowScreen";
import ShowSummaryScreen from "@/screens/ShowSummaryScreen";
import ProductsScreen from "@/screens/ProductsScreen";
import AddProductScreen from "@/screens/AddProductScreen";
import CartScreen from "@/screens/CartScreen";
import CheckoutScreen from "@/screens/CheckoutScreen";
import OrderConfirmationScreen from "@/screens/OrderConfirmationScreen";
import SavedPaymentMethodsScreen from "@/screens/SavedPaymentMethodsScreen";
import ShippingAddressesScreen from "@/screens/ShippingAddressesScreen";
import AddAddressScreen from "@/screens/AddAddressScreen";
import OrdersScreen from "@/screens/OrdersScreen";
import OrderDetailScreen from "@/screens/OrderDetailScreen";
import UploadShortScreen from "@/screens/UploadShortScreen";
import StoreShortsScreen from "@/screens/StoreShortsScreen";
import SavedProductsScreen from "@/screens/SavedProductsScreen";
import StoreAddressScreen from "@/screens/StoreAddressScreen";
import SalesScreen from "@/screens/SalesScreen";
import SaleDetailScreen from "@/screens/SaleDetailScreen";
import AuthScreen from "@/screens/AuthScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";

export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: string; params?: unknown } | undefined;
  LiveStream: { streamId: string; showId?: string };
  Broadcaster: { draftId: string } | undefined;
  Settings: undefined;
  EndedShow: { showId: string };
  ShowSummary: { showId: string };
  Products: undefined;
  AddProduct: { productId?: string } | undefined;
  Cart: undefined;
  Checkout: { sellerId: string };
  OrderConfirmation: { orderId: string; totalAmount: number };
  SavedPaymentMethods: undefined;
  ShippingAddresses: undefined;
  AddAddress: { addressId?: string } | undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  UploadShort: undefined;
  StoreShortsViewer: { sellerId: string; initialIndex?: number };
  SavedProducts: undefined;
  StoreAddress: undefined;
  Sales: undefined;
  SaleDetail: { orderId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  useInAppNotifications();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LiveStream"
            component={LiveStreamScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="Broadcaster"
            component={BroadcasterScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={({ navigation: nav }) => ({
              headerTitle: "Settings",
              headerBackVisible: false,
              headerRight: () => null,
              headerLeft: () => (
                <Pressable
                  onPress={() => nav.goBack()}
                  style={{ padding: 8, marginRight: 8 }}
                >
                  <Feather name="arrow-left" size={24} color={theme.text} />
                </Pressable>
              ),
            })}
          />
          <Stack.Screen
            name="EndedShow"
            component={EndedShowScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ShowSummary"
            component={ShowSummaryScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Products"
            component={ProductsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AddProduct"
            component={AddProductScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="OrderConfirmation"
            component={OrderConfirmationScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="SavedPaymentMethods"
            component={SavedPaymentMethodsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ShippingAddresses"
            component={ShippingAddressesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AddAddress"
            component={AddAddressScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="Orders"
            component={OrdersScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="UploadShort"
            component={UploadShortScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="StoreShortsViewer"
            component={StoreShortsScreen}
            options={{
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="SavedProducts"
            component={SavedProductsScreen}
            options={{
              headerTitle: "Saved Products",
              headerBackVisible: true,
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="StoreAddress"
            component={StoreAddressScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Sales"
            component={SalesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SaleDetail"
            component={SaleDetailScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
