// ====================================================================
// Welcome - صفحة ترحيب متحركة بهوية دردشاتي الزجاجية
// ====================================================================

import { useNavigate } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";
import { MessageCircle, Sparkles, ArrowLeft, Users, Shield } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const appName = settings.app_name || "دردشاتي";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col items-center justify-between px-6 py-10">
      {/* خلفية متحركة - فقاعات زجاجية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>

      {/* جسيمات صغيرة */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 17) % 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${6 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      {/* الشعار العائم */}
      <div className="relative z-10 mt-8 anim-fade-in">
        <div className="logo-float relative">
          <div className="w-28 h-28 rounded-[2.5rem] glass-thick shadow-float flex items-center justify-center relative overflow-hidden border border-white/50">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-12 h-12 icon-style" />
            )}
          </div>
          <div className="absolute -inset-3 rounded-[2.8rem] border border-white/40 logo-ring" />
          <div className="absolute -inset-6 rounded-[3.2rem] border border-white/25 logo-ring-2" />
        </div>
      </div>

      {/* النص الرئيسي */}
      <div className="relative z-10 text-center max-w-md anim-slide-up">
        <span className="inline-block px-4 py-1.5 rounded-full glass-thick text-[10px] font-bold tracking-[0.4em] mb-5 border border-white/50">
          {settings.app_tagline || "CHAT • CONNECT • LEAD"}
        </span>
        <h1 className="text-5xl font-black tracking-[0.15em] mb-4 text-theme">
          {appName}
        </h1>
        <p className="text-foreground/70 text-base leading-relaxed mb-8 px-4 font-medium">
          منصة دردشة عربية حديثة بتصميم زجاجي أنيق<br />
          تواصل، شارك، وأبدع بحرية
        </p>

        {/* بطاقات المزايا */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: MessageCircle, label: "محادثات فورية" },
            { icon: Users, label: "غرف جماعية" },
            { icon: Shield, label: "أمان عالي" },
          ].map((f, i) => (
            <div
              key={i}
              className="glass-thick rounded-[1.8rem] p-3 anim-scale-in feature-card border border-white/45"
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}
            >
              <f.icon className="w-5 h-5 mx-auto mb-1.5 icon-style" />
              <p className="text-[10px] font-bold text-foreground/80">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* الأزرار */}
      <div className="relative z-10 w-full max-w-md space-y-3 anim-slide-up" style={{ animationDelay: "0.3s" }}>
        <button
          onClick={() => navigate("/auth?mode=signup")}
          className="btn-primary w-full h-16 rounded-[2.5rem] font-black text-base shadow-float flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          ابدأ الآن مجاناً
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/auth?mode=login")}
          className="w-full h-16 rounded-[2.5rem] glass-thick font-bold text-base hover:bg-white/70 transition active:scale-[0.98] text-theme border border-white/55"
        >
          لدي حساب بالفعل
        </button>
      </div>

      <style>{`
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.6;
          animation: blob-float 20s ease-in-out infinite;
        }
        .blob-1 {
          width: 380px; height: 380px;
          background: hsl(var(--primary) / 0.7);
          top: -100px; right: -80px;
          animation-delay: 0s;
        }
        .blob-2 {
          width: 320px; height: 320px;
          background: hsl(var(--primary) / 0.5);
          bottom: -80px; left: -60px;
          animation-delay: 5s;
        }
        .blob-3 {
          width: 240px; height: 240px;
          background: hsl(280 60% 80% / 0.4);
          top: 40%; left: -100px;
          animation-delay: 10s;
        }
        .blob-4 {
          width: 280px; height: 280px;
          background: hsl(200 70% 80% / 0.4);
          top: 30%; right: -100px;
          animation-delay: 15s;
        }
        @keyframes blob-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.1); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }

        .particle {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: hsl(var(--foreground) / 0.15);
          animation: particle-float linear infinite;
        }
        @keyframes particle-float {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; }
          100% { transform: translateY(-120vh) scale(0.5); opacity: 0; }
        }

        .logo-float { animation: logo-bob 3s ease-in-out infinite; }
        @keyframes logo-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .logo-ring { animation: ring-spin 8s linear infinite; }
        .logo-ring-2 { animation: ring-spin 12s linear infinite reverse; }
        @keyframes ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .feature-card { transition: transform 0.2s; }
        .feature-card:hover { transform: translateY(-4px); }
      `}</style>
    </div>
  );
}
