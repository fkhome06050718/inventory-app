// api/callback.js - OAuth コールバック＆自動セットアップ
module.exports.config = { maxDuration: 60 };

const GAS_TEMPLATE = "// ============================================================\n// \u304a\u3046\u3061\u5728\u5eab\u7ba1\u7406 - Google Apps Script \u30d0\u30c3\u30af\u30a8\u30f3\u30c9\n// ============================================================\n// \u3010\u521d\u56de\u8a2d\u5b9a\u3011\n// 1. Google\u30b9\u30d7\u30ec\u30c3\u30c9\u30b7\u30fc\u30c8\u3092\u65b0\u898f\u4f5c\u6210\n// 2. \u30e1\u30cb\u30e5\u30fc\u300c\u62e1\u5f35\u6a5f\u80fd\u300d\u2192\u300cApps Script\u300d\u3092\u958b\u304f\n// 3. \u3053\u306e\u30b3\u30fc\u30c9\u3092\u5168\u3066\u30b3\u30d4\u30da\u3057\u3066\u8cbc\u308a\u4ed8\u3051\u308b\n// 4. \u4e0b\u306e\u8a2d\u5b9a\u6b04\uff08SHEET_ID\u30fbAPP_PASSWORD\u30fbNOTIFY_EMAIL\uff09\u3092\u5909\u66f4\n// 5. \u300c\u30c7\u30d7\u30ed\u30a4\u300d\u2192\u300c\u65b0\u3057\u3044\u30c7\u30d7\u30ed\u30a4\u300d\u2192\u7a2e\u985e\u300c\u30a6\u30a7\u30d6\u30a2\u30d7\u30ea\u300d\n//    \u30a2\u30af\u30bb\u30b9\u3067\u304d\u308b\u30e6\u30fc\u30b6\u30fc:\u300c\u5168\u54e1\u300d\u306b\u8a2d\u5b9a\u3057\u3066\u30c7\u30d7\u30ed\u30a4\n// 6. \u767a\u884c\u3055\u308c\u305fURL\u3092\u30a2\u30d7\u30ea\u306e\u8a2d\u5b9a\u753b\u9762\u306b\u8cbc\u308a\u4ed8\u3051\u308b\n//\n// \u3010\u30e1\u30fc\u30eb\u901a\u77e5\u306e\u8a2d\u5b9a\u3011\n// 7. Apps Script\u306e\u30e1\u30cb\u30e5\u30fc\u300c\u30c8\u30ea\u30ac\u30fc\u300d(\u6642\u8a08\u30a2\u30a4\u30b3\u30f3)\u3092\u30af\u30ea\u30c3\u30af\n// 8. \u300c\uff0b\u30c8\u30ea\u30ac\u30fc\u3092\u8ffd\u52a0\u300d\u3092\u30af\u30ea\u30c3\u30af\n// 9. \u4ee5\u4e0b\u306e\u3088\u3046\u306b\u8a2d\u5b9a\u3057\u3066\u4fdd\u5b58\uff1a\n//    - \u5b9f\u884c\u3059\u308b\u95a2\u6570: sendExpiryNotification\n//    - \u30a4\u30d9\u30f3\u30c8\u306e\u30bd\u30fc\u30b9: \u6642\u9593\u4e3b\u5c0e\u578b\n//    - \u6642\u9593\u30d9\u30fc\u30b9\u306e\u30c8\u30ea\u30ac\u30fc: \u65e5\u4ed8\u30d9\u30fc\u30b9\u306e\u30bf\u30a4\u30de\u30fc\n//    - \u6642\u523b: \u6bce\u671d8\u6642\uff08\u597d\u304d\u306a\u6642\u9593\uff09\n// ============================================================\n\nconst SHEET_ID     = '__SHEET_ID__';\nconst SHEET_NAME   = '\u5728\u5eab';\nconst APP_PASSWORD = '__APP_PASSWORD__';\n\n// ---- \u30e1\u30fc\u30eb\u901a\u77e5\u8a2d\u5b9a ----------------------------------------\nconst NOTIFY_EMAIL = '__NOTIFY_EMAIL__';\nconst WARN_DAYS    = 7;  // \u4f55\u65e5\u4ee5\u5185\u3092\u300c\u671f\u9650\u304c\u8fd1\u3044\u300d\u3068\u3059\u308b\u304b\nconst DANGER_DAYS  = 3;  // \u4f55\u65e5\u4ee5\u5185\u3092\u300c\u671f\u9650\u5207\u308c\u76f4\u524d\uff08\u8d64\uff09\u300d\u3068\u3059\u308b\u304b\n// -----------------------------------------------------------\n\n// ============================================================\n// \u30ea\u30af\u30a8\u30b9\u30c8\u51e6\u7406\n// ============================================================\nfunction doGet(e)  { return handleRequest(e); }\nfunction doPost(e) { return handleRequest(e); }\n\nfunction handleRequest(e) {\n  if (!e) return respond({ error: 'invalid request' });\n\n  let params = {};\n  // GET\u30d1\u30e9\u30e1\u30fc\u30bf\uff08\u4e92\u63db\u6027\u306e\u305f\u3081\u6b8b\u3059\uff09\n  if (e.parameter) {\n    Object.assign(params, e.parameter);\n  }\n  // POST\u30dc\u30c7\u30a3\uff08JSON\u5f62\u5f0f\u306e\u307f\uff09\n  if (e.postData && e.postData.contents) {\n    try {\n      const parsed = JSON.parse(e.postData.contents);\n      Object.assign(params, parsed);\n    } catch(err) {\n      // JSON\u30d1\u30fc\u30b9\u5931\u6557\u6642\u306fURL\u30a8\u30f3\u30b3\u30fc\u30c9\u3068\u3057\u3066\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af\n      e.postData.contents.split('&').forEach(function(pair) {\n        const eqIdx = pair.indexOf('=');\n        if(eqIdx === -1) return;\n        const key = decodeURIComponent(pair.slice(0, eqIdx).replace(/\\+/g, ' '));\n        const val = decodeURIComponent(pair.slice(eqIdx + 1).replace(/\\+/g, ' '));\n        params[key] = val;\n      });\n    }\n  }\n\n  const password = params.password || '';\n  if (password !== APP_PASSWORD) {\n    return respond({ error: 'unauthorized' });\n  }\n\n  const action = params.action || '';\n\n  try {\n    switch (action) {\n      case 'getAll':      return respond(getAllItems());\n      case 'save':        return respond(saveItem(JSON.parse(params.item)));\n      case 'delete':      return respond(deleteItem(params.id));\n      case 'updateQty':   return respond(updateQty(params.id, params.qty));\n      case 'uploadPhoto': return respond(uploadPhotoToDrive(params.id, params.photo));\n      case 'quickAdd':    return respond(quickAdd(params.name, params.category, params.qty));\n      case 'quickReduce': return respond(quickReduce(params.name, params.qty));\n      default:            return respond({ error: 'unknown action: ' + action });\n    }\n  } catch(err) {\n    return respond({ error: err.message });\n  }\n}\n\nfunction respond(data) {\n  return ContentService\n    .createTextOutput(JSON.stringify(data))\n    .setMimeType(ContentService.MimeType.JSON);\n}\n\n// ============================================================\n// \u5199\u771f\u3092Google Drive\u306b\u4fdd\u5b58\u3057\u3066URL\u3092\u8fd4\u3059\n// ============================================================\nfunction uploadPhotoToDrive(itemId, base64Data) {\n  if (!itemId || !base64Data) return { error: '\u5199\u771f\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093' };\n  try {\n    var base64 = base64Data.indexOf(',') !== -1 ? base64Data.split(',')[1] : base64Data;\n    var blob = Utilities.newBlob(\n      Utilities.base64Decode(base64),\n      'image/jpeg',\n      'inv_' + itemId + '.jpg'\n    );\n\n    var folderName = '\u304a\u3046\u3061\u5728\u5eab\u5199\u771f';\n    var folders = DriveApp.getFoldersByName(folderName);\n    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);\n\n    var existing = folder.getFilesByName('inv_' + itemId + '.jpg');\n    while (existing.hasNext()) { existing.next().setTrashed(true); }\n\n    var file = folder.createFile(blob);\n    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);\n    var fileId = file.getId();\n    // uc?export=view \u306fSafari\u542b\u3080\u5168\u30c7\u30d0\u30a4\u30b9\u3067\u8a8d\u8a3c\u306a\u3057\u306b\u8868\u793a\u3055\u308c\u308b\n    var url = 'https://drive.google.com/uc?id=' + fileId + '&export=view';\n\n    var sheet = getSheet();\n    var data  = sheet.getDataRange().getValues();\n    var headers = data[0];\n    var photoCol = headers.indexOf('photo') + 1;\n    if (photoCol > 0) {\n      for (var i = 1; i < data.length; i++) {\n        if (String(data[i][0]) === String(itemId)) {\n          sheet.getRange(i + 1, photoCol).setValue(url);\n          break;\n        }\n      }\n    }\n    // \u78ba\u5b9f\u306b\u66f8\u304d\u8fbc\u307f\u3092\u5b8c\u4e86\u3055\u305b\u308b\n    SpreadsheetApp.flush();\n    return { success: true, url: url };\n  } catch(err) {\n    return { error: err.message };\n  }\n}\n\n// ============================================================\n// \u30e1\u30fc\u30eb\u901a\u77e5\uff08\u6bce\u671d\u30c8\u30ea\u30ac\u30fc\u3067\u81ea\u52d5\u5b9f\u884c\uff09\n// ============================================================\nfunction sendExpiryNotification() {\n  const result = getAllItems();\n  const allItems = result.items || [];\n  if (allItems.length === 0) return;\n\n  const today = new Date();\n  today.setHours(0, 0, 0, 0);\n\n  const expired = [], danger = [], warning = [];\n\n  allItems.forEach(item => {\n    if (!item.expiry) return;\n    const expDate = new Date(item.expiry);\n    expDate.setHours(0, 0, 0, 0);\n    const days = Math.floor((expDate - today) / 86400000);\n    if      (days < 0)           expired.push(Object.assign({}, item, {days: days}));\n    else if (days <= DANGER_DAYS) danger.push(Object.assign({}, item, {days: days}));\n    else if (days <= WARN_DAYS)   warning.push(Object.assign({}, item, {days: days}));\n  });\n\n  if (expired.length === 0 && danger.length === 0 && warning.length === 0) return;\n\n  const subject = buildSubject(expired, danger, warning);\n  const body    = buildEmailBody(expired, danger, warning, today);\n  GmailApp.sendEmail(NOTIFY_EMAIL, subject, '', { htmlBody: body });\n}\n\nfunction buildSubject(expired, danger, warning) {\n  const parts = [];\n  if (expired.length > 0) parts.push(`\ud83d\udea8 \u671f\u9650\u5207\u308c ${expired.length}\u4ef6`);\n  if (danger.length  > 0) parts.push(`\u26a0\ufe0f \u307e\u3082\u306a\u304f\u671f\u9650 ${danger.length}\u4ef6`);\n  if (warning.length > 0) parts.push(`\ud83d\udcc5 \u671f\u9650\u304c\u8fd1\u3044 ${warning.length}\u4ef6`);\n  return `\u3010\u304a\u3046\u3061\u5728\u5eab\u3011${parts.join(' \uff0f ')}`;\n}\n\nfunction buildEmailBody(expired, danger, warning, today) {\n  const dateStr  = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy\u5e74M\u6708d\u65e5');\n  const badgeBase = 'display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px;';\n\n  function itemRow(item, badgeHtml) {\n    return `<div style=\"padding:10px 14px;border-bottom:1px solid #E2DDD5;display:flex;align-items:center;gap:12px\">\n      <span style=\"font-size:20px;width:28px;text-align:center;flex-shrink:0\">\ud83d\udce6</span>\n      <div style=\"flex:1\">\n        <div style=\"font-size:14px;font-weight:600;color:#2C2825\">${item.name}</div>\n        <div style=\"font-size:12px;color:#9B9188;margin-top:2px\">${item.category}\u3000\u6570\u91cf: ${item.qty}</div>\n      </div>\n      ${badgeHtml}\n    </div>`;\n  }\n\n  function section(title, color, bgColor, items, badgeFn) {\n    if (items.length === 0) return '';\n    return `<div style=\"margin-bottom:20px\">\n      <div style=\"font-size:13px;font-weight:700;color:${color};background:${bgColor};padding:8px 14px;border-radius:8px 8px 0 0;border:1px solid ${color}40\">\n        ${title}\n      </div>\n      <div style=\"border:1px solid #E2DDD5;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;background:#fff\">\n        ${items.map(item => itemRow(item, badgeFn(item))).join('')}\n      </div>\n    </div>`;\n  }\n\n  return `<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#F7F4EF;font-family:sans-serif\">\n  <div style=\"max-width:520px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)\">\n    <div style=\"background:#C4704A;padding:20px 24px;display:flex;align-items:center;gap:12px\">\n      <span style=\"font-size:32px\">\ud83c\udfe0</span>\n      <div>\n        <div style=\"font-size:18px;font-weight:700;color:#fff\">\u304a\u3046\u3061\u5728\u5eab\u7ba1\u7406</div>\n        <div style=\"font-size:12px;color:rgba(255,255,255,0.8)\">${dateStr} \u306e\u901a\u77e5\u30ec\u30dd\u30fc\u30c8</div>\n      </div>\n    </div>\n    <div style=\"display:flex;border-bottom:1px solid #E2DDD5\">\n      <div style=\"flex:1;text-align:center;padding:14px 8px;border-right:1px solid #E2DDD5\">\n        <div style=\"font-size:22px;font-weight:700;color:#C44A4A\">${expired.length}</div>\n        <div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u671f\u9650\u5207\u308c</div>\n      </div>\n      <div style=\"flex:1;text-align:center;padding:14px 8px;border-right:1px solid #E2DDD5\">\n        <div style=\"font-size:22px;font-weight:700;color:#C4974A\">${danger.length}</div>\n        <div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u307e\u3082\u306a\u304f\u671f\u9650</div>\n      </div>\n      <div style=\"flex:1;text-align:center;padding:14px 8px\">\n        <div style=\"font-size:22px;font-weight:700;color:#5B8A6F\">${warning.length}</div>\n        <div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u671f\u9650\u304c\u8fd1\u3044</div>\n      </div>\n    </div>\n    <div style=\"padding:20px 16px\">\n      ${section(`\ud83d\udea8 \u671f\u9650\u5207\u308c\uff08${expired.length}\u4ef6\uff09`,'#C44A4A','#FCEAEA',expired,\n        i=>`<span style=\"${badgeBase}background:#FCEAEA;color:#C44A4A\">${Math.abs(i.days)}\u65e5\u7d4c\u904e</span>`)}\n      ${section(`\u26a0\ufe0f \u671f\u9650\u5207\u308c\u76f4\u524d\uff08${danger.length}\u4ef6\uff09`,'#C4974A','#F5F0E3',danger,\n        i=>`<span style=\"${badgeBase}background:#F5F0E3;color:#C4974A\">\u3042\u3068${i.days}\u65e5</span>`)}\n      ${section(`\ud83d\udcc5 \u671f\u9650\u304c\u8fd1\u3044\uff08${warning.length}\u4ef6\uff09`,'#5B8A6F','#E8F2EC',warning,\n        i=>`<span style=\"${badgeBase}background:#E8F2EC;color:#5B8A6F\">\u3042\u3068${i.days}\u65e5</span>`)}\n    </div>\n    <div style=\"background:#F7F4EF;padding:14px 20px;text-align:center;font-size:11px;color:#9B9188;border-top:1px solid #E2DDD5\">\n      \u304a\u3046\u3061\u5728\u5eab\u7ba1\u7406\u30a2\u30d7\u30ea\u304b\u3089\u306e\u81ea\u52d5\u901a\u77e5\u3067\u3059\n    </div>\n  </div>\n</body></html>`;\n}\n\n// ============================================================\n// \u6708\u6b21\u30ec\u30dd\u30fc\u30c8\uff08\u6708\u521d\u306b\u81ea\u52d5\u5b9f\u884c\uff09\n// \u30c8\u30ea\u30ac\u30fc\u8a2d\u5b9a: sendMonthlyReport \u2192 \u6642\u9593\u4e3b\u5c0e\u578b \u2192 \u6708\u30d9\u30fc\u30b9\u306e\u30bf\u30a4\u30de\u30fc \u2192 \u6bce\u67081\u65e5\n// ============================================================\nfunction sendMonthlyReport() {\n  var result   = getAllItems();\n  var allItems = result.items || [];\n  if (allItems.length === 0) return;\n\n  var now   = new Date();\n  var year  = now.getFullYear();\n  var month = now.getMonth(); // 0-indexed\n  // \u5148\u6708\u306e\u671f\u9593\n  var firstDay = new Date(year, month - 1, 1);\n  var lastDay  = new Date(year, month, 0);\n  var monthLabel = year + '\u5e74' + month + '\u6708';\n\n  var today = new Date(); today.setHours(0,0,0,0);\n\n  // \u7d71\u8a08\u8a08\u7b97\n  var totalItems    = allItems.length;\n  var expiredItems  = [];\n  var warningItems  = [];\n  var lowItems      = [];\n\n  allItems.forEach(function(item) {\n    var qty      = Number(item.qty) || 0;\n    var minStock = Number(item.minStock) || 1;\n    if (qty <= minStock) lowItems.push(item);\n    if (item.expiry) {\n      var expDate = new Date(item.expiry); expDate.setHours(0,0,0,0);\n      var days    = Math.floor((expDate - today) / 86400000);\n      if (days < 0)          expiredItems.push(Object.assign({}, item, {days: days}));\n      else if (days <= WARN_DAYS) warningItems.push(Object.assign({}, item, {days: days}));\n    }\n  });\n\n  // \u30ab\u30c6\u30b4\u30ea\u30fc\u5225\u96c6\u8a08\n  var catMap = {};\n  allItems.forEach(function(item) {\n    var cat = item.category || '\u305d\u306e\u4ed6';\n    catMap[cat] = (catMap[cat] || 0) + 1;\n  });\n  var catRows = Object.keys(catMap).sort(function(a,b){ return catMap[b]-catMap[a]; }).map(function(cat) {\n    return '<tr><td style=\"padding:6px 12px\">' + cat + '</td><td style=\"padding:6px 12px;text-align:right;font-weight:600\">' + catMap[cat] + '\u4ef6</td></tr>';\n  }).join('');\n\n  var subject = '\u3010\u304a\u3046\u3061\u5728\u5eab\u3011' + monthLabel + ' \u6708\u6b21\u30ec\u30dd\u30fc\u30c8';\n\n  var html = '<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#F7F4EF;font-family:sans-serif\">' +\n  '<div style=\"max-width:520px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)\">' +\n  '<div style=\"background:#C4704A;padding:20px 24px;display:flex;align-items:center;gap:12px\">' +\n    '<span style=\"font-size:32px\">\ud83c\udfe0</span>' +\n    '<div><div style=\"font-size:18px;font-weight:700;color:#fff\">\u304a\u3046\u3061\u5728\u5eab\u7ba1\u7406</div>' +\n    '<div style=\"font-size:12px;color:rgba(255,255,255,0.8)\">' + monthLabel + ' \u6708\u6b21\u30ec\u30dd\u30fc\u30c8</div></div>' +\n  '</div>' +\n  '<div style=\"display:flex;border-bottom:1px solid #E2DDD5\">' +\n    '<div style=\"flex:1;text-align:center;padding:14px 8px;border-right:1px solid #E2DDD5\"><div style=\"font-size:22px;font-weight:700;color:#C4704A\">' + totalItems + '</div><div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u7dcf\u30a2\u30a4\u30c6\u30e0</div></div>' +\n    '<div style=\"flex:1;text-align:center;padding:14px 8px;border-right:1px solid #E2DDD5\"><div style=\"font-size:22px;font-weight:700;color:#C44A4A\">' + expiredItems.length + '</div><div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u671f\u9650\u5207\u308c</div></div>' +\n    '<div style=\"flex:1;text-align:center;padding:14px 8px;border-right:1px solid #E2DDD5\"><div style=\"font-size:22px;font-weight:700;color:#C4974A\">' + warningItems.length + '</div><div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u671f\u9650\u304c\u8fd1\u3044</div></div>' +\n    '<div style=\"flex:1;text-align:center;padding:14px 8px\"><div style=\"font-size:22px;font-weight:700;color:#E65100\">' + lowItems.length + '</div><div style=\"font-size:10px;color:#9B9188;font-weight:600\">\u6b8b\u308a\u5c11\u306a\u3044</div></div>' +\n  '</div>' +\n  '<div style=\"padding:20px 16px\">' +\n  '<div style=\"font-size:13px;font-weight:700;color:#2C2825;margin-bottom:8px\">\ud83d\udcc2 \u30ab\u30c6\u30b4\u30ea\u30fc\u5225\u30a2\u30a4\u30c6\u30e0\u6570</div>' +\n  '<table style=\"width:100%;border-collapse:collapse;font-size:13px;background:#F7F4EF;border-radius:8px;overflow:hidden\">' + catRows + '</table>' +\n  (expiredItems.length > 0 ? '<div style=\"margin-top:16px;padding:12px;background:#FCEAEA;border-radius:8px\"><div style=\"font-size:12px;font-weight:700;color:#C44A4A;margin-bottom:6px\">\ud83d\udea8 \u671f\u9650\u5207\u308c\uff08\u8981\u51e6\u5206\uff09</div>' + expiredItems.slice(0,5).map(function(i){ return '<div style=\"font-size:12px;padding:3px 0\">' + i.name + '\uff08' + Math.abs(i.days) + '\u65e5\u7d4c\u904e\uff09</div>'; }).join('') + (expiredItems.length > 5 ? '<div style=\"font-size:11px;color:#C44A4A\">\u4ed6 ' + (expiredItems.length-5) + '\u4ef6</div>' : '') + '</div>' : '') +\n  (lowItems.length > 0 ? '<div style=\"margin-top:12px;padding:12px;background:#FFF3E0;border-radius:8px\"><div style=\"font-size:12px;font-weight:700;color:#E65100;margin-bottom:6px\">\ud83d\udcc9 \u88dc\u5145\u304c\u5fc5\u8981\u306a\u5546\u54c1</div>' + lowItems.slice(0,5).map(function(i){ return '<div style=\"font-size:12px;padding:3px 0\">' + i.name + '\uff08\u6b8b\u308a' + i.qty + '\u500b\uff09</div>'; }).join('') + (lowItems.length > 5 ? '<div style=\"font-size:11px;color:#E65100\">\u4ed6 ' + (lowItems.length-5) + '\u4ef6</div>' : '') + '</div>' : '') +\n  '</div>' +\n  '<div style=\"background:#F7F4EF;padding:14px 20px;text-align:center;font-size:11px;color:#9B9188;border-top:1px solid #E2DDD5\">\u304a\u3046\u3061\u5728\u5eab\u7ba1\u7406\u30a2\u30d7\u30ea\u304b\u3089\u306e\u6708\u6b21\u81ea\u52d5\u30ec\u30dd\u30fc\u30c8\u3067\u3059</div>' +\n  '</div></body></html>';\n\n  GmailApp.sendEmail(NOTIFY_EMAIL, subject, '', { htmlBody: html });\n}\n\n// ============================================================\n// Siri\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u7528\u30fb\u7c21\u6613\u767b\u9332\n// ============================================================\nfunction quickAdd(name, category, qty) {\n  if (!name) return { error: '\u5546\u54c1\u540d\u304c\u3042\u308a\u307e\u305b\u3093' };\n\n  // \u30ab\u30c6\u30b4\u30ea\u30fc\u304c\u672a\u6307\u5b9a\u307e\u305f\u306f\u30de\u30c3\u30c1\u3057\u306a\u3044\u5834\u5408\u306f\u300c\u305d\u306e\u4ed6\u300d\n  const validCategories = ['\u51b7\u8535\u5eab','\u51b7\u51cd\u5eab','\u30d1\u30f3\u30c8\u30ea\u30fc','\u65e5\u7528\u54c1','\u85ac\u30fb\u30b5\u30d7\u30ea','\u305d\u306e\u4ed6'];\n  const cat = validCategories.includes(category) ? category : '\u305d\u306e\u4ed6';\n  const q   = parseInt(qty) > 0 ? parseInt(qty) : 1;\n\n  const item = {\n    id:       Date.now().toString(),\n    name:     name,\n    category: cat,\n    qty:      q,\n    opened:   0,\n    expiry:   '',\n    note:     'Siri\u304b\u3089\u8ffd\u52a0',\n    date:     Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd'),\n    photo:    ''\n  };\n\n  const result = saveItem(item);\n  return {\n    success: true,\n    message: `\u300c${name}\u300d\u3092${cat}\u306b${q}\u500b\u8ffd\u52a0\u3057\u307e\u3057\u305f`,\n    id: result.id || item.id\n  };\n}\n\n// ============================================================\n// Siri\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u7528\u30fb\u5728\u5eab\u3092\u6e1b\u3089\u3059\n// ============================================================\nfunction quickReduce(name, qty) {\n  if (!name) return { error: '\u5546\u54c1\u540d\u304c\u3042\u308a\u307e\u305b\u3093' };\n  const q = parseInt(qty) > 0 ? parseInt(qty) : 1;\n\n  const sheet = getSheet();\n  const data  = sheet.getDataRange().getValues();\n  const headers = data[0];\n  const qtyCol  = headers.indexOf('qty') + 1;\n\n  // \u5546\u54c1\u540d\u3067\u90e8\u5206\u4e00\u81f4\u691c\u7d22\uff08\u5927\u6587\u5b57\u5c0f\u6587\u5b57\u30fb\u30b9\u30da\u30fc\u30b9\u7121\u8996\uff09\n  const normalize = s => String(s||'').replace(/\\s/g,'').toLowerCase();\n  const keyword   = normalize(name);\n\n  for (let i = 1; i < data.length; i++) {\n    const rowName = normalize(data[i][headers.indexOf('name')]);\n    if (rowName.includes(keyword) || keyword.includes(rowName)) {\n      const currentQty = Number(data[i][headers.indexOf('qty')]) || 0;\n      const newQty     = Math.max(0, currentQty - q);\n      sheet.getRange(i + 1, qtyCol).setValue(newQty);\n      const actualReduced = currentQty - newQty;\n      return {\n        success: true,\n        message: `\u300c${data[i][headers.indexOf('name')]}\u300d\u3092${actualReduced}\u500b\u6e1b\u3089\u3057\u307e\u3057\u305f\uff08\u6b8b\u308a${newQty}\u500b\uff09`,\n        remaining: newQty\n      };\n    }\n  }\n\n  return {\n    success: false,\n    message: `\u300c${name}\u300d\u304c\u5728\u5eab\u306b\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f`\n  };\n}\nfunction getSheet() {\n  const ss = SpreadsheetApp.openById(SHEET_ID);\n  let sheet = ss.getSheetByName(SHEET_NAME);\n  if (!sheet) {\n    sheet = ss.insertSheet(SHEET_NAME);\n    // photo\u306f\u9664\u5916\uff08\u30ed\u30fc\u30ab\u30eb\u306e\u307f\u4fdd\u6301\uff09\u3001subcategory\u30fbminStock\u8ffd\u52a0\n    sheet.getRange(1, 1, 1, 11).setValues([['id','name','category','subcategory','expiry','qty','minStock','opened','openDate','note','photo']]);\n    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');\n    sheet.setFrozenRows(1);\n  }\n  return sheet;\n}\n\nfunction getAllItems() {\n  const sheet = getSheet();\n  const data = sheet.getDataRange().getValues();\n  if (data.length <= 1) return { items: [] };\n  const headers = data[0];\n  const items = data.slice(1).map(row => {\n    const obj = {};\n    headers.forEach((h, i) => obj[h] = row[i]);\n    return obj;\n  });\n  return { items };\n}\n\nfunction saveItem(item) {\n  // \u5199\u771f\u304c\u5927\u304d\u3059\u304e\u308b\u5834\u5408\u306f\u9664\u53bb\uff08\u30bb\u30eb\u4e0a\u965050000\u6587\u5b57\uff09\n  if (item.photo && item.photo.length > 45000) {\n    item.photo = '';\n  }\n  const sheet = getSheet();\n  const data = sheet.getDataRange().getValues();\n  const headers = data[0];\n  if (item.id) {\n    for (let i = 1; i < data.length; i++) {\n      if (String(data[i][0]) === String(item.id)) {\n        sheet.getRange(i + 1, 1, 1, headers.length)\n          .setValues([headers.map(h => item[h] !== undefined ? item[h] : data[i][headers.indexOf(h)])]);\n        return { success: true, action: 'updated' };\n      }\n    }\n  }\n  if (!item.id) item.id = Date.now().toString();\n  sheet.appendRow(headers.map(h => item[h] || ''));\n  return { success: true, action: 'created', id: item.id };\n}\n\nfunction deleteItem(id) {\n  const sheet = getSheet();\n  const data = sheet.getDataRange().getValues();\n  for (let i = 1; i < data.length; i++) {\n    if (String(data[i][0]) === String(id)) {\n      sheet.deleteRow(i + 1);\n      return { success: true };\n    }\n  }\n  // \u898b\u3064\u304b\u3089\u306a\u3044\u5834\u5408\u3082\u6210\u529f\u6271\u3044\uff08\u65e2\u306b\u524a\u9664\u6e08\u307f\uff09\n  return { success: true, note: 'already deleted' };\n}\n\nfunction updateQty(id, qty) {\n  const sheet = getSheet();\n  const data = sheet.getDataRange().getValues();\n  const qtyCol = data[0].indexOf('qty') + 1;\n  for (let i = 1; i < data.length; i++) {\n    if (String(data[i][0]) === String(id)) {\n      sheet.getRange(i + 1, qtyCol).setValue(qty);\n      return { success: true };\n    }\n  }\n  return { error: 'not found' };\n}\n";

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function exchangeCode(code, redirectUri, clientId, clientSecret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      code, redirect_uri: redirectUri,
      client_id: clientId, client_secret: clientSecret,
      grant_type: 'authorization_code'
    })
  });
  return res.json();
}

