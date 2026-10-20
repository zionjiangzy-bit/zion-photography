// 把线上已有的照片清单拉回本地，保证每次改版发布都以线上数据为基础，不会覆盖丢图。
// 用法：node sync-from-live.js
// 说明：线上是“照片清单”的唯一真相，本地 data/photos.json 只是发布时的兜底副本。
const fs = require('fs');
const path = require('path');
const https = require('https');

const LIVE = 'https://zion-fotogallery.app.workbuddy.host/api/photos?sharecode=YY2EGNUGIL';
const ROOT = __dirname;
const DB = path.join(ROOT, 'data', 'photos.json');
const BACKUP_DIR = path.join(ROOT, '.workbuddy', 'backups');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: true }, (res) => {
      let s = '';
      res.on('data', (c) => { s += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(s)); } catch (e) { reject(new Error('解析失败: ' + s.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

get(LIVE).then((photos) => {
  if (!Array.isArray(photos)) throw new Error('线上返回的不是数组');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  fs.writeFileSync(path.join(BACKUP_DIR, 'photos-' + stamp + '.json'), JSON.stringify(photos, null, 2));
  fs.writeFileSync(DB, JSON.stringify(photos, null, 2));
  console.log('已同步 ' + photos.length + ' 张照片到本地');
  console.log('备份: .workbuddy/backups/photos-' + stamp + '.json');
}).catch((e) => {
  console.error('同步失败：', e.message);
  process.exit(1);
});
