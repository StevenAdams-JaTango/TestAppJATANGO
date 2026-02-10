import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Pressable,
  ViewToken,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { ShortCard } from "@/components/ShortCard";
import { useAuth } from "@/contexts/AuthContext";
import { shortsService } from "@/services/shorts";
import { Short } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type StoreShortsRouteProp = RouteProp<RootStackParamList, "StoreShortsViewer">;

export default function StoreShortsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<StoreShortsRouteProp>();
  const { sellerId, initialIndex = 0 } = route.params;

  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await shortsService.fetchByStore(sellerId, user?.id);
      setShorts(data);
      setLoading(false);

      if (initialIndex > 0 && data.length > initialIndex) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: initialIndex,
            animated: false,
          });
        }, 100);
      }
    };
    load();
  }, [sellerId, user?.id, initialIndex]);

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

  useEffect(() => {
    if (shorts.length === 0) return;
    const currentShort = shorts[visibleIndex];
    if (currentShort) {
      shortsService.incrementViewCount(currentShort.id);
    }
  }, [visibleIndex, shorts]);

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

  const renderItem = useCallback(
    ({ item, index }: { item: Short; index: number }) => (
      <ShortCard
        short={item}
        isVisible={index === visibleIndex}
        onLike={handleLike}
        onUnlike={handleUnlike}
      />
    ),
    [visibleIndex, handleLike, handleUnlike],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Close button */}
      <Pressable
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
      >
        <Feather name="x" size={24} color="#fff" />
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
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 200);
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
  closeButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
