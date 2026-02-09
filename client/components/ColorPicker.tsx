import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, Dimensions } from "react-native";
import WheelColorPicker from "react-native-wheel-color-picker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ColorPickerProps {
  visible: boolean;
  initialColor?: string;
  onColorSelected: (color: string) => void;
  onClose: () => void;
}

export function ColorPicker({
  visible,
  initialColor = "#000000",
  onColorSelected,
  onClose,
}: ColorPickerProps) {
  const { theme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(initialColor);

  const handleConfirm = () => {
    onColorSelected(selectedColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Pick a Color</ThemedText>
            <Pressable onPress={onClose}>
              <ThemedText style={styles.closeButton}>✕</ThemedText>
            </Pressable>
          </View>

          <View style={styles.pickerContainer}>
            <WheelColorPicker
              color={selectedColor}
              onColorChange={setSelectedColor}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={false}
            />
          </View>

          <View
            style={[
              styles.preview,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View
              style={[styles.previewColor, { backgroundColor: selectedColor }]}
            />
            <ThemedText style={styles.hexText}>{selectedColor}</ThemedText>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.cancelButton,
                { borderColor: theme.textSecondary },
              ]}
              onPress={onClose}
            >
              <ThemedText
                style={[styles.cancelText, { color: theme.textSecondary }]}
              >
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: theme.primary }]}
              onPress={handleConfirm}
            >
              <ThemedText style={styles.confirmText}>Confirm</ThemedText>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: SCREEN_WIDTH - 40,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    fontSize: 24,
  },
  pickerContainer: {
    height: 300,
    marginBottom: Spacing.lg,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  previewColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  hexText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
