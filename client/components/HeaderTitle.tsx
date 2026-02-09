import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: theme.secondary }]}>
        Jatango
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: theme.primary }]}>
        LIVE SHOPPING
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: -2,
  },
});
