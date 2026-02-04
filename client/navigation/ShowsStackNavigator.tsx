import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ShowsScreen from "@/screens/ShowsScreen";
import ShowSetupScreen from "@/screens/ShowSetupScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ShowsStackParamList = {
  Shows: undefined;
  ShowSetup: { draftId?: string } | undefined;
};

const Stack = createNativeStackNavigator<ShowsStackParamList>();

export default function ShowsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Shows"
        component={ShowsScreen}
        options={{
          headerTitle: "My Shows",
        }}
      />
      <Stack.Screen
        name="ShowSetup"
        component={ShowSetupScreen}
        options={{
          headerTitle: "Show Setup",
        }}
      />
    </Stack.Navigator>
  );
}
