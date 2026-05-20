// ====================================================================
// useRealtimeMessages - رسائل غرفة + Realtime + admin tagging
// + دعم message_deletions (إخفاء من طرف واحد)
// + دعم رسائل صور وصوتيات (message_type/media_url/media_duration)
// ====================================================================

import { useEffect, useState, useCallback } from "react";
import { supabase, type Message, type Profile, type MessageType } from "@/lib/supabase";

const CACHE_PREFIX = "dardashati:msgs:";
const CACHE_LIMIT = 80;

function readCache(roomId: string): Message[] {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + roomId);
    if (!raw) return [];
    return JSON.parse(raw) as Message[];
  } catch { return []; }
}
function writeCache(roomId: string, msgs: Message[]) {
  try {
    const slice = msgs.slice(-CACHE_LIMIT);
    localStorage.setItem(CACHE_PREFIX + roomId, JSON.stringify(slice));
  } catch { /* quota */ }
}

interface SendOpts {
  content?: string;
  type?: MessageType;
  mediaUrl?: string;
  mediaDuration?: number;
}

export function useRealtimeMessages(roomId: string | null, currentUserId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  // قائمة الأدمنز للتمييز البصري
  useEffect(() => {
    supabase.from("user_roles").select("user_id").eq("role", "admin")
      .then(({ data }) => {
        const ids = new Set<string>(((data as { user_id: string }[]) ?? []).map(r => r.user_id));
        setAdminIds(ids);
      });
  }, []);

  const fetchHidden = useCallback(async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("message_deletions")
      .select("message_id")
      .eq("user_id", currentUserId);
    setHiddenIds(new Set(((data as { message_id: string }[]) ?? []).map(r => r.message_id)));
  }, [currentUserId]);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*, profile:profiles(*)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error || !data) {
      // فشل الشبكة: اعرض من الكاش
      const cached = readCache(roomId);
      if (cached.length) setMessages(cached);
      setLoading(false);
      return;
    }
    const msgs = ((data as Message[] | null) ?? []).map(m => ({
      ...m,
      authorIsAdmin: adminIds.has(m.user_id),
    }));
    setMessages(msgs);
    writeCache(roomId, msgs);
    setLoading(false);
  }, [roomId, adminIds]);

  useEffect(() => {
    if (!roomId) { setMessages([]); setLoading(false); return; }

    // اعرض الكاش فوراً قبل الجلب من الشبكة (لا انتظار)
    const cached = readCache(roomId);
    if (cached.length) { setMessages(cached); setLoading(false); }
    else setLoading(true);
    fetchMessages();
    fetchHidden();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: profileData } = await supabase
            .from("profiles").select("*").eq("id", newMsg.user_id).maybeSingle();
          setMessages((prev) => [
            ...prev,
            { ...newMsg, profile: profileData as Profile, authorIsAdmin: adminIds.has(newMsg.user_id) },
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const upd = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === upd.id ? { ...m, ...upd } : m)));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchMessages, fetchHidden, adminIds]);

  // حفظ نسخة محلية كل ما تغيّرت الرسائل (يعمل أوفلاين)
  useEffect(() => {
    if (!roomId || !messages.length) return;
    writeCache(roomId, messages);
  }, [roomId, messages]);

  // إرسال رسالة (نص أو وسائط)
  const sendMessage = useCallback(async (opts: SendOpts | string, userId: string) => {
    if (!roomId) return { error: new Error("invalid room") };
    const o: SendOpts = typeof opts === "string" ? { content: opts, type: "text" } : opts;
    const type: MessageType = o.type ?? "text";

    if (type === "text" && !(o.content ?? "").trim()) {
      return { error: new Error("empty") };
    }
    if (type !== "text" && !o.mediaUrl) {
      return { error: new Error("missing media") };
    }

    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: userId,
      content: (o.content ?? "").trim(),
      message_type: type,
      media_url: o.mediaUrl ?? null,
      media_duration: o.mediaDuration ?? null,
    });
    return { error };
  }, [roomId]);

  // حذف عندي فقط
  const hideForMe = useCallback(async (messageId: string) => {
    if (!currentUserId) return { error: new Error("no user") };
    const { error } = await supabase
      .from("message_deletions")
      .insert({ message_id: messageId, user_id: currentUserId });
    if (!error) setHiddenIds(prev => new Set(prev).add(messageId));
    return { error };
  }, [currentUserId]);

  // حذف للجميع
  const deleteForAll = useCallback(async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    return { error };
  }, []);

  // تعديل رسالة نصية (عبر RPC آمن يضبط edited_at)
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    const { error } = await supabase.rpc("edit_message", {
      _message_id: messageId,
      _new_content: newContent,
    });
    return { error };
  }, []);

  const visibleMessages = messages.filter(m => !hiddenIds.has(m.id));

  return {
    messages: visibleMessages,
    loading,
    sendMessage,
    hideForMe,
    deleteForAll,
    editMessage,
    refresh: fetchMessages,
  };
}