async function getUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {Authorization: `Bearer ${accessToken}`}
  });
  return res.json();
}

async function createSpreadsheet(accessToken, title) {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {title},
      sheets: [{properties: {title: '在庫'}}]
    })
  });
  return res.json();
}

async function createScriptProject(accessToken, title, sheetId) {
  const res = await fetch('https://script.googleapis.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({title, parentId: sheetId})
  });
  return res.json();
}

async function updateScriptContent(accessToken, scriptId, gasCode) {
  const res = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: [
        {name: 'コード', type: 'SERVER_JS', source: gasCode},
        {
          name: 'appsscript',
          type: 'JSON',
          source: JSON.stringify({
            timeZone: 'Asia/Tokyo',
            dependencies: {},
            exceptionLogging: 'STACKDRIVER',
            runtimeVersion: 'V8',
            oauthScopes: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive',
              'https://www.googleapis.com/auth/gmail.send',
              'https://www.googleapis.com/auth/script.external_request'
            ],
            webapp: {executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS'}
          })
        }
      ]
    })
  });
  return res.json();
}

async function deployScript(accessToken, scriptId) {
  const res = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      versionNumber: 1,
      manifestFileName: 'appsscript',
      description: 'おうち在庫管理 初回デプロイ'
    })
  });
  return res.json();
}

