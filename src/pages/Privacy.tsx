// ====================================================================
// Privacy.tsx — صفحة سياسة الخصوصية
// تستخدم الإطار العام AppShell + ألوان الثيم الديناميكية
// ====================================================================

import AppShell from "@/components/AppShell";
import { Shield, Lock, Eye, MessageSquare, Trash2, Mail } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

const SECTIONS = [
  {
    icon: Shield,
    title: "1) من نحن",
    body: "تطبيق دردشاتي منصّة محادثات اجتماعية تتيح إنشاء غرف عامة ومحادثات خاصة مشفّرة بين طرفين. هدفنا توفير تجربة آمنة ومريحة باللغة العربية، مع احترام كامل لخصوصية المستخدم.",
  },
  {
    icon: Eye,
    title: "2) ما البيانات التي نجمعها",
    body: "نجمع فقط ما يلزم لتشغيل التطبيق: اسم المستخدم، الاسم الظاهر، الصورة الرمزية، تاريخ آخر ظهور، والرسائل التي ترسلها داخل الغرف والمحادثات الخاصة. لا نجمع جهات الاتصال أو الموقع الجغرافي أو سجلّ التصفّح.",
  },
  {
    icon: MessageSquare,
    title: "3) الرسائل والمحادثات",
    body: "تُحفظ الرسائل في قاعدة بياناتنا الآمنة حتى تبقى متاحة لك في كل أجهزتك. المحادثات الخاصة 1×1 مرئية فقط للطرفين ولا يمكن لأي مستخدم آخر الاطلاع عليها. لك الحق في حذف أي رسالة من عندك فقط، أو حذفها للجميع إن كنت صاحبها.",
  },
  {
    icon: Lock,
    title: "4) كيف نحمي بياناتك",
    body: "نستخدم سياسات صلاحيات صارمة على مستوى الصف (Row Level Security) في قاعدة البيانات، بحيث لا يستطيع أي مستخدم الوصول لبيانات غيره. الاتصال بالخادم مشفّر عبر HTTPS، وكلمات السر مُجزّأة (hashed) ولا تُخزَّن كنص واضح.",
  },
  {
    icon: Trash2,
    title: "5) حذف حسابك",
    body: "يمكنك في أي وقت طلب حذف حسابك من خلال صفحة الإعدادات أو بالتواصل مع الدعم. عند الحذف تُزال بياناتك الشخصية ورسائلك الخاصة نهائياً.",
  },
  {
    icon: Mail,
    title: "6) التواصل معنا",
    body: "لأي استفسار حول الخصوصية أو لحذف بياناتك، تواصل معنا عبر صفحة الدعم الفني من القائمة الجانبية. نلتزم بالرد خلال 72 ساعة كحدّ أقصى.",
  },
];

export default function Privacy() {
  const { settings } = useAppSettings();
  return (
    <AppShell>
      <div className="px-4 py-4 space-y-4 max-w-[500px] mx-auto" dir="rtl">
        {/* بطاقة رأس */}
        <div className="glass-thick rounded-[2rem] border border-white/50 p-5 text-center">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "var(--app-btn)" }}
          >
            <Shield className="w-7 h-7 text-white" strokeWidth={1.7} />
          </div>
          <h1 className="text-lg font-black mb-1">سياسة الخصوصية</h1>
          <p className="text-xs opacity-70 leading-relaxed">
            خصوصيتك مسؤوليتنا. هذه الصفحة توضّح كيف يتعامل {settings.app_name || "دردشاتي"} مع
            بياناتك.
          </p>
        </div>

        {/* الأقسام */}
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="glass rounded-[1.75rem] border border-white/40 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full glass-thick border border-white/60 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-foreground/85" strokeWidth={1.7} />
              </div>
              <h2 className="font-bold text-sm">{title}</h2>
            </div>
            <p className="text-[13px] leading-relaxed opacity-85">{body}</p>
          </div>
        ))}

        <p className="text-[11px] text-center opacity-50 pt-2">
          آخر تحديث: مايو 2026 — {settings.app_name || "دردشاتي"}
        </p>
      </div>
    </AppShell>
  );
}
