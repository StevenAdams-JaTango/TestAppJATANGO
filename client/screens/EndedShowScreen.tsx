import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { useTheme } from "@/hooks/useTheme";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { showsService, ShowDraft } from "@/services/shows";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { mockSellerProducts } from "@/data/mockData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<{ EndedShow: { showId: string } }, "EndedShow">;

interface ChatMessage {
  id: string;
  userName: string;
  message: string;
  timestamp: number;
}

export default function EndedShowScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { showId } = route.params;

  const [show, setShow] = useState<ShowDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSheet, setShowProductSheet] = useState(false);

  // Mock data for demo - in production these would be stored with the show
  const [chatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      userName: "HappyPanda42",
      message: "Great show!",
      timestamp: Date.now() - 3600000,
    },
    {
      id: "2",
      userName: "SwiftTiger99",
      message: "Love this product!",
      timestamp: Date.now() - 3500000,
    },
    {
      id: "3",
      userName: "BrightEagle35",
      message: "When will you stream again?",
      timestamp: Date.now() - 3400000,
    },
    {
      id: "4",
      userName: "CoolFox77",
      message: "Thanks for the demo!",
      timestamp: Date.now() - 3300000,
    },
  ]);

  const [carouselProducts] = useState<Product[]>(
    mockSellerProducts.slice(0, 3),
  );

  useEffect(() => {
    loadShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const loadShow = async () => {
    setIsLoading(true);
    try {
      const draft = await showsService.getDraft(showId);
      setShow(draft);
    } catch (error) {
      console.error("Failed to load show:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleProductPress = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProduct(product);
    setShowProductSheet(true);
  };

  const handleCloseProductSheet = () => {
    setShowProductSheet(false);
    setSelectedProduct(null);
  };

  const handleAddToCart = (product: Product) => {
    console.log("Add to cart:", product.id);
    handleCloseProductSheet();
  };

  const handleBuyNow = (product: Product) => {
    console.log("Buy now:", product.id);
    handleCloseProductSheet();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (endedAt?: number, createdAt?: number) => {
    if (!endedAt || !createdAt) return "Unknown duration";
    const durationMs = endedAt - createdAt;
    const minutes = Math.floor(durationMs / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (isLoading || !show) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail Header */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: show.thumbnailDataUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.thumbnailGradient}
          />
          <View style={[styles.thumbnailOverlay, { paddingTop: insets.top }]}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.thumbnailInfo}>
            <View style={styles.endedBadge}>
              <Feather name="check-circle" size={12} color="#fff" />
              <ThemedText style={styles.endedBadgeText}>Ended</ThemedText>
            </View>
            <ThemedText style={styles.showTitle}>{show.title}</ThemedText>
            <View style={styles.showMeta}>
              <View style={styles.metaItem}>
                <Feather
                  name="calendar"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
                <ThemedText style={styles.metaText}>
                  {formatDate(show.endedAt || show.updatedAt)}
                </ThemedText>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color="rgba(255,255,255,0.7)" />
                <ThemedText style={styles.metaText}>
                  {formatDuration(show.endedAt, show.createdAt)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View
          style={[
            styles.statsSection,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>127</ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Views
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {chatMessages.length}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Messages
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {carouselProducts.length}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Products
            </ThemedText>
          </View>
        </View>

        {/* Products Section */}
        {carouselProducts.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Featured Products
            </ThemedText>
            <ProductCarousel
              products={carouselProducts}
              onProductPress={handleProductPress}
              visible={true}
            />
          </View>
        )}

        {/* Chat History Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Chat Highlights</ThemedText>
          <View
            style={[
              styles.chatContainer,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            {chatMessages.map((msg) => (
              <View key={msg.id} style={styles.chatMessage}>
                <ThemedText style={styles.chatUserName}>
                  {msg.userName}
                </ThemedText>
                <ThemedText
                  style={[styles.chatText, { color: theme.textSecondary }]}
                >
                  {msg.message}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View
          style={[
            styles.actionsSection,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
        >
          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: Colors.light.primary },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Could navigate to create new show with same settings
            }}
          >
            <Feather name="repeat" size={18} color="#fff" />
            <ThemedText style={styles.actionButtonText}>
              Go Live Again
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.actionButton,
              styles.secondaryButton,
              { borderColor: theme.textSecondary },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Share functionality
            }}
          >
            <Feather name="share" size={18} color={theme.text} />
            <ThemedText
              style={[styles.actionButtonText, { color: theme.text }]}
            >
              Share Recap
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <ProductDetailSheet
        product={selectedProduct}
        visible={showProductSheet}
        onClose={handleCloseProductSheet}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  thumbnailContainer: {
    height: 300,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  endedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: Spacing.sm,
  },
  endedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  showTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: Spacing.sm,
  },
  showMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  statsSection: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  chatContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  chatMessage: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  chatUserName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  chatText: {
    fontSize: 13,
    flex: 1,
  },
  actionsSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
});
