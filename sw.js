// おうち在庫管理 - Service Worker
const CACHE_NAME = 'ouchi-inventory-v3';

// ネットワーク優先：常に最新ファイルを取得し、失敗時のみキャッシュを使う
self.addEventListener('install', event => {
  self.skipWaiting(); // 即座に新しいSWを有効化
});

self.addEventListener('activate', event => {
  // 古いキャッシュを全て削除
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Apps Script API → ネットワークのみ
  if(url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('{"error":"offline"}', { headers: {'Content-Type':'application/json'} })
      )
    );
    return;
  }

  // HTMLファイル → 常にネットワーク優先（キャッシュしない）
  if(event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // その他 → ネットワーク優先、失敗時はキャッシュ
  event.respondWith(
    fetch(event.request).then(res => {
      if(res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return res;
    }).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if(event.data === 'skipWaiting') self.skipWaiting();
});
