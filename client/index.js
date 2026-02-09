import { registerRootComponent } from "expo";
import { Platform } from "react-native";
import Constants from "expo-constants";

import App from "@/App";

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

// Register LiveKit WebRTC globals for native platforms
// This must be done before any LiveKit code runs
// Skip in Expo Go as LiveKit requires native modules
if (Platform.OS !== "web" && !isExpoGo) {
  try {
    // Dynamic import to avoid issues on web
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
    console.log("[LiveKit] WebRTC globals registered successfully");
  } catch (error) {
    console.warn("[LiveKit] Failed to register WebRTC globals:", error);
  }
} else if (isExpoGo) {
  console.log("[LiveKit] Running in Expo Go - LiveKit streaming disabled");
}

registerRootComponent(App);
