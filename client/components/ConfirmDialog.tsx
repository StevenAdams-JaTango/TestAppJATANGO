import React from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "#ef4444",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialog,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText style={styles.title}>{title}</ThemedText>
              <ThemedText
                style={[styles.message, { color: theme.textSecondary }]}
              >
                {message}
              </ThemedText>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                  onPress={onCancel}
                >
                  <ThemedText style={styles.buttonText}>
                    {cancelText}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: confirmColor },
                  ]}
                  onPress={onConfirm}
                >
                  <ThemedText style={[styles.buttonText, styles.confirmText]}>
                    {confirmText}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {},
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmText: {
    color: "#fff",
  },
});
