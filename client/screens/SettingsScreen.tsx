import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { mode, setMode } = useThemeContext();
  const navigation = useNavigation<NavigationProp>();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await signOut();
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          Payment & Shipping
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <MenuItem
            icon="credit-card"
            label="Payment Methods"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("SavedPaymentMethods");
            }}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="map-pin"
            label="Shipping Addresses"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("ShippingAddresses");
            }}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="home"
            label="Store Address"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("StoreAddress");
            }}
            theme={theme}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          Appearance
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <View style={styles.themeItem}>
            <View style={styles.themeLeft}>
              <Feather name="moon" size={20} color={theme.text} />
              <ThemedText style={styles.menuLabel}>Mode</ThemedText>
            </View>
          </View>
          <View style={styles.themePicker}>
            {(["system", "light", "dark"] as const).map((opt) => (
              <Pressable
                key={opt}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      mode === opt ? theme.primary : theme.backgroundSecondary,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMode(opt);
                }}
              >
                <Feather
                  name={
                    opt === "system"
                      ? "smartphone"
                      : opt === "light"
                        ? "sun"
                        : "moon"
                  }
                  size={16}
                  color={mode === opt ? "#FFFFFF" : theme.text}
                />
                <ThemedText
                  style={[
                    styles.themeOptionText,
                    {
                      color: mode === opt ? "#FFFFFF" : theme.text,
                    },
                  ]}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Card elevation={1} style={styles.logoutCard}>
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={theme.primary} />
            <ThemedText style={[styles.menuLabel, { color: theme.primary }]}>
              Log Out
            </ThemedText>
          </Pressable>
        </Card>
      </Animated.View>

      <View style={styles.footer}>
        <ThemedText style={[styles.version, { color: theme.textSecondary }]}>
          Version 1.0.0
        </ThemedText>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Feather name={icon} size={20} color={theme.text} />
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      <Feather name="chevron-right" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  menuCard: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  divider: {
    height: 1,
    marginLeft: Spacing["3xl"] + Spacing.lg,
  },
  themeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  themeLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  themePicker: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  logoutCard: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: 0,
    marginTop: Spacing.xl,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing["3xl"],
    marginBottom: Spacing.xl,
  },
  version: {
    fontSize: 12,
  },
});
