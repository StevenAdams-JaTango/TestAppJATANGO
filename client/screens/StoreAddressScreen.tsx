import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { shippingService } from "@/services/shipping";
import { BorderRadius, Spacing } from "@/constants/theme";

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "Washington D.C." },
];

interface FieldErrors {
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  address?: string;
}

export default function StoreAddressScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stateSearch, setStateSearch] = useState("");

  // Load existing store address
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const address = await shippingService.getStoreAddress(user.id);
        if (address) {
          setAddressLine1(address.addressLine1);
          setAddressLine2(address.addressLine2 || "");
          setCity(address.city);
          setState(address.state);
          setZip(address.zip);
          setPhone(address.phone || "");
        }
      } catch (err) {
        console.error("[StoreAddress] Failed to load:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const validateFields = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!addressLine1.trim()) e.addressLine1 = "Street address is required";
    if (!city.trim()) e.city = "City is required";
    if (!state) e.state = "State is required";
    if (!zip.trim()) {
      e.zip = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) {
      e.zip = "Enter a valid 5-digit ZIP code";
    }
    return e;
  };

  const verifyAddress = async (): Promise<boolean> => {
    const zipTrimmed = zip.trim();
    const zipBase = zipTrimmed.slice(0, 5);

    try {
      const resp = await fetch(`https://api.zippopotam.us/us/${zipBase}`);
      if (!resp.ok) {
        setErrors((prev) => ({
          ...prev,
          zip: "ZIP code not found. Please check and try again.",
        }));
        return false;
      }

      const data = await resp.json();
      const places = data.places || [];
      if (places.length === 0) {
        setErrors((prev) => ({
          ...prev,
          zip: "ZIP code not found. Please check and try again.",
        }));
        return false;
      }

      const zipState = places[0]["state abbreviation"];
      if (zipState && zipState.toUpperCase() !== state.toUpperCase()) {
        const stateName =
          US_STATES.find((s) => s.code === zipState)?.name || zipState;
        setErrors((prev) => ({
          ...prev,
          address: `ZIP code ${zipBase} is in ${stateName}, not ${US_STATES.find((s) => s.code === state)?.name || state}. Please correct the state or ZIP.`,
        }));
        return false;
      }

      const zipCities = places.map(
        (p: Record<string, string>) => p["place name"]?.toLowerCase() || "",
      );
      const enteredCity = city.trim().toLowerCase();
      const cityMatch = zipCities.some(
        (zc: string) => zc.includes(enteredCity) || enteredCity.includes(zc),
      );
      if (!cityMatch) {
        const suggestedCity = places[0]["place name"];
        setErrors((prev) => ({
          ...prev,
          address: `ZIP code ${zipBase} doesn't match city "${city.trim()}". Did you mean "${suggestedCity}"?`,
        }));
        return false;
      }

      return true;
    } catch {
      console.warn("[StoreAddress] ZIP validation API unavailable, skipping");
      return true;
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setErrors({});

    const fieldErrors = validateFields();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsValidating(true);
    const isValid = await verifyAddress();
    setIsValidating(false);
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    try {
      await shippingService.updateStoreAddress(user.id, {
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: "US",
        phone: phone.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err: any) {
      console.error("[StoreAddress] Save error:", err);
      Alert.alert("Error", err.message || "Failed to save store address.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStateName = US_STATES.find((s) => s.code === state)?.name || "";

  const filteredStates = stateSearch
    ? US_STATES.filter(
        (s) =>
          s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
          s.code.toLowerCase().includes(stateSearch.toLowerCase()),
      )
    : US_STATES;

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
          <ThemedText style={styles.headerTitle}>Store Address</ThemedText>
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
        <ThemedText style={styles.headerTitle}>Store Address</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <View style={styles.infoBanner}>
          <Feather name="info" size={16} color={theme.primary} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            This address is used as the origin for shipping rate calculations
            and label generation.
          </ThemedText>
        </View>

        {errors.address && (
          <View style={styles.addressErrorBanner}>
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <ThemedText style={styles.addressErrorText}>
              {errors.address}
            </ThemedText>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Address Line 1 *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: errors.addressLine1 ? "#EF4444" : theme.border,
              },
            ]}
            value={addressLine1}
            onChangeText={(t) => {
              setAddressLine1(t);
              if (errors.addressLine1)
                setErrors((p) => ({ ...p, addressLine1: undefined }));
            }}
            placeholder="123 Main Street"
            placeholderTextColor={theme.textSecondary}
          />
          {errors.addressLine1 && (
            <ThemedText style={styles.fieldError}>
              {errors.addressLine1}
            </ThemedText>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Address Line 2
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="Apt, Suite, Unit (optional)"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              City *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: errors.city ? "#EF4444" : theme.border,
                },
              ]}
              value={city}
              onChangeText={(t) => {
                setCity(t);
                if (errors.city) setErrors((p) => ({ ...p, city: undefined }));
              }}
              placeholder="City"
              placeholderTextColor={theme.textSecondary}
            />
            {errors.city && (
              <ThemedText style={styles.fieldError}>{errors.city}</ThemedText>
            )}
          </View>
          <View style={styles.rowGap} />
          <View style={[styles.fieldGroup, styles.flex1]}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              State *
            </ThemedText>
            <Pressable
              style={[
                styles.input,
                styles.stateDropdown,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: errors.state ? "#EF4444" : theme.border,
                },
              ]}
              onPress={() => {
                setStateSearch("");
                setShowStatePicker(true);
              }}
            >
              <ThemedText
                style={[
                  styles.stateDropdownText,
                  !state && { color: theme.textSecondary },
                ]}
              >
                {state ? `${state} — ${selectedStateName}` : "Select state"}
              </ThemedText>
              <Feather
                name="chevron-down"
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
            {errors.state && (
              <ThemedText style={styles.fieldError}>{errors.state}</ThemedText>
            )}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              ZIP Code *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: errors.zip ? "#EF4444" : theme.border,
                },
              ]}
              value={zip}
              onChangeText={(t) => {
                setZip(t);
                if (errors.zip) setErrors((p) => ({ ...p, zip: undefined }));
              }}
              placeholder="12345"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={10}
            />
            {errors.zip && (
              <ThemedText style={styles.fieldError}>{errors.zip}</ThemedText>
            )}
          </View>
          <View style={styles.rowGap} />
          <View style={[styles.fieldGroup, styles.flex1]}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Phone
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>

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
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          disabled={isSaving || isValidating}
        >
          {isSaving || isValidating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            "Save Store Address"
          )}
        </Button>
      </View>

      <Modal
        visible={showStatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View
          style={[
            styles.pickerContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View style={styles.pickerHeader}>
            <ThemedText style={styles.pickerTitle}>Select State</ThemedText>
            <Pressable onPress={() => setShowStatePicker(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <TextInput
            style={[
              styles.pickerSearch,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Search states..."
            placeholderTextColor={theme.textSecondary}
            value={stateSearch}
            onChangeText={setStateSearch}
            autoFocus
          />
          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.pickerItem,
                  state === item.code && {
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
                onPress={() => {
                  setState(item.code);
                  setShowStatePicker(false);
                  if (errors.state)
                    setErrors((p) => ({ ...p, state: undefined }));
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ThemedText style={styles.pickerItemText}>
                  {item.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.pickerItemCode,
                    { color: theme.textSecondary },
                  ]}
                >
                  {item.code}
                </ThemedText>
                {state === item.code && (
                  <Feather name="check" size={18} color={theme.primary} />
                )}
              </Pressable>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
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
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
  },
  rowGap: {
    width: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  fieldError: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  addressErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addressErrorText: {
    flex: 1,
    color: "#EF4444",
    fontSize: 13,
  },
  stateDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateDropdownText: {
    fontSize: 16,
    flex: 1,
  },
  pickerContainer: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  pickerSearch: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
  },
  pickerItemCode: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
});
