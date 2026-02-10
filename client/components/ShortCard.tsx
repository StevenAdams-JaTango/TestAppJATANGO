import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ShortCommentsSheet } from "@/components/ShortCommentsSheet";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { Short, Product } from "@/types";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { productsService } from "@/services/products";

const WEB_MAX_WIDTH = 420;

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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const CARD_WIDTH =
    Platform.OS === "web"
      ? Math.min(SCREEN_WIDTH, WEB_MAX_WIDTH)
      : SCREEN_WIDTH;
  const videoRef = useRef<Video>(null);
  const navigation = useNavigation<NavigationProp>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const [liked, setLiked] = useState(short.isLiked || false);
  const [likeCount, setLikeCount] = useState(short.likeCount);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(short.commentCount);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Only sync likeCount from realtime updates — don't overwrite local liked state
  useEffect(() => {
    setLikeCount(short.likeCount);
  }, [short.likeCount]);

  useEffect(() => {
    setCommentCount(short.commentCount);
  }, [short.commentCount]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      setHasError(false);
      retryCountRef.current = 0;
      videoRef.current.playAsync().catch(() => {
        // Retry once after a short delay
        setTimeout(() => {
          videoRef.current?.playAsync().catch(() => {});
        }, 500);
      });

      // Safety timeout: if still buffering after 10s, clear the spinner
      const timeout = setTimeout(() => {
        setIsBuffering((prev) => {
          if (prev) {
            console.warn("[ShortCard] Buffering timeout, clearing spinner");
            return false;
          }
          return prev;
        });
      }, 10000);

      return () => clearTimeout(timeout);
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
  }, [isVisible]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          console.warn("[ShortCard] Playback error:", status.error);
          setHasError(true);
          setIsBuffering(false);

          // Auto-retry up to 2 times
          if (retryCountRef.current < 2) {
            retryCountRef.current += 1;
            setTimeout(() => {
              videoRef.current?.unloadAsync().then(() => {
                videoRef.current
                  ?.loadAsync(
                    { uri: short.videoUrl },
                    { shouldPlay: isVisible },
                  )
                  .catch(() => {});
              });
            }, 1000);
          }
        }
        return;
      }
      setHasError(false);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
    },
    [short.videoUrl, isVisible],
  );

  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const handleReadyForDisplay = useCallback((event: any) => {
    if (Platform.OS === "web" && event?.srcElement) {
      event.srcElement.style.position = "initial";
      event.srcElement.style.width = "100%";
      event.srcElement.style.height = "100%";
      event.srcElement.style.objectFit = "contain";
    }
  }, []);

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
    <View
      style={[styles.container, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
    >
      <Pressable
        style={[styles.videoContainer, { width: CARD_WIDTH }]}
        onPress={handleTogglePlay}
      >
        <Video
          ref={videoRef}
          source={{ uri: short.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isVisible}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onReadyForDisplay={handleReadyForDisplay}
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

        {!isPlaying && !isBuffering && !hasError && isVisible && (
          <View style={styles.playOverlay}>
            <Feather name="play" size={48} color="rgba(255,255,255,0.8)" />
          </View>
        )}

        {hasError && isVisible && (
          <Pressable
            style={styles.errorOverlay}
            onPress={() => {
              setHasError(false);
              setIsBuffering(true);
              retryCountRef.current = 0;
              videoRef.current?.unloadAsync().then(() => {
                videoRef.current
                  ?.loadAsync({ uri: short.videoUrl }, { shouldPlay: true })
                  .catch(() => {});
              });
            }}
          >
            <Feather name="refresh-cw" size={32} color="#fff" />
            <ThemedText style={styles.errorText}>Tap to retry</ThemedText>
          </Pressable>
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

        {/* Comments */}
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowComments(true);
          }}
        >
          <Feather name="message-circle" size={28} color="#fff" />
          <ThemedText style={styles.actionText}>
            {formatCount(commentCount)}
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

      {/* Product card overlay */}
      {short.productId && short.productName && (
        <Animated.View
          entering={FadeIn.delay(400)}
          style={[
            styles.productOverlay,
            Platform.OS === "web" && {
              left: (SCREEN_WIDTH - CARD_WIDTH) / 2 + Spacing.md,
              right: (SCREEN_WIDTH - CARD_WIDTH) / 2 + 80,
            },
          ]}
        >
          <Pressable
            style={styles.productCard}
            onPress={async () => {
              if (loadingProduct) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLoadingProduct(true);
              const product = await productsService.getProduct(
                short.productId!,
              );
              setFullProduct(product);
              setShowProductSheet(true);
              setLoadingProduct(false);
            }}
          >
            {short.productImage && (
              <Image
                source={{ uri: short.productImage }}
                style={styles.productImage}
              />
            )}
            <View style={styles.productInfo}>
              <ThemedText style={styles.productName} numberOfLines={1}>
                {short.productName}
              </ThemedText>
              {short.productPrice != null && (
                <ThemedText style={styles.productPrice}>
                  ${short.productPrice.toFixed(2)}
                </ThemedText>
              )}
            </View>
            <Feather name="shopping-bag" size={16} color="#fff" />
          </Pressable>
        </Animated.View>
      )}

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

      <ShortCommentsSheet
        visible={showComments}
        shortId={short.id}
        onClose={() => setShowComments(false)}
        onCommentCountChange={(delta) =>
          setCommentCount((prev) => Math.max(prev + delta, 0))
        }
      />

      {short.productId && (
        <ProductDetailSheet
          product={fullProduct}
          visible={showProductSheet}
          onClose={() => setShowProductSheet(false)}
          keepOpenOnAdd
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    alignItems: Platform.OS === "web" ? "center" : undefined,
  },
  videoContainer: {
    flex: 1,
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
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    gap: 12,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  productOverlay: {
    position: "absolute",
    bottom: 160,
    left: Spacing.md,
    right: 80,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 8,
    gap: 10,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  productPrice: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
});
