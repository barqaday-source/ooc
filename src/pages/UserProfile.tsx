// ====================================================================
// UserProfile - صفحة عرض مستخدم آخر مع أزرار: صداقة / مراسلة / إبلاغ / حظر
// ====================================================================

import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, type Profile } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import UserAvatar from "@/components/UserAvatar";
import {
  ArrowRight,
  MessageCircle,
  Ban,
  Flag,
  Loader2,
  X,
  ShieldAlert,
  UserPlus,
  UserCheck,
  Clock,
  UserX,
  MoreVertical,
  UserX as UserXIcon,
  MessageSquareWarning,
  ImageOff,
  UserMinus,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";

type FriendshipStatus = 'none' | 'pending' | 'accepted' | 'blocked' | 'sent';

type Friendship = {
  id: string;
  status: string;
  requester_id: string;
  addressee_id: string;
};

// 1. مصفوفة البلاغات مع أيقونات
const REPORT_TYPES = [
  { id: 'harassment', label: 'تحرش أو تنمر', icon: <UserXIcon className="w-5 h-5" /> },
  { id: 'hate_speech', label: 'خطاب كراهية', icon: <MessageSquareWarning className="w-5 h-5" /> },
  { id: 'spam', label: 'سبام أو احتيال', icon: <ShieldAlert className="w-5 h-5" /> },
  { id: 'inappropriate', label: 'محتوى غير لائق', icon: <ImageOff className="w-5 h-5" /> },
  { id: 'impersonation', label: 'انتحال شخصية', icon: <UserMinus className="w-5 h-5" /> },
  { id: 'other', label: 'سبب آخر', icon: <HelpCircle className="w-5 h-5" /> }
];

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [online, setOnline] = useState(false);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current &&!moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  useEffect(() => {
    if (!userId ||!user) return;
    (async () => {
      setLoading(true);

      const { data: profileData } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .maybeSingle();

      setProfile(profileData as Profile | null);

      if (profileData) {
        const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        setOnline(new Date((profileData as Profile).last_seen_at) >= new Date(since));
      }

      const { data: friendshipData } = await supabase
  .from("friendships")
  .select("*")
  .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
  .maybeSingle();

      if (friendshipData) {
        setFriendship(friendshipData as Friendship);

        if (friendshipData.status === 'accepted') {
          setFriendshipStatus('accepted');
        } else if (friendshipData.status === 'blocked') {
          setFriendshipStatus('blocked');
        } else if (friendshipData.status === 'pending') {
          if (friendshipData.requester_id === user.id) {
            setFriendshipStatus('sent');
          } else {
            setFriendshipStatus('pending');
          }
        }
      } else {
        setFriendshipStatus('none');
      }

      setLoading(false);
    })();
  }, [userId, user]);

  const startDm = async () => {
    if (!user ||!userId) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user_id: userId });
    setWorking(false);
    if (error ||!data) {
      toast.error("تعذّر بدء المحادثة", { description: error?.message });
      return;
    }
    navigate(`/chat/${data}`);
  };

  const sendFriendRequest = async () => {
    if (!user ||!userId) return;
    setWorking(true);

    const { error } = await supabase
.from("friendships")
.insert({
        requester_id: user.id,
        addressee_id: userId,
        status: 'pending'
      });

    setWorking(false);

    if (error) {
      toast.error("فشل إرسال الطلب", { description: error.message });
    } else {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "friend_request",
        title: "طلب صداقة جديد",
        body: `أرسل لك ${user.user_metadata?.display_name || 'مستخدم'} طلب صداقة`,
        link: "/friends",
      });
      toast.success("تم إرسال طلب الصداقة");
      setFriendshipStatus('sent');
      const { data } = await supabase
  .from("friendships")
  .select("*")
  .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
  .maybeSingle();
      setFriendship(data as Friendship);
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendship) return;
    setWorking(true);

    const { error } = await supabase
.from("friendships")
.delete()
.eq("id", friendship.id);

    setWorking(false);

    if (error) {
      toast.error("فشل إلغاء الطلب", { description: error.message });
    } else {
      toast.success("تم إلغاء طلب الصداقة");
      setFriendshipStatus('none');
      setFriendship(null);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendship) return;
    setWorking(true);

    const { error } = await supabase
