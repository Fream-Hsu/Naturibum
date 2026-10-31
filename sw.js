// Naturibum service worker — 讓 App 能安裝、離線可開啟
// 改了 index.html 或其他靜態檔之後，把 VERSION 加一，舊快取就會被清掉
const VERSION = 'naturibum-v1';
const SHELL = [
  './', './index.html', './manifest.json',
  './vendor/supabase.js',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png', './icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase（資料、登入、照片）與其他外部網址一律直接走網路，不快取，避免存到別人的資料
  if (url.origin !== self.location.origin) return;

  // 開啟頁面：先連網取最新版，失敗（離線）才用快取
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // 其他靜態檔（圖示、vendor）：有快取就用快取
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    }))
  );
});
