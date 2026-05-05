// api/subscribe.js - プッシュ通知サブスクリプション登録
// KVストアの代わりにVercel KV or upstash を使うのが理想だが
// シンプルにするためファイルベースのGASに保存する

module.exports = async function handler(req, res) {
  if(req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if(req.method !== 'POST') return res.status(405).end();

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { subscription, scriptUrl, password } = req.body;
  if(!subscription || !scriptUrl || !password) {
    return res.status(400).json({error: 'missing fields'});
  }

  // GASにサブスクリプションを保存
  try {
    const gasRes = await fetch(scriptUrl, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({
        action: 'savePushSubscription',
        password,
        subscription: JSON.stringify(subscription),
      })
    });
    const data = await gasRes.json();
    if(data.error) throw new Error(data.error);
    return res.status(200).json({success: true});
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}