.from("friendships")
.update({ status: 'accepted' })
.eq("id", friendship.id);

    setWorking(false);

    if (error) {
      toast.error("فشل قبول الطلب", { description: error.message });
    } else {
      await supabase.from("notifications").insert({
        user_id: friendship.requester_id,
        type: "friend_accept",
        title: "تم قبول طلب الصداقة",
        body: `قبل ${user?.user_metadata?.display_name || 'مستخدم'} طلب صداقتك`,
        link: "/friends",
      });
      toast.success("تم قبول طلب الصداقة");
      setFriendshipStatus('accepted');
    }
  };

  const removeFriend = async () => {
    if (!friendship ||!confirm("هل تريد إزالة هذا الصديق؟")) return;
    setWorking(true);

    const { error } = await supabase
.from("friendships")
.delete()
.eq("id", friendship.id);

    setWorking(false);

    if (error) {
      toast.error("فشل إزالة الصديق", { description: error.message });
    } else {
      toast.success("تمت إزالة الصديق");
      setFriendshipStatus('none');
      setFriendship(null);
    }
  };

  const blockUser = async () => {
    if (!user ||!userId) return;
    if (!confirm("سيتم حظر هذا المستخدم ولن يتمكن من مراسلتك — هل أنت متأكد؟")) return;
    setWorking(true);
    setShowMoreMenu(false);

    const res = friendship
? await supabase
      .from("friendships")
      .update({ status: "blocked", requester_id: user.id, addressee_id: userId })
      .eq("id", friendship.id)
      : await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: userId, status: "blocked" });

    setWorking(false);

    if (res.error) {
      toast.error("فشل الحظر", { description: res.error.message });
    } else {
      toast.success("تم حظر المستخدم");
      setFriendshipStatus('blocked');
      navigate("/chat");
    }
  };

  const submitReport = async () => {
    if (!user ||!userId ||!reportType) {
      toast.error("اختر نوع البلاغ");
      return;
    }
    if (reportType === 'other' && reportDetails.trim().length < 3) {
      toast.error("اكتب تفاصيل البلاغ");
      return;
    }
    setWorking(true);
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_id: userId,
      reason: reportType,
      details: reportDetails.trim() || null,
    });
    setWorking(false);
    if (error) toast.error("فشل الإرسال", { description: error.message });
    else {
      toast.success("تم إرسال البلاغ للمدير");
      setShowReport(false);
      setReportType("");
      setReportDetails("");
      setShowMoreMenu(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
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

        {/* 2. الكرت الشخصي الحديث */}
        <div className="relative rounded-[2rem] overflow-hidden bg-background/50 backdrop-blur-xl border border-white/10 shadow-2xl mb-6">
          {/* غلاف ملون خلف الصورة */}
          <div className="h-24 w-full bg-gradient-to-r from-primary/40 to-secondary/40 opacity-80" />

          <div className="px-6 pb-6 relative flex flex-col items-center text-center">
            {/* الصورة الشخصية متداخلة مع الغلاف */}
            <div className="-mt-12 mb-3 rounded-full p-1 bg-background shadow-lg">
              <UserAvatar
                src={profile.avatar_url}
                name={profile.display_name || profile.username}
                size="xl"
                online={online}
                ring
              />
            </div>

            <h1 className="text-2xl font-black">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>

            {profile.bio && (
              <p className="text-sm text-foreground/90 mt-4 leading-relaxed max-w-[90%] bg-white/5 p-3 rounded-2xl border border-white/5">
                {profile.bio}
              </p>
            )}

            {/* حالة الحظر بشكل بارز */}
            {profile.is_banned && (
              <div className="mt-5 w-full bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm">هذا الحساب موقوف من قبل الإدارة</span>
              </div>
            )}
          </div>
        </div>

        {!isSelf && friendshipStatus!== 'blocked' && (
          <div className="flex items-center gap-2">
            <button
              onClick={startDm}
              disabled={working || profile.is_banned}
              className="flex-1 h-11 rounded-xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-md transition-all disabled:opacity-60 text-sm"
            >
              {working? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              مراسلة
            </button>

            {friendshipStatus === 'none' && (
              <button
                onClick={sendFriendRequest}
                disabled={working}
                className="flex-1 h-11 rounded-xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-md transition-all disabled:opacity-60 text-sm"
              >
                {working? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                إضافة صديق
              </button>
            )}

            {friendshipStatus === 'sent' && (
              <button
                onClick={cancelFriendRequest}
                disabled={working}
                className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 text-sm"
              >
                {working? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                إلغاء الطلب
              </button>
            )}

            {friendshipStatus === 'pending' && (
              <button
                onClick={acceptFriendRequest}
                disabled={working}
                className="flex-1 h-11 rounded-xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 text-sm"
              >
                {working? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                قبول
              </button>
            )}

            {friendshipStatus === 'accepted' && (
              <button
                onClick={removeFriend}
                disabled={working}
                className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 text-sm"
              >
                {working? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                إزالة صديق
              </button>
            )}

            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-11 h-11 rounded-xl glass-thick border border-border flex items-center justify-center active:scale-95 transition-all"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-48 glass-thick rounded-2xl border border-border shadow-2xl z-50 overflow-hidden anim-fade-in">
                    {friendshipStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            cancelFriendRequest();
                            setShowMoreMenu(false);
                          }}
                          disabled={working}
                          className="w-full px-4 py-3 text-sm font-medium flex items-center gap-3 hover:bg-secondary/50 transition-colors text-right"
                        >
                          <UserX className="w-4 h-4" />
                          رفض الطلب
                        </button>
                        <div className="h-px bg-border" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowReport(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-3 text-sm font-medium flex items-center gap-3 hover:bg-secondary/50 transition-colors text-right"
                    >
                      <Flag className="w-4 h-4 text-warning" />
                      إبلاغ عن المستخدم
                    </button>
                    <div className="h-px bg-border" />
                    <button
                      onClick={blockUser}
                      disabled={working}
                      className="w-full px-4 py-3 text-sm font-medium flex items-center gap-3 hover:bg-destructive/10 text-destructive transition-colors text-right disabled:opacity-60"
                    >
                      <Ban className="w-4 h-4" />
                      حظر المستخدم
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!isSelf && friendshipStatus === 'blocked' && (
          <div className="w-full h-11 rounded-xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-2">
            <Ban className="w-5 h-5" />
            محظور
          </div>
        )}

        {isSelf && (
          <button
            onClick={() => navigate("/profile")}
            className="w-full h-11 rounded-xl glass-thick border border-border font-semibold text-sm"
          >
            تعديل حسابي
          </button>
        )}
      </div>

      {/* 3. واجهة الإبلاغ الاحترافية */}
      {showReport && (
        <>
          {/* خلفية معتمة */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setShowReport(false)}
          />

          {/* المودال */}
          <div className="fixed bottom-0 left-0 right-0 w-full glass-thick rounded-t-[2.5rem] p-6 z-50 anim-slide-up safe-bottom border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">

            {/* شريط السحب العلوي */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-xl flex items-center gap-2">
                  <Flag className="w-5 h-5 text-warning" />
                  الإبلاغ عن المشكلة
                </h3>
                <p className="text-xs text-muted-foreground mt-1">لن يعرف المستخدم أنك قمت بالإبلاغ عنه</p>
              </div>
              <button onClick={() => setShowReport(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* شبكة البلاغات */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300 active:scale-95 ${
                    reportType === type.id
                     ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                      : "bg-background/40 border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {type.icon}
                  <span className="text-xs font-bold">{type.label}</span>
                </button>
              ))}
            </div>

            {/* مربع الوصف يظهر بنعومة */}
            <div className={`transition-all duration-300 overflow-hidden ${reportType? 'max-h-40 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
              <label className="text-xs font-semibold ml-1 mb-2 block text-muted-foreground">تفاصيل إضافية (اختياري)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="وضح لنا المشكلة بدقة أكثر..."
                className="w-full p-4 rounded-2xl bg-black/20 border border-white/10 outline-none text-sm resize-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>

            {/* زر الإرسال */}
            <button
              onClick={submitReport}
              disabled={working ||!reportType || (reportType === 'other' && reportDetails.trim().length < 3)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-lg disabled:opacity-50 disabled:grayscale active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {working? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  إرسال البلاغ <ArrowRight className="w-5 h-5 rotate-180" />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}