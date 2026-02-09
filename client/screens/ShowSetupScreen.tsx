import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { showsService } from "@/services/shows";
import { uploadImage } from "@/services/storage";
import type { ShowsStackParamList } from "@/navigation/ShowsStackNavigator";

type RouteT = RouteProp<ShowsStackParamList, "ShowSetup">;

type NavT = NativeStackNavigationProp<ShowsStackParamList>;

function isValidImageUri(uri: string): boolean {
  if (!uri || uri.length === 0) return false;
  // Accept data URIs, file URIs, blob URIs, and http(s) URLs
  return (
    /^data:image\/(png|jpeg|jpg|webp);base64,/.test(uri) ||
    uri.startsWith("file://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("http://") ||
    uri.startsWith("https://")
  );
}

export default function ShowSetupScreen() {
  const { theme } = useTheme();
  const route = useRoute<RouteT>();
  const navigation = useNavigation<NavT>();
  const insets = useSafeAreaInsets();

  const draftId = route.params?.draftId;

  const [title, setTitle] = useState("");
  const [thumbnailDataUri, setThumbnailDataUri] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && isValidImageUri(thumbnailDataUri);
  }, [title, thumbnailDataUri]);

  useEffect(() => {
    (async () => {
      if (!draftId) return;
      const draft = await showsService.getDraft(draftId);
      if (!draft) return;
      setTitle(draft.title);
      setThumbnailDataUri(draft.thumbnailDataUri);
    })();
  }, [draftId]);

  const handleCapture = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Use ImagePicker for all platforms
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false, // Always use our custom cropper
      aspect: [16, 9], // Show thumbnails are typically 16:9
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      // Always show cropper modal on all platforms
      setPendingCropImage(uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      Alert.alert("Missing info", "Please add a show title and thumbnail.");
      return;
    }

    setIsSaving(true);
    try {
      // Upload the thumbnail image to storage first
      let finalThumbnailUrl = thumbnailDataUri;

      // Only upload if it's a local/blob URI (not already a remote URL)
      if (
        !thumbnailDataUri.includes("supabase.co") &&
        !thumbnailDataUri.includes("supabase.in")
      ) {
        console.log("[ShowSetup] Uploading thumbnail...");
        const uploadedUrl = await uploadImage(
          thumbnailDataUri,
          "show-thumbnails",
        );
        if (!uploadedUrl) {
          Alert.alert("Upload failed", "Could not upload thumbnail image.");
          setIsSaving(false);
          return;
        }
        finalThumbnailUrl = uploadedUrl;
        console.log("[ShowSetup] Thumbnail uploaded:", finalThumbnailUrl);
      }

      // Now save the show with the uploaded URL
      const result = await showsService.upsertDraft({
        id: draftId,
        title: title.trim(),
        thumbnailDataUri: finalThumbnailUrl,
      });

      if (!result) {
        Alert.alert(
          "Save failed",
          "Could not save your show. Please try again.",
        );
        setIsSaving(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      console.error("[ShowSetup] save error", e);
      Alert.alert("Save failed", "Could not save your show.");
    } finally {
      setIsSaving(false);
    }
  }, [canSave, draftId, navigation, thumbnailDataUri, title]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View
            style={[styles.iconContainer, { backgroundColor: theme.primary }]}
          >
            <Feather name="video" size={28} color="#fff" />
          </View>
          <ThemedText style={[styles.screenTitle, { color: theme.text }]}>
            Set up your show
          </ThemedText>
          <ThemedText
            style={[styles.screenSubtitle, { color: theme.textSecondary }]}
          >
            Add a title and thumbnail before going live
          </ThemedText>
        </View>

        <Pressable
          style={[
            styles.thumbnailCard,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
          onPress={handleCapture}
        >
          {thumbnailDataUri ? (
            <>
              <Image
                source={{ uri: thumbnailDataUri }}
                style={styles.thumbnail}
              />
              <View style={styles.thumbnailOverlay}>
                <Pressable
                  style={[
                    styles.captureBtn,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleCapture}
                >
                  <Feather name="camera" size={16} color="#fff" />
                  <ThemedText style={styles.captureText}>
                    {Platform.OS === "web" ? "Change" : "Change"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => setThumbnailDataUri("")}
                >
                  <Feather name="x" size={14} color="#fff" />
                </Pressable>
              </View>
            </>
          ) : (
            <View
              style={[
                styles.thumbnailPlaceholder,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={styles.placeholderIconContainer}>
                <Feather name="image" size={32} color={theme.primary} />
              </View>
              <ThemedText
                style={[styles.placeholderText, { color: theme.text }]}
              >
                Add a thumbnail
              </ThemedText>
              <ThemedText
                style={[
                  styles.placeholderSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                This will be shown to viewers before your show starts
              </ThemedText>
              <View style={styles.uploadBtnContainer}>
                <View
                  style={[
                    styles.captureBtn,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Feather name="camera" size={16} color="#fff" />
                  <ThemedText style={styles.captureText}>
                    {Platform.OS === "web" ? "Upload" : "Capture"}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </Pressable>

        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: theme.text }]}>
            Show title
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Spring Drops + Q&A"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          />
        </View>

        <View style={styles.tipsSection}>
          <ThemedText
            style={[styles.tipsTitle, { color: theme.textSecondary }]}
          >
            Tips for a great show
          </ThemedText>
          <View style={styles.tipRow}>
            <Feather name="check-circle" size={14} color={theme.primary} />
            <ThemedText
              style={[styles.tipText, { color: theme.textSecondary }]}
            >
              Use good lighting and a clear background
            </ThemedText>
          </View>
          <View style={styles.tipRow}>
            <Feather name="check-circle" size={14} color={theme.primary} />
            <ThemedText
              style={[styles.tipText, { color: theme.textSecondary }]}
            >
              Have your products ready to showcase
            </ThemedText>
          </View>
          <View style={styles.tipRow}>
            <Feather name="check-circle" size={14} color={theme.primary} />
            <ThemedText
              style={[styles.tipText, { color: theme.textSecondary }]}
            >
              Engage with your audience in the chat
            </ThemedText>
          </View>
        </View>

        <Pressable
          style={[
            styles.saveBtn,
            { backgroundColor: theme.primary },
            !canSave ? styles.saveBtnDisabled : null,
          ]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
        >
          <Feather
            name="check"
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <ThemedText style={styles.saveBtnText}>
            {isSaving ? "Saving..." : "Save & Continue"}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <ImageCropperModal
        visible={!!pendingCropImage}
        imageUri={pendingCropImage || ""}
        aspectRatio={[16, 9]}
        onCrop={(croppedUri) => {
          setThumbnailDataUri(croppedUri);
          setPendingCropImage(null);
        }}
        onCancel={() => {
          setPendingCropImage(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  screenSubtitle: {
    marginTop: Spacing.xs,
    fontSize: 14,
    textAlign: "center",
  },
  thumbnailCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.md,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.xl,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  placeholderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  placeholderText: {
    fontWeight: "700",
    fontSize: 16,
  },
  placeholderSubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  uploadBtnContainer: {
    marginTop: Spacing.md,
  },
  thumbnailOverlay: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  captureText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    marginTop: Spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  tipsSection: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: "rgba(124, 58, 237, 0.05)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.1)",
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
  },
  saveBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    ...Shadows.lg,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
