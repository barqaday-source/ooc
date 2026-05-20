// ====================================================================
// ResetPassword - صفحة تعيين كلمة مرور جديدة بعد رابط البريد
// ====================================================================

import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase يضع الـ session تلقائيًا من الـ hash بعد فتح الرابط
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setValidSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error("فشل تحديث كلمة المرور", { description: error.message });
    } else {
      setDone(true);
      toast.success("تم تحديث كلمة المرور بنجاح");
      setTimeout(() => navigate("/chat", { replace: true }), 2000);
    }
  };

  const appName = settings.app_name || "دردشاتي";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-5 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="rp-blob rp-blob-1" />
        <div className="rp-blob rp-blob-2" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6 anim-fade-in">
          <div className="w-20 h-20 rounded-3xl glass-thick shadow-elev flex items-center justify-center mb-4 overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-9 h-9" />
            )}
          </div>
          <h1 className="text-2xl font-black tracking-[0.3em]">{appName}</h1>
        </div>

        <div className="glass-thick rounded-3xl shadow-float p-6 anim-slide-up">
          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold mb-2">تم بنجاح ✨</h2>
              <p className="text-sm text-muted-foreground">جارٍ تحويلك للتطبيق...</p>
            </div>
          ) : validSession === false ? (
            <div className="text-center py-6">
              <h2 className="text-xl font-bold mb-2">رابط غير صالح</h2>
              <p className="text-sm text-muted-foreground mb-5">
                الرابط منتهي الصلاحية أو غير صحيح. يرجى طلب رابط جديد.
              </p>
              <button
                onClick={() => navigate("/auth?mode=forgot")}
                className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-sm"
              >
                طلب رابط جديد
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-center mb-1">كلمة مرور جديدة</h2>
              <p className="text-xs text-muted-foreground text-center mb-6">
                أدخل كلمة مرور جديدة لحسابك
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور الجديدة"
                    required
                    minLength={6}
                    dir="ltr"
                    className="w-full h-12 pr-10 pl-10 rounded-2xl glass border border-glass-border text-sm font-medium outline-none focus:border-foreground/50 focus:bg-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="تأكيد كلمة المرور"
                    required
                    minLength={6}
                    dir="ltr"
                    className="w-full h-12 pr-10 pl-3 rounded-2xl glass border border-glass-border text-sm font-medium outline-none focus:border-foreground/50 focus:bg-card"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 mt-2 rounded-2xl bg-foreground text-background font-bold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-elev"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "تحديث كلمة المرور"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .rp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          animation: rp-float 16s ease-in-out infinite;
        }
        .rp-blob-1 {
          width: 320px; height: 320px;
          background: hsl(var(--primary) / 0.6);
          top: -100px; right: -80px;
        }
        .rp-blob-2 {
          width: 280px; height: 280px;
          background: hsl(200 70% 80% / 0.5);
          bottom: -80px; left: -80px;
          animation-delay: 5s;
        }
        @keyframes rp-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
