import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

interface UseImagePickerOptions {
  aspectRatio?: [number, number];
  allowsMultiple?: boolean;
}

interface UseImagePickerReturn {
  pickImage: () => Promise<void>;
  pendingImage: string | null;
  setPendingImage: (uri: string | null) => void;
  isPickerOpen: boolean;
}

export function useImagePicker(
  onImageSelected: (uri: string) => void,
  options: UseImagePickerOptions = {},
): UseImagePickerReturn {
  const { aspectRatio = [1, 1], allowsMultiple = false } = options;
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const pickImage = useCallback(async () => {
    setIsPickerOpen(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: Platform.OS !== "web", // Native platforms have built-in cropping
        aspect: aspectRatio,
        quality: 0.9,
        allowsMultipleSelection: allowsMultiple,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        if (Platform.OS === "web") {
          // On web, show our custom cropper
          setPendingImage(uri);
        } else {
          // On native, the image is already cropped by the picker
          onImageSelected(uri);
        }
      }
    } catch (error) {
      console.error("[useImagePicker] Error picking image:", error);
    } finally {
      setIsPickerOpen(false);
    }
  }, [aspectRatio, allowsMultiple, onImageSelected]);

  return {
    pickImage,
    pendingImage,
    setPendingImage,
    isPickerOpen,
  };
}
