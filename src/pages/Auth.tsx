// ====================================================================
// Auth - تسجيل دخول / إنشاء حساب / نسيت كلمة المرور (تصميم زجاجي حديث)
// ====================================================================

import { useState, useEffect, FormEvent, forwardRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, User, ArrowRight, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import appConfig from "@/lib/app.config.json"; // ملف المفاتيح الصارمة

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings } = useAppSettings();
  const { user, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>(() => {
    const m = params.get("mode");
    return m === "signup" || m === "forgot"? m : "login";
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

  const appName = settings?.app_name || "دردشاتي";

  const getRedirectURL = () => {
    const url = window.location.origin;
    return `${url}/chat`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (mode === "forgot") {
      if (!username.trim()) {
        toast.error("يرجى إدخال اسم المستخدم");
        return;
      }
      setSubmitting(true);
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, "");
      const resetEmail = `${cleanUsername}@dardashati.local`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSubmitting(false);
      if (error) {
        toast.error("فشل إرسال رابط الاستعادة", { description: error.message });
      } else {
        toast.success("تم إرسال رابط الاستعادة ✉️", {
          description: "تفقد بريدك الإلكتروني واتبع الرابط لتعيين كلمة مرور جديدة",
        });
        setMode("login");
        setUsername("");
      }
      return;
    }

    if (mode === "signup" &&!agree) {
      toast.error("يجب الموافقة على معالجة البيانات الشخصية");
      return;
    }

    if (!username.trim()) {
      toast.error("يرجى إدخال اسم المستخدم");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setSubmitting(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, "");
    const email = `${cleanUsername}@dardashati.local`;

    const { error } =
      mode === "login"
      ? await signIn(email, password)
        : await signUp(email, password, username.trim(), true);

    setSubmitting(false);

    if (error) {
      toast.error(mode === "login"? "فشل تسجيل الدخول" : "فشل إنشاء الحساب", {
        description: error.message,
      });
    } else {
      toast.success(mode === "login"? `أهلاً بعودتك إلى ${appName}` : "تم إنشاء حسابك بنجاح");
      navigate("/chat");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectURL(),
        queryParams: {
          client_id: appConfig.GOOGLE_CLIENT_ID_ANDROID, // إجبار النظام على هذا المعرف فقط
          access_type: "offline",
          prompt: "select_account",
          // هذا الخيار يجبر النظام على عدم استخدام كروت داخلية ويفتح متصفح النظام
          signing_config_enabled: appConfig.SIGNING_CONFIG_ENABLED,
        },
        skipBrowserRedirect: false, // يجبر Supabase على فتح متصفح النظام Native في Capacitor
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

        {/* اسم التطبيق فقط بدون لوقو */}
        <div className="flex flex-col items-center mb-6 anim-fade-in">
          <h1 className="text-2xl font-light tracking-[0.3em]">{appName}</h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.4em] mt-1 font-light">
            {settings?.app_tagline || "CHAT • CONNECT • LEAD"}
          </p>
        </div>

        {/* البطاقة الزجاجية الرئيسية */}
        <div className="glass-card shadow-float p-6 page-transition">
          <h2 className="text-2xl font-light text-center mb-1">
            {mode === "login" && "أهلاً بعودتك"}
            {mode === "signup" && "إنشاء حساب جديد"}
            {mode === "forgot" && "استعادة كلمة المرور"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-6 font-light">
            {mode === "login" && "سجّل دخولك للمتابعة"}
            {mode === "signup" && "ابدأ رحلتك معنا الآن"}
            {mode === "forgot" && "أدخل اسم المستخدم لإرسال رابط الاستعادة"}
          </p>

          {/* Google - فقط في login/signup */}
          {mode!== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full h-12 mb-4 rounded-2xl glass border-glass-border flex items-center justify-center gap-3 font-light text-sm hover:bg-card active:scale-[0.98] transition disabled:opacity-60"
              >
                {googleLoading? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                {mode === "signup"? "متابعة عبر Google" : "الدخول عبر Google"}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground tracking-wider font-light">أو</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <GlassInput
              icon={User}
              value={username}
              onChange={setUsername}
              placeholder="اسم المستخدم"
              required
              maxLength={30}
            />

            {mode!== "forgot" && (
              <GlassInput
                icon={Lock}
                type={showPassword? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="كلمة المرور"
                required
                minLength={6}
                dir="ltr"
                rightIcon={showPassword? EyeOff : Eye}
                onRightClick={() => setShowPassword((v) =>!v)}
              />
            )}

            {mode === "signup" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none pt-1 font-light">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="w-4 h-4 rounded accent-foreground"
                />
                أوافق على <span className="text-foreground font-medium">شروط الاستخدام</span> ومعالجة البيانات
              </label>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-foreground font-medium hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            {/* زر الإرسال — زجاجي مفرغ شفاف */}
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full h-14 mt-3 rounded-full font-medium text-sm tracking-wide
                         border border-primary/30 bg-primary/5 backdrop-blur-md text-foreground
                         flex items-center justify-center gap-2 overflow-hidden
                         hover:bg-primary/10 hover:border-primary/50
                         active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                {submitting? (
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
          <div className="text-center text-xs text-muted-foreground pt-5 font-light">
            {mode === "login" && (
              <>
                ليس لديك حساب؟{" "}
                <button onClick={() => setMode("signup")} className="text-foreground font-medium hover:underline">
                  أنشئ حساب
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                لديك حساب بالفعل؟{" "}
                <button onClick={() => setMode("login")} className="text-foreground font-medium hover:underline">
                  دخول
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-foreground font-medium hover:underline">
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
    icon: Icon,
    value,
    onChange,
    placeholder,
    type = "text",
    required,
    minLength,
    maxLength,
    dir,
    rightIcon: RightIcon,
    onRightClick,
  },
  ref
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
        className="w-full h-12 pr-10 pl-10 rounded-2xl glass border border-glass-border text-sm font-light outline-none transition focus:border-foreground/50 focus:bg-card placeholder:text-muted-foreground/70"
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

const GoogleIcon = () => {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5c-2 1.4-4.5 2.2-7.2 2.2-5.3 0-9.7-3.4-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.8l6.2 5C41.6 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
};
