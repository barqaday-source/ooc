import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dardshati.app", // يجب أن يطابق تماماً "Package Name" في Firebase
  appName: "دردشة",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true, // للسماح بتحميل الموارد عبر HTTPS
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      // الـ Client ID الخاص بـ Android (للتطبيق نفسه)
      androidClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      // الـ Client ID الخاص بـ Web (يُستخدم للـ OIDC مع Supabase)
      serverClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
