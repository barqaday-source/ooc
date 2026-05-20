// ====================================================================
// NotificationsBell - أيقونة جرس + قائمة منسدلة بالإشعارات
// ====================================================================

import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";
import { useNavigate } from "react-router-dom";

export default function NotificationsBell() {
  const { user } = useAuth();
  const { unreadCount } = useNotificationsCenter(user?.id ?? null);
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/notifications")}
      className="p-2 relative active:scale-90 transition"
      aria-label="الإشعارات"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
