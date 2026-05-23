// ====================================================================
// useUnreadCounts - عدد الرسائل غير المقروءة في كل غرفة
// ====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadCounts(userId: string | null, roomIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  // نثبت الـ deps عشان ما يعيد الـ refresh على كل render
  const roomIdsKey = useMemo(() => roomIds.join(","), [roomIds]);

  const refresh = useCallback(async () => {
    if (!userId || roomIds.length === 0) {
      setCounts({});
      return;
    }

    // 1) آخر قراءة لكل غرفة
    const { data: reads, error: readsError } = await supabase
     .from("room_reads")
     .select("room_id, last_read_at")
     .eq("user_id", userId)
     .in("room_id", roomIds);

    if (readsError) {
      console.error("Error fetching room_reads:", readsError);
      return;
    }

    const readMap = new Map<string, string>(
      ((reads as { room_id: string; last_read_at: string }[])?? []).map((r) => [
        r.room_id,
        r.last_read_at,
      ])
    );

    // 2) عدّ الرسائل الأحدث من آخر قراءة (وليست رسائل المستخدم نفسه)
    const result: Record<string, number> = {};
    await Promise.all(
      roomIds.map(async (rid) => {
        const since = readMap.get(rid)?? "1970-01-01T00:00:00Z";
        const { count, error } = await supabase
         .from("messages")
         .select("id", { count: "exact", head: true })
         .eq("room_id", rid)
         .neq("user_id", userId) // مهم: لا تحسب رسائلك انت
         .gt("created_at", since);

        if (error) {
          console.error(`Error counting messages for room ${rid}:`, error);
          result[rid] = 0;
          return;
        }
        result[rid] = count?? 0;
      })
    );
    setCounts(result);
  }, [userId, roomIdsKey]);

  useEffect(() => {
    refresh();
    if (!userId) return;

    // اشتراك realtime لتحديث العداد عند وصول رسالة جديدة
    const ch = supabase
     .channel(`unread-counts-watch-${userId}`)
     .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as {
            room_id: string;
            user_id: string;
            created_at: string;
          };

          // 1. تجاهل لو الرسالة منك انت - هذا يمنع الوميض
          if (m.user_id === userId) return;

          // 2. تجاهل لو الغرفة مش ضمن الغرف اللي نتابعها
          if (!roomIds.includes(m.room_id)) return;

          setCounts((prev) => ({
           ...prev,
            [m.room_id]: (prev[m.room_id]?? 0) + 1,
          }));
        }
      )
     .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh, userId, roomIdsKey, roomIds]);

  // تعليم الغرفة كمقروءة + تحديث مؤشر is_read للطرف الثاني
  const markRead = useCallback(
    async (roomId: string) => {
      if (!userId) return;
      const now = new Date().toISOString();

      // 1. حدّث جدول room_reads عشان جهازك يعرف انك قريت
      const { error: upsertError } = await supabase
       .from("room_reads")
       .upsert(
          { user_id: userId, room_id: roomId, last_read_at: now },
          { onConflict: "room_id,user_id" }
        );

      if (upsertError) {
        console.error("Error upserting room_reads:", upsertError);
        return;
      }

      // 2. حدّث كل رسائل الطرف الثاني في الغرفة الى is_read = true
      // هذا اللي يخلي الصحين تظهر زرقاء عند المرسل
      const { error: updateError } = await supabase
       .from("messages")
       .update({ is_read: true })
       .eq("room_id", roomId)
       .neq("user_id", userId)
       .eq("is_read", false);

      if (updateError) {
        console.error("Error updating messages is_read:", updateError);
      }

      // 3. صفّر العداد محلياً مباشرة بدون انتظار refresh
      setCounts((prev) => ({...prev, [roomId]: 0 }));
    },
    [userId]
  );

  return { counts, refresh, markRead };
}