import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Polls the `notifications` table for unread notifications and shows
 * an in-app alert. Simple, reliable, no Supabase Realtime or SSE needed.
 */
export function useInAppNotifications() {
  const { user } = useAuth();
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      console.log("[InAppNotif] No user, skipping poll");
      return;
    }

    console.log(`[InAppNotif] Starting poll for user ${user.id}`);

    let active = true;

    async function poll() {
      if (!active) return;

      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("id, title, body, type")
          .eq("user_id", user!.id)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          console.warn("[InAppNotif] Poll error:", error.message);
          return;
        }

        if (data && data.length > 0) {
          for (const notif of data) {
            if (shownIds.current.has(notif.id)) continue;
            shownIds.current.add(notif.id);

            console.log(`[InAppNotif] New notification: ${notif.title}`);

            if (Platform.OS === "web") {
              window.alert(`${notif.title}\n${notif.body}`);
            } else {
              Alert.alert(notif.title, notif.body);
            }

            // Mark as read
            supabase
              .from("notifications")
              .update({ read: true })
              .eq("id", notif.id)
              .then(() => {});
          }
        }
      } catch {
        // ignore network errors during poll
      }
    }

    // Initial poll
    poll();

    // Poll every 5 seconds
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      console.log("[InAppNotif] Stopping poll");
      active = false;
      clearInterval(interval);
    };
  }, [user]);
}
