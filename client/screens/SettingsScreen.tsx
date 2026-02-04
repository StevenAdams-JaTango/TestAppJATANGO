import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Account
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <MenuItem
            icon="user"
            label="Edit Profile"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="shopping-bag"
            label="Seller Dashboard"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            theme={theme}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Notifications
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <ToggleItem
            icon="bell"
            label="Push Notifications"
            value={notifications}
            onValueChange={(val) => {
              setNotifications(val);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleItem
            icon="video"
            label="Live Stream Alerts"
            value={liveAlerts}
            onValueChange={(val) => {
              setLiveAlerts(val);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleItem
            icon="package"
            label="Order Updates"
            value={orderUpdates}
            onValueChange={(val) => {
              setOrderUpdates(val);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            theme={theme}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Appearance
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <View style={styles.themeItem}>
            <View style={styles.themeLeft}>
              <Feather name="moon" size={20} color={theme.text} />
              <ThemedText style={styles.menuLabel}>Dark Mode</ThemedText>
            </View>
            <ThemedText style={[styles.themeValue, { color: theme.textSecondary }]}>
              {isDark ? "On" : "Off"}
            </ThemedText>
          </View>
        </Card>
        <ThemedText style={[styles.themeHint, { color: theme.textSecondary }]}>
          Theme follows your system settings
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Support
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <MenuItem
            icon="help-circle"
            label="Help Center"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="file-text"
            label="Terms of Service"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="shield"
            label="Privacy Policy"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            theme={theme}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).springify()}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Account Actions
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={Colors.light.primary} />
            <ThemedText style={[styles.menuLabel, { color: Colors.light.primary }]}>
              Log Out
            </ThemedText>
          </Pressable>
        </Card>
        <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
          <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
        </Pressable>
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

function ToggleItem({
  icon,
  label,
  value,
  onValueChange,
  theme,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  theme: any;
}) {
  return (
    <View style={styles.menuItem}>
      <Feather name={icon} size={20} color={theme.text} />
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.border,
          true: Colors.light.primary,
        }}
        thumbColor={Platform.OS === "android" ? Colors.light.buttonText : undefined}
      />
    </View>
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
  themeValue: {
    fontSize: 14,
  },
  themeHint: {
    fontSize: 12,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  deleteText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: "500",
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
