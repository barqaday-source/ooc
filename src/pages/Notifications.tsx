import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";
import { Bell, Check, Trash2 } from "lucide-react";

export default function Notifications() {
  const { user } = useAuth();
  const { items, unreadCount, markRead, markAllRead, remove } = useNotificationsCenter(user?.id ?? null);

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black">الإشعارات</h1>
            <p className="text-xs text-muted-foreground mt-1">طلبات الصداقة وتنبيهات الغرف</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-4 h-10 rounded-full glass-thick text-xs font-bold active:scale-95 transition">
              تعليم الكل
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto opacity-40 mb-2" />
            لا توجد إشعارات بعد
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className={`glass-card rounded-[1.75rem] p-4 ${!n.is_read ? "border-primary" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold truncate">{n.title}</h2>
                    {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-2">
                      {new Date(n.created_at).toLocaleString("ar", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} className="w-9 h-9 rounded-full glass flex items-center justify-center" aria-label="تعليم كمقروء">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => remove(n.id)} className="w-9 h-9 rounded-full glass flex items-center justify-center" aria-label="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}