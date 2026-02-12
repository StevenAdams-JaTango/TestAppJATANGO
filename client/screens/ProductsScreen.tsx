import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductCard } from "@/components/ProductCard";
import { CartIcon } from "@/components/CartIcon";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { productsService } from "@/services/products";
import { streamingService } from "@/services/streaming";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const voiceRoomRef = useRef<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const data = await productsService.listProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const handleAddProduct = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("AddProduct");
  };

  const handleEditProduct = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AddProduct", { productId: product.id });
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    await productsService.deleteProduct(productToDelete.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteDialog(false);
    setProductToDelete(null);
    loadProducts();
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setProductToDelete(null);
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    return (
      <ProductCard
        product={item}
        onPress={() => handleEditProduct(item)}
        variant="list"
        showDelete={true}
        onDelete={() => handleDeleteProduct(item)}
        index={index}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.backgroundTertiary },
        ]}
      >
        <Feather name="package" size={40} color={theme.secondary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        No Products Yet
      </ThemedText>
      <ThemedText
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        Add your first product to start selling in live shows
      </ThemedText>
      <Pressable
        style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
        onPress={handleAddProduct}
      >
        <Feather name="plus" size={18} color={theme.buttonText} />
        <ThemedText style={[styles.emptyBtnText, { color: theme.buttonText }]}>
          Add Product
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: theme.backgroundRoot },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          My Products
        </ThemedText>
        <View style={styles.headerRight}>
          <CartIcon />
          <Pressable
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={handleAddProduct}
          >
            <Feather name="plus" size={20} color={theme.buttonText} />
          </Pressable>
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={[
          styles.listContent,
          products.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      />

      {/* Voice Add FAB */}
      <Pressable
        style={[
          styles.voiceFab,
          {
            backgroundColor: isVoiceActive ? "#EF4444" : theme.secondary,
            bottom: insets.bottom + 24,
          },
        ]}
        onPress={async () => {
          if (isVoiceActive) {
            // Stop voice session
            await streamingService.disconnect();
            setIsVoiceActive(false);
            voiceRoomRef.current = null;
            loadProducts();
            return;
          }

          if (!user?.id) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsVoiceActive(true);

          try {
            const roomName = `jatango-voice-${user.id}-${Date.now()}`;
            voiceRoomRef.current = roomName;

            const { token, wsUrl } = await streamingService.getToken({
              roomName,
              participantName: user.id,
              isHost: true,
            });

            const room = await streamingService.connect(token, wsUrl);
            await room.localParticipant.setMicrophoneEnabled(true);

            const apiUrl = getApiUrl().replace(/\/$/, "");
            await fetch(`${apiUrl}/api/streaming/dispatch-agent`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomName }),
            });
          } catch (err: any) {
            console.error("[ProductsScreen] Voice agent error:", err);
            Alert.alert(
              "Voice Error",
              err.message || "Failed to start voice assistant",
            );
            setIsVoiceActive(false);
            voiceRoomRef.current = null;
            await streamingService.disconnect();
          }
        }}
      >
        {isVoiceActive ? (
          <View style={styles.voiceFabContent}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <ThemedText style={styles.voiceFabText}>Listening...</ThemedText>
          </View>
        ) : (
          <View style={styles.voiceFabContent}>
            <Feather name="mic" size={20} color="#FFFFFF" />
            <ThemedText style={styles.voiceFabText}>Voice Add</ThemedText>
          </View>
        )}
      </Pressable>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#EF4444"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  voiceFab: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  voiceFabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  voiceFabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
