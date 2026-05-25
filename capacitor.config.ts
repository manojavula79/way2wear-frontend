import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.way2wear.app',
  appName: 'Way2Wear',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'Light',
      backgroundColor: '#FFFFFF'
    },
    Keyboard: {
      resize: 'body',
      style: 'light',
      resizeOnFullScreen: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
