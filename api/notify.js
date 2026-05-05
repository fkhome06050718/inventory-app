// api/notify.js - Vercel Cron で毎朝実行されるプッシュ通知
// vercel.json に cron 設定が必要

import webpush from 'web-push';

module.exports = async function handler(req, res) {
  // cronジョブからのみ実行（セキュリティ）
  const authHeader = req.headers['authorization'];
  if(authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({error: 'unauthorized'});
  }

  const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail   = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  // GASエンドポイントからデータ取得
  // 各ユーザーのGASはsavePushSubscriptionで登録済みのリストから通知
  // ここでは全登録サブスクリプションを取得して期限チェック
  const masterUrl = process.env.MASTER_GAS_URL;
  const masterPw  = process.env.MASTER_GAS_PASSWORD;

  if(!masterUrl || !masterPw) {
    return res.status(500).json({error: 'MASTER_GAS_URL not configured'});
  }

  try {
    // 全ユーザーのサブスクリプション＋GAS URLを取得
    const gasRes = await fetch(masterUrl, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({action: 'getAllSubscriptions', password: masterPw})
    });
    const {subscriptions} = await gasRes.json();
    if(!subscriptions || !subscriptions.length) {
      return res.status(200).json({sent: 0, message: 'no subscriptions'});
    }

    const today = new Date(); today.setHours(0,0,0,0);
    let sent = 0;

    for(const sub of subscriptions) {
      try {
        // そのユーザーのGASからアイテム取得
        const itemsRes = await fetch(sub.scriptUrl, {
          method: 'POST',
          headers: {'Content-Type': 'text/plain'},
          body: JSON.stringify({action: 'getAll', password: sub.password})
        });
        const {items} = await itemsRes.json();
        if(!items) continue;

        const expired = items.filter(item => {
          if(!item.expiry) return false;
          const d = Math.floor((new Date(item.expiry) - today) / 86400000);
          return d < 0;
        });
        const expiringSoon = items.filter(item => {
          if(!item.expiry) return false;
          const d = Math.floor((new Date(item.expiry) - today) / 86400000);
          return d >= 0 && d <= 3;
        });

        if(!expired.length && !expiringSoon.length) continue;

        let title = '🏠 おうち在庫管理';
        let body  = '';
        if(expired.length) body += `🚨 期限切れ: ${expired.slice(0,3).map(i=>i.name||i.productType).join('、')}${expired.length>3?`他${expired.length-3}件`:''}`;
        if(expiringSoon.length) {
          if(body) body += '\n';
          body += `⚠️ 期限が近い: ${expiringSoon.slice(0,3).map(i=>i.name||i.productType).join('、')}${expiringSoon.length>3?`他${expiringSoon.length-3}件`:''}`;
        }

        const pushSub = JSON.parse(sub.subscription);
        await webpush.sendNotification(pushSub, JSON.stringify({
          title, body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'inventory-expiry',
          renotify: true,
        }));
        sent++;
      } catch(e) {
        console.error('Failed to notify:', e.message);
      }
    }

    return res.status(200).json({sent});
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}
