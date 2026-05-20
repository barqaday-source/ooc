// ====================================================================
// useNotificationsCenter - إدارة جدول notifications + Realtime
// ====================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type AppNotification } from "@/lib/supabase";

export function useNotificationsCenter(userId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelId = useRef(`notif:${crypto.randomUUID()}`);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as AppNotification[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!userId) return;

    const ch = supabase
      .channel(`${channelId.current}:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => [n, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, refresh]);

  const unreadCount = items.filter((i) => !i.is_read).length;

  const markRead = useCallback(
    async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setItems((p) => p.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setItems((p) => p.map((i) => ({ ...i, is_read: true })));
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
  }, []);

  return { items, loading, unreadCount, refresh, markRead, markAllRead, remove };
}
