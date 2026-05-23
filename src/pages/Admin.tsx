// ====================================================================
// Admin - لوحة تحكم الأدمن (Minimalist) + اعتماد الغرف + البلاغات
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Room, type Profile, type AppRole } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import UserAvatar from "@/components/UserAvatar";
import {
  Loader2, Trash2, Lock, Unlock, ShieldOff, Shield, Users, MessageSquare,
  Layers, Check, X, Clock, Settings as SettingsIcon, Flag, AlertTriangle,
  Eye, Send, UserX, MessageSquareWarning, ImageOff, UserMinus, HelpCircle
} from "lucide-react";
import { toast } from "sonner";

interface AdminStats { users: number; rooms: number; messagesToday: number; pending: number; reports: number; }
interface UserRow extends Profile { roles: AppRole[]; }
interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  admin_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  reporter?: Profile;
  reported?: Profile;
}

const REPORT_REASONS: Record<string, { label: string; icon: JSX.Element }> = {
  'harassment': { label: 'تحرش أو تنمر', icon: <UserX className="w-4 h-4" /> },
  'hate_speech': { label: 'خطاب كراهية', icon: <MessageSquareWarning className="w-4 h-4" /> },
  'spam': { label: 'سبام أو احتيال', icon: <Shield className="w-4 h-4" /> },
  'inappropriate': { label: 'محتوى غير لائق', icon: <ImageOff className="w-4 h-4" /> },
  'impersonation': { label: 'انتحال شخصية', icon: <UserMinus className="w-4 h-4" /> },
  'other': { label: 'سبب آخر', icon: <HelpCircle className="w-4 h-4" /> }
};

