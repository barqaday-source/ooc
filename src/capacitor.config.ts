import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.drdshati.app", // تأكد من مطابقة هذا لاسم الحزمة في Firebase تماماً
  appName: "دردشة",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      // استخدم نفس الـ Client ID الخاص بـ ANDROID
      androidClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
      // الـ serverClientId هو الخاص بالويب/الخلفية (Supabase)
      serverClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
