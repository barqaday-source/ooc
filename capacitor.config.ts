import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.joud.chat",
  appName: "دردشة",
  webDir: "dist",
  server: {
    androidScheme: "https",
    allowNavigation: ["*"], // للسماح بتسجيل الدخول الأصلي
  },
  android: {
    // هذا يلغي أي ستايلات افتراضية قد تشوه كروتك الزجاجية
    backgroundColor: "#00000000", 
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "ضع_الـ_ID_هنا.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
