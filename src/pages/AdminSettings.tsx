// ====================================================================
// AdminSettings - صفحة إعدادات التطبيق (Phase 3) - للأدمن فقط
// ====================================================================
// تتيح للأدمن تعديل:
//   - اسم التطبيق + الشعار النصي
//   - اللون الأساسي (hue/sat/light) — يُطبَّق فوراً على كل المستخدمين
//   - أرقام التواصل والدعم (هاتف/إيميل/واتساب)
//   - إعلان عام يظهر داخل التطبيق
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAppSettings, AppSettings } from "@/hooks/useAppSettings";
import {
  ArrowRight, Loader2, Save, Palette, Phone, Mail, MessageCircle,
  Megaphone, Type, Sparkles, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS: { name: string; hue: string; sat: string; light: string }[] = [
  { name: "كحلي ناعم",  hue: "226", sat: "56%", light: "84%" },
  { name: "أزرق ملكي", hue: "220", sat: "70%", light: "55%" },
  { name: "بنفسجي",    hue: "270", sat: "60%", light: "65%" },
  { name: "أخضر زمردي", hue: "160", sat: "55%", light: "55%" },
  { name: "وردي",      hue: "340", sat: "75%", light: "70%" },
  { name: "ذهبي",      hue: "40",  sat: "85%", light: "60%" },
  { name: "أحمر دافئ",  hue: "10",  sat: "75%", light: "60%" },
  { name: "تركواز",    hue: "180", sat: "60%", light: "55%" },
];

export default function AdminSettings() {
  const navigate = useNavigate();
  const { settings, updateSetting, refresh } = useAppSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(settings); }, [settings]);

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const applyPreset = (p: typeof PRESET_COLORS[0]) => {
    setDraft((d) => ({
      ...d,
      primary_hue: p.hue, primary_sat: p.sat, primary_light: p.light,
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    const keys: (keyof AppSettings)[] = [
      "app_name", "app_tagline", "primary_hue", "primary_sat", "primary_light",
      "logo_url", "support_phone", "support_email", "support_whatsapp", "announcement",
    ];
    let firstError: string | null = null;
    for (const k of keys) {
      if (draft[k] !== settings[k]) {
        const { error } = await updateSetting(k, draft[k]);
        if (error && !firstError) firstError = error.message;
      }
    }
    setSaving(false);
    if (firstError) toast.error("فشل الحفظ", { description: firstError });
    else { toast.success("✅ تم الحفظ — الإعدادات سُرّيت لكل المستخدمين فوراً"); refresh(); }
  };

  const previewColor = `hsl(${draft.primary_hue} ${draft.primary_sat} ${draft.primary_light})`;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <AppShell>
      <div className="anim-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/admin")}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-base">إعدادات التطبيق</h2>
            <p className="text-[10px] text-muted-foreground">يُطبَّق على كل المستخدمين فوراً</p>
          </div>
          <div className="w-10 h-10 rounded-xl shadow-soft border border-border" style={{ background: previewColor }} />
        </div>

        <div className="p-4 space-y-5">
          {/* الهوية */}
          <Section icon={Type} title="هوية التطبيق">
            <Field label="اسم التطبيق">
              <input value={draft.app_name} onChange={(e) => set("app_name", e.target.value)}
                maxLength={30} className="input-base" placeholder="دردشاتي" />
            </Field>
            <Field label="الشعار النصي (Tagline)">
              <input value={draft.app_tagline} onChange={(e) => set("app_tagline", e.target.value)}
                maxLength={60} className="input-base" placeholder="Chat • Connect • Lead" />
            </Field>
            <Field label="رابط الشعار (URL اختياري)">
              <input value={draft.logo_url} onChange={(e) => set("logo_url", e.target.value)}
                dir="ltr" className="input-base text-left" placeholder="https://..." />
            </Field>
          </Section>

          {/* الثيم */}
          <Section icon={Palette} title="اللون الأساسي للتطبيق">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((p) => {
                const active = draft.primary_hue === p.hue && draft.primary_sat === p.sat && draft.primary_light === p.light;
                return (
                  <button key={p.name} onClick={() => applyPreset(p)}
                    className={`aspect-square rounded-2xl shadow-soft border-2 transition relative ${
                      active ? "border-foreground scale-95" : "border-transparent active:scale-95"
                    }`}
                    style={{ background: `hsl(${p.hue} ${p.sat} ${p.light})` }}
                    title={p.name}>
                    {active && <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-foreground" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Field label={`Hue (${draft.primary_hue})`}>
                <input type="range" min="0" max="360" value={draft.primary_hue}
                  onChange={(e) => set("primary_hue", e.target.value)} className="w-full accent-foreground" />
              </Field>
              <Field label={`Sat (${draft.primary_sat})`}>
                <input type="range" min="0" max="100" value={parseInt(draft.primary_sat) || 0}
                  onChange={(e) => set("primary_sat", `${e.target.value}%`)} className="w-full accent-foreground" />
              </Field>
              <Field label={`Light (${draft.primary_light})`}>
                <input type="range" min="0" max="100" value={parseInt(draft.primary_light) || 0}
                  onChange={(e) => set("primary_light", `${e.target.value}%`)} className="w-full accent-foreground" />
              </Field>
            </div>

            <div className="mt-3 p-3 rounded-2xl border border-border" style={{ background: previewColor }}>
              <p className="text-xs font-semibold" style={{ color: "hsl(var(--primary-foreground))" }}>
                🎨 معاينة اللون — هذا ما سيراه المستخدمون
              </p>
            </div>

            <button onClick={() => applyPreset(PRESET_COLORS[0])}
              className="mt-2 w-full h-10 rounded-xl bg-card border border-border text-xs font-semibold flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> استعادة اللون الافتراضي
            </button>
          </Section>

          {/* التواصل */}
          <Section icon={Phone} title="معلومات التواصل والدعم">
            <Field label="رقم الدعم الفني" icon={Phone}>
              <input value={draft.support_phone} onChange={(e) => set("support_phone", e.target.value)}
                dir="ltr" className="input-base text-left" placeholder="+966500000000" />
            </Field>
            <Field label="البريد الإلكتروني" icon={Mail}>
              <input type="email" value={draft.support_email} onChange={(e) => set("support_email", e.target.value)}
                dir="ltr" className="input-base text-left" placeholder="support@dardashati.local" />
            </Field>
            <Field label="رقم/رابط واتساب" icon={MessageCircle}>
              <input value={draft.support_whatsapp} onChange={(e) => set("support_whatsapp", e.target.value)}
                dir="ltr" className="input-base text-left" placeholder="+966500000000" />
            </Field>
          </Section>

          {/* الإعلان */}
          <Section icon={Megaphone} title="إعلان عام للمستخدمين">
            <Field label="نص الإعلان (يظهر لكل المستخدمين)">
              <textarea value={draft.announcement} onChange={(e) => set("announcement", e.target.value)}
                rows={3} maxLength={200}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border outline-none text-sm resize-none"
                placeholder="مرحباً بكم في دردشاتي..." />
            </Field>
          </Section>

          {/* حفظ */}
          <button onClick={saveAll} disabled={!isDirty || saving}
            className="w-full h-14 rounded-2xl bg-foreground text-background font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition shadow-elev">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> حفظ كل التعديلات</>}
          </button>
        </div>
      </div>

      <style>{`
        .input-base {
          width: 100%; height: 48px; padding: 0 14px;
          border-radius: 0.875rem;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          font-size: 0.875rem; outline: none;
          transition: border-color .2s;
        }
        .input-base:focus { border-color: hsl(var(--foreground) / 0.4); }
      `}</style>
    </AppShell>
  );
}

// ----------- مكوّنات صغيرة -----------

function Section({
  icon: Icon, title, children,
}: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl p-4 shadow-soft border border-border/50 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({
  label, children, icon: Icon,
}: { label: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground px-1 mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      {children}
    </div>
  );
}
