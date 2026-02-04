import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";
import { mockUser } from "@/data/mockData";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [user] = useState(mockUser);

  const handleGoLive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Main", { screen: "ShowsTab" });
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={styles.avatarSection}
      >
        <LinearGradient
          colors={["#7C3AED", "#9333EA"]}
          style={styles.avatarBorder}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <Image
                source={require("../../assets/images/avatar-default-1.png")}
                style={styles.avatar}
              />
            )}
          </View>
        </LinearGradient>
        <Pressable
          style={styles.editButton}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Feather name="edit-2" size={14} color={Colors.light.buttonText} />
        </Pressable>
        <ThemedText style={styles.name}>{user.name}</ThemedText>
        {user.isSeller ? (
          <View style={styles.sellerBadge}>
            <Feather
              name="check-circle"
              size={14}
              color={Colors.light.success}
            />
            <ThemedText
              style={[styles.sellerText, { color: Colors.light.success }]}
            >
              Verified Seller
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>

      {user.isSeller ? (
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.statsRow}
        >
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[styles.statValue, { color: Colors.light.secondary }]}
            >
              {user.followers.toLocaleString()}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Followers
            </ThemedText>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[styles.statValue, { color: Colors.light.secondary }]}
            >
              {user.following.toLocaleString()}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Following
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(300).springify()}>
        {user.isSeller ? (
          <Pressable style={styles.goLiveButton} onPress={handleGoLive}>
            <LinearGradient
              colors={[Colors.light.primary, "#FF8C5A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.goLiveGradient}
            >
              <Feather name="video" size={20} color={Colors.light.buttonText} />
              <ThemedText style={styles.goLiveText}>
                Start Live Stream
              </ThemedText>
            </LinearGradient>
          </Pressable>
        ) : (
          <Card
            elevation={1}
            style={styles.becomeSellerCard}
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          >
            <View style={styles.becomeSellerContent}>
              <LinearGradient
                colors={["#7C3AED", "#9333EA"]}
                style={styles.sellerIcon}
              >
                <Feather
                  name="shopping-bag"
                  size={24}
                  color={Colors.light.buttonText}
                />
              </LinearGradient>
              <View style={styles.becomeSellerText}>
                <ThemedText style={styles.becomeSellerTitle}>
                  Become a Seller
                </ThemedText>
                <ThemedText
                  style={[
                    styles.becomeSellerDesc,
                    { color: theme.textSecondary },
                  ]}
                >
                  Start selling your products through live streams
                </ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={Colors.light.secondary}
              />
            </View>
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <ThemedText
          style={[styles.sectionTitle, { color: Colors.light.secondary }]}
        >
          Account
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <MenuItem
            icon="package"
            label="My Products"
            onPress={() => navigation.navigate("Products")}
            theme={theme}
          />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem icon="heart" label="Saved Products" theme={theme} />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem icon="bell" label="Notifications" theme={theme} />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="settings"
            label="Settings"
            onPress={() => navigation.navigate("Settings")}
            theme={theme}
          />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="log-out"
            label="Sign Out"
            onPress={handleSignOut}
            theme={theme}
          />
        </Card>
      </Animated.View>
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
  onPress?: () => void;
  theme: any;
}) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
    >
      <View
        style={[
          styles.menuIconContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name={icon} size={18} color={Colors.light.secondary} />
      </View>
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
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarBorder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 4,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  editButton: {
    position: "absolute",
    top: 80,
    right: "35%",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  sellerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sellerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  goLiveButton: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    ...Shadows.md,
  },
  goLiveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  goLiveText: {
    color: Colors.light.buttonText,
    fontWeight: "700",
    fontSize: 16,
  },
  becomeSellerCard: {
    marginBottom: Spacing.xl,
  },
  becomeSellerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  becomeSellerText: {
    flex: 1,
  },
  becomeSellerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  becomeSellerDesc: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  menuCard: {
    paddingVertical: Spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    marginLeft: Spacing.md,
  },
  menuDivider: {
    height: 1,
    marginLeft: Spacing["3xl"] + Spacing.lg,
  },
});
