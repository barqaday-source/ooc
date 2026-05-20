// ====================================================================
// AppShell - الإطار العام: header + bottom nav + side menu
// + جرس إشعارات + زر ثيم + presence عام
// ====================================================================

import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, User, Bell, Menu, X, LogOut, Shield, Globe, Megaphone, Settings as SettingsIcon, Users, BookLock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useGlobalPresence } from "@/hooks/usePresence";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";
import { useOnline } from "@/hooks/useOnline";
import { Wifi, WifiOff } from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  children: ReactNode;
  activeRoomId?: string | null;
  bare?: boolean;
}

// ترتيب الأيقونات كما في تصميم الشريط (RTL: حسابي أقصى اليمين)
const NAV = [
  { to: "/profile",       icon: User,         label: "حسابي" },
  { to: "/notifications", icon: Bell,         label: "إشعارات" },
  { to: "/friends",       icon: Users,        label: "الأصدقاء" },
  { to: "/rooms",         icon: BookLock,     label: "الغرف" },
  { to: "/chat",          icon: MessageSquare,label: "محادثة" },
];

export default function AppShell({ children, activeRoomId = null, bare = false }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { settings } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [annDismissed, setAnnDismissed] = useState(false);

  useNotifications(activeRoomId);
  useGlobalPresence(user?.id ?? null);
  const { unreadCount } = useNotificationsCenter(user?.id ?? null);
  const isOnline = useOnline();

  if (bare) return <div className="min-h-screen bg-background">{children}</div>;

  const showAnnouncement = !!settings.announcement && !annDismissed;
  const hideHeader = location.pathname === "/chat";

  return (
    <div className="min-h-screen flex flex-col max-w-[500px] mx-auto relative">
      {!isOnline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] anim-slide-up">
          <div className="px-4 py-2 rounded-full glass-thick border border-destructive/40 text-destructive text-xs font-bold flex items-center gap-2 shadow-glassy">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
            <WifiOff className="w-3.5 h-3.5" />
            لا يوجد اتصال — يتم العرض من الذاكرة
          </div>
        </div>
      )}
      {!hideHeader && (
        <header className="h-[65px] mx-3 mt-3 px-4 flex items-center justify-between glass-thick rounded-3xl safe-top sticky top-3 z-40 shadow-glassy">
          <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2" aria-label="القائمة">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold tracking-wide">{settings.app_name || "دردشاتي"}</h2>
          <div className="flex items-center -ml-2">
            <ThemeToggle compact />
            <NotificationsBell />
          </div>
        </header>
      )}

      {showAnnouncement && (
        <div className="bg-primary/20 border-b border-primary/30 px-4 py-2.5 flex items-start gap-2 anim-fade-in">
          <Megaphone className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
          <p className="text-xs flex-1 leading-relaxed">{settings.announcement}</p>
          <button onClick={() => setAnnDismissed(true)} className="p-0.5 -mr-1" aria-label="إغلاق">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto pb-[110px] ${hideHeader ? "pt-6" : "pt-2"}`}>{children}</main>

      {/* شريط سفلي زجاجي بيضاوي مفرغ — 5 أقسام */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.25rem)] max-w-[440px] h-[68px] px-3 glass-thick rounded-full border border-white/50 flex items-center justify-between safe-bottom z-40 shadow-float"
        dir="rtl"
      >
        {NAV.map(({ to, icon: Icon, label }) => {
          const active =
            location.pathname === to ||
            (to === "/chat" && location.pathname.startsWith("/chat"));
          const showBadge = to === "/notifications" && unreadCount > 0;
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex-1 flex flex-col items-center gap-0.5 relative py-1.5 transition-all active:scale-95"
              aria-label={label}
            >
              <div
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  active
                    ? "bg-white/55 border border-white/70 shadow-sm"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  strokeWidth={1.6}
                  className="w-[22px] h-[22px] text-foreground/85"
                />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center border border-white/80 animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-bold text-foreground" : "font-medium text-foreground/65"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 anim-fade-in" onClick={() => setMenuOpen(false)} />
          <aside className="fixed top-0 right-0 h-full w-[85%] max-w-sm glass-thick z-50 p-6 safe-top safe-bottom anim-slide-up">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">القائمة</h3>
              <button onClick={() => setMenuOpen(false)} className="p-2"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-background/50 mb-6">
              <UserAvatar src={profile?.avatar_url} name={profile?.display_name || profile?.username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{profile?.display_name || profile?.username || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile?.username || "—"}</p>
              </div>
            </div>

            <div className="space-y-1">
              <ThemeToggle />
              {isAdmin && (
                <button
                  onClick={() => { setMenuOpen(false); navigate("/admin"); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-background/50 transition text-right"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">لوحة الأدمن</span>
                </button>
              )}
              <button
                onClick={() => { setMenuOpen(false); navigate("/privacy"); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-background/50 transition text-right"
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">سياسة الخصوصية</span>
              </button>
              {(settings.support_phone || settings.support_email || settings.support_whatsapp) && (
                <a
                  href={settings.support_whatsapp ? `https://wa.me/${settings.support_whatsapp.replace(/\D/g, "")}` : settings.support_email ? `mailto:${settings.support_email}` : `tel:${settings.support_phone}`}
                  className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-background/50 transition text-right"
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span className="font-medium">الدعم الفني</span>
                </a>
              )}
              <button
                onClick={async () => { await signOut(); navigate("/auth"); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-destructive/10 text-destructive transition text-right"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">تسجيل الخروج</span>
              </button>
            </div>

            <div className="absolute bottom-8 right-6 text-xs text-muted-foreground/60">
              {settings.app_name} © 2026
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