export default function Admin() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<"pending" | "rooms" | "users" | "reports">("pending");
  const [stats, setStats] = useState<AdminStats>({ users: 0, rooms: 0, messagesToday: 0, pending: 0, reports: 0 });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingRooms, setPendingRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [responseTarget, setResponseTarget] = useState<"reporter" | "reported">("reporter");
  const [actionTaken, setActionTaken] = useState<"none" | "warning" | "ban">("none");
  const [working, setWorking] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersC, roomsC, msgsC, pendingC, reportsC, roomsData, pendingData, profilesData, rolesData, reportsData] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("rooms").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("rooms").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_reports")
    .select("*, reporter:profiles!user_reports_reporter_id_fkey(*), reported:profiles!user_reports_reported_id_fkey(*)")
    .order("created_at", { ascending: false })
    ]);

    setStats({
      users: usersC.count?? 0,
      rooms: roomsC.count?? 0,
      messagesToday: msgsC.count?? 0,
      pending: pendingC.count?? 0,
      reports: reportsC.count?? 0,
    });
    setRooms((roomsData.data as Room[])?? []);
    setPendingRooms((pendingData.data as Room[])?? []);
    setReports((reportsData.data as UserReport[])?? []);

    const roleMap = new Map<string, AppRole[]>();
    ((rolesData.data as { user_id: string; role: AppRole }[])?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id)?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    setUsers(((profilesData.data as Profile[])?? []).map((p) => ({...p, roles: roleMap.get(p.id)?? [] })));
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
      toast.success("اعتُمدت");
      refresh();
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
      toast.success("رُفضت");
      refresh();
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("حذف الغرفة وجميع رسائلها؟")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) toast.error("فشل الحذف", { description: error.message });
    else { toast.success("حُذفت"); refresh(); }
  };

  const toggleRoomClose = async (room: Room) => {
    const { error } = await supabase.from("rooms").update({ is_closed:!room.is_closed }).eq("id", room.id);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success(room.is_closed? "فُتحت" : "أُغلقت"); refresh(); }
  };

  const toggleBan = async (u: UserRow) => {
    if (u.id === me?.id) { toast.error("لا يمكن حظر نفسك"); return; }
    const { error } = await supabase.from("profiles").update({ is_banned:!u.is_banned }).eq("id", u.id);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success(u.is_banned? "رُفع الحظر" : "تم الحظر"); refresh(); }
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

  const resolveReport = async (reportId: string, newStatus: string) => {
    setWorking(true);
    const { error } = await supabase.from("user_reports").update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: me?.id
    }).eq("id", reportId);
    setWorking(false);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success("تم التحديث"); refresh(); setSelectedReport(null); }
  };

  const sendReportResponse = async () => {
    if (!selectedReport ||!responseMsg.trim() ||!me) return;
    setWorking(true);

    const targetId = responseTarget === "reporter"? selectedReport.reporter_id : selectedReport.reported_id;

    const { error } = await supabase.from("user_report_responses").insert({
      report_id: selectedReport.id,
      admin_id: me.id,
      target_user_id: targetId,
      message: responseMsg.trim(),
      action_taken: actionTaken
    });

    if (error) {
      toast.error("فشل الإرسال", { description: error.message });
      setWorking(false);
      return;
    }

    if (actionTaken === "ban" && responseTarget === "reported") {
      await supabase.from("profiles").update({ is_banned: true }).eq("id", selectedReport.reported_id);
    }

    await supabase.from("user_reports").update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: me.id,
      admin_note: responseMsg.trim()
    }).eq("id", selectedReport.id);

    toast.success("تم إرسال الرد والإشعار");
    setResponseMsg("");
    setActionTaken("none");
    setSelectedReport(null);
    setWorking(false);
    refresh();
  };

  return (
    <AppShell>
      <div className="p-4 anim-fade-in bg-background min-h-full">
        <div className="glass-card p-4 mb-4 flex items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-lg">لوحة الأدمن</h4>
            <p className="text- opacity-80">إدارة الغرف والمستخدمين والبلاغات</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => navigate("/admin/settings")}
              className="h-10 px-3 rounded-xl glass-thick text-foreground text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition">
              <SettingsIcon className="w-4 h-4" /> إعدادات
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-5">
          {[
            { icon: Users, label: "مستخدمون", value: stats.users },
            { icon: Layers, label: "غرف", value: stats.rooms },
            { icon: MessageSquare, label: "رسائل اليوم", value: stats.messagesToday },
            { icon: Clock, label: "بالانتظار", value: stats.pending, hl: stats.pending > 0 },
            { icon: Flag, label: "بلاغات", value: stats.reports, hl: stats.reports > 0 },
          ].map((s, i) => (
            <div key={i} className={`glass-card p-2.5 ${s.hl? "bg-primary text-primary-foreground" : ""}`}>
              <s.icon className="w-3.5 h-3.5 opacity-80 mb-1" />
              <p className="text-[9px] opacity-80">{s.label}</p>
              <p className="text-base font-bold">{loading? "..." : s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-4 p-1 glass rounded-2xl">
          {([
            ["pending", `طلبات (${stats.pending})`],
            ["rooms", "الغرف"],
            ["users", "المستخدمون"],
            ["reports", `البلاغات (${stats.reports})`],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                tab === t? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : tab === "pending"? (
          <div className="space-y-2">
            {pendingRooms.map(r => (
              <div key={r.id} className="glass-card p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center font-bold text-sm shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text- text-muted-foreground truncate">{r.description || "بلا وصف"}</p>
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
        ) : tab === "rooms"? (
          <div className="space-y-2">
            {rooms.map((r) => (
              <div key={r.id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-primary-foreground bg-primary">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text- text-muted-foreground">
                    {r.is_closed? "🔒 مغلق" : "🟢 نشط"}
                  </p>
                </div>
                <button onClick={() => toggleRoomClose(r)}
                  className="w-9 h-9 rounded-xl glass flex items-center justify-center"
                  title={r.is_closed? "فتح" : "إغلاق"}>
                  {r.is_closed? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteRoom(r.id)}
                  className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center" title="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {rooms.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد غرف</p>}
          </div>
        ) : tab === "users"? (
          <div className="space-y-2">
            {users.map((u) => {
              const isAdminUser = u.roles.includes("admin");
              return (
                <div key={u.id} className="glass-card p-3 flex items-center gap-3">
                  <UserAvatar src={u.avatar_url} name={u.display_name || u.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{u.display_name || u.username}</p>
                      {isAdminUser && <span className="text-[9px] text-primary-foreground bg-primary px-1.5 py-0.5 rounded-md">ADMIN</span>}
                      {u.is_banned && <span className="text-[9px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-md">محظور</span>}
                    </div>
                    <p className="text- text-muted-foreground">انضم {new Date(u.created_at).toLocaleDateString("ar")}</p>
                  </div>
                  <button onClick={() => toggleAdmin(u)} disabled={u.id === me?.id}
                    className="w-9 h-9 rounded-xl glass flex items-center justify-center disabled:opacity-30"
                    title={isAdminUser? "إلغاء أدمن" : "ترقية لأدمن"}>
                    {isAdminUser? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleBan(u)} disabled={u.id === me?.id}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 ${
                      u.is_banned? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                    title={u.is_banned? "رفع الحظر" : "حظر"}>
                    {u.is_banned? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
            {users.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا يوجد مستخدمون</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => {
              const reasonData = REPORT_REASONS[report.reason] || REPORT_REASONS.other;
              const statusColor = report.status === 'pending'? 'warning' : report.status === 'resolved'? 'success' : 'muted';
              return (
                <div key={report.id} className="glass-card p-3">
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${statusColor}/15 text-${statusColor}`}>
                      {reasonData.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">{reasonData.label}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md bg-${statusColor}/15 text-${statusColor}`}>
                          {report.status === 'pending'? 'قيد المراجعة' : report.status === 'resolved'? 'تم الحل' : 'مرفوض'}
                        </span>
                      </div>
                      <p className="text- text-muted-foreground">
                        من: @{report.reporter?.username} → إلى: @{report.reported?.username}
                      </p>
                      <p className="text- text-muted-foreground">
                        {new Date(report.created_at).toLocaleString("ar")}
                      </p>
                    </div>
                  </div>

                  {report.details && (
                    <p className="text-xs bg-foreground/5 p-2 rounded-lg mb-2">{report.details}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="flex-1 h-9 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> عرض والرد
                    </button>
                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={() => resolveReport(report.id, 'resolved')}
                          className="h-9 px-3 rounded-lg bg-success/10 text-success text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => resolveReport(report.id, 'rejected')}
                          className="h-9 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {reports.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد بلاغات</p>}
          </div>
        )}
      </div>

      {selectedReport && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setSelectedReport(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] glass-thick rounded-t-3xl p-5 z-50 anim-slide-up safe-bottom space-y-4 border-t border-border max-h- overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                معالجة البلاغ
              </p>
              <button onClick={() => setSelectedReport(null)} className="p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="glass-card p-3 text-sm">
              <p className="font-semibold mb-1">السبب: {REPORT_REASONS[selectedReport.reason]?.label}</p>
              <p className="text-xs text-muted-foreground mb-2">
                المبلِّغ: @{selectedReport.reporter?.username} → المبلَّغ عليه: @{selectedReport.reported?.username}
              </p>
              {selectedReport.details && <p className="text-xs bg-foreground/5 p-2 rounded-lg">{selectedReport.details}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">الرد على:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setResponseTarget("reporter")}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                    responseTarget === "reporter"? "bg-primary text-primary-foreground" : "glass"
                  }`}>
                  المبلِّغ
                </button>
                <button
                  onClick={() => setResponseTarget("reported")}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                    responseTarget === "reported"? "bg-primary text-primary-foreground" : "glass"
                  }`}>
                  المبلَّغ عليه
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">الإجراء المتخذ:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'لا شيء', color: 'muted' },
                  { id: 'warning', label: 'تحذير', color: 'warning' },
                  { id: 'ban', label: 'حظر', color: 'destructive' }
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActionTaken(a.id as any)}
                    className={`h-10 rounded-xl text-xs font-semibold transition ${
                      actionTaken === a.id? `bg-${a.color} text-${a.color}-foreground` : "glass"
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={responseMsg}
              onChange={(e) => setResponseMsg(e.target.value)}
              rows={3}
              placeholder="اكتب رسالة الرد..."
              className="w-full p-3 rounded-xl bg-background border border-border outline-none text-sm resize-none"
            />

            <button
              onClick={sendReportResponse}
              disabled={working ||!responseMsg.trim()}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {working? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> إرسال الرد</>}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}