import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { ShippingRate } from "@/types";

/* eslint-disable prettier/prettier */
const CARRIER_LOGOS: Record<string, string> = {
  usps: "https://cdn.brandfetch.io/idL0iThUQR/w/512/h/512/theme/dark/icon.jpeg",
  ups: "https://cdn.brandfetch.io/id2S-kXbuX/w/512/h/512/theme/dark/icon.jpeg",
  fedex: "https://cdn.brandfetch.io/id8mMFplKP/w/512/h/512/theme/dark/icon.jpeg",
  dhl: "https://cdn.brandfetch.io/idZmpfgsGY/w/512/h/512/theme/dark/icon.jpeg",
};
/* eslint-enable prettier/prettier */

const CARRIER_NAMES: Record<string, string> = {
  usps: "USPS",
  ups: "UPS",
  fedex: "FedEx",
  dhl: "DHL",
};

function getCarrierInfo(carrier: string) {
  const key = carrier.toLowerCase();
  const uri = CARRIER_LOGOS[key];
  const name = CARRIER_NAMES[key] || carrier.toUpperCase();
  return { uri, name };
}

interface ShippingRateSelectorProps {
  rates: ShippingRate[];
  selectedRateId: string | null;
  onSelect: (rate: ShippingRate) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ShippingRateSelector({
  rates,
  selectedRateId,
  onSelect,
  isLoading,
  error,
}: ShippingRateSelectorProps) {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText
          style={[styles.loadingText, { color: theme.textSecondary }]}
        >
          Getting shipping rates...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={16} color="#EF4444" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  if (rates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          No shipping rates available
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {rates.map((rate) => {
        const isSelected = selectedRateId === rate.rateId;
        return (
          <Pressable
            key={rate.rateId}
            style={[
              styles.rateCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: isSelected ? theme.primary : theme.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
            onPress={() => {
              onSelect(rate);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={styles.rateLeft}>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                )}
              </View>
              {(() => {
                const { uri, name } = getCarrierInfo(rate.carrier);
                return uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.carrierLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={[
                      styles.carrierBadge,
                      { backgroundColor: theme.border },
                    ]}
                  >
                    <ThemedText style={styles.carrierBadgeText}>
                      {name.charAt(0)}
                    </ThemedText>
                  </View>
                );
              })()}
              <View style={styles.rateInfo}>
                <ThemedText
                  style={[styles.carrierName, { color: theme.textSecondary }]}
                >
                  {getCarrierInfo(rate.carrier).name}
                </ThemedText>
                <ThemedText style={styles.serviceName}>
                  {rate.serviceName}
                </ThemedText>
                {rate.estimatedDays > 0 && (
                  <ThemedText
                    style={[
                      styles.estimatedDays,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {rate.estimatedDays === 1
                      ? "1 business day"
                      : `${rate.estimatedDays} business days`}
                  </ThemedText>
                )}
              </View>
            </View>
            <ThemedText style={[styles.price, { color: theme.primary }]}>
              ${rate.amount.toFixed(2)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
    color: "#EF4444",
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
  },
  rateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  rateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rateInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
  },
  estimatedDays: {
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  carrierLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  carrierBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  carrierBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  carrierName: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
});
