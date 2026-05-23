// ====================================================================
// Welcome - صفحة ترحيب متحركة بهوية دردشاتي الزجاجية الحديثة
// ====================================================================

import { useNavigate } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";
import { MessageCircle, Sparkles, ArrowLeft, Users, Shield } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const appName = settings.app_name || "دردشاتي";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col items-center justify-between px-8 py-14">
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
      <div className="relative z-10 mt-6 anim-fade-in">
        <div className="logo-float relative">
          <div className="w-24 h-24 rounded-[2rem] glass-thick shadow-float flex items-center justify-center relative overflow-hidden border border-white/50">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-10 h-10 icon-style" />
            )}
          </div>
          <div className="absolute -inset-2 rounded-[2.2rem] border border-white/40 logo-ring" />
          <div className="absolute -inset-4 rounded-[2.5rem] border border-white/25 logo-ring-2" />
        </div>
      </div>

      {/* النص الرئيسي والمزايا في مجموعة واحدة */}
      <div className="relative z-10 text-center max-w-sm anim-slide-up w-full my-auto flex flex-col items-center justify-center">
        <h1 className="text-4xl font-black tracking-wide mb-3 text-theme">
          {appName}
        </h1>
        <p className="text-foreground/70 text-sm leading-relaxed mb-10 font-medium">
          تواصل، شارك، وأبدع بحرية
        </p>

        {/* المزايا العصرية (عائمة وبدون إطارات بيضاء) */}
        <div className="grid grid-cols-3 gap-6 w-full px-2">
          {[
            { icon: MessageCircle, label: "محادثات فورية" },
            { icon: Users, label: "غرف جماعية" },
            { icon: Shield, label: "أمان عالي" },
          ].map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center transition-transform duration-200 hover:-translate-y-1"
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}
            >
              <f.icon className="w-5 h-5 mb-2 opacity-80 text-theme stroke-[1.5]" />
              <p className="text-[11px] font-semibold text-foreground/60 whitespace-nowrap">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* مجموعة الأزرار السفلية */}
      <div className="relative z-10 w-full max-w-xs space-y-4 anim-slide-up flex flex-col items-center" style={{ animationDelay: "0.3s" }}>
        <button
          onClick={() => navigate("/auth?mode=signup")}
          className="btn-primary w-full h-14 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          ابدأ الآن مجاناً
          <ArrowLeft className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => navigate("/auth?mode=login")}
          className="text-sm font-semibold text-theme hover:underline bg-transparent border-none py-2 px-4 transition active:scale-[0.98]"
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
          50% { transform: translateY(-8px); }
        }
        .logo-ring { animation: ring-spin 8s linear infinite; }
        .logo-ring-2 { animation: ring-spin 12s linear infinite reverse; }
        @keyframes ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
