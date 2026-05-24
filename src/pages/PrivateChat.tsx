// ====================================================================
// PrivateChat - محادثة خاصة مشفرة E2E + حضور + آخر ظهور
// ====================================================================

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { useRoomPresence } from "@/hooks/usePresence";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import UserAvatar from "@/components/UserAvatar";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoicePlayer from "@/components/VoicePlayer";
import TypingIndicator from "@/components/TypingIndicator";
import { uploadFile, compressImage } from "@/lib/upload";
import { ArrowRight, Send, Loader2, Trash2, EyeOff, X, Image as ImageIcon, Pencil, CheckCheck, Check, Reply, ZoomIn, Lock } from "lucide-react";
import { toast } from "sonner";
import { useReadReceipts } from "@/hooks/useReadReceipts";

type ReplyData = {
  id: string;
  name: string;
  preview: string;
  messageType: string;
};

type OtherUserProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  is_online?: boolean;
};

export default function PrivateChat() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [otherUser, setOtherUser] = useState<OtherUserProfile | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionMsgId, setActionMsgId] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyData | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { messages, loading, sendMessage, hideForMe, deleteForAll, editMessage } =
    useRealtimeMessages(roomId?? null, user?.id);
  useNotifications(roomId?? null);

  const { typingUsers, isUserOnline, setTyping } = useRoomPresence(
    roomId?? null,
    user?.id?? null,
    profile?.display_name || profile?.username || null,
  );

  const { markRead } = useUnreadCounts(user?.id?? null, roomId? [roomId] : []);
  const { isMessageRead } = useReadReceipts(roomId?? null, user?.id?? null);

  useEffect(() => {
    if (!roomId ||!user?.id) return;

    const initPrivateChat = async () => {
      try {
        // تحقق أن الغرفة خاصة
        const { data: roomData, error: roomErr } = await supabase
         .from("rooms")
         .select("id, type")
         .eq("id", roomId)
         .eq("type", "private")
         .maybeSingle();

        if (roomErr ||!roomData) {
          toast.error("المحادثة غير موجودة");
          navigate("/chat");
          return;
        }

        // جيب الطرف الثاني
        const { data: members } = await supabase
         .from("room_members")
         .select("user_id")
         .eq("room_id", roomId)
         .neq("user_id", user.id)
         .maybeSingle();

        if (members?.user_id) {
          const { data: userData } = await supabase
           .from("profiles")
           .select("id, display_name, username, avatar_url, last_seen")
           .eq("id", members.user_id)
           .maybeSingle();

          if (userData) {
            setOtherUser({
             ...userData,
              is_online: isUserOnline(userData.id)
            });
          }
        }
      } catch (err) {
        console.error('PrivateChat init error:', err);
      }
    };

    initPrivateChat();
  }, [roomId, user?.id, isUserOnline, navigate]);

  // تحديث حالة الاتصال للطرف الثاني
  useEffect(() => {
    if (otherUser) {
      setOtherUser(prev => prev? {...prev, is_online: isUserOnline(prev.id) } : null);
    }
  }, [isUserOnline, otherUser?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (roomId && messages.length > 0) markRead(roomId);
  }, [messages, roomId, markRead]);

  const scrollToMessage = (msgId: string) => {
    const element = messageRefs.current[msgId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() ||!user) return;
    setSending(true);
    const { error } = await sendMessage({
      content: input,
      type: "text",
      replyToId: replyTo?.id || null
    }, user.id);
    setSending(false);
    if (error) toast.error("فشل الإرسال", { description: error.message });
    else { setInput(""); setTyping(false); setReplyTo(null); }
  };

  const handleImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file ||!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة فقط");
      return;
    }
    setSending(true);
    try {
      const compressed = await compressImage(file);
      const { url, error } = await uploadFile("chat-media", user.id, compressed, "jpg");
      if (error ||!url) throw error || new Error("فشل الرفع");
      const { error: sendErr } = await sendMessage(
        { type: "image", mediaUrl: url, content: "", replyToId: replyTo?.id || null },
        user.id,
      );
      if (sendErr) throw sendErr;
      setReplyTo(null);
    } catch (err) {
      toast.error("فشل رفع الصورة", { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const handleVoiceSend = async (blob: Blob, durationSec: number) => {
    if (!user) return;
    try {
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      const { url, error } = await uploadFile("voice-notes", user.id, blob, ext);
      if (error ||!url) throw error || new Error("فشل الرفع");
      const { error: sendErr } = await sendMessage(
        { type: "voice", mediaUrl: url, mediaDuration: durationSec, content: "", replyToId: replyTo?.id || null },
        user.id,
      );
      if (sendErr) throw sendErr;
      setReplyTo(null);
    } catch (err) {
      toast.error("فشل إرسال الصوت", { description: (err as Error).message });
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.length > 0) setTyping(true);
    else setTyping(false);
  };

  const activeMsg = messages.find(m => m.id === actionMsgId);
  const typingNames = typingUsers.map(t => t.username);

  const getRepliedMessage = (replyToId: string | null) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId) || null;
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "غير متصل";
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "نشط الآن";
    if (minutes < 60) return `آخر ظهور قبل ${minutes} د`;
    if (hours < 24) return `آخر ظهور قبل ${hours} س`;
    return `آخر ظهور قبل ${days} ي`;
  };

  if (!roomId) return null;

  return (
    <div className="min-h-screen bg-app flex flex-col max-w-[500px] mx-auto">
      <header className="h-20 mx-3 mt-3 px-4 flex items-center gap-3 glass-thick rounded-3xl safe-top sticky top-3 z-40 shadow-glassy">
        <button onClick={() => navigate("/chat")} className="p-2 -mr-2"><ArrowRight className="w-5 h-5" /></button>

        {otherUser? (
          <>
            <button
              onClick={() => navigate(`/u/${otherUser.id}`)}
              className="shrink-0 active:scale-95"
            >
              <UserAvatar
                src={otherUser.avatar_url}
                name={otherUser.display_name || otherUser.username}
                size="lg"
                online={otherUser.is_online}
              />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate flex items-center gap-2">
                <Lock className="w-4 h-4 text-success" strokeWidth={2.5} />
                {otherUser.display_name || otherUser.username}
              </h2>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                {otherUser.is_online? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block animate-pulse" />
                    نشط الآن
                  </>
                ) : (
                  formatLastSeen(otherUser.last_seen)
                )}
              </p>
    </
