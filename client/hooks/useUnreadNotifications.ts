import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

/**
 * Shared hook that returns the unread notification count for the current user.
 * Polls every 30 seconds and refreshes on focus via the returned `refresh` function.
 */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch {
      // ignore network errors
    }
  }, [user]);

  useEffect(() => {
    refresh();

    // Poll every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { unreadCount, refresh };
}
