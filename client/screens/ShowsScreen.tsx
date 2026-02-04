import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useFocusEffect,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";
import { showsService, ShowDraft } from "@/services/shows";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { ShowsStackParamList } from "@/navigation/ShowsStackNavigator";

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ShowsStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type TabType = "upcoming" | "past";

export default function ShowsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [upcomingShows, setUpcomingShows] = useState<ShowDraft[]>([]);
  const [pastShows, setPastShows] = useState<ShowDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [upcoming, past] = await Promise.all([
        showsService.listUpcoming(),
        showsService.listPast(),
      ]);
      setUpcomingShows(upcoming);
      setPastShows(past);
    } catch (error) {
      console.error("[ShowsScreen] Failed to load shows:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ShowSetup");
  };

  const handleEdit = (draftId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ShowSetup", { draftId });
  };

  const handleDelete = (draftId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDraftToDelete(draftId);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!draftToDelete) return;

    try {
      await showsService.deleteDraft(draftToDelete);
      await load();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to delete draft:", error);
    } finally {
      setDeleteDialogVisible(false);
      setDraftToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    setDraftToDelete(null);
  };

  const handleStart = (draftId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Broadcaster", { draftId });
  };

  const handleViewEndedShow = (showId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("EndedShow", { showId });
  };

  const renderUpcomingItem = ({ item }: { item: ShowDraft }) => (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable style={styles.thumbWrap} onPress={() => handleEdit(item.id)}>
        <Image source={{ uri: item.thumbnailDataUri }} style={styles.thumb} />
        <View style={styles.thumbOverlay}>
          <Feather name="edit-2" size={16} color="#fff" />
        </View>
      </Pressable>
      <View style={styles.cardBody}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleStart(item.id)}
          >
            <Feather name="video" size={16} color="#fff" />
            <ThemedText style={styles.actionText}>Start</ThemedText>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => handleEdit(item.id)}>
            <Feather name="settings" size={16} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderPastItem = ({ item }: { item: ShowDraft }) => (
    <Pressable
      style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
      onPress={() => handleViewEndedShow(item.id)}
    >
      <View style={styles.thumbWrap}>
        <Image source={{ uri: item.thumbnailDataUri }} style={styles.thumb} />
        <View style={styles.endedBadge}>
          <Feather name="check-circle" size={10} color="#fff" />
        </View>
      </View>
      <View style={styles.cardBody}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.endedDate, { color: theme.textSecondary }]}>
          {new Date(item.endedAt || item.updatedAt).toLocaleDateString()}
        </ThemedText>
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.viewBtn]}
            onPress={() => handleViewEndedShow(item.id)}
          >
            <Feather name="play" size={16} color="#fff" />
            <ThemedText style={styles.actionText}>View</ThemedText>
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  const renderItem =
    activeTab === "upcoming" ? renderUpcomingItem : renderPastItem;

  const currentData = activeTab === "upcoming" ? upcomingShows : pastShows;

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  // Calculate bottom padding for tab bar
  const tabBarHeight = Platform.OS === "android" ? 60 + insets.bottom : 88;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <ThemedText style={styles.headerTitle}>Your shows</ThemedText>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "upcoming" && styles.tabActive]}
          onPress={() => handleTabChange("upcoming")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.tabTextActive,
            ]}
          >
            Upcoming
          </ThemedText>
          {upcomingShows.length > 0 && (
            <View style={styles.tabBadge}>
              <ThemedText style={styles.tabBadgeText}>
                {upcomingShows.length}
              </ThemedText>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "past" && styles.tabActive]}
          onPress={() => handleTabChange("past")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "past" && styles.tabTextActive,
            ]}
          >
            Past Shows
          </ThemedText>
          {pastShows.length > 0 && (
            <View style={styles.tabBadge}>
              <ThemedText style={styles.tabBadgeText}>
                {pastShows.length}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(d) => d.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight }]}
        refreshing={isLoading}
        onRefresh={load}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather
              name={activeTab === "upcoming" ? "film" : "clock"}
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText style={styles.emptyTitle}>
              {activeTab === "upcoming" ? "No shows yet" : "No past shows"}
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {activeTab === "upcoming"
                ? "Create a show with a title and thumbnail, then start streaming."
                : "Your completed shows will appear here."}
            </ThemedText>
            {activeTab === "upcoming" && (
              <Pressable style={styles.emptyCta} onPress={handleCreate}>
                <ThemedText style={styles.emptyCtaText}>
                  Create your first show
                </ThemedText>
              </Pressable>
            )}
          </View>
        }
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete show?"
        message="This will permanently remove the saved show draft."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#ef4444"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Floating Add Button */}
      <Pressable
        style={[styles.fab, { bottom: tabBarHeight + Spacing.md }]}
        onPress={handleCreate}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.secondary,
    letterSpacing: -0.4,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    flexDirection: "row",
    ...Shadows.sm,
  },
  thumbWrap: {
    width: 110,
    height: 110,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbOverlay: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cardBody: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  empty: {
    alignItems: "center",
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyCtaText: {
    color: Colors.light.secondary,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },
  tabBadge: {
    backgroundColor: Colors.light.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.light.secondary,
  },
  endedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  endedDate: {
    fontSize: 12,
    marginTop: 2,
  },
  viewBtn: {
    backgroundColor: Colors.light.secondary,
  },
});
