import { registerRootComponent } from "expo";
import { Platform } from "react-native";

import App from "@/App";

// Register LiveKit WebRTC globals for native platforms
// This must be done before any LiveKit code runs
if (Platform.OS !== "web") {
  try {
    // Dynamic import to avoid issues on web
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
    console.log("[LiveKit] WebRTC globals registered successfully");
  } catch (error) {
    console.warn("[LiveKit] Failed to register WebRTC globals:", error);
  }
}

registerRootComponent(App);
