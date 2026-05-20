// ====================================================================
// Capacitor Configuration - إعداد التطبيق للموبايل (iOS / Android)
// ====================================================================
// بعد التصدير لـ GitHub:
//   npm install
//   npx cap add ios       # و/أو
//   npx cap add android
//   npm run build
//   npx cap sync
//   npx cap run ios       # أو android
// ====================================================================

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.9e7ffc3e9f0d4063b851d511cbef7b8d",
  appName: "دردشة",
  webDir: "dist",
  server: {
    // Hot-reload من preview Lovable أثناء التطوير.
    // احذف هذا القسم قبل بناء الـ release النهائي للنشر على المتاجر.
    url: "https://9e7ffc3e-9f0d-4063-b851-d511cbef7b8d.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#F2F3F1",
  },
};

export default config;
