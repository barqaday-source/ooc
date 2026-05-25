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
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      androidClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
      serverClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#B6D6FF",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
