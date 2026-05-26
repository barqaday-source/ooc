import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drdshati.app',
  appName: 'دردشاتي',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Keyboard: {
      resize: 'none', // هذا اللي يمنع التمطيط
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#FFFFFF' // هذا يخلي الخلفية بيضاء تحت الشريط
  }
};

export default config;
