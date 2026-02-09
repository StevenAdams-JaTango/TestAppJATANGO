import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { CartIcon } from "@/components/CartIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showCart?: boolean;
}

export function AppHeader({
  title,
  showBack = false,
  showCart = true,
}: AppHeaderProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.md,
        },
      ]}
    >
      <View style={styles.left}>
        {showBack ? (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.right}>
        {showCart ? <CartIcon /> : <View style={styles.spacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  left: {
    width: 40,
  },
  right: {
    width: 48,
    alignItems: "flex-end",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
});
