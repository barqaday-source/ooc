// ====================================================================
// Admin - لوحة تحكم الأدمن (Minimalist) + اعتماد الغرف
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Room, type Profile, type AppRole } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import {
  Loader2, Trash2, Lock, Unlock, ShieldOff, Shield, Users, MessageSquare,
  Layers, Check, X, Clock, Settings as SettingsIcon, Palette,
} from "lucide-react";
import { toast } from "sonner";

interface AdminStats { users: number; rooms: number; messagesToday: number; pending: number; }
interface UserRow extends Profile { roles: AppRole[]; }

export default function Admin() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<"pending" | "rooms" | "users">("pending");
  const [stats, setStats] = useState<AdminStats>({ users: 0, rooms: 0, messagesToday: 0, pending: 0 });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingRooms, setPendingRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [usersC, roomsC, msgsC, pendingC, roomsData, pendingData, profilesData, rolesData] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("rooms").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("rooms").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    setStats({
      users: usersC.count ?? 0,
      rooms: roomsC.count ?? 0,
      messagesToday: msgsC.count ?? 0,
      pending: pendingC.count ?? 0,
    });
    setRooms((roomsData.data as Room[]) ?? []);
    setPendingRooms((pendingData.data as Room[]) ?? []);

    const roleMap = new Map<string, AppRole[]>();
    ((rolesData.data as { user_id: string; role: AppRole }[]) ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role); roleMap.set(r.user_id, arr);
    });
    setUsers(((profilesData.data as Profile[]) ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const approveRoom = async (id: string) => {
    const room = pendingRooms.find(r => r.id === id);
    const { error } = await supabase.from("rooms").update({ status: "approved" }).eq("id", id);
    if (error) toast.error("فشل", { description: error.message });
    else {
      if (room) {
        await supabase.from("notifications").insert({
          user_id: room.owner_id,
          type: "room_approved",
          title: "تم اعتماد غرفتك ✅",
          body: `الغرفة "${room.name}" أصبحت متاحة للجميع`,
          link: `/chat/${room.id}`,
        });
      }
      toast.success("اعتُمدت"); refresh();
    }
  };

  const rejectRoom = async (id: string) => {
    if (!confirm("رفض الغرفة؟")) return;
    const room = pendingRooms.find(r => r.id === id);
    const { error } = await supabase.from("rooms").update({ status: "rejected" }).eq("id", id);
    if (error) toast.error("فشل", { description: error.message });
    else {
      if (room) {
        await supabase.from("notifications").insert({
          user_id: room.owner_id,
          type: "room_rejected",
          title: "تم رفض غرفتك ❌",
          body: `الغرفة "${room.name}" لم تُعتمد`,
          link: "/rooms",
        });
      }
      toast.success("رُفضت"); refresh();
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("حذف الغرفة وجميع رسائلها؟")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) toast.error("فشل الحذف", { description: error.message });
    else { toast.success("حُذفت"); refresh(); }
  };

  const toggleRoomClose = async (room: Room) => {
    const { error } = await supabase.from("rooms").update({ is_closed: !room.is_closed }).eq("id", room.id);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success(room.is_closed ? "فُتحت" : "أُغلقت"); refresh(); }
  };

  const toggleBan = async (u: UserRow) => {
    if (u.id === me?.id) { toast.error("لا يمكن حظر نفسك"); return; }
    const { error } = await supabase.from("profiles").update({ is_banned: !u.is_banned }).eq("id", u.id);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success(u.is_banned ? "رُفع الحظر" : "تم الحظر"); refresh(); }
  };

  const toggleAdmin = async (u: UserRow) => {
    if (u.id === me?.id) { toast.error("لا يمكن تعديل دورك"); return; }
    const isAdminUser = u.roles.includes("admin");
    if (isAdminUser) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      if (error) toast.error("فشل", { description: error.message });
      else { toast.success("أُلغيت صلاحية الأدمن"); refresh(); }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      if (error) toast.error("فشل", { description: error.message });
      else { toast.success("صار أدمن"); refresh(); }
    }
  };

  return (
    <AppShell>
      <div className="p-4 anim-fade-in" style={{ background: "var(--gradient-admin-soft)", minHeight: "100%" }}>
        {/* Header */}
        <div className="glass-card p-4 mb-4 flex items-center justify-between gap-2"
             style={{ background: "var(--gradient-admin)", color: "hsl(var(--admin-foreground))" }}>
          <div>
            <h4 className="font-bold text-lg">لوحة الأدمن</h4>
            <p className="text-[11px] opacity-80">إدارة الغرف والمستخدمين</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => navigate("/admin/themes")}
              className="h-10 px-3 rounded-xl glass-thick text-foreground text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition">
              <Palette className="w-4 h-4" /> ثيمات
            </button>
            <button onClick={() => navigate("/admin/settings")}
              className="h-10 px-3 rounded-xl glass-thick text-foreground text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition">
              <SettingsIcon className="w-4 h-4" /> إعدادات
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { icon: Users, label: "مستخدمون", value: stats.users },
            { icon: Layers, label: "غرف", value: stats.rooms },
            { icon: MessageSquare, label: "رسائل اليوم", value: stats.messagesToday },
            { icon: Clock, label: "بالانتظار", value: stats.pending, hl: stats.pending > 0 },
          ].map((s, i) => (
            <div key={i} className="glass-card p-2.5"
                 style={s.hl
                   ? { background: "linear-gradient(135deg, hsl(38 92% 60%), hsl(28 92% 50%))", color: "white" }
                   : { background: "var(--gradient-admin)", color: "hsl(var(--admin-foreground))" }}>
              <s.icon className="w-3.5 h-3.5 opacity-80 mb-1" />
              <p className="text-[9px] opacity-80">{s.label}</p>
              <p className="text-base font-bold">{loading ? "..." : s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-4 p-1 glass rounded-2xl">
          {([
            ["pending", `طلبات (${stats.pending})`],
            ["rooms", "الغرف"],
            ["users", "المستخدمون"],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                tab === t ? "text-white shadow-md" : "text-muted-foreground"
              }`}
              style={tab === t ? { background: "var(--gradient-admin)" } : undefined}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : tab === "pending" ? (
          <div className="space-y-2">
            {pendingRooms.map(r => (
              <div key={r.id} className="glass-card p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center font-bold text-sm shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.description || "بلا وصف"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveRoom(r.id)}
                    className="flex-1 h-9 rounded-lg bg-success/10 text-success text-xs font-semibold flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" /> اعتماد
                  </button>
                  <button onClick={() => rejectRoom(r.id)}
                    className="flex-1 h-9 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1">
                    <X className="w-3.5 h-3.5" /> رفض
                  </button>
                </div>
              </div>
            ))}
            {pendingRooms.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد طلبات</p>}
          </div>
        ) : tab === "rooms" ? (
          <div className="space-y-2">
            {rooms.map((r) => (
              <div key={r.id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-white"
                     style={{ background: "var(--gradient-admin)" }}>
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.is_closed ? "🔒 مغلق" : "🟢 نشط"}
                  </p>
                </div>
                <button onClick={() => toggleRoomClose(r)}
                  className="w-9 h-9 rounded-xl glass flex items-center justify-center"
                  title={r.is_closed ? "فتح" : "إغلاق"}>
                  {r.is_closed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteRoom(r.id)}
                  className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center" title="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {rooms.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد غرف</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const isAdminUser = u.roles.includes("admin");
              return (
                <div key={u.id} className="glass-card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-white"
                       style={{ background: "var(--gradient-admin)" }}>
                    {(u.display_name || u.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{u.display_name || u.username}</p>
                      {isAdminUser && <span className="text-[9px] text-white px-1.5 py-0.5 rounded-md" style={{ background: "var(--gradient-admin)" }}>ADMIN</span>}
                      {u.is_banned && <span className="text-[9px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-md">محظور</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">انضم {new Date(u.created_at).toLocaleDateString("ar")}</p>
                  </div>
                  <button onClick={() => toggleAdmin(u)} disabled={u.id === me?.id}
                    className="w-9 h-9 rounded-xl glass flex items-center justify-center disabled:opacity-30"
                    title={isAdminUser ? "إلغاء أدمن" : "ترقية لأدمن"}>
                    {isAdminUser ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleBan(u)} disabled={u.id === me?.id}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 ${
                      u.is_banned ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                    title={u.is_banned ? "رفع الحظر" : "حظر"}>
                    {u.is_banned ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
            {users.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا يوجد مستخدمون</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
