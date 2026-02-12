import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and save the token to the user's profile.
 */
export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("[Notifications] Must use physical device for push");
    return null;
  }

  // Web doesn't support Expo push notifications
  if (Platform.OS === "web") {
    return null;
  }

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted");
    return null;
  }

  // Android needs a notification channel (set up even if push token fails)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sales", {
      name: "Sales",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
    });
  }

  // Get the Expo push token — requires FCM (google-services.json) on Android.
  // If FCM isn't configured, we skip push and rely on in-app notifications
  // via Supabase Realtime (useInAppNotifications hook).
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = tokenData.data;
    console.log("[Notifications] Push token:", pushToken);

    // Save token to the user's profile in Supabase
    const { error } = await supabase
      .from("profiles")
      .update({ push_token: pushToken })
      .eq("id", userId);

    if (error) {
      console.error("[Notifications] Failed to save push token:", error);
    }

    return pushToken;
  } catch {
    // FCM not configured — this is expected if google-services.json is missing.
    // In-app notifications via Supabase Realtime will still work.
    console.log(
      "[Notifications] Push token unavailable (FCM not configured). " +
        "In-app notifications via Supabase Realtime are active.",
    );
    return null;
  }
}
