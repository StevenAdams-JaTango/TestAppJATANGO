import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { supabase } from "@/lib/supabase";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: string): keyof typeof Feather.glyphMap {
  switch (type) {
    case "new_sale":
      return "dollar-sign";
    case "order_shipped":
      return "truck";
    case "order_delivered":
      return "check-circle";
    default:
      return "bell";
  }
}

function getNotificationColor(type: string, theme: Record<string, string>) {
  switch (type) {
    case "new_sale":
      return theme.success || "#22c55e";
    case "order_shipped":
      return theme.primary;
    case "order_delivered":
      return theme.secondary;
    default:
      return theme.textSecondary;
  }
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("[Notifications] Error fetching:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = async (notif: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read
    if (!notif.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
    }

    // Navigate based on type
    if (notif.type === "new_sale" && notif.data?.orderId) {
      navigation.navigate("SaleDetail", { orderId: notif.data.orderId });
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = ({
    item,
    index,
  }: {
    item: Notification;
    index: number;
  }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type, theme);

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          style={[
            styles.notifCard,
            {
              backgroundColor: item.read
                ? theme.backgroundDefault
                : theme.backgroundSecondary,
              borderColor: item.read ? theme.border : iconColor + "30",
            },
          ]}
          onPress={() => handleNotificationPress(item)}
        >
          {/* Unread dot */}
          {!item.read && (
            <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
          )}

          {/* Icon */}
          <View
            style={[styles.iconCircle, { backgroundColor: iconColor + "15" }]}
          >
            <Feather name={iconName} size={20} color={iconColor} />
          </View>

          {/* Content */}
          <View style={styles.notifContent}>
            <ThemedText
              style={[
                styles.notifTitle,
                { color: theme.text },
                !item.read && styles.notifTitleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </ThemedText>
            <ThemedText
              style={[styles.notifBody, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.body}
            </ThemedText>
            <ThemedText
              style={[styles.notifTime, { color: theme.textSecondary }]}
            >
              {timeAgo(item.created_at)}
            </ThemedText>
          </View>

          {/* Chevron */}
          {item.data?.orderId && (
            <Feather
              name="chevron-right"
              size={18}
              color={theme.textSecondary}
            />
          )}
        </Pressable>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          Notifications
        </ThemedText>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <ThemedText style={[styles.markAllText, { color: theme.primary }]}>
              Mark all read
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="bell-off" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
              No notifications yet
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textSecondary }]}
            >
              You&apos;ll see sale alerts and updates here
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  markAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  unreadDot: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  notifTitleUnread: {
    fontWeight: "800",
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260,
  },
});
