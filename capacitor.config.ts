import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.drdshati.app",
  appName: "دردشة",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // هذا يمنع التمطط مع الكيبورد
    mixedContentMode: "always_allow"
  },
  ios: {
    backgroundColor: "#FFFFFF",
    contentInset: "always",
    scrollEnabled: true, // غيرتها لـ true عشان السكرول يضبط
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      androidClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
      serverClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#FFFFFF",
      overlaysWebView: false,
      androidOverlaysWebView: false
    },
    Keyboard: {
      resize: "none", // أهم سطر: يمنع التمطط نهائياً
      style: "dark",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    }
  },
};

export default config;
