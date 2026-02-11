import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ShippingRateSelector } from "@/components/ShippingRateSelector";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { shippingService } from "@/services/shipping";
import { productsService } from "@/services/products";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Sale, ShippingRate, OrderItem, SavedPackage } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRouteProp = RouteProp<RootStackParamList, "SaleDetail">;

interface PackageType {
  id: string;
  name: string;
  description: string;
  length: string;
  width: string;
  height: string;
  icon: string;
  category: "standard" | "flat_rate" | "poly" | "saved";
}

const STANDARD_PACKAGES: PackageType[] = [
  // Standard USPS boxes
  {
    id: "6x4x4",
    name: '6" × 4" × 4"',
    description: "Extra Small",
    length: "6",
    width: "4",
    height: "4",
    icon: "box",
    category: "standard",
  },
  {
    id: "8x6x4",
    name: '8" × 6" × 4"',
    description: "Small",
    length: "8",
    width: "6",
    height: "4",
    icon: "box",
    category: "standard",
  },
  {
    id: "10x8x6",
    name: '10" × 8" × 6"',
    description: "Medium",
    length: "10",
    width: "8",
    height: "6",
    icon: "package",
    category: "standard",
  },
  {
    id: "12x10x6",
    name: '12" × 10" × 6"',
    description: "Large",
    length: "12",
    width: "10",
    height: "6",
    icon: "package",
    category: "standard",
  },
  {
    id: "14x10x6",
    name: '14" × 10" × 6"',
    description: "Large Wide",
    length: "14",
    width: "10",
    height: "6",
    icon: "package",
    category: "standard",
  },
  {
    id: "16x12x8",
    name: '16" × 12" × 8"',
    description: "Extra Large",
    length: "16",
    width: "12",
    height: "8",
    icon: "archive",
    category: "standard",
  },
  {
    id: "18x14x8",
    name: '18" × 14" × 8"',
    description: "Oversized",
    length: "18",
    width: "14",
    height: "8",
    icon: "archive",
    category: "standard",
  },
  {
    id: "20x14x10",
    name: '20" × 14" × 10"',
    description: "Jumbo",
    length: "20",
    width: "14",
    height: "10",
    icon: "archive",
    category: "standard",
  },
  // USPS Flat Rate
  {
    id: "flat_rate_envelope",
    name: "Flat Rate Envelope",
    description: '12.5" × 9.5" × 0.75"',
    length: "12.5",
    width: "9.5",
    height: "0.75",
    icon: "mail",
    category: "flat_rate",
  },
  {
    id: "flat_rate_padded",
    name: "Padded Flat Rate Envelope",
    description: '12.5" × 9.5" × 1"',
    length: "12.5",
    width: "9.5",
    height: "1",
    icon: "mail",
    category: "flat_rate",
  },
  {
    id: "flat_rate_small",
    name: "Small Flat Rate Box",
    description: '8.625" × 5.375" × 1.625"',
    length: "8.625",
    width: "5.375",
    height: "1.625",
    icon: "inbox",
    category: "flat_rate",
  },
  {
    id: "flat_rate_medium",
    name: "Medium Flat Rate Box",
    description: '11.25" × 8.75" × 5.5"',
    length: "11.25",
    width: "8.75",
    height: "5.5",
    icon: "inbox",
    category: "flat_rate",
  },
  {
    id: "flat_rate_large",
    name: "Large Flat Rate Box",
    description: '12.25" × 12.25" × 6"',
    length: "12.25",
    width: "12.25",
    height: "6",
    icon: "inbox",
    category: "flat_rate",
  },
  // Poly Mailer (custom dimensions)
  {
    id: "poly_mailer",
    name: "Poly Mailer",
    description: "Enter your own dimensions",
    length: "10",
    width: "13",
    height: "1",
    icon: "send",
    category: "poly",
  },
];

