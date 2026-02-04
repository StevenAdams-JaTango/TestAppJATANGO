import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LiveStreamScreen from "@/screens/LiveStreamScreen";
import BroadcasterScreen from "@/screens/BroadcasterScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import EndedShowScreen from "@/screens/EndedShowScreen";
import ProductsScreen from "@/screens/ProductsScreen";
import AddProductScreen from "@/screens/AddProductScreen";
import AuthScreen from "@/screens/AuthScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";

export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: string; params?: unknown } | undefined;
  LiveStream: { streamId: string };
  Broadcaster: { draftId: string } | undefined;
  Settings: undefined;
  EndedShow: { showId: string };
  Products: undefined;
  AddProduct: { productId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { user, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.light.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.primary} />
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
            options={{
              headerTitle: "Settings",
            }}
          />
          <Stack.Screen
            name="EndedShow"
            component={EndedShowScreen}
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
        </>
      )}
    </Stack.Navigator>
  );
}
