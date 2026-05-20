// ====================================================================
// Splash - شاشة الترحيب الأولى - بهوية دردشاتي
// ====================================================================

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

interface Props { onDone: () => void }

export default function Splash({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const { settings } = useAppSettings();

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1800);
    const t2 = setTimeout(onDone, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-foreground/10 blur-3xl" />
      </div>

      <div className="relative anim-scale-in">
        <div className="w-32 h-32 rounded-[2.5rem] bg-foreground text-background flex items-center justify-center shadow-float relative overflow-hidden">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.app_name} className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-12 h-12" />
          )}
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary border-4 border-background" />
        </div>
      </div>

      <div className="relative mt-8 text-center anim-fade-in">
        <h1 className="text-4xl font-black tracking-[0.4em]">{settings.app_name || "دردشاتي"}</h1>
        <p className="text-xs text-muted-foreground mt-2 tracking-widest uppercase">{settings.app_tagline}</p>
      </div>

      <div className="relative mt-12 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-foreground/60"
            style={{ animation: `pulse-live 1s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
