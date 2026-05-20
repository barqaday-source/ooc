// ====================================================================
// UserProfile - صفحة عرض مستخدم آخر مع أزرار: مراسلة / إبلاغ / حظر
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, type Profile } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import UserAvatar from "@/components/UserAvatar";
import { ArrowRight, MessageCircle, Ban, Flag, Loader2, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(data as Profile | null);
      if (data) {
        const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        setOnline(new Date((data as Profile).last_seen_at) >= new Date(since));
      }
      setLoading(false);
    })();
  }, [userId]);

  const startDm = async () => {
    if (!user || !userId) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user_id: userId });
    setWorking(false);
    if (error || !data) {
      toast.error("تعذّر بدء المحادثة", { description: error?.message });
      return;
    }
    navigate(`/chat/${data}`);
  };

  const blockUser = async () => {
    if (!user || !userId) return;
    if (!confirm("سيتم حظر هذا المستخدم — هل أنت متأكد؟")) return;
    setWorking(true);
    // ابحث عن صداقة سابقة، وإلا أنشئ سجل بحالة blocked
    const { data: existing } = await supabase
      .from("friendships").select("id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    const res = existing
      ? await supabase.from("friendships").update({ status: "blocked", requester_id: user.id, addressee_id: userId }).eq("id", (existing as { id: string }).id)
      : await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: userId, status: "blocked" });
    setWorking(false);
    if (res.error) toast.error("فشل الحظر", { description: res.error.message });
    else { toast.success("تم حظر المستخدم"); navigate("/chat"); }
  };

  const submitReport = async () => {
    if (!user || !userId || reportReason.trim().length < 3) {
      toast.error("اكتب سبب الإبلاغ");
      return;
    }
    setWorking(true);
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_id: userId,
      reason: reportReason.trim(),
    });
    setWorking(false);
    if (error) toast.error("فشل الإرسال", { description: error.message });
    else { toast.success("تم إرسال البلاغ للمدير"); setShowReport(false); setReportReason(""); }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="p-8 text-center text-muted-foreground">المستخدم غير موجود</div>
      </AppShell>
    );
  }

  const isSelf = user?.id === profile.id;

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 mb-2" aria-label="رجوع">
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* بطاقة الملف */}
        <div className="glass-card p-6 flex flex-col items-center text-center mb-5">
          <div className="relative">
            <UserAvatar src={profile.avatar_url} name={profile.display_name || profile.username} size="xl" online={online} ring />
          </div>
          <h1 className="text-xl font-black mt-4">{profile.display_name || profile.username}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm text-foreground/80 mt-3 leading-relaxed max-w-sm">{profile.bio}</p>
          )}
          {profile.is_banned && (
            <span className="mt-3 text-[11px] bg-destructive/15 text-destructive px-2 py-1 rounded-md font-semibold inline-flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> هذا الحساب موقوف
            </span>
          )}
        </div>

        {!isSelf && (
          <div className="space-y-2.5">
            <button
              onClick={startDm}
              disabled={working || profile.is_banned}
              className="w-full h-13 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-elev disabled:opacity-60"
              style={{ backgroundColor: "var(--app-btn)" }}
            >
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
              مراسلة (محادثة خاصة)
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowReport(true)}
                className="h-12 rounded-2xl glass-thick border border-white/50 font-semibold flex items-center justify-center gap-2 active:scale-95"
              >
                <Flag className="w-4 h-4 text-warning" /> إبلاغ
              </button>
              <button
                onClick={blockUser}
                disabled={working}
                className="h-12 rounded-2xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-2 active:scale-95"
              >
                <Ban className="w-4 h-4" /> حظر
              </button>
            </div>
          </div>
        )}

        {isSelf && (
          <button
            onClick={() => navigate("/profile")}
            className="w-full h-12 rounded-2xl glass-thick border border-white/50 font-semibold"
          >
            تعديل حسابي
          </button>
        )}
      </div>

      {/* مودال الإبلاغ */}
      {showReport && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowReport(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] glass-thick rounded-t-3xl p-5 z-50 anim-slide-up safe-bottom space-y-3 border-t border-white/40">
            <div className="flex items-center justify-between">
              <p className="font-bold">سبب الإبلاغ</p>
              <button onClick={() => setShowReport(false)} className="p-1"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="اكتب سبب البلاغ بوضوح (تحرّش / إساءة / محتوى مخالف...)"
              className="w-full p-3 rounded-2xl bg-background/70 border border-white/50 outline-none text-sm resize-none"
              autoFocus
            />
            <button
              onClick={submitReport}
              disabled={working || reportReason.trim().length < 3}
              className="w-full h-12 rounded-2xl text-white font-bold disabled:opacity-50"
              style={{ backgroundColor: "var(--app-btn)" }}
            >
              {working ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إرسال البلاغ"}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}