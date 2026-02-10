import { supabase } from "@/lib/supabase";
import { Short } from "@/types";

interface CreateShortInput {
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number;
}

function mapShort(row: any, likedShortIds?: Set<string>): Short {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.profiles?.name || "Unknown",
    sellerAvatar: row.profiles?.avatar_url || null,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    caption: row.caption || "",
    duration: row.duration || 0,
    viewCount: row.view_count || 0,
    likeCount: row.like_count || 0,
    isLiked: likedShortIds ? likedShortIds.has(row.id) : false,
    createdAt: row.created_at,
  };
}

/**
 * Fetch shorts feed (all sellers, newest first) with pagination
 */
async function fetchFeed(
  userId: string,
  page: number = 0,
  pageSize: number = 10,
): Promise<Short[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("shorts")
    .select("*, profiles!shorts_seller_id_fkey(name, avatar_url)")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[Shorts] fetchFeed error:", error);
    return [];
  }

  // Fetch which of these the user has liked
  const shortIds = (data || []).map((s: any) => s.id);
  const likedIds = await fetchLikedShortIds(userId, shortIds);

  return (data || []).map((row: any) => mapShort(row, likedIds));
}

/**
 * Fetch shorts for a specific seller
 */
async function fetchByStore(
  sellerId: string,
  userId?: string,
): Promise<Short[]> {
  const { data, error } = await supabase
    .from("shorts")
    .select("*, profiles!shorts_seller_id_fkey(name, avatar_url)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Shorts] fetchByStore error:", error);
    return [];
  }

  let likedIds: Set<string> | undefined;
  if (userId) {
    const shortIds = (data || []).map((s: any) => s.id);
    likedIds = await fetchLikedShortIds(userId, shortIds);
  }

  return (data || []).map((row: any) => mapShort(row, likedIds));
}

/**
 * Create a new short
 */
async function createShort(input: CreateShortInput): Promise<Short | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("shorts")
    .insert({
      seller_id: user.id,
      video_url: input.videoUrl,
      thumbnail_url: input.thumbnailUrl || null,
      caption: input.caption || "",
      duration: input.duration || 0,
    })
    .select("*, profiles!shorts_seller_id_fkey(name, avatar_url)")
    .single();

  if (error) {
    console.error("[Shorts] createShort error:", error);
    return null;
  }

  return mapShort(data);
}

/**
 * Delete a short
 */
async function deleteShort(shortId: string): Promise<boolean> {
  const { error } = await supabase.from("shorts").delete().eq("id", shortId);

  if (error) {
    console.error("[Shorts] deleteShort error:", error);
    return false;
  }
  return true;
}

/**
 * Like a short
 */
async function likeShort(shortId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("short_likes")
    .insert({ short_id: shortId, user_id: userId });

  if (error) {
    if (error.code === "23505") return true; // already liked
    console.error("[Shorts] likeShort error:", error);
    return false;
  }

  // Increment like_count
  await supabase.rpc("increment_short_likes", { short_id_input: shortId });

  return true;
}

/**
 * Unlike a short
 */
async function unlikeShort(shortId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("short_likes")
    .delete()
    .eq("short_id", shortId)
    .eq("user_id", userId);

  if (error) {
    console.error("[Shorts] unlikeShort error:", error);
    return false;
  }

  // Decrement like_count
  await supabase.rpc("decrement_short_likes", { short_id_input: shortId });

  return true;
}

/**
 * Fetch which short IDs the user has liked from a given set
 */
async function fetchLikedShortIds(
  userId: string,
  shortIds: string[],
): Promise<Set<string>> {
  if (shortIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("short_likes")
    .select("short_id")
    .eq("user_id", userId)
    .in("short_id", shortIds);

  if (error) {
    console.error("[Shorts] fetchLikedShortIds error:", error);
    return new Set();
  }

  return new Set((data || []).map((row: any) => row.short_id));
}

/**
 * Increment view count
 */
async function incrementViewCount(shortId: string): Promise<void> {
  await supabase.rpc("increment_short_views", { short_id_input: shortId });
}

/**
 * Save user's last-watched short for resume
 */
async function saveProgress(
  userId: string,
  lastShortId: string,
): Promise<void> {
  const { error } = await supabase.from("short_progress").upsert(
    {
      user_id: userId,
      last_short_id: lastShortId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[Shorts] saveProgress error:", error);
  }
}

/**
 * Get user's last-watched short ID
 */
async function getProgress(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("short_progress")
    .select("last_short_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data.last_short_id;
}

export const shortsService = {
  fetchFeed,
  fetchByStore,
  createShort,
  deleteShort,
  likeShort,
  unlikeShort,
  incrementViewCount,
  saveProgress,
  getProgress,
};
