import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { shortsService } from "@/services/shorts";
import { ShortComment } from "@/types";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ShortCommentsSheetProps {
  visible: boolean;
  shortId: string;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

export function ShortCommentsSheet({
  visible,
  shortId,
  onClose,
  onCommentCountChange,
}: ShortCommentsSheetProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const sheetHeight = Math.min(
    Math.max(windowHeight * 0.55, 360),
    windowHeight,
  );

  const loadComments = useCallback(async () => {
    if (!shortId) return;
    setLoading(true);
    const data = await shortsService.fetchComments(shortId);
    setComments(data);
    setLoading(false);
  }, [shortId]);

  useEffect(() => {
    if (visible && shortId) {
      loadComments();
    }
  }, [visible, shortId, loadComments]);

  const handlePost = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || posting || !user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosting(true);

    const comment = await shortsService.postComment(shortId, trimmed);
    if (comment) {
      setComments((prev) => [...prev, comment]);
      setText("");
      onCommentCountChange?.(1);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    setPosting(false);
  }, [text, posting, user?.id, shortId, onCommentCountChange]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const success = await shortsService.deleteComment(commentId, shortId);
      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommentCountChange?.(-1);
      }
    },
    [shortId, onCommentCountChange],
  );

  const formatTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const renderComment = useCallback(
    ({ item, index }: { item: ShortComment; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(index * 20).springify()}
        style={[
          styles.commentRow,
          { backgroundColor: theme.backgroundSecondary + "60" },
        ]}
      >
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: theme.primary + "20" },
            ]}
          >
            <Feather name="user" size={14} color={theme.primary} />
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentMeta}>
            <ThemedText
              style={[styles.commentName, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.userName}
            </ThemedText>
            <View style={[styles.timeBadge, { backgroundColor: theme.border }]}>
              <ThemedText
                style={[styles.commentTime, { color: theme.textSecondary }]}
              >
                {formatTime(item.createdAt)}
              </ThemedText>
            </View>
          </View>
          <ThemedText
            style={[styles.commentText, { color: theme.textSecondary }]}
          >
            {item.text}
          </ThemedText>
        </View>
        {user?.id === item.userId && (
          <Pressable
            style={[styles.deleteButton, { backgroundColor: theme.border }]}
            onPress={() => handleDelete(item.id)}
            hitSlop={8}
          >
            <Feather name="trash-2" size={12} color={theme.textSecondary} />
          </Pressable>
        )}
      </Animated.View>
    ),
    [theme, user?.id, handleDelete],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.backgroundRoot, height: sheetHeight },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
                Comments
              </ThemedText>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <ThemedText
                  style={[styles.countText, { color: theme.primary }]}
                >
                  {comments.length}
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={[
                styles.closeButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={onClose}
              hitSlop={8}
            >
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Comments list */}
          <View style={styles.listWrapper}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : Platform.OS === "web" ? (
              <ScrollView
                style={[styles.commentsList, styles.webScrollView]}
                contentContainerStyle={[
                  styles.listContent,
                  comments.length === 0 && styles.emptyList,
                ]}
                showsVerticalScrollIndicator
              >
                {comments.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[
                        styles.emptyIcon,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <Feather
                        name="message-circle"
                        size={28}
                        color={theme.textSecondary}
                      />
                    </View>
                    <ThemedText
                      style={[styles.emptyTitle, { color: theme.text }]}
                    >
                      No comments yet
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.emptySubtitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Be the first to comment
                    </ThemedText>
                  </View>
                ) : (
                  comments.map((item, index) => (
                    <View key={item.id} style={styles.webRowSpacing}>
                      {renderComment({ item, index })}
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <FlatList
                ref={flatListRef}
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                style={styles.commentsList}
                contentContainerStyle={[
                  styles.listContent,
                  comments.length === 0 && styles.emptyList,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View
                      style={[
                        styles.emptyIcon,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <Feather
                        name="message-circle"
                        size={28}
                        color={theme.textSecondary}
                      />
                    </View>
                    <ThemedText
                      style={[styles.emptyTitle, { color: theme.text }]}
                    >
                      No comments yet
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.emptySubtitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Be the first to comment
                    </ThemedText>
                  </View>
                }
              />
            )}
          </View>

          {/* Input */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.backgroundRoot,
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, Spacing.md),
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={theme.textSecondary}
              value={text}
              onChangeText={setText}
              maxLength={500}
              multiline
              returnKeyType="send"
              onSubmitEditing={handlePost}
              blurOnSubmit
            />
            <Pressable
              style={[
                styles.sendButton,
                {
                  backgroundColor: text.trim()
                    ? theme.primary
                    : theme.backgroundSecondary,
                },
              ]}
              onPress={handlePost}
              disabled={!text.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather
                  name="arrow-up"
                  size={18}
                  color={text.trim() ? "#fff" : theme.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
    zIndex: 2,
    flexDirection: "column",
  },
  handleBar: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listWrapper: {
    flex: 1,
    minHeight: 0,
  },
  commentsList: {
    flex: 1,
    minHeight: 0,
  },
  webScrollView: {
    overflow: "scroll",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  webRowSpacing: {
    marginBottom: Spacing.sm,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 13,
  },
  commentRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentContent: {
    flex: 1,
    gap: 2,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  commentName: {
    fontSize: 13,
    fontWeight: "700",
  },
  timeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  commentTime: {
    fontSize: 10,
    fontWeight: "500",
  },
  commentText: {
    fontSize: 14,
    lineHeight: 19,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    maxHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 1 : 0,
  },
});
