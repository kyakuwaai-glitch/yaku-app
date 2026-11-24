import type { CapacitorConfig } from '@capacitor/cli'
// appId is permanent once published. Confirm it before your first store upload.
const config: CapacitorConfig = {
  appId: 'ug.yaku.app', appName: 'YAKU', webDir: 'dist',
  android: { allowMixedContent: false },
  ios: { contentInset: 'always' },
  plugins: { SplashScreen: { launchShowDuration: 0, backgroundColor: '#FFFFFF', androidScaleType: 'CENTER_INSIDE' } },
}
export default config
