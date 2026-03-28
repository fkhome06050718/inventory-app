// おうち在庫管理 - Service Worker
// iOS Safariでの写真アップロード問題を避けるためfetchイベントは処理しない

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // 古いキャッシュを全て削除
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// fetchイベントを処理しない → 全リクエストをブラウザが直接処理
// これによりiOS SafariでのPOST失敗問題が解消される

self.addEventListener('message', event => {
  if(event.data === 'skipWaiting') self.skipWaiting();
});
