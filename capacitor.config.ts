import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.drdshati.app",
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
            // ضع الـ ID الجديد هنا
            androidClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
            // في العادة الـ serverClientId يكون مختلفاً (يسمى Web Client ID في Google Cloud)
            // إذا لم يكن لديك واحد آخر، جرب استخدام نفس الـ ID، لكن الأفضل استخراج Web Client ID من Google Cloud Console
            serverClientId: "159537926588-dtnce28t16apvq1calgdvjj1u1t95iq3.apps.googleusercontent.com",
            forceCodeForRefreshToken: true,
        },
        // ... باقي الإضافات
    },

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
