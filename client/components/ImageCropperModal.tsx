import React, { useState, useCallback, useEffect, useRef } from "react";
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
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string;
  aspectRatio?: [number, number];
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
}

function getImageDimensions(
  uri: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 1000, height: 1000 });
      img.src = uri;
    } else {
      Image.getSize(
        uri,
        (w, h) => resolve({ width: w, height: h }),
        () => resolve({ width: 1000, height: 1000 }),
      );
    }
  });
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
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const aspectW = aspectRatio[0];
  const aspectH = aspectRatio[1];

  // Crop frame dimensions (fixed on screen)
  const cropFrameWidth = Math.min(SCREEN_WIDTH - Spacing.lg * 2, 360);
  const cropFrameHeight = cropFrameWidth * (aspectH / aspectW);

  // Gesture shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Track the fitted image dimensions for crop math
  const fittedWidthRef = useRef(0);
  const fittedHeightRef = useRef(0);

  // Shared values the worklets can read for clamping
  const dispW = useSharedValue(cropFrameWidth);
  const dispH = useSharedValue(cropFrameHeight);
  const frameW = useSharedValue(cropFrameWidth);
  const frameH = useSharedValue(cropFrameHeight);

  // Load image dimensions when URI changes
  useEffect(() => {
    if (!imageUri || !visible) return;
    getImageDimensions(imageUri).then((dims) => {
      setImageSize(dims);
      // Reset transforms
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });
  }, [
    imageUri,
    visible,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
  ]);

  // Calculate fitted image size (image fills crop frame, may overflow)
  let displayWidth = cropFrameWidth;
  let displayHeight = cropFrameHeight;
  if (imageSize) {
    const imageAspect = imageSize.width / imageSize.height;
    const frameAspect = cropFrameWidth / cropFrameHeight;
    if (imageAspect > frameAspect) {
      displayHeight = cropFrameHeight;
      displayWidth = cropFrameHeight * imageAspect;
    } else {
      displayWidth = cropFrameWidth;
      displayHeight = cropFrameWidth / imageAspect;
    }
  }
  fittedWidthRef.current = displayWidth;
  fittedHeightRef.current = displayHeight;

  // Keep shared values in sync so worklets can read them
  useEffect(() => {
    dispW.value = displayWidth;
    dispH.value = displayHeight;
    frameW.value = cropFrameWidth;
    frameH.value = cropFrameHeight;
  }, [
    displayWidth,
    displayHeight,
    cropFrameWidth,
    cropFrameHeight,
    dispW,
    dispH,
    frameW,
    frameH,
  ]);

  // Pan gesture — all math inlined for worklet safety
  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      "worklet";
      const newX = savedTranslateX.value + e.translationX;
      const newY = savedTranslateY.value + e.translationY;
      const s = scale.value;
      const maxTx = Math.max(0, (dispW.value * s - frameW.value) / 2);
      const maxTy = Math.max(0, (dispH.value * s - frameH.value) / 2);
      translateX.value = Math.min(maxTx, Math.max(-maxTx, newX));
      translateY.value = Math.min(maxTy, Math.max(-maxTy, newY));
    })
    .onEnd(() => {
      "worklet";
      const s = scale.value;
      const maxTx = Math.max(0, (dispW.value * s - frameW.value) / 2);
      const maxTy = Math.max(0, (dispH.value * s - frameH.value) / 2);
      translateX.value = withSpring(
        Math.min(maxTx, Math.max(-maxTx, translateX.value)),
        { damping: 20, stiffness: 200 },
      );
      translateY.value = withSpring(
        Math.min(maxTy, Math.max(-maxTy, translateY.value)),
        { damping: 20, stiffness: 200 },
      );
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      "worklet";
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      "worklet";
      const newScale = Math.max(1, Math.min(5, savedScale.value * e.scale));
      scale.value = newScale;
      const maxTx = Math.max(0, (dispW.value * newScale - frameW.value) / 2);
      const maxTy = Math.max(0, (dispH.value * newScale - frameH.value) / 2);
      translateX.value = Math.min(maxTx, Math.max(-maxTx, translateX.value));
      translateY.value = Math.min(maxTy, Math.max(-maxTy, translateY.value));
    })
    .onEnd(() => {
      "worklet";
      if (scale.value < 1) {
        scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      }
      const s = scale.value;
      const maxTx = Math.max(0, (dispW.value * s - frameW.value) / 2);
      const maxTy = Math.max(0, (dispH.value * s - frameH.value) / 2);
      translateX.value = withSpring(
        Math.min(maxTx, Math.max(-maxTx, translateX.value)),
        { damping: 20, stiffness: 200 },
      );
      translateY.value = withSpring(
        Math.min(maxTy, Math.max(-maxTy, translateY.value)),
        { damping: 20, stiffness: 200 },
      );
    });

  // Double-tap to reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      "worklet";
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    doubleTapGesture,
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleCrop = useCallback(async () => {
    if (!imageUri || !imageSize) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const currentScale = scale.value;
      const currentTx = translateX.value;
      const currentTy = translateY.value;

      const fw = fittedWidthRef.current;
      const fh = fittedHeightRef.current;

      // Ratio: how many real image pixels per display pixel
      const pxPerDpX = imageSize.width / fw;
      const pxPerDpY = imageSize.height / fh;

      // The crop frame center in the image's coordinate system
      // At tx=0, ty=0, scale=1, the image center aligns with the frame center
      // The visible region's top-left in display coords relative to image center:
      const visibleLeft = -currentTx - cropFrameWidth / 2;
      const visibleTop = -currentTy - cropFrameHeight / 2;

      // Convert to image coordinates (accounting for scale)
      const originX = (visibleLeft / currentScale + fw / 2) * pxPerDpX;
      const originY = (visibleTop / currentScale + fh / 2) * pxPerDpY;
      const cropW = (cropFrameWidth / currentScale) * pxPerDpX;
      const cropH = (cropFrameHeight / currentScale) * pxPerDpY;

      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(originX, imageSize.width - cropW));
      const clampedY = Math.max(0, Math.min(originY, imageSize.height - cropH));
      const clampedW = Math.min(cropW, imageSize.width - clampedX);
      const clampedH = Math.min(cropH, imageSize.height - clampedY);

      const targetAspect = aspectW / aspectH;
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(clampedX),
              originY: Math.round(clampedY),
              width: Math.round(clampedW),
              height: Math.round(clampedH),
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
      onCrop(imageUri);
    } finally {
      setIsProcessing(false);
    }
  }, [
    imageUri,
    imageSize,
    scale,
    translateX,
    translateY,
    cropFrameWidth,
    cropFrameHeight,
    aspectW,
    aspectH,
    onCrop,
  ]);

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
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.overlay}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { paddingTop: Platform.OS === "ios" ? 54 : 16 },
            ]}
          >
            <Pressable onPress={handleCancel} style={styles.headerBtn}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Crop Image</ThemedText>
            <View style={styles.headerBtn} />
          </View>

          {/* Crop area */}
          <View style={styles.cropContainer}>
            {/* Dark overlay with transparent crop window */}
            <View style={styles.cropOverlayContainer}>
              {/* Top dark bar */}
              <View
                style={[
                  styles.darkOverlay,
                  { height: (SCREEN_HEIGHT * 0.65 - cropFrameHeight) / 2 },
                ]}
              />
              {/* Middle row: left dark | crop window | right dark */}
              <View style={styles.cropMiddleRow}>
                <View
                  style={[
                    styles.darkOverlay,
                    {
                      width: (SCREEN_WIDTH - cropFrameWidth) / 2,
                      height: cropFrameHeight,
                    },
                  ]}
                />
                {/* Crop window (transparent) */}
                <View
                  style={[
                    styles.cropWindow,
                    {
                      width: cropFrameWidth,
                      height: cropFrameHeight,
                    },
                  ]}
                >
                  <View style={styles.cropBorderOverlay}>
                    {/* Corner indicators */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    {/* Grid lines */}
                    <View
                      style={[styles.gridLineH, { top: cropFrameHeight / 3 }]}
                    />
                    <View
                      style={[
                        styles.gridLineH,
                        { top: (cropFrameHeight * 2) / 3 },
                      ]}
                    />
                    <View
                      style={[styles.gridLineV, { left: cropFrameWidth / 3 }]}
                    />
                    <View
                      style={[
                        styles.gridLineV,
                        { left: (cropFrameWidth * 2) / 3 },
                      ]}
                    />
                  </View>
                </View>
                <View
                  style={[
                    styles.darkOverlay,
                    {
                      width: (SCREEN_WIDTH - cropFrameWidth) / 2,
                      height: cropFrameHeight,
                    },
                  ]}
                />
              </View>
              {/* Bottom dark bar */}
              <View
                style={[
                  styles.darkOverlay,
                  { height: (SCREEN_HEIGHT * 0.65 - cropFrameHeight) / 2 },
                ]}
              />
            </View>

            {/* Image underneath the overlay (gesture target) */}
            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={[
                  styles.imageContainer,
                  {
                    width: displayWidth,
                    height: displayHeight,
                  },
                  animatedImageStyle,
                ]}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: displayWidth, height: displayHeight }}
                  resizeMode="cover"
                />
              </Animated.View>
            </GestureDetector>
          </View>

          {/* Hint */}
          <ThemedText style={styles.hint}>
            Pinch to zoom, drag to position
          </ThemedText>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={handleCancel}
            >
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.actionBtn,
                styles.cropBtn,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleCrop}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="crop" size={18} color="#fff" />
                  <ThemedText style={styles.cropBtnText}>Crop</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  cropContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cropOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    pointerEvents: "none",
  },
  darkOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: "100%",
  },
  cropMiddleRow: {
    flexDirection: "row",
  },
  cropWindow: {
    position: "relative",
  },
  cropBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 2,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#fff",
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 4,
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  imageContainer: {
    zIndex: 1,
  },
  hint: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing.lg,
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  cancelBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  cancelBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  cropBtn: {
    ...Shadows.md,
  },
  cropBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
