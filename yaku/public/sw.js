/* YAKU service worker: caches the app shell only. It never touches Supabase, APIs or any other origin. */
const V = 'yaku-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.webp', '/icons/icon-192.png']
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url)
  if (r.method !== 'GET' || u.origin !== location.origin) return
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match('/index.html'))); return }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && /\.(js|css|png|webp|svg|woff2?)$/.test(u.pathname)) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)) } return res })))
})
