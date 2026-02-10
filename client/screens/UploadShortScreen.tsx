import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Video, ResizeMode } from "expo-av";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { uploadVideo, uploadThumbnail } from "@/services/storage";
import { shortsService } from "@/services/shorts";
import { productsService } from "@/services/products";
import { Product } from "@/types";
import { Spacing, BorderRadius } from "@/constants/theme";

const MAX_DURATION = 60;

/**
 * Generate a thumbnail from a video blob URL on web using video + canvas.
 */
function generateWebThumbnail(videoUri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.src = videoUri;

    video.onloadeddata = () => {
      video.currentTime = 0;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };

    video.onerror = () => resolve(null);

    // Timeout fallback
    setTimeout(() => resolve(null), 5000);
  });
}

export default function UploadShortScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      const data = await productsService.listProducts();
      setProducts(data);
      setLoadingProducts(false);
    };
    loadProducts();
  }, []);

  const pickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        videoMaxDuration: MAX_DURATION,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        if (asset.duration && asset.duration > MAX_DURATION * 1000) {
          Alert.alert(
            "Too Long",
            `Shorts must be ${MAX_DURATION} seconds or less.`,
          );
          return;
        }

        // Check file size (Supabase free tier default: 50MB)
        if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
          Alert.alert(
            "File Too Large",
            `This video is ${sizeMB}MB. Please choose a shorter or lower quality video (max 50MB).`,
          );
          return;
        }

        setVideoUri(asset.uri);
        setDuration(asset.duration ? asset.duration / 1000 : 0);

        // Auto-generate thumbnail from first frame
        if (Platform.OS === "web") {
          try {
            const thumbUri = await generateWebThumbnail(asset.uri);
            if (thumbUri) setThumbnailUri(thumbUri);
          } catch (thumbErr) {
            console.warn("[UploadShort] Web thumbnail failed:", thumbErr);
          }
        } else {
          try {
            const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
              time: 0,
              quality: 0.8,
            });
            if (thumb?.uri) setThumbnailUri(thumb.uri);
          } catch (thumbErr) {
            console.warn("[UploadShort] Native thumbnail failed:", thumbErr);
          }
        }
      }
    } catch (err) {
      console.error("[UploadShort] pickVideo error:", err);
      Alert.alert("Error", "Failed to pick video. Please try again.");
    }
  }, []);

  const pickThumbnail = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.9,
      });

      if (!result.canceled && result.assets.length > 0) {
        setThumbnailUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("[UploadShort] pickThumbnail error:", err);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!videoUri || !user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);

    try {
      // Upload video with timeout to prevent hanging on web
      const uploadPromise = uploadVideo(videoUri);
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(
          () => reject(new Error("Upload timed out. Check your connection.")),
          120000,
        ),
      );
      const videoUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (!videoUrl) {
        Alert.alert("Error", "Failed to upload video. Please try again.");
        setUploading(false);
        return;
      }

      // Upload thumbnail if provided
      let thumbnailUrl: string | undefined;
      if (thumbnailUri) {
        const uploaded = await uploadThumbnail(thumbnailUri);
        if (uploaded) thumbnailUrl = uploaded;
      }

      // Create short in database
      const short = await shortsService.createShort({
        videoUrl,
        thumbnailUrl,
        caption: caption.trim(),
        duration,
        productId: selectedProduct?.id,
      });

      if (!short) {
        Alert.alert("Error", "Failed to create short. Please try again.");
        setUploading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to profile so user sees their new short
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "Main",
              state: {
                routes: [{ name: "ProfileTab" }],
              },
            },
          ],
        }),
      );
    } catch (err: any) {
      console.error("[UploadShort] upload error:", err);
      Alert.alert("Error", err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [
    videoUri,
    thumbnailUri,
    caption,
    duration,
    selectedProduct?.id,
    user?.id,
    navigation,
  ]);

  const handleClose = useCallback(() => {
    if (videoUri && !uploading) {
      Alert.alert("Discard Short?", "Your video will not be saved.", [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      navigation.goBack();
    }
  }, [videoUri, uploading, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Upload Short</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Video picker */}
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Video (max {MAX_DURATION}s)
        </ThemedText>
        {videoUri ? (
          <View style={styles.videoPreviewContainer}>
            <Video
              source={{ uri: videoUri }}
              style={styles.videoPreview}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isLooping={false}
            />
            <Pressable style={styles.changeVideoButton} onPress={pickVideo}>
              <Feather name="refresh-cw" size={16} color="#fff" />
              <ThemedText style={styles.changeVideoText}>Change</ThemedText>
            </Pressable>
            {duration > 0 && (
              <View style={styles.durationBadge}>
                <ThemedText style={styles.durationText}>
                  {Math.round(duration)}s
                </ThemedText>
              </View>
            )}
          </View>
        ) : (
          <Pressable
            style={[
              styles.pickerCard,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={pickVideo}
          >
            <Feather name="video" size={32} color={theme.primary} />
            <ThemedText style={[styles.pickerText, { color: theme.text }]}>
              Select a video
            </ThemedText>
            <ThemedText
              style={[styles.pickerSubtext, { color: theme.textSecondary }]}
            >
              Up to {MAX_DURATION} seconds
            </ThemedText>
          </Pressable>
        )}

        {/* Thumbnail picker */}
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Thumbnail (optional)
        </ThemedText>
        {thumbnailUri ? (
          <View style={styles.thumbnailPreviewContainer}>
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnailPreview}
            />
            <Pressable style={styles.changeVideoButton} onPress={pickThumbnail}>
              <Feather name="refresh-cw" size={16} color="#fff" />
              <ThemedText style={styles.changeVideoText}>Change</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[
              styles.thumbnailPicker,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={pickThumbnail}
          >
            <Feather name="image" size={24} color={theme.textSecondary} />
            <ThemedText
              style={[styles.pickerSubtext, { color: theme.textSecondary }]}
            >
              Add a cover image
            </ThemedText>
          </Pressable>
        )}

        {/* Caption */}
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Caption
        </ThemedText>
        <TextInput
          style={[
            styles.captionInput,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Write a caption..."
          placeholderTextColor={theme.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={200}
          textAlignVertical="top"
        />
        <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>
          {caption.length}/200
        </ThemedText>

        {/* Product attachment (optional) */}
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Attach Product (optional)
        </ThemedText>
        {selectedProduct ? (
          <View
            style={[
              styles.selectedProductCard,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            {selectedProduct.image ? (
              <Image
                source={{ uri: selectedProduct.image }}
                style={styles.selectedProductImage}
              />
            ) : null}
            <View style={styles.selectedProductInfo}>
              <ThemedText
                style={[styles.selectedProductName, { color: theme.text }]}
                numberOfLines={1}
              >
                {selectedProduct.name}
              </ThemedText>
              <ThemedText
                style={[
                  styles.selectedProductPrice,
                  { color: theme.textSecondary },
                ]}
              >
                ${selectedProduct.price.toFixed(2)}
              </ThemedText>
            </View>
            <Pressable onPress={() => setSelectedProduct(null)} hitSlop={8}>
              <Feather name="x-circle" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        ) : loadingProducts ? (
          <ActivityIndicator
            size="small"
            color={theme.primary}
            style={{ paddingVertical: Spacing.md }}
          />
        ) : products.length > 0 ? (
          <FlatList
            data={products}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productList}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.productPickerCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedProduct(item);
                }}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.productPickerImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.productPickerImage,
                      { backgroundColor: theme.border },
                    ]}
                  />
                )}
                <ThemedText
                  style={[styles.productPickerName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.productPickerPrice,
                    { color: theme.textSecondary },
                  ]}
                >
                  ${item.price.toFixed(2)}
                </ThemedText>
              </Pressable>
            )}
          />
        ) : (
          <ThemedText
            style={[styles.noProductsText, { color: theme.textSecondary }]}
          >
            No products to attach
          </ThemedText>
        )}
      </ScrollView>

      {/* Upload button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Button
          onPress={handleUpload}
          disabled={!videoUri || uploading}
          style={styles.uploadButton}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <ThemedText style={styles.uploadingText}>Uploading...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.uploadingText}>Upload Short</ThemedText>
          )}
        </Button>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  pickerCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerSubtext: {
    fontSize: 13,
  },
  videoPreviewContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    height: 300,
    position: "relative",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  changeVideoButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changeVideoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  durationBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  thumbnailPicker: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  thumbnailPreviewContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    height: 200,
    position: "relative",
  },
  thumbnailPreview: {
    width: "100%",
    height: "100%",
  },
  captionInput: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  uploadButton: {
    width: "100%",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  uploadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  webUnsupported: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  webUnsupportedTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.md,
  },
  webUnsupportedText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  selectedProductCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  selectedProductImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedProductPrice: {
    fontSize: 13,
    marginTop: 2,
  },
  productList: {
    gap: Spacing.sm,
  },
  productPickerCard: {
    width: 100,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  productPickerImage: {
    width: 100,
    height: 100,
  },
  productPickerName: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  productPickerPrice: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingBottom: 6,
    marginTop: 2,
  },
  noProductsText: {
    fontSize: 13,
    paddingVertical: Spacing.sm,
  },
});
