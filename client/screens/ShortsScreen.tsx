import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ViewToken,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { ShortCard } from "@/components/ShortCard";
import { CartBottomSheet } from "@/components/CartBottomSheet";
import { CheckoutBottomSheet } from "@/components/CheckoutBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { shortsService } from "@/services/shorts";
import { supabase } from "@/lib/supabase";
import { Short } from "@/types";

export default function ShortsScreen() {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const { user } = useAuth();
  const { cart, totalItems } = useCart();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState(false);
  const [checkoutSellerId, setCheckoutSellerId] = useState<string | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadShorts = useCallback(
    async (pageNum: number, isRefresh: boolean = false) => {
      if (!user?.id) return;

      if (isRefresh) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await shortsService.fetchFeed(user.id, pageNum, 10);

        if (isRefresh) {
          setShorts(data);
          setPage(0);
        } else {
          setShorts((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === 10);
      } catch (err) {
        console.error("[ShortsScreen] loadShorts error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.id],
  );

  // Initial load + resume from progress
  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      setLoading(true);
      try {
        const data = await shortsService.fetchFeed(user.id, 0, 10);
        setShorts(data);
        setHasMore(data.length === 10);

        // Try to resume from last watched
        const lastShortId = await shortsService.getProgress(user.id);
        if (lastShortId && data.length > 0) {
          const idx = data.findIndex((s) => s.id === lastShortId);
          if (idx > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: idx,
                animated: false,
              });
              setVisibleIndex(idx);
            }, 100);
          }
        }
        setInitialScrollDone(true);
      } catch (err) {
        console.error("[ShortsScreen] init error:", err);
        setInitialScrollDone(true);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // Real-time subscription for live like/view count updates
  useEffect(() => {
    const channel = supabase
      .channel("shorts-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shorts" },
        (payload) => {
          const updated = payload.new as {
            id: string;
            like_count: number;
            view_count: number;
            comment_count: number;
          };
          setShorts((prev) =>
            prev.map((s) =>
              s.id === updated.id
                ? {
                    ...s,
                    likeCount: updated.like_count,
                    viewCount: updated.view_count,
                    commentCount: updated.comment_count,
                  }
                : s,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "shorts" },
        (payload) => {
          const deleted = payload.old as { id: string };
          setShorts((prev) => prev.filter((s) => s.id !== deleted.id));
        },
      )
      .subscribe((status) => {
        console.log("[ShortsScreen] Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadShorts(nextPage, false);
  }, [loadingMore, hasMore, page, loadShorts]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setVisibleIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Save progress + increment view only once per short change
  const lastViewedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id || shorts.length === 0 || !initialScrollDone) return;
    const currentShort = shorts[visibleIndex];
    if (currentShort && currentShort.id !== lastViewedIdRef.current) {
      lastViewedIdRef.current = currentShort.id;
      shortsService.saveProgress(user.id, currentShort.id);
      shortsService.incrementViewCount(currentShort.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIndex, user?.id, initialScrollDone]);

  const handleLike = useCallback(
    (shortId: string) => {
      if (!user?.id) return;
      shortsService.likeShort(shortId, user.id);
    },
    [user?.id],
  );

  const handleUnlike = useCallback(
    (shortId: string) => {
      if (!user?.id) return;
      shortsService.unlikeShort(shortId, user.id);
    },
    [user?.id],
  );

  const handleDelete = useCallback(async (shortId: string) => {
    const success = await shortsService.deleteShort(shortId);
    if (success) {
      setShorts((prev) => prev.filter((s) => s.id !== shortId));
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Short; index: number }) => (
      <ShortCard
        short={item}
        isVisible={index === visibleIndex}
        currentUserId={user?.id}
        onLike={handleLike}
        onUnlike={handleUnlike}
        onDelete={handleDelete}
      />
    ),
    [visibleIndex, handleLike, handleUnlike, handleDelete, user?.id],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [SCREEN_HEIGHT],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (shorts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <View style={styles.emptyIconInner} />
          </View>
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyTitleText}>No Shorts Yet</Text>
            <Text style={styles.emptySubText}>
              Be the first to upload a short video!
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        hitSlop={12}
      >
        <Feather name="arrow-left" size={24} color="#fff" />
      </Pressable>
      <FlatList
        ref={flatListRef}
        data={shorts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={2}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null
        }
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 200);
        }}
      />

      {/* Floating cart FAB */}
      {totalItems > 0 && (
        <Pressable
          style={[styles.cartFab, { bottom: insets.bottom + 24 }]}
          onPress={() => setShowCartSheet(true)}
        >
          <Feather name="shopping-cart" size={22} color="#fff" />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{totalItems}</Text>
          </View>
        </Pressable>
      )}

      <CartBottomSheet
        visible={showCartSheet}
        onClose={() => setShowCartSheet(false)}
        onCheckout={() => {
          const firstStore = cart.stores[0];
          if (firstStore) {
            setShowCartSheet(false);
            setCheckoutSellerId(firstStore.sellerId);
            setShowCheckoutSheet(true);
          }
        }}
        onStoreCheckout={(sellerId) => {
          setShowCartSheet(false);
          setCheckoutSellerId(sellerId);
          setShowCheckoutSheet(true);
        }}
      />

      <CheckoutBottomSheet
        visible={showCheckoutSheet}
        sellerId={checkoutSellerId}
        onClose={() => {
          setShowCheckoutSheet(false);
          setCheckoutSellerId(null);
        }}
        onSuccess={() => {
          setShowCheckoutSheet(false);
          setCheckoutSellerId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
    gap: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: "rgba(255,255,255,0.4)",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 4,
  },
  emptyTextContainer: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitleText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  emptySubText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
  },
  footerLoader: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartFab: {
    position: "absolute",
    right: 20,
    zIndex: 100,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
