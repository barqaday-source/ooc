// ====================================================================
// Auth - تسجيل دخول / إنشاء حساب / نسيت كلمة المرور (تصميم زجاجي حديث)
// ====================================================================

import { useState, useEffect, FormEvent, forwardRef } from "react";
import { Navigate, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings } = useAppSettings();
  const { user, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>(() => {
    const m = params.get("mode");
    return m === "signup" || m === "forgot" ? m : "login";
  });
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const m = params.get("mode");
    if (m === "signup" || m === "login" || m === "forgot") setMode(m as Mode);
  }, [params]);

  if (loading) return null;
  if (user) return <Navigate to="/chat" replace />;

  const appName = settings.app_name || "دردشاتي";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (mode === "forgot") {
      if (!username.trim()) {
        toast.error("يرجى إدخال اسم المستخدم");
        return;
      }
      setSubmitting(true);
      const resetEmail = `${username.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, "")}@dardashati.local`;
      // إرسال رابط استعادة كلمة المرور — يعيد التوجيه إلى /reset-password بنفس النطاق الحالي
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSubmitting(false);
      if (error) {
        toast.error("فشل إرسال رابط الاستعادة", { description: error.message });
      } else {
        toast.success("تم إرسال رابط الاستعادة ✉️", {
          description: "تفقد بريدك الإلكتروني (وصندوق الـ Spam) واتبع الرابط لتعيين كلمة مرور جديدة",
        });
        setMode("login");
      }
      return;
    }

    if (mode === "signup" && !agree) {
      toast.error("يجب الموافقة على معالجة البيانات الشخصية");
      return;
    }

    if (!username.trim()) {
      toast.error("يرجى إدخال اسم المستخدم");
      return;
    }

    setSubmitting(true);
    const { error } =
      mode === "login"
        ? await signIn(`${username.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, "")}@dardashati.local`, password)
        : await signUp(`${username.trim()}@dardashati.local`, password, username.trim(), true);
    setSubmitting(false);

    if (error) {
      toast.error(mode === "login" ? "فشل تسجيل الدخول" : "فشل إنشاء الحساب", { description: error.message });
    } else {
      toast.success(mode === "login" ? `أهلاً بعودتك إلى ${appName}` : "تم إنشاء حسابك بنجاح");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/chat`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error("فشل الدخول عبر Google", { description: error.message });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-5 py-8">
      {/* فقاعات زجاجية ملونة في الخلفية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* زر الرجوع */}
        <button
          onClick={() => navigate("/")}
          className="absolute -top-2 right-0 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-card transition"
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* الشعار */}
        <div className="flex flex-col items-center mb-6 anim-fade-in">
          <div className="w-20 h-20 rounded-3xl glass-thick shadow-elev flex items-center justify-center mb-4 relative overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-9 h-9" />
            )}
          </div>
          <h1 className="text-2xl font-black tracking-[0.3em]">{appName}</h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.4em] mt-1">
            {settings.app_tagline || "CHAT • CONNECT • LEAD"}
          </p>
        </div>

        {/* البطاقة الزجاجية الرئيسية */}
        <div className="glass-card shadow-float p-6 page-transition">
          <h2 className="text-2xl font-bold text-center mb-1">
            {mode === "login" && "أهلاً بعودتك"}
            {mode === "signup" && "إنشاء حساب جديد"}
            {mode === "forgot" && "استعادة كلمة المرور"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-6">
            {mode === "login" && "سجّل دخولك للمتابعة"}
            {mode === "signup" && "ابدأ رحلتك معنا الآن"}
            {mode === "forgot" && "أدخل اسم المستخدم لإرسال رابط الاستعادة"}
          </p>

          {/* Google - فقط في login/signup */}
          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full h-12 mb-4 rounded-2xl glass border-glass-border flex items-center justify-center gap-3 font-semibold text-sm hover:bg-card active:scale-[0.98] transition disabled:opacity-60"
              >
                {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                {mode === "signup" ? "متابعة عبر Google" : "الدخول عبر Google"}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground tracking-wider">أو</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode !== "forgot" && (
              <GlassInput
                icon={User}
                value={username}
                onChange={setUsername}
                placeholder="اسم المستخدم"
                maxLength={30}
              />
            )}

            {mode === "forgot" && (
              <GlassInput
                icon={User}
                value={username}
                onChange={setUsername}
                placeholder="اسم المستخدم"
                required
              />
            )}

            {mode !== "forgot" && (
              <GlassInput
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="كلمة المرور"
                required
                minLength={6}
                dir="ltr"
                rightIcon={showPassword ? EyeOff : Eye}
                onRightClick={() => setShowPassword(v => !v)}
              />
            )}

            {mode === "signup" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="w-4 h-4 rounded accent-foreground"
                />
                أوافق على <span className="text-foreground font-semibold">شروط الاستخدام</span> ومعالجة البيانات
              </label>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-foreground font-semibold hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            {/* زر الإرسال — كبسولة زجاجية فاخرة بانحناءات كاملة ولمعة متحركة */}
            <button
              type="submit"
              disabled={submitting}
              className="auth-submit group relative w-full h-14 mt-3 rounded-full font-bold text-sm tracking-wide
                         flex items-center justify-center gap-2 overflow-hidden
                         active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 transition-all duration-300"
            >
              {/* الطبقة الزجاجية الزرقاء */}
              <span
                className="absolute inset-0 rounded-full backdrop-blur-xl"
                style={{ backgroundColor: "var(--app-btn)", opacity: 0.92 }}
              />
              {/* تدرج أزرق ناعم */}
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%, rgba(0,0,0,0.08))" }}
              />
              {/* لمعة علوية زجاجية */}
              <span className="absolute top-0 inset-x-3 h-1/2 rounded-t-full bg-gradient-to-b from-white/40 to-transparent" />
              {/* بريق متحرك يمر عند المرور */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out
                               bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              {/* حلقة خارجية ناعمة */}
              <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/35" />

              {/* المحتوى */}
              <span className="relative z-10 flex items-center gap-2 text-white drop-shadow-sm">
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === "login" && "تسجيل الدخول"}
                    {mode === "signup" && "إنشاء حساب"}
                    {mode === "forgot" && "إرسال رابط الاستعادة"}
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* روابط التبديل */}
          <div className="text-center text-xs text-muted-foreground pt-5">
            {mode === "login" && (
              <>ليس لديك حساب؟{" "}
                <button onClick={() => setMode("signup")} className="text-foreground font-bold hover:underline">
                  أنشئ حساب
                </button>
              </>
            )}
            {mode === "signup" && (
              <>لديك حساب بالفعل؟{" "}
                <button onClick={() => setMode("login")} className="text-foreground font-bold hover:underline">
                  دخول
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-foreground font-bold hover:underline">
                ← العودة لتسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .auth-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          animation: auth-float 18s ease-in-out infinite;
        }
        .auth-blob-1 {
          width: 350px; height: 350px;
          background: hsl(var(--primary) / 0.7);
          top: -120px; right: -100px;
        }
        .auth-blob-2 {
          width: 300px; height: 300px;
          background: hsl(var(--accent) / 0.5);
          bottom: -100px; left: -80px;
          animation-delay: 6s;
        }
        .auth-blob-3 {
          width: 260px; height: 260px;
          background: hsl(var(--primary-deep) / 0.5);
          top: 40%; right: 30%;
          animation-delay: 12s;
        }
        @keyframes auth-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 40px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

// === مكوّن الإدخال الزجاجي ===
type GlassInputProps = {
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  dir?: "ltr" | "rtl";
  rightIcon?: React.ElementType;
  onRightClick?: () => void;
};

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(function GlassInput(
  {
    icon: Icon, value, onChange, placeholder, type = "text", required, minLength, maxLength, dir,
    rightIcon: RightIcon, onRightClick,
  },
  ref,
) {
  return (
    <div className="relative group">
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition">
        <Icon className="w-4 h-4" />
      </div>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        dir={dir}
        className="w-full h-12 pr-10 pl-10 rounded-2xl glass border border-glass-border text-sm font-medium outline-none transition focus:border-foreground/50 focus:bg-card placeholder:text-muted-foreground/70"
      />
      {RightIcon && (
        <button
          type="button"
          onClick={onRightClick}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
        >
          <RightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

const GoogleIcon = forwardRef<SVGSVGElement>(function GoogleIcon(_, ref) {
  return (
    <svg ref={ref} width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5c-2 1.4-4.5 2.2-7.2 2.2-5.3 0-9.7-3.4-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.8l6.2 5C41.6 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
});
