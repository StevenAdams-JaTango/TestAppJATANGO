import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/hooks/useTheme";

interface CartIconProps {
  color?: string;
  size?: number;
}

export function CartIcon({ color, size = 24 }: CartIconProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { totalItems } = useCart();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Try to navigate from current navigator first
    try {
      (navigation as any).navigate("Cart");
      return;
    } catch {
      // If that fails, traverse up to find a navigator that has the Cart route
    }

    // Traverse up the navigator tree
    let currentNav: any = navigation;
    const navigators: any[] = [currentNav];

    // Collect all parent navigators
    while (currentNav) {
      const parent = currentNav.getParent();
      if (parent) {
        navigators.push(parent);
        currentNav = parent;
      } else {
        break;
      }
    }

    // Try to navigate from each navigator, starting from the top (root)
    for (let i = navigators.length - 1; i >= 0; i--) {
      try {
        navigators[i].navigate("Cart");
        return;
      } catch {
        // This navigator doesn't have the Cart route, try the next one
        continue;
      }
    }

    // If all else fails, log an error
    console.error("Could not navigate to Cart from any navigator");
  };

  const iconColor = color ?? theme.text;

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Feather name="shopping-cart" size={size} color={iconColor} />
      {totalItems > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.badgeText}>
            {totalItems > 99 ? "99+" : totalItems}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
