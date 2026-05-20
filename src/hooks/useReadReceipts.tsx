// ====================================================================
// useReadReceipts - علامات تسليم/قراءة (✓ تم الإرسال، ✓✓ تمت القراءة)
// ====================================================================
// الفكرة: نقرأ أقصى last_read_at من جدول room_reads لباقي الأعضاء
// (غير المرسل الحالي). إذا كان أقصى وقت قراءة >= وقت إنشاء الرسالة
// نعتبرها مقروءة (✓✓)، وإلا فهي مسلَّمة فقط (✓).
// ====================================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useReadReceipts(roomId: string | null, currentUserId: string | null) {
  const [othersLastRead, setOthersLastRead] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!roomId || !currentUserId) return;
    const { data } = await supabase
      .from("room_reads")
      .select("user_id, last_read_at")
      .eq("room_id", roomId)
      .neq("user_id", currentUserId)
      .order("last_read_at", { ascending: false })
      .limit(1);
    const top = (data as { last_read_at: string }[] | null)?.[0];
    setOthersLastRead(top?.last_read_at ?? null);
  }, [roomId, currentUserId]);

  useEffect(() => {
    refresh();
    if (!roomId) return;
    const ch = supabase
      .channel(`room-reads:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_reads", filter: `room_id=eq.${roomId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, refresh]);

  const isMessageRead = useCallback(
    (createdAt: string) => {
      if (!othersLastRead) return false;
      return new Date(othersLastRead).getTime() >= new Date(createdAt).getTime();
    },
    [othersLastRead],
  );

  return { isMessageRead, othersLastRead };
}