const getStatusColor = (status: string, theme: Record<string, string>) => {
  switch (status) {
    case "delivered":
      return theme.success;
    case "paid":
      return theme.secondary;
    case "shipped":
      return theme.primary;
    case "cancelled":
      return "#ef4444";
    default:
      return theme.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "Needs Shipping";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

export default function SaleDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { user } = useAuth();

  const { orderId } = route.params;
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [savedPackages, setSavedPackages] = useState<SavedPackage[]>([]);
  const [packageTab, setPackageTab] = useState<
    "standard" | "flat_rate" | "poly" | "saved"
  >("standard");
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  // Product weight lookup: productId -> weight in lbs
  const [productWeights, setProductWeights] = useState<Record<string, number>>(
    {},
  );

  // Multi-parcel state
  interface Parcel {
    id: string;
    itemIds: string[];
    packageType: PackageType | null;
    customLength: string;
    customWidth: string;
    customHeight: string;
    weight: string;
    rates: ShippingRate[];
    selectedRate: ShippingRate | null;
    isLoadingRates: boolean;
    ratesError: string | null;
    isBuyingLabel: boolean;
    trackingNumber: string | null;
    labelUrl: string | null;
  }
  const [parcels, setParcels] = useState<Parcel[]>([]);

  // Convert a product weight to lbs based on its unit
  const toLbs = (weight: number, unit?: string): number => {
    switch (unit) {
      case "oz":
        return weight / 16;
      case "g":
        return weight / 453.592;
      case "kg":
        return weight * 2.20462;
      default:
        return weight; // assume lbs
    }
  };

  // Calculate total weight (lbs) for a set of item IDs
  const calcTotalWeight = (
    itemIds: string[],
    items: OrderItem[],
    weights: Record<string, number>,
  ): string => {
    let total = 0;
    for (const itemId of itemIds) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        const w = weights[item.productId] || 0;
        total += w * item.quantity;
      }
    }
    return total > 0 ? total.toFixed(2) : "1";
  };

  const loadSale = useCallback(async () => {
    if (!user?.id) return;
    try {
      const sales = await shippingService.fetchSales(user.id);
      const found = sales.find((s) => s.id === orderId);
      setSale(found || null);

      // Fetch product weights for all items
      if (found?.items?.length) {
        const uniqueProductIds = [
          ...new Set(found.items.map((i) => i.productId)),
        ];
        const weights: Record<string, number> = {};
        await Promise.all(
          uniqueProductIds.map(async (pid) => {
            const product = await productsService.getProduct(pid);
            if (product?.weight) {
              weights[pid] = toLbs(product.weight, product.weightUnit);
            }
          }),
        );
        setProductWeights(weights);
      }
    } catch (err) {
      console.error("[SaleDetail] Failed to load:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, orderId]);

  const loadSavedPackages = useCallback(async () => {
    if (!user?.id) return;
    try {
      const pkgs = await shippingService.fetchSavedPackages(user.id);
      setSavedPackages(pkgs);
    } catch (err) {
      console.error("[SaleDetail] Failed to load saved packages:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSale();
    loadSavedPackages();
  }, [loadSale, loadSavedPackages]);

  // Create initial parcel with all items when sale loads
  useEffect(() => {
    if (!sale?.items?.length || parcels.length > 0) return;
    const allItemIds = sale.items.map((i) => i.id);
    setParcels([
      {
        id: `parcel-${Date.now()}`,
        itemIds: allItemIds,
        packageType: null,
        customLength: "6",
        customWidth: "4",
        customHeight: "4",
        weight: "1",
        rates: [],
        selectedRate: null,
        isLoadingRates: false,
        ratesError: null,
        isBuyingLabel: false,
        trackingNumber: null,
        labelUrl: null,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale]);

  // Update parcel weights once product weights are fetched
  useEffect(() => {
    if (!sale?.items?.length) return;
    if (Object.keys(productWeights).length === 0) return;
    setParcels((prev) =>
      prev.map((p) => ({
        ...p,
        weight: calcTotalWeight(p.itemIds, sale.items, productWeights),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productWeights]);

  const saveCurrentPackage = async (parcel: Parcel) => {
    if (!user?.id || !parcel.packageType) return;
    const pkg = parcel.packageType;
    const isCustom = pkg.category === "poly";
    const pL = isCustom ? parcel.customLength : pkg.length;
    const pW = isCustom ? parcel.customWidth : pkg.width;
    const pH = isCustom ? parcel.customHeight : pkg.height;

    Alert.prompt(
      "Save Package",
      `Save ${pL}" × ${pW}" × ${pH}" as a reusable package?\nEnter a name:`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (name?: string) => {
            if (!name?.trim()) return;
            setIsSavingPackage(true);
            try {
              await shippingService.createSavedPackage({
                sellerId: user.id,
                name: name.trim(),
                packageType: pkg.category === "poly" ? "poly" : "box",
                length: pL,
                width: pW,
                height: pH,
                weight: parcel.weight || undefined,
              });
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              loadSavedPackages();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to save package");
            } finally {
              setIsSavingPackage(false);
            }
          },
        },
      ],
      "plain-text",
      pkg.name,
    );
  };

  const deleteSavedPackage = async (pkgId: string) => {
    Alert.alert("Delete Package", "Remove this saved package?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await shippingService.deleteSavedPackage(pkgId);
            setSavedPackages((prev) => prev.filter((p) => p.id !== pkgId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete package");
          }
        },
      },
    ]);
  };

  const addParcel = () => {
    setParcels((prev) => [
      ...prev,
      {
        id: `parcel-${Date.now()}`,
        itemIds: [],
        packageType: null,
        customLength: "6",
        customWidth: "4",
        customHeight: "4",
        weight: "1",
        rates: [],
        selectedRate: null,
        isLoadingRates: false,
        ratesError: null,
        isBuyingLabel: false,
        trackingNumber: null,
        labelUrl: null,
      },
    ]);
  };

  const removeParcel = (parcelId: string) => {
    setParcels((prev) => prev.filter((p) => p.id !== parcelId));
  };

  const toggleItemInParcel = (parcelId: string, itemId: string) => {
    setParcels((prev) =>
      prev.map((p) => {
        if (p.id !== parcelId) return p;
        const has = p.itemIds.includes(itemId);
        const newItemIds = has
          ? p.itemIds.filter((id) => id !== itemId)
          : [...p.itemIds, itemId];
        return {
          ...p,
          itemIds: newItemIds,
          weight: sale?.items
            ? calcTotalWeight(newItemIds, sale.items, productWeights)
            : p.weight,
          rates: [],
          selectedRate: null,
        };
      }),
    );
  };

  const selectPackageType = (parcelId: string, pkg: PackageType) => {
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              packageType: pkg,
              customLength: pkg.length,
              customWidth: pkg.width,
              customHeight: pkg.height,
              rates: [],
              selectedRate: null,
            }
          : p,
      ),
    );
  };

  const updateParcelField = (
    parcelId: string,
    field: "customLength" | "customWidth" | "customHeight" | "weight",
    value: string,
  ) => {
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? { ...p, [field]: value, rates: [], selectedRate: null }
          : p,
      ),
    );
  };

  const getAssignedItemIds = (): string[] => {
    return parcels.flatMap((p) => p.itemIds);
  };

  const fetchRatesForParcel = async (parcelId: string) => {
    if (!sale?.shippingAddress || !user?.id) return;

    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? { ...p, isLoadingRates: true, ratesError: null }
          : p,
      ),
    );

    try {
      const storeAddress = await shippingService.getStoreAddress(user.id);
      if (!storeAddress) {
        setParcels((prev) =>
          prev.map((p) =>
            p.id === parcelId
              ? {
                  ...p,
                  isLoadingRates: false,
                  ratesError: "Please set up your store address first.",
                }
              : p,
          ),
        );
        return;
      }

      const parcel = parcels.find((p) => p.id === parcelId);
      if (!parcel?.packageType) {
        setParcels((prev) =>
          prev.map((p) =>
            p.id === parcelId
              ? {
                  ...p,
                  isLoadingRates: false,
                  ratesError: "Please select a package type first.",
                }
              : p,
          ),
        );
        return;
      }

      const useCustomDims = parcel.packageType.category === "poly";
      const pLength = useCustomDims
        ? parcel.customLength
        : parcel.packageType.length;
      const pWidth = useCustomDims
        ? parcel.customWidth
        : parcel.packageType.width;
      const pHeight = useCustomDims
        ? parcel.customHeight
        : parcel.packageType.height;
      const pWeight = parcel.weight || "1";

      const result = await shippingService.getRates(
        {
          name: "Store",
          street1: storeAddress.addressLine1,
          street2: storeAddress.addressLine2,
          city: storeAddress.city,
          state: storeAddress.state,
          zip: storeAddress.zip,
          country: storeAddress.country || "US",
        },
        {
          name: sale.shippingAddress.name,
          street1: sale.shippingAddress.addressLine1,
          street2: sale.shippingAddress.addressLine2,
          city: sale.shippingAddress.city,
          state: sale.shippingAddress.state,
          zip: sale.shippingAddress.zip,
          country: sale.shippingAddress.country || "US",
        },
        {
          length: pLength,
          width: pWidth,
          height: pHeight,
          distanceUnit: "in",
          weight: pWeight,
          massUnit: "lb",
        },
      );

      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId
            ? {
                ...p,
                rates: result.rates,
                selectedRate: result.rates[0] || null,
                isLoadingRates: false,
              }
            : p,
        ),
      );
    } catch (err: any) {
      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId
            ? {
                ...p,
                isLoadingRates: false,
                ratesError: err.message || "Failed to get rates",
              }
            : p,
        ),
      );
    }
  };

  const handleBuyLabelForParcel = async (parcelId: string) => {
    const parcel = parcels.find((p) => p.id === parcelId);
    if (!parcel?.selectedRate || !sale) return;

    setParcels((prev) =>
      prev.map((p) => (p.id === parcelId ? { ...p, isBuyingLabel: true } : p)),
    );

    try {
      const pkgType = parcel.packageType;
      const result = await shippingService.buyLabel(
        parcel.selectedRate.rateId,
        sale.id,
        pkgType
          ? {
              packageType: pkgType.id,
              length:
                pkgType.category === "poly"
                  ? parcel.customLength
                  : pkgType.length,
              width:
                pkgType.category === "poly"
                  ? parcel.customWidth
                  : pkgType.width,
              height:
                pkgType.category === "poly"
                  ? parcel.customHeight
                  : pkgType.height,
              weight: parcel.weight,
            }
          : undefined,
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId
            ? {
                ...p,
                isBuyingLabel: false,
                trackingNumber: result.trackingNumber,
                labelUrl: result.labelUrl,
              }
            : p,
        ),
      );

      // If all parcels have labels, mark order as shipped
      const allShipped = parcels.every(
        (p) => p.id === parcelId || p.trackingNumber,
      );
      if (allShipped) {
        setSale((prev) =>
          prev
            ? {
                ...prev,
                trackingNumber: result.trackingNumber,
                status: "shipped" as const,
              }
            : null,
        );
      }

      Alert.alert(
        "Label Purchased!",
        `Tracking: ${result.trackingNumber}\n\nThe label PDF is ready to download.`,
        [
          { text: "OK" },
          {
            text: "Open Label",
            onPress: () => {
              if (result.labelUrl) Linking.openURL(result.labelUrl);
            },
          },
        ],
      );
    } catch (err: any) {
      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId ? { ...p, isBuyingLabel: false } : p,
        ),
      );
      Alert.alert("Error", err.message || "Failed to purchase label");
    }
  };

  const handleMarkDelivered = async () => {
    if (!sale) return;

    setIsUpdatingStatus(true);
    try {
      await shippingService.updateOrderStatus(sale.id, "delivered");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSale((prev) =>
        prev ? { ...prev, status: "delivered" as const } : null,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
        ]}
      >
        <Header theme={theme} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (!sale) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
        ]}
      >
        <Header theme={theme} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.emptyText}>Sale not found</ThemedText>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(sale.status, theme);
  const itemCount = sale.items.reduce((sum, i) => sum + i.quantity, 0);
  const needsShipping = sale.status === "paid";
  const hasLabel = !!sale.trackingNumber;
  const allParcelsLabeled =
    parcels.length > 0 && parcels.every((p) => !!p.trackingNumber);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, paddingTop: insets.top },
      ]}
    >
      <Header theme={theme} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "18" },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(sale.status)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Buyer
            </ThemedText>
            <ThemedText style={styles.infoValue}>
              {sale.buyerName || "Unknown"}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Order ID
            </ThemedText>
            <ThemedText style={styles.infoValue} numberOfLines={1}>
              {sale.id.slice(0, 8)}...
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: theme.textSecondary }]}
            >
              Items
            </ThemedText>
            <ThemedText style={styles.infoValue}>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={[styles.totalValue, { color: theme.primary }]}>
              ${sale.totalAmount.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {/* Shipping Address */}
        {sale.shippingAddress && (
          <>
            <ThemedText style={styles.sectionTitle}>Ship To</ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.addressRow}>
                <Feather name="map-pin" size={16} color={theme.primary} />
                <View style={styles.addressText}>
                  <ThemedText style={styles.addressName}>
                    {sale.shippingAddress.name}
                  </ThemedText>
                  <ThemedText
                    style={[styles.addressLine, { color: theme.textSecondary }]}
                  >
                    {sale.shippingAddress.addressLine1}
                  </ThemedText>
                  {sale.shippingAddress.addressLine2 ? (
                    <ThemedText
                      style={[
                        styles.addressLine,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {sale.shippingAddress.addressLine2}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    style={[styles.addressLine, { color: theme.textSecondary }]}
                  >
                    {`${sale.shippingAddress.city}, ${sale.shippingAddress.state} ${sale.shippingAddress.zip}`}
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Items */}
        <ThemedText style={styles.sectionTitle}>Items</ThemedText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          {sale.items.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && (
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              )}
              <ItemRow item={item} theme={theme} />
            </React.Fragment>
          ))}
        </View>

        {/* Print Packing Slip */}
        <Pressable
          style={styles.labelLink}
          onPress={() => {
            if (!sale) return;
            const addr = sale.shippingAddress;
            const itemsHtml = sale.items
              .map(
                (item) =>
                  `<tr>
                    <td style="padding:8px;border-bottom:1px solid #eee;">
                      ${item.productName}
                      ${item.selectedColorName ? `<br/><small style="color:#666;">Color: ${item.selectedColorName}</small>` : ""}
                      ${item.selectedSizeName ? `<br/><small style="color:#666;">Size: ${item.selectedSizeName}</small>` : ""}
                    </td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.unitPrice.toFixed(2)}</td>
                  </tr>`,
              )
              .join("");
            const html = `<!DOCTYPE html>
<html><head><title>Packing Slip - ${sale.id.slice(0, 8)}</title>
<style>
  body{font-family:-apple-system,sans-serif;max-width:600px;margin:40px auto;color:#333;}
  h1{font-size:22px;margin-bottom:4px;}
  .meta{color:#666;font-size:13px;margin-bottom:24px;}
  .section{margin-bottom:20px;}
  .section h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;}
  .addr{line-height:1.6;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;}
  th:nth-child(2){text-align:center;}
  th:last-child{text-align:right;}
  .total-row td{border-top:2px solid #333;font-weight:700;padding-top:12px;}
  @media print{body{margin:20px;}}
</style></head><body>
<h1>Packing Slip</h1>
<div class="meta">Order #${sale.id.slice(0, 8)} &bull; ${new Date(sale.createdAt).toLocaleDateString()}</div>
${
  addr
    ? `<div class="section"><h2>Ship To</h2><div class="addr">
  <strong>${addr.name}</strong><br/>
  ${addr.addressLine1}<br/>
  ${addr.addressLine2 ? addr.addressLine2 + "<br/>" : ""}
  ${addr.city}, ${addr.state} ${addr.zip}
</div></div>`
    : ""
}
<div class="section"><h2>Items</h2>
<table><thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
<tbody>${itemsHtml}
<tr class="total-row"><td>Total</td><td></td><td style="text-align:right;">$${sale.totalAmount.toFixed(2)}</td></tr>
</tbody></table></div>
<div style="text-align:center;color:#999;font-size:12px;margin-top:40px;">Thank you for your order!</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
            const w = window.open("", "_blank");
            if (w) {
              w.document.write(html);
              w.document.close();
            }
          }}
        >
          <Feather name="printer" size={16} color={theme.primary} />
          <ThemedText style={[styles.labelLinkText, { color: theme.primary }]}>
            Print Packing Slip
          </ThemedText>
        </Pressable>

        {/* Tracking Info */}
        {hasLabel && (
          <>
            <ThemedText style={styles.sectionTitle}>Shipping</ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Tracking
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {sale.trackingNumber}
                </ThemedText>
              </View>
              {sale.labelUrl && (
                <>
                  <View
                    style={[styles.divider, { backgroundColor: theme.border }]}
                  />
                  <Pressable
                    style={styles.labelLink}
                    onPress={() => {
                      if (sale.labelUrl) Linking.openURL(sale.labelUrl);
                    }}
                  >
                    <Feather name="download" size={16} color={theme.primary} />
                    <ThemedText
                      style={[styles.labelLinkText, { color: theme.primary }]}
                    >
                      Download Shipping Label (PDF)
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}

        {/* Ship Order — Multi-Parcel with Item Picking */}
        {needsShipping && sale.shippingAddress && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Ship Order</ThemedText>
              <Pressable
                style={[
                  styles.addParcelButton,
                  { backgroundColor: theme.primary + "15" },
                ]}
                onPress={() => {
                  addParcel();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Feather name="plus" size={16} color={theme.primary} />
                <ThemedText
                  style={[styles.addParcelText, { color: theme.primary }]}
                >
                  Add Parcel
                </ThemedText>
              </Pressable>
            </View>

            {parcels.length === 0 && (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundRoot,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.emptyParcelText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Tap &ldquo;Add Parcel&rdquo; to create a package, then pick
                  which items go in it. Each parcel gets its own shipping label.
                </ThemedText>
              </View>
            )}

            {parcels.map((parcel, idx) => {
              const parcelItems = sale.items.filter((i) =>
                parcel.itemIds.includes(i.id),
              );
              const assignedElsewhere = getAssignedItemIds().filter(
                (id) => !parcel.itemIds.includes(id),
              );

              return (
                <View
                  key={parcel.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundRoot,
                      borderColor: parcel.trackingNumber
                        ? theme.success
                        : theme.border,
                    },
                  ]}
                >
                  <View style={styles.parcelHeader}>
                    <View style={styles.parcelTitleRow}>
                      <Feather name="package" size={16} color={theme.primary} />
                      <ThemedText style={styles.parcelTitle}>
                        Parcel {idx + 1}
                      </ThemedText>
                    </View>
                    {!parcel.trackingNumber && (
                      <Pressable
                        onPress={() => removeParcel(parcel.id)}
                        hitSlop={8}
                      >
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>

                  {parcel.trackingNumber ? (
                    <View style={styles.parcelShipped}>
                      <Feather
                        name="check-circle"
                        size={16}
                        color={theme.success}
                      />
                      <ThemedText
                        style={[styles.trackingText, { color: theme.success }]}
                      >
                        {parcel.trackingNumber}
                      </ThemedText>
                      {parcel.labelUrl && (
                        <Pressable
                          onPress={() => Linking.openURL(parcel.labelUrl!)}
                        >
                          <Feather
                            name="download"
                            size={16}
                            color={theme.primary}
                          />
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <>
                      {/* Item Picker */}
                      <ThemedText
                        style={[
                          styles.pickLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Select items for this parcel:
                      </ThemedText>
                      {sale.items.map((item) => {
                        const isInParcel = parcel.itemIds.includes(item.id);
                        const isAssignedElsewhere = assignedElsewhere.includes(
                          item.id,
                        );
                        return (
                          <Pressable
                            key={item.id}
                            style={[
                              styles.pickItem,
                              {
                                backgroundColor: isInParcel
                                  ? theme.primary + "10"
                                  : theme.backgroundDefault,
                                borderColor: isInParcel
                                  ? theme.primary
                                  : theme.border,
                                opacity: isAssignedElsewhere ? 0.4 : 1,
                              },
                            ]}
                            onPress={() => {
                              if (!isAssignedElsewhere) {
                                toggleItemInParcel(parcel.id, item.id);
                                Haptics.impactAsync(
                                  Haptics.ImpactFeedbackStyle.Light,
                                );
                              }
                            }}
                            disabled={isAssignedElsewhere}
                          >
                            <Feather
                              name={isInParcel ? "check-square" : "square"}
                              size={18}
                              color={
                                isInParcel ? theme.primary : theme.textSecondary
                              }
                            />
                            {item.productImage ? (
                              <Image
                                source={{ uri: item.productImage }}
                                style={styles.pickItemImage}
                              />
                            ) : null}
                            <View style={styles.pickItemInfo}>
                              <ThemedText
                                style={styles.pickItemName}
                                numberOfLines={1}
                              >
                                {item.productName}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.pickItemQty,
                                  { color: theme.textSecondary },
                                ]}
                              >
                                Qty: {item.quantity}
                              </ThemedText>
                            </View>
                          </Pressable>
                        );
                      })}

                      {/* Package Type Selector */}
                      {parcel.itemIds.length > 0 && (
                        <View style={styles.packageSection}>
                          <ThemedText
                            style={[
                              styles.pickLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Select package type:
                          </ThemedText>

                          {/* Category Tabs */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.tabScroll}
                          >
                            {(
                              [
                                { key: "standard", label: "Boxes" },
                                { key: "flat_rate", label: "Flat Rate" },
                                { key: "poly", label: "Poly Mailer" },
                                { key: "saved", label: "My Packages" },
                              ] as const
                            ).map((tab) => (
                              <Pressable
                                key={tab.key}
                                style={[
                                  styles.tab,
                                  {
                                    backgroundColor:
                                      packageTab === tab.key
                                        ? theme.primary
                                        : theme.backgroundDefault,
                                    borderColor:
                                      packageTab === tab.key
                                        ? theme.primary
                                        : theme.border,
                                  },
                                ]}
                                onPress={() => setPackageTab(tab.key)}
                              >
                                <ThemedText
                                  style={[
                                    styles.tabText,
                                    {
                                      color:
                                        packageTab === tab.key
                                          ? "#fff"
                                          : theme.textSecondary,
                                    },
                                  ]}
                                >
                                  {tab.label}
                                  {tab.key === "saved" &&
                                  savedPackages.length > 0
                                    ? ` (${savedPackages.length})`
                                    : ""}
                                </ThemedText>
                              </Pressable>
                            ))}
                          </ScrollView>

                          {/* Package Grid */}
                          {packageTab !== "saved" && (
                            <View style={styles.packageGrid}>
                              {STANDARD_PACKAGES.filter(
                                (p) => p.category === packageTab,
                              ).map((pkg) => {
                                const isSelected =
                                  parcel.packageType?.id === pkg.id;
                                return (
                                  <Pressable
                                    key={pkg.id}
                                    style={[
                                      styles.packageCard,
                                      {
                                        backgroundColor: isSelected
                                          ? theme.primary + "15"
                                          : theme.backgroundDefault,
                                        borderColor: isSelected
                                          ? theme.primary
                                          : theme.border,
                                      },
                                    ]}
                                    onPress={() => {
                                      selectPackageType(parcel.id, pkg);
                                      Haptics.impactAsync(
                                        Haptics.ImpactFeedbackStyle.Light,
                                      );
                                    }}
                                  >
                                    <Feather
                                      name={pkg.icon as any}
                                      size={18}
                                      color={
                                        isSelected
                                          ? theme.primary
                                          : theme.textSecondary
                                      }
                                    />
                                    <ThemedText
                                      style={[
                                        styles.packageName,
                                        isSelected && {
                                          color: theme.primary,
                                        },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {pkg.name}
                                    </ThemedText>
                                    <ThemedText
                                      style={[
                                        styles.packageDims,
                                        { color: theme.textSecondary },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {pkg.description}
                                    </ThemedText>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}

                          {/* Saved Packages Tab */}
                          {packageTab === "saved" && (
                            <View style={styles.packageGrid}>
                              {savedPackages.length === 0 ? (
                                <ThemedText
                                  style={[
                                    styles.emptyParcelText,
                                    { color: theme.textSecondary },
                                  ]}
                                >
                                  No saved packages yet. Select a package and
                                  tap the save icon to save it for later.
                                </ThemedText>
                              ) : (
                                savedPackages.map((sp) => {
                                  const savedId = `saved_${sp.id}`;
                                  const isSelected =
                                    parcel.packageType?.id === savedId;
                                  return (
                                    <Pressable
                                      key={sp.id}
                                      style={[
                                        styles.packageCard,
                                        {
                                          backgroundColor: isSelected
                                            ? theme.primary + "15"
                                            : theme.backgroundDefault,
                                          borderColor: isSelected
                                            ? theme.primary
                                            : theme.border,
                                        },
                                      ]}
                                      onPress={() => {
                                        selectPackageType(parcel.id, {
                                          id: `saved_${sp.id}`,
                                          name: sp.name,
                                          description: `${sp.length}" × ${sp.width}" × ${sp.height}"`,
                                          length: sp.length,
                                          width: sp.width,
                                          height: sp.height,
                                          icon:
                                            sp.packageType === "poly"
                                              ? "send"
                                              : "package",
                                          category: "saved",
                                        });
                                        if (sp.weight) {
                                          updateParcelField(
                                            parcel.id,
                                            "weight",
                                            sp.weight,
                                          );
                                        }
                                        Haptics.impactAsync(
                                          Haptics.ImpactFeedbackStyle.Light,
                                        );
                                      }}
                                      onLongPress={() =>
                                        deleteSavedPackage(sp.id)
                                      }
                                    >
                                      <Feather
                                        name={
                                          sp.packageType === "poly"
                                            ? "send"
                                            : "package"
                                        }
                                        size={18}
                                        color={
                                          isSelected
                                            ? theme.primary
                                            : theme.textSecondary
                                        }
                                      />
                                      <ThemedText
                                        style={[
                                          styles.packageName,
                                          isSelected && {
                                            color: theme.primary,
                                          },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {sp.name}
                                      </ThemedText>
                                      <ThemedText
                                        style={[
                                          styles.packageDims,
                                          { color: theme.textSecondary },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {sp.length}&quot; × {sp.width}&quot; ×{" "}
                                        {sp.height}&quot;
                                      </ThemedText>
                                    </Pressable>
                                  );
                                })
                              )}
                            </View>
                          )}

                          {/* Poly Mailer custom dimensions */}
                          {parcel.packageType?.category === "poly" && (
                            <View style={styles.customDims}>
                              <View style={styles.dimRow}>
                                <View style={styles.dimField}>
                                  <ThemedText
                                    style={[
                                      styles.dimLabel,
                                      { color: theme.textSecondary },
                                    ]}
                                  >
                                    L (in)
                                  </ThemedText>
                                  <TextInput
                                    style={[
                                      styles.dimInput,
                                      {
                                        color: theme.text,
                                        borderColor: theme.border,
                                        backgroundColor:
                                          theme.backgroundDefault,
                                      },
                                    ]}
                                    value={parcel.customLength}
                                    onChangeText={(v) =>
                                      updateParcelField(
                                        parcel.id,
                                        "customLength",
                                        v,
                                      )
                                    }
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                                <View style={styles.dimField}>
                                  <ThemedText
                                    style={[
                                      styles.dimLabel,
                                      { color: theme.textSecondary },
                                    ]}
                                  >
                                    W (in)
                                  </ThemedText>
                                  <TextInput
                                    style={[
                                      styles.dimInput,
                                      {
                                        color: theme.text,
                                        borderColor: theme.border,
                                        backgroundColor:
                                          theme.backgroundDefault,
                                      },
                                    ]}
                                    value={parcel.customWidth}
                                    onChangeText={(v) =>
                                      updateParcelField(
                                        parcel.id,
                                        "customWidth",
                                        v,
                                      )
                                    }
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                                <View style={styles.dimField}>
                                  <ThemedText
                                    style={[
                                      styles.dimLabel,
                                      { color: theme.textSecondary },
                                    ]}
                                  >
                                    H (in)
                                  </ThemedText>
                                  <TextInput
                                    style={[
                                      styles.dimInput,
                                      {
                                        color: theme.text,
                                        borderColor: theme.border,
                                        backgroundColor:
                                          theme.backgroundDefault,
                                      },
                                    ]}
                                    value={parcel.customHeight}
                                    onChangeText={(v) =>
                                      updateParcelField(
                                        parcel.id,
                                        "customHeight",
                                        v,
                                      )
                                    }
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                              </View>
                            </View>
                          )}

                          {/* Weight + Save Package */}
                          <View style={styles.weightRow}>
                            <ThemedText
                              style={[
                                styles.dimLabel,
                                { color: theme.textSecondary },
                              ]}
                            >
                              Weight (lbs)
                            </ThemedText>
                            <TextInput
                              style={[
                                styles.weightInput,
                                {
                                  color: theme.text,
                                  borderColor: theme.border,
                                  backgroundColor: theme.backgroundDefault,
                                },
                              ]}
                              value={parcel.weight}
                              onChangeText={(v) =>
                                updateParcelField(parcel.id, "weight", v)
                              }
                              keyboardType="decimal-pad"
                            />
                            {parcel.packageType && (
                              <Pressable
                                style={[
                                  styles.savePackageBtn,
                                  { borderColor: theme.border },
                                ]}
                                onPress={() => saveCurrentPackage(parcel)}
                                disabled={isSavingPackage}
                              >
                                <Feather
                                  name="bookmark"
                                  size={16}
                                  color={theme.primary}
                                />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Rates + Buy Label */}
                      {parcel.itemIds.length > 0 && parcel.packageType && (
                        <View style={styles.parcelActions}>
                          {parcel.rates.length === 0 &&
                          !parcel.isLoadingRates &&
                          !parcel.ratesError ? (
                            <Button
                              style={[
                                styles.actionButton,
                                { backgroundColor: theme.primary },
                              ]}
                              onPress={() => fetchRatesForParcel(parcel.id)}
                            >
                              Get Rates ({parcelItems.length} item
                              {parcelItems.length !== 1 ? "s" : ""})
                            </Button>
                          ) : (
                            <ShippingRateSelector
                              rates={parcel.rates}
                              selectedRateId={
                                parcel.selectedRate?.rateId || null
                              }
                              onSelect={(rate) =>
                                setParcels((prev) =>
                                  prev.map((p) =>
                                    p.id === parcel.id
                                      ? { ...p, selectedRate: rate }
                                      : p,
                                  ),
                                )
                              }
                              isLoading={parcel.isLoadingRates}
                              error={parcel.ratesError}
                            />
                          )}

                          {parcel.selectedRate && (
                            <Button
                              style={[
                                styles.actionButton,
                                { backgroundColor: theme.primary },
                              ]}
                              onPress={() => handleBuyLabelForParcel(parcel.id)}
                              disabled={parcel.isBuyingLabel}
                            >
                              {parcel.isBuyingLabel ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#FFFFFF"
                                />
                              ) : (
                                `Buy Label — $${parcel.selectedRate.amount.toFixed(2)}`
                              )}
                            </Button>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Tracking Info (legacy single-label) */}
        {hasLabel && parcels.length === 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Shipping</ThemedText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Tracking
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {sale.trackingNumber}
                </ThemedText>
              </View>
              {sale.labelUrl && (
                <>
                  <View
                    style={[styles.divider, { backgroundColor: theme.border }]}
                  />
                  <Pressable
                    style={styles.labelLink}
                    onPress={() => {
                      if (sale.labelUrl) Linking.openURL(sale.labelUrl);
                    }}
                  >
                    <Feather name="download" size={16} color={theme.primary} />
                    <ThemedText
                      style={[styles.labelLinkText, { color: theme.primary }]}
                    >
                      Download Shipping Label (PDF)
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}

        {/* Mark Delivered */}
        {(sale.status === "shipped" || allParcelsLabeled) && (
          <Button
            style={[styles.deliveredButton, { backgroundColor: theme.success }]}
            onPress={handleMarkDelivered}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              "Mark as Delivered"
            )}
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

function Header({ theme, onBack }: { theme: any; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Feather name="arrow-left" size={24} color={theme.text} />
      </Pressable>
      <ThemedText style={styles.headerTitle}>Sale Details</ThemedText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function ItemRow({ item, theme }: { item: OrderItem; theme: any }) {
  const variantText = [item.selectedColorName, item.selectedSizeName]
    .filter(Boolean)
    .join(" / ");
  const lineTotal = item.unitPrice * item.quantity;

  return (
    <View style={styles.itemRow}>
      {item.productImage ? (
        <Image source={{ uri: item.productImage }} style={styles.itemImage} />
      ) : (
        <View
          style={[
            styles.itemImage,
            styles.itemImagePlaceholder,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="package" size={20} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <ThemedText style={styles.itemName} numberOfLines={2}>
          {item.productName}
        </ThemedText>
        {variantText ? (
          <ThemedText
            style={[styles.itemVariant, { color: theme.textSecondary }]}
          >
            {variantText}
          </ThemedText>
        ) : null}
        <View style={styles.itemPriceRow}>
          <ThemedText
            style={[styles.itemPrice, { color: theme.textSecondary }]}
          >
            ${item.unitPrice.toFixed(2)} × {item.quantity}
          </ThemedText>
          <ThemedText style={styles.itemTotal}>
            ${lineTotal.toFixed(2)}
          </ThemedText>
        </View>
      </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  addressText: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  itemImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemVariant: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
  },
  labelLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  labelLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buyLabelSection: {
    marginTop: Spacing.xs,
  },
  selectedSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  deliveredButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  addParcelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  addParcelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyParcelText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  parcelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  parcelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  parcelTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  parcelShipped: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  trackingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  pickLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  pickItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  pickItemImage: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
  },
  pickItemInfo: {
    flex: 1,
  },
  pickItemName: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickItemQty: {
    fontSize: 12,
  },
  parcelActions: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  packageSection: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  packageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  packageCard: {
    width: "48%" as any,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: "center",
    gap: 4,
  },
  packageName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  packageDims: {
    fontSize: 10,
    textAlign: "center",
  },
  customDims: {
    marginTop: Spacing.xs,
  },
  dimRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dimField: {
    flex: 1,
  },
  dimLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dimInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
  },
  tabScroll: {
    marginBottom: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  savePackageBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
