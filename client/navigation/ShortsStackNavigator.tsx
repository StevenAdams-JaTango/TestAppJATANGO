import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ShortsScreen from "@/screens/ShortsScreen";

export type ShortsStackParamList = {
  Shorts: undefined;
};

const Stack = createNativeStackNavigator<ShortsStackParamList>();

export default function ShortsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Shorts" component={ShortsScreen} />
    </Stack.Navigator>
  );
}
