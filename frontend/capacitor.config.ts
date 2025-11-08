// frontend/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shoes.app',
  appName: 'Shoes-Net',
  webDir: 'build', // تأكد إنه build
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#18191a'
  },
  ios: {
    backgroundColor: '#18191a'
  }
};

export default config;
