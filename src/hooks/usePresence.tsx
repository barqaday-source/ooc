// ====================================================================
// usePresence - حضور (online) + يكتب الآن (typing) لكل غرفة
// ====================================================================
// يعتمد على Supabase Realtime Presence (بدون أي جدول).
// كل غرفة لها قناة منفصلة باسم: presence:room:<roomId>
// ====================================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  user_id: string;
  username: string;
  typing: boolean;
  online_at: string;
}

export function useRoomPresence(
  roomId: string | null,
  userId: string | null,
  username: string | null,
) {
  const [online, setOnline] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`presence:room:${roomId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const flat: Record<string, PresenceState> = {};
        Object.keys(state).forEach((key) => {
          const arr = state[key];
          if (arr && arr[0]) flat[key] = arr[0];
        });
        setOnline(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            username: username || "user",
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, userId, username]);

  // إعلام بأن المستخدم يكتب (تنطفئ تلقائياً بعد 2.5 ثانية)
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch || !userId) return;
      await ch.track({
        user_id: userId,
        username: username || "user",
        typing: isTyping,
        online_at: new Date().toISOString(),
      });
      if (isTyping) {
        if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(() => {
          ch.track({
            user_id: userId,
            username: username || "user",
            typing: false,
            online_at: new Date().toISOString(),
          });
        }, 2500);
      }
    },
    [userId, username],
  );

  const onlineCount = Object.keys(online).length;
  const typingUsers = Object.values(online).filter((p) => p.typing && p.user_id !== userId);
  const isUserOnline = (id: string) => !!online[id];

  return { online, onlineCount, typingUsers, isUserOnline, setTyping };
}

// ====================================================================
// useGlobalPresence - تتبع آخر ظهور للمستخدم على مستوى التطبيق
// ====================================================================
export function useGlobalPresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    // تحديث last_seen_at كل دقيقة + عند المغادرة
    const update = () =>
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);

    update();
    const interval = window.setInterval(update, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", update);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", update);
    };
  }, [userId]);
}
