import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Listens for new rows in the `notifications` table via Supabase Realtime.
 * Shows an in-app alert when a notification arrives.
 * Works on emulators, physical devices, and web — no push token needed.
 */
export function useInAppNotifications() {
  const { user } = useAuth();
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      console.log("[InAppNotif] No user, skipping subscription");
      return;
    }

    console.log(
      `[InAppNotif] Subscribing to notifications for user ${user.id}`,
    );

    const channel = supabase
      .channel("in-app-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(
            "[InAppNotif] Received payload:",
            JSON.stringify(payload),
          );

          const notif = payload.new as {
            id: string;
            title: string;
            body: string;
            type: string;
          };

          // Deduplicate — realtime can fire twice
          if (shownIds.current.has(notif.id)) return;
          shownIds.current.add(notif.id);

          console.log(`[InAppNotif] Showing alert: ${notif.title}`);

          // Show in-app alert
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
        },
      )
      .subscribe((status, err) => {
        console.log(`[InAppNotif] Subscription status: ${status}`);
        if (err) {
          console.error("[InAppNotif] Subscription error:", err);
        }
      });

    return () => {
      console.log("[InAppNotif] Unsubscribing");
      supabase.removeChannel(channel);
    };
  }, [user]);
}
