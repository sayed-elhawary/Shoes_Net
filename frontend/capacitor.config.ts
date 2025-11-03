// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.app',
  appName: 'Shose-Net',
  webDir: 'build',
  bundledWebRuntime: false,
  plugins: {},
  android: {
    backgroundColor: '#FFFFFF',
    splash: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      imageName: 'icon.png' // هنا حددنا أيقونة التطبيق
    }
  }
};

export default config;

