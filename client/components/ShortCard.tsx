import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Short } from "@/types";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WEB_MAX_WIDTH = 420;
// eslint-disable-next-line prettier/prettier
const CARD_WIDTH = Platform.OS === "web"
  ? Math.min(SCREEN_WIDTH, WEB_MAX_WIDTH)
  : SCREEN_WIDTH;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ShortCardProps {
  short: Short;
  isVisible: boolean;
  currentUserId?: string;
  onLike: (shortId: string) => void;
  onUnlike: (shortId: string) => void;
  onDelete?: (shortId: string) => void;
}

export function ShortCard({
  short,
  isVisible,
  currentUserId,
  onLike,
  onUnlike,
  onDelete,
}: ShortCardProps) {
  const videoRef = useRef<Video>(null);
  const navigation = useNavigation<NavigationProp>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(short.isLiked || false);
  const [likeCount, setLikeCount] = useState(short.likeCount);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Only sync likeCount from realtime updates — don't overwrite local liked state
  useEffect(() => {
    setLikeCount(short.likeCount);
  }, [short.likeCount]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
  }, [isVisible]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsBuffering(true);
      return;
    }
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const handleToggleMute = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted((prev) => !prev);
  }, []);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (liked) {
      setLiked(false);
      setLikeCount((prev) => Math.max(prev - 1, 0));
      onUnlike(short.id);
    } else {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
      onLike(short.id);
    }
  }, [liked, short.id, onLike, onUnlike]);

  const isOwner = currentUserId === short.sellerId;

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleSellerPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Main", {
      screen: "ExploreTab",
      params: {
        screen: "StoreProfile",
        params: { storeId: short.sellerId },
      },
    } as any);
  }, [navigation, short.sellerId]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={handleTogglePlay}>
        <Video
          ref={videoRef}
          source={{ uri: short.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isVisible}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          posterSource={
            short.thumbnailUrl ? { uri: short.thumbnailUrl } : undefined
          }
          usePoster={!!short.thumbnailUrl}
        />

        {isBuffering && isVisible && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {!isPlaying && !isBuffering && isVisible && (
          <View style={styles.playOverlay}>
            <Feather name="play" size={48} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </Pressable>

      {/* Right side actions */}
      <Animated.View
        entering={FadeIn.delay(200)}
        style={[
          styles.actions,
          Platform.OS === "web" && {
            right: (SCREEN_WIDTH - CARD_WIDTH) / 2 + Spacing.md,
          },
        ]}
      >
        {/* Seller avatar */}
        <Pressable style={styles.avatarButton} onPress={handleSellerPress}>
          {short.sellerAvatar ? (
            <Image source={{ uri: short.sellerAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={20} color="#fff" />
            </View>
          )}
        </Pressable>

        {/* Like */}
        <Pressable style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={30}
            color={liked ? "#ef4444" : "#fff"}
          />
          <ThemedText style={styles.actionText}>
            {formatCount(likeCount)}
          </ThemedText>
        </Pressable>

        {/* Views */}
        <View style={styles.actionButton}>
          <Feather name="eye" size={28} color="#fff" />
          <ThemedText style={styles.actionText}>
            {formatCount(short.viewCount)}
          </ThemedText>
        </View>

        {/* Mute toggle */}
        <Pressable style={styles.actionButton} onPress={handleToggleMute}>
          <Feather
            name={isMuted ? "volume-x" : "volume-2"}
            size={28}
            color="#fff"
          />
        </Pressable>

        {/* Delete (owner only) */}
        {isOwner && onDelete && (
          <Pressable style={styles.actionButton} onPress={handleDelete}>
            <Feather name="trash-2" size={26} color="rgba(255,255,255,0.8)" />
          </Pressable>
        )}
      </Animated.View>

      {/* Bottom overlay: seller name + caption */}
      <Animated.View
        entering={FadeIn.delay(300)}
        style={[
          styles.bottomOverlay,
          Platform.OS === "web" && {
            left: (SCREEN_WIDTH - CARD_WIDTH) / 2 + Spacing.md,
            right: (SCREEN_WIDTH - CARD_WIDTH) / 2 + 80,
          },
        ]}
      >
        <Pressable onPress={handleSellerPress}>
          <ThemedText style={styles.sellerName}>@{short.sellerName}</ThemedText>
        </Pressable>
        {short.caption ? (
          <ThemedText style={styles.caption} numberOfLines={2}>
            {short.caption}
          </ThemedText>
        ) : null}
      </Animated.View>
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Short"
        message="Are you sure you want to delete this short? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.(short.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000",
    alignItems: Platform.OS === "web" ? "center" : undefined,
  },
  videoContainer: {
    flex: 1,
    width: CARD_WIDTH,
    alignSelf: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    position: "absolute",
    right: Spacing.md,
    bottom: 160,
    alignItems: "center",
    gap: 20,
  },
  avatarButton: {
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 100,
    left: Spacing.md,
    right: 80,
  },
  sellerName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  caption: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 20,
  },
});
