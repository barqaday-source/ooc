// ====================================================================
// Rooms - تصفّح الغرف + إنشاء (الجديد ينتظر اعتماد الأدمن)
// ====================================================================

import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Room } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Plus, Loader2, X, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export default function Rooms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"public" | "mine">("public");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchRooms = async () => {
    // RLS ستعرض المعتمدة + ما يملكه المستخدم
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_dm", false)
      .order("created_at", { ascending: false });
    setRooms((data as Room[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
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
    .filter(r => tab === "mine" ? r.owner_id === user?.id : r.status === "approved")
    .filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-lg">الغرف</h4>
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center active:scale-95 transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-3 p-1 bg-card rounded-2xl">
          {(["public", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-9 rounded-xl text-xs font-semibold transition ${
                tab === t ? "bg-foreground text-background" : "text-muted-foreground"
              }`}>
              {t === "public" ? "عامة معتمدة" : "غرفي"}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن غرفة..."
          className="w-full h-11 px-4 rounded-2xl bg-card border border-border outline-none text-sm mb-4"
        />

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {tab === "mine" ? "لم تنشئ غرفاً بعد" : "لا توجد غرف معتمدة"}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((room) => (
              <div
                key={room.id}
                className="glass-card rounded-[1.7rem] p-4 text-right shadow-glassy anim-scale-in"
              >
                <div className="flex items-start gap-3">
                  {room.cover_url ? (
                    <img src={room.cover_url} alt={room.name} className="w-12 h-12 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-bold">
                      {room.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="truncate">{room.name}</b>
                      {room.status === "pending" && <span className="inline-flex items-center gap-1 text-[9px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-md"><Clock className="w-2.5 h-2.5" /> بانتظار الاعتماد</span>}
                      {room.status === "rejected" && <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-md">مرفوضة</span>}
                      {room.is_closed && <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-md">مغلق</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{room.description || "بدون وصف"}</p>
                    <div className="flex items-center justify-between mt-3 gap-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> متواجدون الآن
                      </span>
                      <button
                        onClick={() => navigate(`/chat/${room.id}`)}
                        className="h-9 px-4 rounded-xl bg-foreground text-background text-xs font-bold active:scale-95 transition"
                      >
                        انضمام
                      </button>
                    </div>
                  </div>
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
                className="w-full h-12 px-4 rounded-xl bg-background border border-border outline-none text-sm"
              />
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3}
                placeholder="وصف مختصر (اختياري)"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border outline-none text-sm resize-none"
              />
              <button
                type="submit" disabled={creating || !name.trim()}
                className="w-full h-12 rounded-xl bg-foreground text-background font-semibold disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إرسال للاعتماد"}
              </button>
            </div>
          </form>
        </>
      )}
    </AppShell>
  );
}
