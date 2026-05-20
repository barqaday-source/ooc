// ====================================================================
// useUnreadCounts - عدد الرسائل غير المقروءة في كل غرفة
// ====================================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadCounts(userId: string | null, roomIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!userId || roomIds.length === 0) {
      setCounts({});
      return;
    }

    // 1) آخر قراءة لكل غرفة
    const { data: reads } = await supabase
      .from("room_reads")
      .select("room_id, last_read_at")
      .eq("user_id", userId)
      .in("room_id", roomIds);
    const readMap = new Map<string, string>(
      ((reads as { room_id: string; last_read_at: string }[]) ?? []).map((r) => [
        r.room_id,
        r.last_read_at,
      ]),
    );

    // 2) عدّ الرسائل الأحدث من آخر قراءة (وليست رسائل المستخدم نفسه)
    const result: Record<string, number> = {};
    await Promise.all(
      roomIds.map(async (rid) => {
        const since = readMap.get(rid) ?? "1970-01-01T00:00:00Z";
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", rid)
          .neq("user_id", userId)
          .gt("created_at", since);
        result[rid] = count ?? 0;
      }),
    );
    setCounts(result);
  }, [userId, roomIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
    if (!userId) return;

    // اشتراك realtime لتحديث العدد عند وصول رسالة جديدة
    const ch = supabase
      .channel("unread-counts-watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { room_id: string; user_id: string };
          if (m.user_id === userId) return;
          if (!roomIds.includes(m.room_id)) return;
          setCounts((prev) => ({ ...prev, [m.room_id]: (prev[m.room_id] ?? 0) + 1 }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh, userId, roomIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // تعليم الغرفة كمقروءة
  const markRead = useCallback(
    async (roomId: string) => {
      if (!userId) return;
      const now = new Date().toISOString();
      // upsert
      await supabase
        .from("room_reads")
        .upsert({ user_id: userId, room_id: roomId, last_read_at: now }, { onConflict: "room_id,user_id" });
      setCounts((prev) => ({ ...prev, [roomId]: 0 }));
    },
    [userId],
  );

  return { counts, refresh, markRead };
}
