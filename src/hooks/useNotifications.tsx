// ====================================================================
// useNotifications - إشعارات الرسائل الجديدة (toast فوري)
// ====================================================================
// يستمع لكل الرسائل الجديدة في كل الغرف، ويُظهر toast إذا
// لم تكن الغرفة هي الغرفة المفتوحة حالياً + ليست رسالتك أنت.
// ====================================================================

import { useEffect } from "react";
import { supabase, type Message } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useNotifications(activeRoomId: string | null) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as Message;
          // تجاهل: رسائلي + الغرفة المفتوحة
          if (msg.user_id === user.id) return;
          if (msg.room_id === activeRoomId) return;

          // جلب اسم المرسل + اسم الغرفة
          const [{ data: profile }, { data: room }] = await Promise.all([
            supabase.from("profiles").select("display_name, username").eq("id", msg.user_id).maybeSingle(),
            supabase.from("rooms").select("name").eq("id", msg.room_id).maybeSingle(),
          ]);

          const sender = profile?.display_name || profile?.username || "مستخدم";
          const roomName = room?.name || "غرفة";

          toast(`💬 ${sender} في ${roomName}`, {
            description: msg.content.slice(0, 80),
            duration: 4000,
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeRoomId]);
}
