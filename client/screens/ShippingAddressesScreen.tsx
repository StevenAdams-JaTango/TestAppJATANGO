import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInRight } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { settingsService } from "@/services/settings";
import { BorderRadius, Spacing } from "@/constants/theme";
import { ShippingAddress } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ShippingAddressesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{
    visible: boolean;
    address: ShippingAddress | null;
  }>({ visible: false, address: null });

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fetched = await settingsService.fetchAddresses(user.id);
      setAddresses(fetched);
    } catch (err) {
      console.error("[Addresses] Failed to load:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Reload when returning from AddAddress screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadAddresses();
    });
    return unsubscribe;
  }, [navigation, loadAddresses]);

  const handleSetDefault = async (address: ShippingAddress) => {
    if (address.isDefault) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await settingsService.setDefaultAddress(address.id);
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === address.id,
        })),
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to set default address.");
    }
  };

  const handleDeleteAddress = async () => {
    const addr = confirmDelete.address;
    if (!addr) return;
    setConfirmDelete({ visible: false, address: null });

    try {
      await settingsService.deleteAddress(addr.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete address.");
    }
  };

  const renderAddress = ({
    item,
    index,
  }: {
    item: ShippingAddress;
    index: number;
  }) => (
    <Animated.View entering={FadeInRight.delay(index * 80).springify()}>
      <Card elevation={1} style={styles.addressCard}>
        <Pressable
          style={styles.addressContent}
          onPress={() =>
            navigation.navigate("AddAddress", { addressId: item.id })
          }
        >
          <View
            style={[
              styles.addressIconWrap,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <Feather name="map-pin" size={20} color={theme.primary} />
          </View>
          <View style={styles.addressInfo}>
            <View style={styles.addressTopRow}>
              <ThemedText style={styles.addressName}>{item.name}</ThemedText>
              {item.isDefault && (
                <View
                  style={[
                    styles.defaultBadge,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <ThemedText
                    style={[styles.defaultBadgeText, { color: theme.primary }]}
                  >
                    Default
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText
              style={[styles.addressLine, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.addressLine1}
              {item.addressLine2 ? `, ${item.addressLine2}` : ""}
            </ThemedText>
            <ThemedText
              style={[styles.addressLine, { color: theme.textSecondary }]}
            >
              {item.city}, {item.state} {item.zip}
            </ThemedText>
            {item.phone && (
              <ThemedText
                style={[styles.addressPhone, { color: theme.textSecondary }]}
              >
                {item.phone}
              </ThemedText>
            )}
          </View>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </Pressable>
        <View style={[styles.addressActions, { borderTopColor: theme.border }]}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleSetDefault(item)}
          >
            <Feather
              name={item.isDefault ? "check-circle" : "circle"}
              size={16}
              color={item.isDefault ? theme.primary : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.actionText,
                item.isDefault && { color: theme.primary },
              ]}
            >
              {item.isDefault ? "Default" : "Set as default"}
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setConfirmDelete({ visible: true, address: item });
            }}
          >
            <Feather name="trash-2" size={16} color="#DC2626" />
            <ThemedText style={[styles.actionText, { color: "#DC2626" }]}>
              Delete
            </ThemedText>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Shipping Addresses</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Shipping Addresses</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          addresses.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="map-pin" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyTitle}>
              No Saved Addresses
            </ThemedText>
            <ThemedText
              style={[styles.emptyDesc, { color: theme.textSecondary }]}
            >
              Add a shipping address to speed up checkout.
            </ThemedText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <Button
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("AddAddress")}
        >
          Add Address
        </Button>
      </View>

      <ConfirmDialog
        visible={confirmDelete.visible}
        title="Delete Address"
        message={`Delete "${confirmDelete.address?.name || "this address"}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAddress}
        onCancel={() => setConfirmDelete({ visible: false, address: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyContent: {
    flex: 1,
  },
  addressCard: {
    marginBottom: Spacing.md,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  addressContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  addressInfo: {
    flex: 1,
  },
  addressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  addressName: {
    fontSize: 15,
    fontWeight: "600",
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addressLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  addressPhone: {
    fontSize: 12,
    marginTop: 4,
  },
  addressActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  addButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
