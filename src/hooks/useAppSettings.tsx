// ====================================================================
// useAppSettings - إعدادات التطبيق الديناميكية (الأدمن يعدّلها فوراً للجميع)
// ====================================================================
// كيف تعمل:
//   1) عند تشغيل التطبيق نقرأ كل صفوف public.app_settings مرة واحدة.
//   2) نطبّق "primary_hue/sat/light" على CSS variable --primary فوراً.
//   3) نشترك على Realtime channel — أي تعديل من الأدمن يُحدّث الجميع لحظياً.
//   4) نوفّر دوال get(key) و update(key,value) للاستخدام داخل التطبيق.
//
// ✅ آمن للحذف: لو لم يوجد الجدول/البذور، يستخدم الافتراضيات بدون كسر التطبيق.
// ====================================================================

import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

export type AppSettings = {
  app_name: string;
  app_tagline: string;
  primary_hue: string;
  primary_sat: string;
  primary_light: string;
  logo_url: string;
  support_phone: string;
  support_email: string;
  support_whatsapp: string;
  announcement: string;
  /** ألوان ديناميكية (Hex) يتحكم بها الأدمن */
  app_bg_color: string;
  app_icon_color: string;
  app_button_color: string;
};

const DEFAULTS: AppSettings = {
  app_name: "دردشاتي",
  app_tagline: "دردشة • تواصل • غرف",
  primary_hue: "212",
  primary_sat: "100%",
  primary_light: "86%",
  logo_url: "",
  support_phone: "",
  support_email: "",
  support_whatsapp: "",
  announcement: "",
  app_bg_color: "#B6D6FF",
  app_icon_color: "#1A1821",
  app_button_color: "#5F9EF4",
};

interface Ctx {
  settings: AppSettings;
  loading: boolean;
  updateSetting: (key: keyof AppSettings, value: string) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<Ctx | undefined>(undefined);

/**
 * يطبّق اللون الأساسي على CSS variable --primary بصيغة HSL.
 * مثال: applyPrimary("226", "56%", "84%") => --primary: 226 56% 84%
 */
function applyPrimary(hue: string, sat: string, light: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", `${hue} ${sat} ${light}`);
  root.style.setProperty("--accent", `${hue} ${sat} ${light}`);
  // نسخة أغمق للـ ring في الوضع الليلي
  root.style.setProperty("--ring", `${hue} ${sat} ${light}`);
}

/**
 * يطبّق ألوان الواجهة الديناميكية (Hex) كمتغيرات CSS:
 *   --app-bg, --app-icon, --app-btn
 * تُستخدم في glass-card, btn-primary, .text-theme...
 */
function applyDynamicColors(bg: string, icon: string, btn: string) {
  const root = document.documentElement;
  // في الوضع الليلي نُبقي ألوان التطبيق الداكنة من index.css ونتجاهل ألوان الأدمن
  const isDark = root.classList.contains("dark");
  if (!isDark) {
    if (bg)   root.style.setProperty("--app-bg", bg);
    if (icon) root.style.setProperty("--app-icon", icon);
  } else {
    root.style.removeProperty("--app-bg");
    root.style.removeProperty("--app-icon");
  }
  // زر الإجراءات يظل من تخصيص الأدمن في كلا الوضعين
  if (btn)  root.style.setProperty("--app-btn", btn);
}

/** يطبّق اسم التطبيق على document.title */
function applyTitle(name: string) {
  document.title = name;
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error || !data) {
      // الجدول غير موجود أو فشل الاتصال => استخدم الافتراضيات
      applyPrimary(DEFAULTS.primary_hue, DEFAULTS.primary_sat, DEFAULTS.primary_light);
      applyDynamicColors(DEFAULTS.app_bg_color, DEFAULTS.app_icon_color, DEFAULTS.app_button_color);
      applyTitle(DEFAULTS.app_name);
      setLoading(false);
      return;
    }
    const merged: AppSettings = { ...DEFAULTS };
    (data as { key: string; value: string | null }[]).forEach((row) => {
      if (row.key in merged) {
        (merged as Record<string, string>)[row.key] = row.value ?? "";
      }
    });
    setSettings(merged);
    applyPrimary(merged.primary_hue, merged.primary_sat, merged.primary_light);
    applyDynamicColors(merged.app_bg_color, merged.app_icon_color, merged.app_button_color);
    applyTitle(merged.app_name);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // اشتراك Realtime: أي تغيير من الأدمن يُحدّث الكل
    const ch = supabase
      .channel("app-settings-live")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => { load(); }
      )
      .subscribe();
    // إعادة تطبيق الألوان عند تبديل الوضع الليلي/النهاري
    const onThemeChange = () => { load(); };
    window.addEventListener("theme-changed", onThemeChange);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("theme-changed", onThemeChange);
    };
  }, [load]);

  const updateSetting = useCallback(
    async (key: keyof AppSettings, value: string) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (!error) {
        setSettings((s) => ({ ...s, [key]: value }));
        if (key === "primary_hue" || key === "primary_sat" || key === "primary_light") {
          const next = { ...settings, [key]: value };
          applyPrimary(next.primary_hue, next.primary_sat, next.primary_light);
        }
        if (key === "app_bg_color" || key === "app_icon_color" || key === "app_button_color") {
          const next = { ...settings, [key]: value };
          applyDynamicColors(next.app_bg_color, next.app_icon_color, next.app_button_color);
        }
        if (key === "app_name") applyTitle(value);
      }
      return { error: error as Error | null };
    },
    [settings],
  );

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSetting, refresh: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used inside <AppSettingsProvider>");
  return ctx;
}
