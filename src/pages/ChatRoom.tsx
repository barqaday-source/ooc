// ====================================================================
// PublicChatRoom - غرفة محادثة عامة Realtime + وسائط + حضور
// ====================================================================

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, type Room } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { useRoomPresence } from "@/hooks/usePresence";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import AdminBadge from "@/components/AdminBadge";
import UserAvatar from "@/components/UserAvatar";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoicePlayer from "@/components/VoicePlayer";
import TypingIndicator from "@/components/TypingIndicator";
import { uploadFile, compressImage } from "@/lib/upload";
import { ArrowRight, Send, Loader2, Settings2, Users, Trash2, EyeOff, X, Image as ImageIcon, Pencil, CheckCheck, Check, Reply, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { useReadReceipts } from "@/hooks/useReadReceipts";

type ReplyData = {
  id: string;
  name: string;
  preview: string;
  messageType: string;
};

export default function PublicChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
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

  const { onlineCount, typingUsers, isUserOnline, setTyping } = useRoomPresence(
    roomId?? null,
    user?.id?? null,
    profile?.display_name || profile?.username || null,
  );

  const { markRead } = useUnreadCounts(user?.id?? null, roomId? [roomId] : []);
  const { isMessageRead } = useReadReceipts(roomId?? null, user?.id?? null);

  useEffect(() => {
    if (!roomId ||!user?.id) return;

    const joinRoom = async () => {
      try {
        const { data: existing } = await supabase
         .from("room_members")
         .select("id")
         .eq("room_id", roomId)
         .eq("user_id", user.id)
         .maybeSingle();

        if (!existing) {
          const { error: joinErr } = await supabase.from("room_members").insert({
            room_id: roomId,
            user_id: user.id,
            role: 'member'
          });
          if (joinErr) console.error('Join room error:', joinErr);
        }

        const { data: roomData, error: roomErr } = await supabase
         .from("rooms")
         .select("*")
         .eq("id", roomId)
         .eq("type", "public")
         .maybeSingle();

        if (roomErr ||!roomData) {
          console.error('Room load error:', roomErr);
          toast.error("الغرفة غير موجودة أو ليست عامة");
          navigate("/chat");
          return;
        }

        setRoom(roomData as Room);
      } catch (err) {
        console.error('PublicChatRoom init error:', err);
      }
    };

    joinRoom();
  }, [roomId, user?.id, navigate]);

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

  const isOwner = user?.id === room?.owner_id;
  const isStaff = isOwner || isAdmin;
  const activeMsg = messages.find(m => m.id === actionMsgId);
  const typingNames = typingUsers.map(t => t.username);

  const getRepliedMessage = (replyToId: string | null) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId) || null;
  };

  if (!roomId) return null;

  return (
    <div className="min-h-screen bg-app flex flex-col max-w-[500px] mx-auto">
      <header className="h-20 mx-3 mt-3 px-4 flex items-center gap-3 glass-thick rounded-3xl safe-top sticky top-3 z-40 shadow-glassy">
        <button onClick={() => navigate("/chat")} className="p-2 -mr-2"><ArrowRight className="w-5 h-5" /></button>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg truncate flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" strokeWidth={2.5} />
            {room?.name || "..."}
          </h2>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            {room?.status === "pending"? (
              "بانتظار اعتماد المدير"
            ) : room?.is_closed? (
              "مغلقة مؤقتاً"
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                {onlineCount} متصل الآن
              </>
            )}
          </p>
        </div>
        {isOwner && (
          <>
            <button onClick={() => navigate(`/rooms/${roomId}/members`)} className="p-2"><Users className="w-5 h-5" /></button>
            <button onClick={() => navigate(`/rooms/${roomId}/edit`)} className="p-2"><Settings2 className="w-5 h-5" /></button>
          </>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            كن أول من يكتب رسالة 👋
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.user_id === user?.id;
            const authorIsAdmin =!!msg.authorIsAdmin;
            const online = isUserOnline(msg.user_id);
            const repliedMsg = getRepliedMessage(msg.reply_to_id);
            const isHighlighted = highlightedMsgId === msg.id;

            return (
              <div
                key={msg.id}
                ref={el => messageRefs.current[msg.id] = el}
                className={`flex gap-2 anim-fade-in ${mine? "flex-row-reverse" : ""} ${isHighlighted? "animate-pulse" : ""}`}
              >
                <button
                  onClick={() =>!mine && navigate(`/u/${msg.user_id}`)}
                  className="shrink-0 active:scale-95"
                  aria-label="عرض الملف الشخصي"
                  disabled={mine}
                >
                  <UserAvatar
                    src={msg.profile?.avatar_url}
                    name={msg.profile?.display_name || msg.profile?.username}
                    size="sm"
                    online={online &&!mine}
                  />
                </button>
                <div className={`max-w-[75%] ${mine? "items-end" : "items-start"} flex flex-col`}>
                  {!mine && (
                    <span className="text-xs text-muted-foreground mb-1 px-1 inline-flex items-center gap-1">
                      {msg.profile?.display_name || msg.profile?.username}
                      {authorIsAdmin && <AdminBadge size="xs" />}
                    </span>
                  )}

                  {repliedMsg && (
                    <button
                      onClick={() => scrollToMessage(repliedMsg.id)}
                      className={`mb-1 px-3 py-2 rounded-2xl text-xs max-w-full opacity-40 hover:opacity-60 transition text-right ${
                        mine? "rounded-tr-sm" : "rounded-tl-sm"
                      } bg-foreground/10 text-foreground active:scale-[0.98]`}
                    >
                      <p className="font-bold mb-0.5">
                        {repliedMsg.profile?.display_name || repliedMsg.profile?.username}
                      </p>
                      <p className="truncate">
                        {repliedMsg.message_type === "text"
                         ? repliedMsg.content
                          : repliedMsg.message_type === "image"? "📷 صورة" : "🎙️ رسالة صوتية"}
                      </p>
                    </button>
                  )}

                  <div
                    onClick={() => setActionMsgId(msg.id)}
                    className={`text-sm break-words text-right transition active:scale-[0.98] cursor-pointer ${
                      msg.message_type === "image"
                       ? "p-0 relative group"
                        : msg.message_type === "voice"
                         ? "p-0"
                          : authorIsAdmin &&!mine
                           ? "px-3 py-2 bg-foreground/5 border border-foreground/20 rounded-2xl rounded-tl-none"
                            : mine
                             ? "px-3 py-2 bg-foreground text-background rounded-2xl rounded-tr-none"
                              : "px-3 py-2 glass-card rounded-2xl rounded-tl-none shadow-none"
                    } ${isHighlighted? "ring-2 ring-primary ring-offset-2" : ""}`}
                  >
                    {msg.message_type === "image" && msg.media_url? (
                      <div className="relative">
                        <img
                          src={msg.media_url}
                          alt=""
                          loading="lazy"
                          className="max-w-[240px] max-h-[300px] rounded-xl"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewImg(msg.media_url!); }}
                          className="absolute top-2 left-2 p-1.5 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                          aria-label="تكبير الصورة"
                        >
                          <ZoomIn className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : msg.message_type === "voice" && msg.media_url? (
                      <div className="px-3 py-2 rounded-2xl bg-transparent">
                        <VoicePlayer src={msg.media_url} duration={msg.media_duration} mine={mine} />
                      </div>
                    ) : (
                      <span>
                        {msg.content}
                        {msg.edited_at && (
                          <span className="opacity-60 text-xs mr-1">(معدّلة)</span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground/60 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    {mine && (
                      isMessageRead(msg.created_at)
                       ? <CheckCheck className="inline-block w-3.5 h-3.5 mr-1 text-sky-500" strokeWidth={2.2} />
                        : <Check className="inline-block w-3.5 h-3.5 mr-1 text-muted-foreground" strokeWidth={2.2} />
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <TypingIndicator names={typingNames} />
      </div>

      {actionMsgId && activeMsg && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setActionMsgId(null)} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-auto min-w-[200px] bg-card rounded-2xl p-2 z-50 anim-slide-up shadow-2xl border border-border">
            <div className="space-y-1">
              {activeMsg.message_type === "image" && activeMsg.media_url && (
                <button
                  onClick={() => {
                    setPreviewImg(activeMsg.media_url!);
                    setActionMsgId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl hover:bg-background/70 font-medium flex items-center gap-3 text-sm transition"
                >
                  <ZoomIn className="w-4 h-4" /> عرض الصورة
                </button>
              )}

              <button
                onClick={() => {
                  const name = activeMsg.profile?.display_name || activeMsg.profile?.username || "—";
                  const preview = activeMsg.message_type === "text"
                   ? activeMsg.content.slice(0, 60)
                    : activeMsg.message_type === "image"? "📷 صورة" : "🎙️ صوت";
                  setReplyTo({ id: activeMsg.id, name, preview, messageType: activeMsg.message_type });
                  setActionMsgId(null);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="w-full px-4 py-2.5 rounded-xl hover:bg-background/70 font-medium flex items-center gap-3 text-sm transition"
              >
                <Reply className="w-4 h-4" /> رد
              </button>

              <button
                onClick={async () => {
                  const { error } = await hideForMe(activeMsg.id);
                  if (error) toast.error("فشل", { description: error.message });
                  else toast.success("أُخفيت من عندك");
                  setActionMsgId(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl hover:bg-background/70 font-medium flex items-center gap-3 text-sm transition"
              >
                <EyeOff className="w-4 h-4" /> حذف مني
              </button>

              {(activeMsg.user_id === user?.id || isStaff) && (
                <button
                  onClick={async () => {
                    if (!confirm("حذف الرسالة من الجميع؟")) return;
                    const { error } = await deleteForAll(activeMsg.id);
                    if (error) toast.error("فشل", { description: error.message });
                    else toast.success("حُذفت من الجميع");
                    setActionMsgId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive font-medium flex items-center gap-3 text-sm transition"
                >
                  <Trash2 className="w-4 h-4" /> حذف للجميع
                </button>
              )}

              {activeMsg.user_id === user?.id && activeMsg.message_type === "text" && (
                <button
                  onClick={() => {
                    setEditingId(activeMsg.id);
                    setEditingText(activeMsg.content);
                    setActionMsgId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl hover:bg-background/70 font-medium flex items-center gap-3 text-sm transition"
                >
                  <Pencil className="w-4 h-4" /> تعديل
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {editingId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setEditingId(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] glass-thick rounded-t-3xl p-4 z-50 anim-slide-up safe-bottom space-y-3 border-t border-white/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">تعديل الرسالة</p>
              <button onClick={() => setEditingId(null)} className="p-1"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full p-3 rounded-2xl bg-background/70 border border-white/50 outline-none text-sm resize-none"
              autoFocus
            />
            <button
              onClick={async () => {
                if (!editingText.trim()) return;
                const { error } = await editMessage(editingId, editingText.trim());
                if (error) toast.error("فشل التعديل", { description: error.message });
                else toast.success("تم التعديل");
                setEditingId(null);
              }}
              className="w-full h-12 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--app-btn)" }}
            >
              <Check className="w-4 h-4" /> حفظ التعديل
            </button>
          </div>
        </>
      )}

      {previewImg && (
        <div
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute top-4 left-4 p-2 bg-white/10 rounded-xl text-white"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={previewImg} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}

      {room?.status === "pending"? (
        <div className="p-4 text-center text-sm text-muted-foreground bg-card border-t border-border/50 safe-bottom">
          ⏳ الغرفة بانتظار اعتماد المدير
        </div>
      ) : room?.is_closed? (
        <div className="p-4 text-center text-sm text-muted-foreground bg-card border-t border-border/50 safe-bottom">
          🔒 الغرفة مغلقة مؤقتاً
        </div>
      ) : (
        <div className="sticky bottom-0 safe-bottom bg-transparent">
          {replyTo && (
            <div className="mx-3 mb-1 px-3 py-2 rounded-2xl glass-thick border border-white/50 flex items-center gap-2 anim-slide-up">
              <Reply className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground/80">{replyTo.name}</p>
                <p className="text-xs text-foreground/60 truncate">{replyTo.preview}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1" aria-label="إلغاء الرد">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={handleSend}
            className="px-3 pt-2 pb-3 flex gap-2 items-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImagePick}
            />

            {input.trim()? (
              <button
                type="submit"
                disabled={sending}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95 transition shadow-md"
                style={{ backgroundColor: "var(--app-btn)" }}
                aria-label="إرسال"
              >
                {sending? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            ) : (
              <VoiceRecorder onSend={handleVoiceSend} disabled={sending} />
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-12 h-12 rounded-full glass-thick border border-white/60 flex items-center justify-center disabled:opacity-50 active:scale-95 transition shrink-0"
              aria-label="إرفاق صورة"
            >
              <ImageIcon className="w-5 h-5 text-foreground/80" strokeWidth={1.6} />
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="اكتب رسالة..."
              disabled={sending ||!profile}
              dir="rtl"
              className="flex-1 h-12 px-5 rounded-full bg-primary/50 border-white/60 placeholder:text-foreground/40 focus:border-white outline-none text-sm transition min-w-0 text-right"
            />
          </form>
        </div>
      )}
    </div>
  );
    }
