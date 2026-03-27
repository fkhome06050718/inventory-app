// おうち在庫管理 - Service Worker
const CACHE_NAME = 'ouchi-inventory-v4';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Apps Script API → ネットワークのみ（インターセプトしない）
  // JSON POSTリクエスト（写真アップロード）は特にそのまま通す
  if(url.hostname === 'script.google.com') {
    const isJsonPost = event.request.method === 'POST' &&
      (event.request.headers.get('Content-Type') || '').includes('application/json');

    if(isJsonPost) {
      // 写真アップロード等のJSONリクエストはそのまま通す（SWが触らない）
      return;
    }

    // 通常APIリクエスト：失敗時はofflineエラーを返す
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('{"error":"offline"}', { headers: {'Content-Type':'application/json'} })
      )
    );
    return;
  }

  // HTMLファイル → 常にネットワーク優先
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
