import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PurchasesScreen from "@/screens/PurchasesScreen";
import { CartIcon } from "@/components/CartIcon";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type PurchasesStackParamList = {
  Purchases: undefined;
};

const Stack = createNativeStackNavigator<PurchasesStackParamList>();

export default function PurchasesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Purchases"
        component={PurchasesScreen}
        options={{
          headerTitle: "My Purchases",
          headerRight: () => <CartIcon />,
        }}
      />
    </Stack.Navigator>
  );
}