async function createVersion(accessToken, scriptId) {
  const res = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({description: 'v1'})
  });
  return res.json();
}

module.exports = async function handler(req, res) {
  const {code, state, error} = req.query;
  const appUrl = process.env.APP_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/callback`;

  if (error) {
    return res.redirect(302, `${appUrl}?setup_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(302, `${appUrl}?setup_error=no_code`);
  }

  try {
    // 1. コードをトークンに交換
    const tokens = await exchangeCode(code, redirectUri, clientId, clientSecret);
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);
    const accessToken = tokens.access_token;

    // 2. ユーザー情報取得
    const userInfo = await getUserInfo(accessToken);
    const userEmail = userInfo.email;

    // 3. パスワード生成
    const password = generatePassword();

    // 4. スプレッドシート作成
    const sheet = await createSpreadsheet(accessToken, 'おうち在庫管理');
    if (!sheet.spreadsheetId) throw new Error('スプレッドシート作成失敗: ' + JSON.stringify(sheet));
    const sheetId = sheet.spreadsheetId;

    // 5. GASコード準備（プレースホルダー置換）
    const gasCode = GAS_TEMPLATE
      .replace('__SHEET_ID__', sheetId)
      .replace('__APP_PASSWORD__', password)
      .replace('__NOTIFY_EMAIL__', userEmail);

    // 6. スクリプトプロジェクト作成
    const project = await createScriptProject(accessToken, 'おうち在庫管理スクリプト', sheetId);
    if (!project.scriptId) throw new Error('スクリプト作成失敗: ' + JSON.stringify(project));
    const scriptId = project.scriptId;

    // 7. コードをアップロード
    const contentResult = await updateScriptContent(accessToken, scriptId, gasCode);
    if (contentResult.error) throw new Error('コードアップロード失敗: ' + JSON.stringify(contentResult));

    // 8. バージョン作成
    await createVersion(accessToken, scriptId);

    // 9. デプロイ
    const deployment = await deployScript(accessToken, scriptId);
    if (!deployment.deploymentId) throw new Error('デプロイ失敗: ' + JSON.stringify(deployment));

    // 10. Web App URLを構築
    const scriptUrl = `https://script.google.com/macros/s/${deployment.deploymentId}/exec`;

    // 11. 設定情報をURLパラメータで渡す（フロントエンドが受け取って保存）
    const params = new URLSearchParams({
      setup_success: '1',
      script_url: scriptUrl,
      password: password,
      sheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}`,
      email: userEmail
    });

    return res.redirect(302, `${appUrl}?${params.toString()}`);

  } catch(e) {
    console.error('Setup error:', e);
    return res.redirect(302, `${appUrl}?setup_error=${encodeURIComponent(e.message)}`);
  }
}
