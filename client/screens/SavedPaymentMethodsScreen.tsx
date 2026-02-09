import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useStripe } from "@/hooks/useStripePayment";
import Animated, { FadeInRight } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddCardModal } from "@/components/AddCardModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { settingsService, SavedPaymentMethod } from "@/services/settings";
import { BorderRadius, Spacing } from "@/constants/theme";

const BRAND_ICONS: Record<string, string> = {
  visa: "💳",
  mastercard: "💳",
  amex: "💳",
  discover: "💳",
  unknown: "💳",
};

function getBrandDisplay(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function SavedPaymentMethodsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [cards, setCards] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [webSetup, setWebSetup] = useState<{
    visible: boolean;
    clientSecret: string | null;
  }>({ visible: false, clientSecret: null });
  const [confirmDelete, setConfirmDelete] = useState<{
    visible: boolean;
    card: SavedPaymentMethod | null;
  }>({ visible: false, card: null });

  const loadCards = useCallback(async () => {
    if (!user?.id) return;
    try {
      const methods = await settingsService.fetchPaymentMethods(user.id);
      setCards(methods);
    } catch (err) {
      console.error("[PaymentMethods] Failed to load:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleAddCard = async () => {
    if (!user?.id) return;

    setIsAdding(true);
    try {
      const { clientSecret, ephemeralKey, customerId } =
        await settingsService.createSetupIntent(
          user.id,
          user.email || undefined,
        );

      if (Platform.OS === "web") {
        // Show web card form modal
        setWebSetup({ visible: true, clientSecret });
        setIsAdding(false);
        return;
      }

      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: "JaTango",
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
      });

      if (initError) {
        console.error("[PaymentMethods] Init error:", initError);
        Alert.alert("Error", "Failed to initialize card form.");
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Error", presentError.message);
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadCards();
    } catch (err: any) {
      console.error("[PaymentMethods] Add card error:", err);
      Alert.alert("Error", err.message || "Failed to add card.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleWebCardSuccess = async () => {
    setWebSetup({ visible: false, clientSecret: null });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadCards();
  };

  const handleWebCardCancel = () => {
    setWebSetup({ visible: false, clientSecret: null });
  };

  const handleDeleteCard = async () => {
    const card = confirmDelete.card;
    if (!card) return;

    setConfirmDelete({ visible: false, card: null });

    try {
      await settingsService.deletePaymentMethod(card.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err: any) {
      console.error("[PaymentMethods] Delete error:", err);
      Alert.alert("Error", err.message || "Failed to remove card.");
    }
  };

  const renderCard = ({
    item,
    index,
  }: {
    item: SavedPaymentMethod;
    index: number;
  }) => (
    <Animated.View entering={FadeInRight.delay(index * 80).springify()}>
      <Card elevation={1} style={styles.cardItem}>
        <View style={styles.cardRow}>
          <View
            style={[
              styles.cardIconWrap,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText style={styles.cardIcon}>
              {BRAND_ICONS[item.brand] || BRAND_ICONS.unknown}
            </ThemedText>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardTopRow}>
              <ThemedText style={styles.cardBrand}>
                {getBrandDisplay(item.brand)}
              </ThemedText>
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
              style={[styles.cardNumber, { color: theme.textSecondary }]}
            >
              •••• •••• •••• {item.last4}
            </ThemedText>
            <ThemedText
              style={[styles.cardExpiry, { color: theme.textSecondary }]}
            >
              Expires {String(item.expMonth).padStart(2, "0")}/
              {String(item.expYear).slice(-2)}
            </ThemedText>
          </View>
          <Pressable
            style={styles.deleteButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setConfirmDelete({ visible: true, card: item });
            }}
          >
            <Feather name="trash-2" size={18} color="#EF4444" />
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
          <ThemedText style={styles.headerTitle}>Payment Methods</ThemedText>
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
        <ThemedText style={styles.headerTitle}>Payment Methods</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          cards.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="credit-card" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyTitle}>No Saved Cards</ThemedText>
            <ThemedText
              style={[styles.emptyDesc, { color: theme.textSecondary }]}
            >
              Add a card to speed up checkout. Your card details are securely
              stored by Stripe.
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
          onPress={handleAddCard}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            "Add Card"
          )}
        </Button>
      </View>

      {webSetup.visible && webSetup.clientSecret && (
        <AddCardModal
          clientSecret={webSetup.clientSecret}
          onSuccess={handleWebCardSuccess}
          onCancel={handleWebCardCancel}
        />
      )}

      <ConfirmDialog
        visible={confirmDelete.visible}
        title="Remove Card"
        message={`Remove card ending in ${confirmDelete.card?.last4 || "****"}?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleDeleteCard}
        onCancel={() => setConfirmDelete({ visible: false, card: null })}
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
  cardItem: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  cardBrand: {
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
  cardNumber: {
    fontSize: 13,
    fontFamily: "monospace",
  },
  cardExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
