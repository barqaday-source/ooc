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
  appId: "com.joud.chat",
  appName: "دردشة",
  webDir: "dist",
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#F2F3F1",
  },
};

export default config;