import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  useFocusEffect,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { RingLightAvatar } from "@/components/RingLightAvatar";
import { useTheme } from "@/hooks/useTheme";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/services/storage";
import { shippingService } from "@/services/shipping";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  isSeller: boolean;
  followers: number;
  following: number;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user: authUser, signOut } = useAuth();
  const { totalItems } = useCart();
  const { unreadCount, refresh: refreshNotifications } =
    useUnreadNotifications();
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [shortsCount, setShortsCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit profile state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = React.useCallback(async () => {
    if (!authUser) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", authUser.id)
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        name: data.name || authUser.email?.split("@")[0] || "User",
        avatar: data.avatar_url,
        isSeller: true, // TODO: Add is_seller field to profiles table
        followers: 0, // TODO: Add followers count
        following: 0, // TODO: Add following count
      });

      // Check if user has products
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", authUser.id);
      setProductCount(count ?? 0);

      // Check if user has shorts
      const { count: sc } = await supabase
        .from("shorts")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", authUser.id);
      setShortsCount(sc ?? 0);

      // Check order count
      const { count: oc } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id);
      setOrderCount(oc ?? 0);

      // Check saved products count
      const { count: spc } = await supabase
        .from("saved_products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id);
      setSavedCount(spc ?? 0);

      // Check sales count via backend API (bypasses RLS)
      try {
        const sales = await shippingService.fetchSales(authUser.id);
        setSalesCount(sales.length);
      } catch {
        setSalesCount(0);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback to basic user info
      setProfile({
        id: authUser.id,
        name: authUser.email?.split("@")[0] || "User",
        avatar: null,
        isSeller: true,
        followers: 0,
        following: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useFocusEffect(
    React.useCallback(() => {
      if (authUser) {
        loadProfile();
      }
    }, [authUser, loadProfile]),
  );

  // Real-time subscriptions for badge counts
  React.useEffect(() => {
    if (!authUser) return;

    // Channel for tables filtered by this user's ID
    const channel = supabase
      .channel("profile-badges")
      // Orders where this user is the BUYER
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          const { count: oc } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authUser.id);
          setOrderCount(oc ?? 0);
        },
      )
      // Orders where this user is the SELLER (sales)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${authUser.id}`,
        },
        async () => {
          try {
            const sales = await shippingService.fetchSales(authUser.id);
            setSalesCount(sales.length);
          } catch {
            // ignore
          }
        },
      )
      // Order items where this user is the seller (backup trigger for sales)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_items",
          filter: `seller_id=eq.${authUser.id}`,
        },
        async () => {
          try {
            const sales = await shippingService.fetchSales(authUser.id);
            setSalesCount(sales.length);
          } catch {
            // ignore
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `seller_id=eq.${authUser.id}`,
        },
        async () => {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", authUser.id);
          setProductCount(count ?? 0);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_products",
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          const { count } = await supabase
            .from("saved_products")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authUser.id);
          setSavedCount(count ?? 0);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shorts",
          filter: `seller_id=eq.${authUser.id}`,
        },
        async () => {
          const { count } = await supabase
            .from("shorts")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", authUser.id);
          setShortsCount(count ?? 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  if (!profile) {
    return null;
  }

  const openEditModal = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditAvatar(profile.avatar);
    setEditModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setEditAvatar(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveProfile = async () => {
    if (!authUser || !editName.trim()) {
      Alert.alert("Error", "Please enter a display name");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = editAvatar;

      // Upload new avatar if it's a local file
      if (editAvatar && !editAvatar.includes("supabase")) {
        const uploaded = await uploadImage(editAvatar, "avatars");
        if (uploaded) {
          avatarUrl = uploaded;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", authUser.id);

      if (error) throw error;

      // Update local state
      setProfile((prev) =>
        prev ? { ...prev, name: editName.trim(), avatar: avatarUrl } : null,
      );
      setEditModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
          paddingTop: insets.top + 44 + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadProfile();
            refreshNotifications();
            setRefreshing(false);
          }}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={styles.avatarSection}
      >
        {profile.isSeller ? (
          <RingLightAvatar avatar={profile.avatar} />
        ) : (
          <View style={styles.avatarBorderPlain}>
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.backgroundRoot },
              ]}
            >
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <Image
                  source={require("../../assets/images/avatar-default-1.png")}
                  style={styles.avatar}
                />
              )}
            </View>
          </View>
        )}
        <Pressable
          style={[styles.editButton, { backgroundColor: theme.primary }]}
          onPress={openEditModal}
        >
          <Feather name="edit-2" size={14} color={theme.buttonText} />
        </Pressable>
        <ThemedText style={styles.name}>{profile.name}</ThemedText>
        {profile.isSeller ? (
          <View style={styles.sellerBadge}>
            <Feather name="check-circle" size={14} color={theme.success} />
            <ThemedText style={[styles.sellerText, { color: theme.success }]}>
              Verified Seller
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>

      {profile.isSeller ? (
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
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
              {profile.followers.toLocaleString()}
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
            <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
              {profile.following.toLocaleString()}
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
        {profile.isSeller ? (
          <Pressable style={styles.goLiveButton} onPress={handleGoLive}>
            <LinearGradient
              colors={[theme.primary, "#FF8C5A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.goLiveGradient}
            >
              <Feather name="video" size={20} color={theme.buttonText} />
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
                  color={theme.buttonText}
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
              <Feather name="chevron-right" size={20} color={theme.secondary} />
            </View>
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <ThemedText style={[styles.sectionTitle, { color: theme.secondary }]}>
          Account
        </ThemedText>
        <Card elevation={1} style={styles.menuCard}>
          <MenuItem
            icon="home"
            label="My Store"
            onPress={() =>
              navigation.navigate("StoreProfile", {
                storeId: profile.id,
              })
            }
            theme={theme}
          />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="shopping-bag"
            label="My Orders"
            onPress={() => navigation.navigate("Orders")}
            theme={theme}
            badge={orderCount}
          />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="shopping-cart"
            label="My Cart"
            onPress={() => navigation.navigate("Cart")}
            theme={theme}
            badge={totalItems}
          />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="package"
            label="My Products"
            onPress={() => navigation.navigate("Products")}
            theme={theme}
            badge={productCount}
          />
          {profile.isSeller && (
            <>
              <View
                style={[styles.menuDivider, { backgroundColor: theme.border }]}
              />
              <MenuItem
                icon="play-circle"
                label="My Shorts"
                onPress={() =>
                  shortsCount > 0
                    ? navigation.navigate("StoreShortsViewer", {
                        sellerId: profile.id,
                      })
                    : (navigation as any).navigate("UploadShort")
                }
                theme={theme}
                badge={shortsCount}
              />
              <View
                style={[styles.menuDivider, { backgroundColor: theme.border }]}
              />
              <MenuItem
                icon="dollar-sign"
                label="My Sales"
                onPress={() => navigation.navigate("Sales")}
                theme={theme}
                badge={salesCount}
              />
            </>
          )}
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="heart"
            label="Saved Products"
            onPress={() => navigation.navigate("SavedProducts")}
            theme={theme}
            badge={savedCount}
          />
          <View
            style={[styles.menuDivider, { backgroundColor: theme.border }]}
          />
          <MenuItem
            icon="bell"
            label="Notifications"
            onPress={() => navigation.navigate("Notifications")}
            theme={theme}
            badge={unreadCount}
          />
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

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Pressable
              onPress={() => setEditModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText style={styles.modalTitle}>Edit Profile</ThemedText>
            <Pressable
              onPress={saveProfile}
              style={styles.modalSaveBtn}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <ThemedText
                  style={[styles.modalSaveText, { color: theme.primary }]}
                >
                  Save
                </ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <Pressable style={styles.avatarEditSection} onPress={pickAvatar}>
              <View style={styles.avatarEditContainer}>
                {editAvatar ? (
                  <Image
                    source={{ uri: editAvatar }}
                    style={styles.avatarEdit}
                  />
                ) : (
                  <Image
                    source={require("../../assets/images/avatar-default-1.png")}
                    style={styles.avatarEdit}
                  />
                )}
                <View style={styles.avatarEditOverlay}>
                  <Feather name="camera" size={24} color="#fff" />
                </View>
              </View>
              <ThemedText
                style={[styles.changePhotoText, { color: theme.primary }]}
              >
                Change Photo
              </ThemedText>
            </Pressable>

            <View style={styles.inputGroup}>
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Display Name
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                maxLength={50}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollViewCompat>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  theme,
  badge,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  theme: any;
  badge?: number;
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
        <Feather name={icon} size={18} color={theme.secondary} />
      </View>
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      {badge != null && badge > 0 && (
        <View style={[styles.menuBadge, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.menuBadgeText}>
            {badge > 99 ? "99+" : badge}
          </ThemedText>
        </View>
      )}
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
  avatarBorderPlain: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 4,
    marginBottom: Spacing.md,
    backgroundColor: "#7C3AED",
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
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
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
    color: "#FFFFFF",
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
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: Spacing.sm,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    includeFontPadding: false,
  },
  menuDivider: {
    height: 1,
    marginLeft: Spacing["3xl"] + Spacing.lg,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalSaveBtn: {
    width: 60,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalContent: {
    padding: Spacing.xl,
  },
  avatarEditSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarEditContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  avatarEdit: {
    width: "100%",
    height: "100%",
  },
  avatarEditOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  textInput: {
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
