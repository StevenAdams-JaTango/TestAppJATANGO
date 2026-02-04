import { supabase, DbShow } from "@/lib/supabase";

export type ShowStatus = "draft" | "scheduled" | "live" | "ended";

export interface ShowDraft {
  id: string;
  title: string;
  thumbnailDataUri: string;
  createdAt: number;
  updatedAt: number;
  status: ShowStatus;
  scheduledAt?: number;
  endedAt?: number;
  productIds?: string[];
}

// Convert database row to ShowDraft type
function dbToShow(row: DbShow): ShowDraft {
  return {
    id: row.id,
    title: row.title,
    thumbnailDataUri: row.thumbnail_url || "",
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    status: row.status as ShowStatus,
    scheduledAt: row.scheduled_at
      ? new Date(row.scheduled_at).getTime()
      : undefined,
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : undefined,
    productIds: row.product_ids,
  };
}

export const showsService = {
  async listDrafts(): Promise<ShowDraft[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("No authenticated user, returning empty shows");
        return [];
      }

      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("seller_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToShow);
    } catch (error) {
      console.error("Error listing shows:", error);
      return [];
    }
  },

  async getDraft(id: string): Promise<ShowDraft | null> {
    try {
      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? dbToShow(data) : null;
    } catch (error) {
      console.error("Error getting show:", error);
      return null;
    }
  },

  async upsertDraft(input: {
    id?: string;
    title: string;
    thumbnailDataUri: string;
    status?: ShowStatus;
    scheduledAt?: number;
  }): Promise<ShowDraft | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Must be authenticated to create shows");
      }

      const showData = {
        title: input.title,
        thumbnail_url: input.thumbnailDataUri,
        status: input.status || "draft",
        scheduled_at: input.scheduledAt
          ? new Date(input.scheduledAt).toISOString()
          : null,
        seller_id: user.id,
      };

      if (input.id) {
        // Update existing
        const { data, error } = await supabase
          .from("shows")
          .update(showData)
          .eq("id", input.id)
          .select()
          .single();

        if (error) throw error;
        return data ? dbToShow(data) : null;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("shows")
          .insert(showData)
          .select()
          .single();

        if (error) throw error;
        return data ? dbToShow(data) : null;
      }
    } catch (error) {
      console.error("Error upserting show:", error);
      return null;
    }
  },

  async deleteDraft(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("shows").delete().eq("id", id);

      if (error) throw error;
      console.log("[showsService] Delete complete");
    } catch (error) {
      console.error("Error deleting show:", error);
    }
  },

  async updateStatus(
    id: string,
    status: ShowStatus,
  ): Promise<ShowDraft | null> {
    try {
      const updateData: Record<string, unknown> = { status };

      if (status === "live") {
        updateData.started_at = new Date().toISOString();
      } else if (status === "ended") {
        updateData.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("shows")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data ? dbToShow(data) : null;
    } catch (error) {
      console.error("Error updating show status:", error);
      return null;
    }
  },

  async listByStatus(statuses: ShowStatus[]): Promise<ShowDraft[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("seller_id", user.id)
        .in("status", statuses)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToShow);
    } catch (error) {
      console.error("Error listing shows by status:", error);
      return [];
    }
  },

  async listUpcoming(): Promise<ShowDraft[]> {
    return this.listByStatus(["draft", "scheduled"]);
  },

  async listPast(): Promise<ShowDraft[]> {
    return this.listByStatus(["ended"]);
  },

  // List all live shows (for viewers)
  async listLiveShows(): Promise<ShowDraft[]> {
    try {
      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("status", "live")
        .order("started_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToShow);
    } catch (error) {
      console.error("Error listing live shows:", error);
      return [];
    }
  },

  // Subscribe to live shows updates
  subscribeToLiveShows(callback: (shows: ShowDraft[]) => void) {
    const subscription = supabase
      .channel("live_shows_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shows",
          filter: "status=eq.live",
        },
        async () => {
          const shows = await this.listLiveShows();
          callback(shows);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};
