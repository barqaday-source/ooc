import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drdshati.app',
  appName: 'دردشاتي',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Keyboard: {
      resize: 'none',
    },
    VoiceRecorder: {
      // هذا السطر يجبر البلاگن يتسجل بالاندرويد
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#FFFFFF'
  }
};

export default config;
