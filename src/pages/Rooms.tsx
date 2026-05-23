// ====================================================================
// Rooms - تصفّح الغرف + إنشاء (الجديد ينتظر اعتماد الأدمن)
// ====================================================================

import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Room } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Plus, Loader2, X, Clock, Lock, Wifi } from "lucide-react";
import { toast } from "sonner";

type RoomWithOnline = Room & {
  online_count: number;
};

export default function Rooms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomWithOnline[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"public" | "mine">("public");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchRooms = async () => {
    setLoading(true);

    const { data: roomsData } = await supabase
   .from("rooms")
   .select("*")
   .eq("is_dm", false)
   .order("created_at", { ascending: false });

    if (!roomsData) {
      setLoading(false);
      return;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const roomsWithOnline = await Promise.all(
      roomsData.map(async (room) => {
        const { count } = await supabase
       .from("room_members")
       .select("*", { count: 'exact', head: true })
       .eq("room_id", room.id)
       .gte("last_seen", fiveMinutesAgo);

        return {
       ...room,
          online_count: count || 0
        };
      })
    );

    setRooms(roomsWithOnline);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user ||!name.trim()) return;
    setCreating(true);
    const { error } = await supabase
   .from("rooms")
   .insert({ name: name.trim(), description: description.trim() || null, owner_id: user.id });
    setCreating(false);

    if (error) { toast.error("فشل إنشاء الغرفة", { description: error.message }); return; }
    toast.success("أُرسل طلب إنشاء الغرفة - بانتظار اعتماد المدير");
    setShowCreate(false); setName(""); setDescription("");
    fetchRooms();
  };

  const filtered = rooms
 .filter(r => tab === "mine"? r.owner_id === user?.id : r.status === "approved")
 .filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description?.toLowerCase().includes(search.toLowerCase())?? false)
    );

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-lg">الغرف</h4>
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-3 p-1 bg-card rounded-full">
          {(["public", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-9 rounded-full text-xs font-semibold transition ${
                tab === t? "bg-foreground text-background" : "text-muted-foreground"
              }`}>
              {t === "public"? "عامة معتمدة" : "غرفي"}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن غرفة..."
          className="w-full h-11 px-4 rounded-full bg-card border border-border outline-none text-sm mb-5"
        />

        {loading? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {tab === "mine"? "لم تنشئ غرفاً بعد" : "لا توجد غرف معتمدة"}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
            {filtered.map((room) => (
              <div
                key={room.id}
                className="relative shrink-0 w-[200px] h-[280px] rounded-[24px] overflow-hidden snap-start shadow-xl group"
              >
                {/* خلفية الصورة */}
                <img
                  src={room.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${room.id}&backgroundColor=1e293b,0f172a,020617`}
                  alt={room.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* تدرج للقراءة */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

                {/* إطار زجاجي شفاف خارجي فقط */}
                <div className="absolute inset-0 rounded-[24px] border border-white/15" />

                {/* البادجات العلوية */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    {room.is_closed && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-black/50 backdrop-blur-xl text-white px-2 py-0.5 rounded-full border border-white/10 w-fit">
                        <Lock className="w-2.5 h-2.5" /> مغلقة
                      </span>
                    )}
                    {room.status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-orange-500/40 backdrop-blur-xl text-white px-2 py-0.5 rounded-full border border-white/10 w-fit">
                        <Clock className="w-2.5 h-2.5" /> قيد المراجعة
                      </span>
                    )}
                  </div>

                  {/* عداد المتواجدين */}
                  {room.online_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/40 backdrop-blur-xl text-white px-2 py-0.5 rounded-full border border-white/10">
                      <Wifi className="w-2.5 h-2.5" /> {room.online_count}
                    </span>
                  )}
                </div>

                {/* المحتوى السفلي - مباشرة على الخلفية بدون كرت */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="mb-3">
                    <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-2xl">{room.name}</h3>
                    <p className="text-white/70 text-xs line-clamp-1 drop-shadow-lg">{room.description || "غرفة دردشة عامة"}</p>
                  </div>

                  <button
                    onClick={() => navigate(`/chat/${room.id}`)}
                    disabled={room.status!== "approved" || room.is_closed}
                    className="w-full py-2.5 rounded-full bg-white/95 backdrop-blur-md text-black text-sm font-bold active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xl hover:bg-white border border-white/20"
                  >
                    {room.is_closed? "الغرفة مغلقة" : room.status === "approved"? "انضمام" : "غير متاحة"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowCreate(false)} />
          <form
            onSubmit={handleCreate}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] glass-thick rounded-t-3xl p-6 z-50 anim-slide-up safe-bottom"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">غرفة جديدة</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">📝 الغرفة ستحتاج موافقة المدير قبل ظهورها للجميع</p>

            <div className="space-y-3">
              <input
                value={name} onChange={(e) => setName(e.target.value)} required maxLength={50}
                placeholder="اسم الغرفة *"
                className="w-full h-12 px-4 rounded-full bg-background border border-border outline-none text-sm"
              />
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3}
                placeholder="وصف مختصر (اختياري)"
                className="w-full px-4 py-3 rounded-2xl bg-background border border-border outline-none text-sm resize-none"
              />
              <button
                type="submit" disabled={creating ||!name.trim()}
                className="w-full h-12 rounded-full bg-foreground text-background font-semibold disabled:opacity-50"
              >
                {creating? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إرسال للاعتماد"}
              </button>
            </div>
          </form>
        </>
      )}
    </AppShell>
  );
}