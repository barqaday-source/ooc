import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dardshati.app",
  appName: "دردشة",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      androidClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      serverClientId: "62134907551-t9cac5jbefl8o6pl1epbae1p8dscipj8.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#B6D6FF",
      overlaysWebView: false
    },
    Keyboard: {
      resize: "none", // الأهم: يمنع تمدد التطبيق مع الكيبورد
      resizeOnFullScreen: true
    }
  },
};

export default config;
