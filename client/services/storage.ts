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

    let fileData: Blob | ArrayBuffer;
    let extension: string;
    let contentType: string;

    if (uri.startsWith("data:")) {
      // Handle data URIs (e.g. from canvas.toDataURL)
      const mimeMatch = uri.match(/^data:([^;]+);/);
      contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      extension = contentType === "image/png" ? "png" : "jpg";
      const response = await fetch(uri);
      fileData = await response.blob();
    } else if (Platform.OS === "web") {
      // Web: fetch the blob URL and get the blob
      extension = uri.split(".").pop()?.toLowerCase() || "jpg";
      contentType = `image/${extension === "jpg" ? "jpeg" : extension}`;
      const response = await fetch(uri);
      fileData = await response.blob();
    } else {
      // Native: read file as base64 using FileSystem
      extension = uri.split(".").pop()?.toLowerCase() || "jpg";
      contentType = `image/${extension === "jpg" ? "jpeg" : extension}`;

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

    const fileName = `${folder}/${user.id}/${timestamp}_${randomId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileData, {
        contentType,
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

const VIDEO_BUCKET_NAME = "short-videos";

/**
 * Upload a video to Supabase Storage (short-videos bucket)
 * Uses FileSystem.uploadAsync on native to stream the file without loading
 * it entirely into memory (avoids OOM on large videos).
 * @param uri - Local file URI (from video picker)
 * @param folder - Optional folder path within the bucket
 * @returns Public URL of the uploaded video, or null on failure
 */
export async function uploadVideo(
  uri: string,
  folder: string = "shorts",
): Promise<string | null> {
  try {
    if (uri.includes("supabase.co") || uri.includes("supabase.in")) {
      return uri;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Must be authenticated to upload videos");
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error("No active session for video upload");
      return null;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    if (Platform.OS === "web") {
      return uploadVideoWeb(uri, folder, user.id, session.access_token);
    }

    // Native: use FileSystem.uploadAsync to stream file directly
    const uriExt = uri.split(".").pop()?.toLowerCase() || "mp4";
    const contentType =
      uriExt === "mov"
        ? "video/quicktime"
        : uriExt === "webm"
          ? "video/webm"
          : "video/mp4";

    const fileName = `${folder}/${user.id}/${timestamp}_${randomId}.${uriExt}`;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${VIDEO_BUCKET_NAME}/${fileName}`;

    console.log("[uploadVideo] Native streaming upload to:", uploadUrl);

    const result = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
    });

    if (result.status < 200 || result.status >= 300) {
      console.error(
        "[uploadVideo] Native upload failed:",
        result.status,
        result.body,
      );
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(VIDEO_BUCKET_NAME).getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading video:", error);
    return null;
  }
}

/**
 * Web-specific video upload using direct fetch to Supabase Storage REST API.
 * The Supabase JS client .upload() hangs on large blobs in the browser,
 * so we bypass it and POST directly.
 */
async function uploadVideoWeb(
  uri: string,
  folder: string,
  userId: string,
  accessToken: string,
): Promise<string | null> {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);

  const response = await fetch(uri);
  const blob = await response.blob();

  let extension = "mp4";
  let contentType = "video/mp4";

  if (blob.type === "video/webm") {
    extension = "webm";
    contentType = "video/webm";
  } else if (blob.type === "video/quicktime") {
    extension = "mov";
    contentType = "video/quicktime";
  } else {
    contentType = blob.type || "video/mp4";
  }

  const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
  console.log(`[uploadVideo] Web upload: ${sizeMB}MB, type: ${blob.type}`);

  const fileName = `${folder}/${userId}/${timestamp}_${randomId}.${extension}`;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${VIDEO_BUCKET_NAME}/${fileName}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    console.error(
      "[uploadVideo] Web upload failed:",
      uploadResponse.status,
      errText,
    );
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(VIDEO_BUCKET_NAME).getPublicUrl(fileName);

  return publicUrl;
}

const THUMBNAIL_BUCKET_NAME = "short-thumbnails";

/**
 * Upload a thumbnail image to the short-thumbnails bucket.
 * Handles data: URIs (from canvas), blob: URIs, and file URIs.
 * Uses direct REST API to avoid Supabase JS client issues on web.
 */
export async function uploadThumbnail(
  uri: string,
  folder: string = "thumbnails",
): Promise<string | null> {
  try {
    if (uri.includes("supabase.co") || uri.includes("supabase.in")) {
      return uri;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("Must be authenticated to upload thumbnails");
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session for thumbnail upload");
      return null;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    let blob: Blob;
    let extension = "jpg";
    let contentType = "image/jpeg";

    if (uri.startsWith("data:")) {
      const mimeMatch = uri.match(/^data:([^;]+);/);
      contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      extension = contentType === "image/png" ? "png" : "jpg";
      const response = await fetch(uri);
      blob = await response.blob();
    } else if (Platform.OS === "web") {
      const response = await fetch(uri);
      blob = await response.blob();
      if (blob.type.includes("png")) {
        extension = "png";
        contentType = "image/png";
      }
    } else {
      // Native: use FileSystem.uploadAsync for streaming
      const uriExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      extension = uriExt;
      contentType = `image/${uriExt === "jpg" ? "jpeg" : uriExt}`;

      const fileName = `${folder}/${user.id}/${timestamp}_${randomId}.${extension}`;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${THUMBNAIL_BUCKET_NAME}/${fileName}`;

      const result = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": contentType,
          "x-upsert": "false",
        },
      });

      if (result.status < 200 || result.status >= 300) {
        console.error(
          "[uploadThumbnail] Native upload failed:",
          result.status,
          result.body,
        );
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(THUMBNAIL_BUCKET_NAME).getPublicUrl(fileName);
      return publicUrl;
    }

    // Web / data URI path: direct fetch to REST API
    const fileName = `${folder}/${user.id}/${timestamp}_${randomId}.${extension}`;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${THUMBNAIL_BUCKET_NAME}/${fileName}`;

    console.log(
      "[uploadThumbnail] Uploading:",
      (blob.size / 1024).toFixed(1),
      "KB",
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error(
        "[uploadThumbnail] Upload failed:",
        uploadResponse.status,
        errText,
      );
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(THUMBNAIL_BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    return null;
  }
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
