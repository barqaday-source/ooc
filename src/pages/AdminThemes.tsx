// ====================================================================
// AdminThemes - Phase 4: إدارة قوالب الثيمات (للأدمن فقط)
// ====================================================================
// يستطيع الأدمن:
//   - استعراض كل القوالب الجاهزة + المخصصة
//   - تفعيل أي قالب بضغطة (Trigger يطبّقه على كل المستخدمين فوراً)
//   - إنشاء قالب جديد بأي لون
//   - حذف القوالب المخصصة (الجاهزة محمية)
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase, type ThemePreset } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  ArrowRight, Loader2, Plus, Trash2, Check, Palette, Sparkles, Lock,
  Paintbrush,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminThemes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingColor, setSavingColor] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "", primary_hue: "226", primary_sat: "56", primary_light: "55",
  });

  const load = async () => {
    const { data, error } = await supabase
      .from("theme_presets")
      .select("*")
      .order("is_builtin", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast.error("فشل التحميل", { description: error.message });
    else setPresets((data as ThemePreset[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("theme-presets-live")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "theme_presets" },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const activate = async (p: ThemePreset) => {
    if (p.is_active) return;
    const { error } = await supabase
      .from("theme_presets")
      .update({ is_active: true })
      .eq("id", p.id);
    if (error) toast.error("فشل التفعيل", { description: error.message });
    else toast.success(`✅ تم تطبيق "${p.name}" على كل المستخدمين`);
  };

  const removePreset = async (p: ThemePreset) => {
    if (p.is_builtin) { toast.error("لا يمكن حذف القوالب الجاهزة"); return; }
    if (p.is_active)  { toast.error("لا يمكن حذف القالب المُفعَّل"); return; }
    if (!confirm(`حذف القالب "${p.name}"؟`)) return;
    const { error } = await supabase.from("theme_presets").delete().eq("id", p.id);
    if (error) toast.error("فشل الحذف", { description: error.message });
    else toast.success("حُذف القالب");
  };

  const createPreset = async () => {
    if (!draft.name.trim()) { toast.error("ادخل اسماً للقالب"); return; }
    const { error } = await supabase.from("theme_presets").insert({
      name: draft.name.trim(),
      primary_hue: draft.primary_hue,
      primary_sat: `${draft.primary_sat}%`,
      primary_light: `${draft.primary_light}%`,
      is_active: false,
      is_builtin: false,
      created_by: user?.id,
    });
    if (error) toast.error("فشل الإنشاء", { description: error.message });
    else {
      toast.success("✅ تم إنشاء القالب");
      setCreating(false);
      setDraft({ name: "", primary_hue: "226", primary_sat: "56", primary_light: "55" });
    }
  };

  const previewColor = `hsl(${draft.primary_hue} ${draft.primary_sat}% ${draft.primary_light}%)`;

  const saveColor = async (
    key: "app_bg_color" | "app_icon_color" | "app_button_color",
    value: string,
  ) => {
    setSavingColor(key);
    const { error } = await updateSetting(key, value);
    setSavingColor(null);
    if (error) toast.error("فشل الحفظ", { description: error.message });
    else toast.success("✅ تم تطبيق اللون فوراً على الجميع");
  };

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
            <h2 className="font-bold text-base flex items-center gap-2">
              <Palette className="w-4 h-4" /> قوالب الثيمات
            </h2>
            <p className="text-[10px] text-muted-foreground">يُطبَّق على كل المستخدمين فوراً</p>
          </div>
          <button onClick={() => setCreating((s) => !s)}
            className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* === ألوان الواجهة الديناميكية === */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Paintbrush className="w-4 h-4" />
              ألوان الواجهة (تُطبَّق فوراً على الجميع)
            </h3>
            <div className="grid gap-3">
              <ColorRow
                label="خلفية التطبيق"
                value={settings.app_bg_color}
                onSave={(v) => saveColor("app_bg_color", v)}
                saving={savingColor === "app_bg_color"}
              />
              <ColorRow
                label="لون الأيقونات والنصوص"
                value={settings.app_icon_color}
                onSave={(v) => saveColor("app_icon_color", v)}
                saving={savingColor === "app_icon_color"}
              />
              <ColorRow
                label="لون الأزرار الرئيسية"
                value={settings.app_button_color}
                onSave={(v) => saveColor("app_button_color", v)}
                saving={savingColor === "app_button_color"}
              />
            </div>
          </div>

          {/* Create form */}
          {creating && (
            <div className="bg-card rounded-3xl p-4 shadow-soft border border-border/50 space-y-3 anim-fade-in">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> قالب جديد
              </h3>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="اسم القالب — مثال: ربيعي"
                className="w-full h-11 px-4 rounded-xl bg-background border border-border outline-none text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <Slider label={`Hue (${draft.primary_hue})`} min={0} max={360}
                  value={draft.primary_hue} onChange={(v) => setDraft({ ...draft, primary_hue: v })} />
                <Slider label={`Sat (${draft.primary_sat}%)`} min={0} max={100}
                  value={draft.primary_sat} onChange={(v) => setDraft({ ...draft, primary_sat: v })} />
                <Slider label={`Light (${draft.primary_light}%)`} min={0} max={100}
                  value={draft.primary_light} onChange={(v) => setDraft({ ...draft, primary_light: v })} />
              </div>
              <div className="h-14 rounded-2xl border border-border" style={{ background: previewColor }} />
              <button onClick={createPreset}
                className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-sm">
                حفظ القالب
              </button>
            </div>
          )}

          {/* Presets list */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {presets.map((p) => {
                const color = `hsl(${p.primary_hue} ${p.primary_sat} ${p.primary_light})`;
                return (
                  <div key={p.id}
                    className={`relative rounded-3xl p-3 shadow-soft border-2 transition ${
                      p.is_active ? "border-foreground" : "border-border/40"
                    }`}>
                    <button onClick={() => activate(p)}
                      className="block w-full aspect-square rounded-2xl mb-2 active:scale-95 transition relative overflow-hidden"
                      style={{ background: color }}>
                      {p.is_active && (
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
                          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                            <Check className="w-5 h-5 text-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold truncate flex-1">{p.name}</p>
                      {p.is_builtin ? (
                        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      ) : (
                        <button onClick={() => removePreset(p)}
                          disabled={p.is_active}
                          className="w-6 h-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center disabled:opacity-30">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {p.is_active && (
                      <span className="absolute -top-2 -right-2 text-[9px] bg-foreground text-background px-2 py-0.5 rounded-full font-bold">
                        مُفعَّل
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && presets.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              لا توجد قوالب — اضغط + لإضافة الأول
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/** صف اختيار لون واحد مع color picker + معاينة + زر حفظ */
function ColorRow({
  label, value, onSave, saving,
}: { label: string; value: string; onSave: (v: string) => void; saving: boolean }) {
  const [local, setLocal] = useState(value || "#000000");
  // مزامنة عند تغيّر القيمة من Realtime
  useEffect(() => { setLocal(value || "#000000"); }, [value]);

  const dirty = local.toLowerCase() !== (value || "").toLowerCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/60 border border-border/40">
      <input
        type="color"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"
        aria-label={label}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{local.toUpperCase()}</p>
      </div>
      <button
        onClick={() => onSave(local)}
        disabled={!dirty || saving}
        className="h-9 px-3 rounded-xl bg-foreground text-background text-xs font-bold disabled:opacity-30 flex items-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        حفظ
      </button>
    </div>
  );
}

function Slider({
  label, min, max, value, onChange,
}: { label: string; min: number; max: number; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground px-1 mb-1 block">{label}</label>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-foreground" />
    </div>
  );
}
