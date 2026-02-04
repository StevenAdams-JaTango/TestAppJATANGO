import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors, Spacing, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string;
  aspectRatio?: [number, number];
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  visible,
  imageUri,
  aspectRatio = [1, 1],
  onCrop,
  onCancel,
}: ImageCropperModalProps) {
  const { theme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);

  const cropSize = Math.min(SCREEN_WIDTH - Spacing.lg * 2, 400);
  const aspectWidth = aspectRatio[0];
  const aspectHeight = aspectRatio[1];

  const handleCrop = useCallback(async () => {
    if (!imageUri) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Get image dimensions
      const imageInfo = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          if (Platform.OS === "web") {
            const img = new window.Image();
            img.onload = () => {
              resolve({ width: img.width, height: img.height });
            };
            img.src = imageUri;
          } else {
            Image.getSize(
              imageUri,
              (width, height) => resolve({ width, height }),
              () => resolve({ width: 1000, height: 1000 }),
            );
          }
        },
      );

      // Calculate crop area (center crop to aspect ratio)
      const targetAspect = aspectWidth / aspectHeight;
      const imageAspect = imageInfo.width / imageInfo.height;

      let cropWidth: number;
      let cropHeight: number;
      let originX: number;
      let originY: number;

      if (imageAspect > targetAspect) {
        // Image is wider than target - crop sides
        cropHeight = imageInfo.height;
        cropWidth = cropHeight * targetAspect;
        originX = (imageInfo.width - cropWidth) / 2;
        originY = 0;
      } else {
        // Image is taller than target - crop top/bottom
        cropWidth = imageInfo.width;
        cropHeight = cropWidth / targetAspect;
        originX = 0;
        originY = (imageInfo.height - cropHeight) / 2;
      }

      // Perform the crop and resize
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
            },
          },
          {
            resize: {
              width: 800,
              height: Math.round(800 / targetAspect),
            },
          },
        ],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      onCrop(result.uri);
    } catch (error) {
      console.error("[ImageCropper] Error cropping image:", error);
      // Fall back to original image if cropping fails
      onCrop(imageUri);
    } finally {
      setIsProcessing(false);
    }
  }, [imageUri, aspectWidth, aspectHeight, onCrop]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  }, [onCancel]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.headerBtn}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Crop Image
            </ThemedText>
            <View style={styles.headerBtn} />
          </View>

          <View style={styles.previewContainer}>
            <View
              style={[
                styles.cropFrame,
                {
                  width: cropSize,
                  height: cropSize * (aspectHeight / aspectWidth),
                  borderColor: Colors.light.primary,
                },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              Image will be cropped to fit {aspectWidth}:{aspectHeight} ratio
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.actionBtn,
                styles.cancelBtn,
                { borderColor: theme.border },
              ]}
              onPress={handleCancel}
            >
              <ThemedText style={[styles.cancelBtnText, { color: theme.text }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.cropBtn]}
              onPress={handleCrop}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <ThemedText style={styles.cropBtnText}>Use Photo</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 500,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewContainer: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  cropFrame: {
    borderWidth: 3,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  hint: {
    marginTop: Spacing.md,
    fontSize: 13,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cropBtn: {
    backgroundColor: "#4A90E2", // Lighter, brighter blue
    ...Shadows.md,
  },
  cropBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
