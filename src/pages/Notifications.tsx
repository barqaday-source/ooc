// ====================================================================
// Notifications - صفحة الإشعارات + Realtime
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Notification } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { 
  Bell, CheckCheck, Loader2, MessageSquare, UserPlus, ShieldAlert, 
  ShieldCheck, AlertTriangle, Ban, Megaphone
} from "lucide-react";
import { toast } from "sonner";

const NOTIF_ICONS: Record<string, JSX.Element> = {
  message: <MessageSquare className="w-5 h-5 text-blue-400" />,
  message_reply: <MessageSquare className="w-5 h-5 text-blue-400" />,
  friend_request: <UserPlus className="w-5 h-5 text-sky-400" />,
  friend_accept: <CheckCheck className="w-5 h-5 text-emerald-400" />,
  room_approved: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
  room_rejected: <ShieldAlert className="w-5 h-5 text-red-400" />,
  report_response: <Megaphone className="w-5 h-5 text-amber-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  ban: <Ban className="w-5 h-5 text-red-400" />,
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
   .from("notifications")
   .select("*")
   .eq("user_id", user.id)
   .order("created_at", { ascending: false })
   .limit(50);
    
    if (error) {
      toast.error("فشل جلب الإشعارات", { description: error.message });
    } else {
      setNotifications((data as Notification[])?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
   .channel(`notifications-page:${user?.id}`)
   .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif,...prev]);
        }
      )
   .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
   .from("notifications")
   .update({ is_read: true })
   .eq("id", id);
    
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id? {...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
   .from("notifications")
   .update({ is_read: true })
   .eq("user_id", user.id)
   .eq("is_read", false);
    
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({...n, is_read: true })));
      toast.success("تم تعليم الكل كمقروء");
    }
  };

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  const unreadCount = notifications.filter((n) =>!n.is_read).length;

  return (
    <AppShell>
      <div className="p-4 min-h-full">
        <div className="bg-primary/20 border border-primary/30 p-4 mb-4 flex items-center justify-between gap-2 rounded-2xl backdrop-blur-sm">
          <div>
            <h4 className="font-bold text-lg flex items-center gap-2">
              الإشعارات
              {unreadCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h4>
            <p className="text-xs opacity-80">طلبات الصداقة وتنبيهات الغرف والبلاغات</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="h-10 px-3 rounded-xl bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition"
            >
              <CheckCheck className="w-4 h-4" /> تعليم الكل
            </button>
          )}
        </div>

        {loading? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : notifications.length === 0? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">لا توجد إشعارات بعد</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-right p-3.5 rounded-2xl flex items-start gap-3 transition active:scale-[0.98] border ${
                 !notif.is_read
                    ? "bg-primary/20 border-primary/40"
                    : "bg-primary/10 border-primary/20"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {NOTIF_ICONS[notif.type] || <Bell className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1">{notif.title}</p>
                  <p className="text-xs text-foreground/70 line-clamp-2">{notif.body}</p>
                  <p className="text- text-foreground/50 mt-1.5">
                    {new Date(notif.created_at).toLocaleString("ar")}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}