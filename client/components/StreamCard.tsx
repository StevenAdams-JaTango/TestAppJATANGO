import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { LiveBadge } from "@/components/LiveBadge";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { LiveStream } from "@/types";

interface StreamCardProps {
  stream: LiveStream;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StreamCard({ stream, onPress }: StreamCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
      testID={`stream-card-${stream.id}`}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: stream.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <View style={styles.topRow}>
            {stream.isLive ? <LiveBadge /> : null}
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.stat}>
              <Feather name="eye" size={14} color={theme.buttonText} />
              <ThemedText style={styles.statText}>
                {stream.viewerCount.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <Feather name="shopping-bag" size={14} color={theme.buttonText} />
              <ThemedText style={styles.statText}>
                {stream.productCount}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.infoContainer}>
        <View style={styles.sellerRow}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            {stream.sellerAvatar ? (
              <Image
                source={{ uri: stream.sellerAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Feather name="user" size={16} color={theme.textSecondary} />
            )}
          </View>
          <ThemedText
            style={[styles.sellerName, { color: theme.textSecondary }]}
          >
            {stream.sellerName}
          </ThemedText>
        </View>
        <ThemedText style={styles.title} numberOfLines={2}>
          {stream.title}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  thumbnailContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  bottomRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoContainer: {
    padding: Spacing.md,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  sellerName: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
});
