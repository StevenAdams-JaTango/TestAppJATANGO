import React from "react";
import { View, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Spacing } from "@/constants/theme";

interface RingLightAvatarProps {
  avatar: string | null;
  size?: number;
}

/**
 * Ring light avatar for sellers — bright white ring with dark borders,
 * mimicking a real ring light. Profile picture sits in the center.
 */
export function RingLightAvatar({ avatar, size = 128 }: RingLightAvatarProps) {
  const BORDER = 2;
  const RING_WIDTH = Math.round(size * 0.11);
  const INNER = size - (BORDER + RING_WIDTH) * 2;
  const AVATAR_SIZE = INNER - 4;

  const GLOW_PAD = 10;

  return (
    <View
      style={{
        width: size + GLOW_PAD * 2,
        height: size + GLOW_PAD * 2,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.md,
      }}
    >
      {/* Outer glow layer */}
      <View
        style={{
          position: "absolute",
          width: size + GLOW_PAD,
          height: size + GLOW_PAD,
          borderRadius: (size + GLOW_PAD) / 2,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          shadowColor: "#fff",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 16,
          elevation: 12,
        }}
      />
      {/* Outer dark border */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: BORDER,
          borderColor: "#222",
          backgroundColor: "#FAFAFA",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#fff",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Inner dark border + center hole */}
        <View
          style={{
            width: INNER + BORDER * 2,
            height: INNER + BORDER * 2,
            borderRadius: (INNER + BORDER * 2) / 2,
            borderWidth: BORDER,
            borderColor: "#222",
            backgroundColor: "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              overflow: "hidden",
              backgroundColor: "rgba(0,0,0,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Feather name="user" size={AVATAR_SIZE * 0.45} color="#C4B5FD" />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
