import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dardshati.app", // تأكد من مطابقة هذا لاسم الحزمة في Firebase تماماً
  appName: "دردشة",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // إزالة allowNavigation="*" لأنها قد تسبب ثغرات أمنية وتؤثر على عمل Google Auth الأصلي
  },
  plugins: {
    GoogleAuth: {
      // هذه الإعدادات تجبر المكتبة على استخدام Native SDK بدلاً من المتصفح
      scopes: ["profile", "email"],
      // ضع هنا الـ Client ID الخاص بـ ANDROID الذي استخرجته من Firebase
      androidClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      // الـ serverClientId هو الخاص بالخلفية (Supabase)
      serverClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
