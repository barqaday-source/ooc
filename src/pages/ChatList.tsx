// ====================================================================
// ChatList - قسم المحادثات الخاصة فقط (DMs)
// يعرض قائمة المحادثات بآخر رسالة + شارة عدّاد رسائل غير مقروءة + حذف المحادثة
// ====================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Profile, type Message, type Room } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import AppShell from "@/components/AppShell";
import UserAvatar from "@/components/UserAvatar";
import { Loader2, MessageCircle, Search, Users, Trash2 } from "lucide-react";
import { toast } from "sonner"; // تأكد انك مركب sonner أو استبدلها بـ alert

interface DmRow {
  room: Room;
  other: Profile;
  lastMessage: Message | null;
}

// استخراج معرّف الطرف الآخر من dm_key الشكل: dm:smaller:larger
function otherIdFromKey(dmKey: string | null | undefined, me: string): string | null {
  if (!dmKey) return null;
  const parts = dmKey.split(":");
  if (parts.length < 3) return null;
  const [, a, b] = parts;
  return a === me? b : a;
}

export default function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<DmRow[]>([]);
  const [activeUsers, setActiveUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      // 1) كل غرف الـ DM التي يكون المستخدم طرفًا فيها
      const { data: dmRooms } = await supabase
       .from("rooms")
       .select("*")
       .eq("is_dm", true)
       .ilike("dm_key", `%${user.id}%`);

      const dms = (dmRooms as Room[])?? [];
      const otherIds = Array.from(new Set(
        dms.map((r) => otherIdFromKey(r.dm_key, user.id)).filter(Boolean) as string[]
      ));

      // 2) ملفات الطرف الآخر + آخر رسالة لكل غرفة
      const [profilesRes, lastMsgRes, onlineRes] = await Promise.all([
        otherIds.length
         ? supabase.from("profiles").select("*").in("id", otherIds)
          : Promise.resolve({ data: [] as Profile[] }),
        dms.length
         ? supabase
             .from("messages")
             .select("*")
             .in("room_id", dms.map((r) => r.id))
             .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as Message[] }),
        supabase
         .from("profiles")
         .select("*")
         .gte("last_seen_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
         .neq("id", user.id)
         .order("last_seen_at", { ascending: false })
         .limit(20),
      ]);

      const profMap = new Map(((profilesRes.data as Profile[])?? []).map((p) => [p.id, p]));
      const lastMap = new Map<string, Message>();
      for (const m of ((lastMsgRes.data as Message[])?? [])) {
        if (!lastMap.has(m.room_id)) lastMap.set(m.room_id, m);
      }

      const built: DmRow[] = dms
       .map((r) => {
          const oid = otherIdFromKey(r.dm_key, user.id);
          const other = oid? profMap.get(oid) : undefined;
          if (!other) return null;
          return { room: r, other, lastMessage: lastMap.get(r.id)?? null };
        })
       .filter(Boolean) as DmRow[];

      // ترتيب حسب آخر رسالة (أحدث للأعلى) ثم تاريخ إنشاء الغرفة
      built.sort((a, b) => {
        const at = a.lastMessage?.created_at?? a.room.created_at;
        const bt = b.lastMessage?.created_at?? b.room.created_at;
        return bt.localeCompare(at);
      });

      setRows(built);
      setActiveUsers((onlineRes.data as Profile[])?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const roomIds = useMemo(() => rows.map((r) => r.room.id), [rows]);
  const { counts } = useUnreadCounts(user?.id?? null, roomIds);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (r.other.display_name || "").toLowerCase().includes(q) ||
      r.other.username.toLowerCase().includes(q)
    );
  });

  const isOnline = (id: string) => activeUsers.some((p) => p.id === id);

  const previewOf = (m: Message | null) => {
    if (!m) return "ابدأ المحادثة الآن";
    if (m.message_type === "image") return "📷 صورة";
    if (m.message_type === "voice") return "🎙️ رسالة صوتية";
    return m.content.slice(0, 60);
  };

  // دالة حذف المحادثة بالكامل
  const handleDeleteConversation = async (e: React.MouseEvent, roomId: string, otherName: string) => {
    e.stopPropagation(); // منع فتح المحادثة عند الضغط على زر الحذف

    if (!confirm(`هل أنت متأكد من حذف محادثتك مع ${otherName} بالكامل؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    setDeletingId(roomId);

    try {
      // 1. حذف جميع الرسائل في الغرفة
      const { error: msgError } = await supabase
       .from("messages")
       .delete()
       .eq("room_id", roomId);

      if (msgError) throw msgError;

      // 2. حذف الغرفة نفسها - اختياري. لو تبغى تحتفظ بالغرفة احذف السطرين الجاية
      const { error: roomError } = await supabase
       .from("rooms")
       .delete()
       .eq("id", roomId);

      if (roomError) throw roomError;

      // 3. تحديث الواجهة فوراً
      setRows(prev => prev.filter(r => r.room.id!== roomId));
      toast.success("تم حذف المحادثة بنجاح");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("حدث خطأ أثناء الحذف. تأكد من صلاحيات RLS");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <div className="pt-1 anim-fade-in">
        <section className="flex items-center justify-between mb-3 px-4">
          <h1 className="text-3xl font-black leading-tight">الرسائل</h1>
          <button
            onClick={() => navigate("/friends")}
            className="w-11 h-11 rounded-full glass-thick flex items-center justify-center shadow-glassy active:scale-95 transition"
            aria-label="الأصدقاء"
          >
            <Users className="w-5 h-5" />
          </button>
        </section>

        {/* النشطون الآن - دائرة قابلة للضغط تفتح صفحة المستخدم */}
        <section className="mb-2">
          <div className="px-4 flex gap-4 overflow-x-auto pb-3 snap-x">
            {activeUsers.length === 0? (
              <div className="glass rounded-[2rem] px-5 py-4 text-xs text-muted-foreground min-w-full text-center">
                لا يوجد مستخدمون نشطون الآن
              </div>
            ) : activeUsers.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/u/${p.id}`)}
                className="snap-start shrink-0 flex flex-col items-center gap-2 active:scale-95 transition"
              >
                <div className="relative rounded-full p-1 glass-thick anim-scale-in">
                  <UserAvatar src={p.avatar_url} name={p.display_name || p.username} size="lg" online ring />
                </div>
                <span className="text-[11px] font-semibold max-w-16 truncate">{p.display_name || p.username}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-t-[2.5rem] p-5 shadow-glassy min-h-[520px]">
          <div className="h-12 rounded-[1.35rem] bg-background/70 border border-border flex items-center gap-2 px-4 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الرسائل..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {loading? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0? (
            <div className="text-center py-16">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">لا توجد محادثات بعد</p>
              <button onClick={() => navigate("/friends")} className="mt-4 text-sm font-semibold text-foreground underline">
                ابدأ محادثة مع صديق
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((r) => {
                const unread = counts[r.room.id]?? 0;
                const lm = r.lastMessage;
                const isDeleting = deletingId === r.room.id;

                return (
                  <div
                    key={r.room.id}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-[1.5rem] hover:bg-background/40 transition text-right group relative ${
                      isDeleting? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {/* الأفاتار يفتح صفحة المستخدم */}
                    <button
                      onClick={() => navigate(`/u/${r.other.id}`)}
                      className="shrink-0 active:scale-95"
                      aria-label="عرض الملف"
                    >
                      <UserAvatar
                        src={r.other.avatar_url}
                        name={r.other.display_name || r.other.username}
                        size="md"
                        online={isOnline(r.other.id)}
                      />
                    </button>

                    {/* الجسم يفتح المحادثة */}
                    <button
                      onClick={() => navigate(`/chat/${r.room.id}`)}
                      className="flex-1 min-w-0 text-right active:scale-[0.98] transition"
                    >
                      <div className="flex justify-between items-baseline gap-2">
                        <b className={`text-sm truncate ${unread > 0? "font-black" : ""}`}>
                          {r.other.display_name || r.other.username}
                        </b>
                        <small className="text-muted-foreground/70 text-[10px] shrink-0">
                          {lm
                           ? new Date(lm.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </small>
                      </div>
                      <p className={`text-xs mt-1 truncate ${unread > 0? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {previewOf(lm)}
                      </p>
                    </button>

                    {/* زر الحذف - يظهر عند hover على الديسكتوب أو دائماً على الموبايل */}
                    <button
                      onClick={(e) => handleDeleteConversation(e, r.room.id, r.other.display_name || r.other.username)}
                      disabled={isDeleting}
                      className="shrink-0 p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
                      aria-label="حذف المحادثة"
                    >
                      {isDeleting? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>

                    {unread > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shrink-0 ring-2 ring-card animate-pulse absolute top-2 left-2">
                        {unread > 99? "99+" : unread}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}