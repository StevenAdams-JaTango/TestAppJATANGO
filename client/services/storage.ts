import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const BUCKET_NAME = "product-images";

/**
 * Upload an image to Supabase Storage
 * @param uri - Local file URI (from image picker)
 * @param folder - Optional folder path within the bucket
 * @returns Public URL of the uploaded image, or null on failure
 */
export async function uploadImage(
  uri: string,
  folder: string = "products",
): Promise<string | null> {
  try {
    // If it's already a remote Supabase URL, return as-is
    if (uri.includes("supabase.co") || uri.includes("supabase.in")) {
      return uri;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Must be authenticated to upload images");
      return null;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${folder}/${user.id}/${timestamp}_${randomId}.${extension}`;

    let fileData: Blob | ArrayBuffer;

    if (Platform.OS === "web") {
      // Web: fetch the blob URL and get the blob
      const response = await fetch(uri);
      fileData = await response.blob();
    } else {
      // Native: read file as base64 using FileSystem
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileData, {
        contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

/**
 * Upload multiple images
 * @param uris - Array of local file URIs
 * @param folder - Optional folder path within the bucket
 * @returns Array of public URLs (failed uploads will be filtered out)
 */
export async function uploadImages(
  uris: string[],
  folder: string = "products",
): Promise<string[]> {
  const results = await Promise.all(
    uris.map((uri) => uploadImage(uri, folder)),
  );
  return results.filter((url): url is string => url !== null);
}

/**
 * Delete an image from Supabase Storage
 * @param url - Public URL of the image to delete
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
    if (pathParts.length < 2) return false;

    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}
