import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNative } from '../lib/native'
/** Web: registers the offline shell. Native app: status bar, splash, Android back button and deep links. */
export default function NativeBridge() {
  const nav = useNavigate()
  useEffect(() => {
    if (!isNative()) { if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}); return }
    const off: Array<() => void> = []; let dead = false
    ;(async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([import('@capacitor/app'), import('@capacitor/status-bar'), import('@capacitor/splash-screen')])
      if (dead) return
      try { await StatusBar.setStyle({ style: Style.Light }) } catch { /* not supported on this device */ }
      await SplashScreen.hide().catch(() => {})
      const b = await App.addListener('backButton', ({ canGoBack }) => { if (canGoBack) history.back(); else App.exitApp() })
      const d = await App.addListener('appUrlOpen', ({ url }) => { try { const u = new URL(url); nav(u.pathname + u.search + u.hash) } catch { /* ignore bad link */ } })
      off.push(() => b.remove(), () => d.remove())
    })()
    return () => { dead = true; off.forEach(f => f()) }
  }, [nav])
  return null
}
