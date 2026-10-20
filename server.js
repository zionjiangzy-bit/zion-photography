// Zero-dependency Node server for Zion's Photography
// - Serves the static site
// - Stores photos on disk (./uploads) and metadata in ./data/photos.json
// - Exposes a small REST API consumed by app.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const UPLOADS = path.join(ROOT, 'uploads');
const DATA = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA, 'photos.json');
const PORT = process.env.PORT || 8765;

// ---- Admin lock (owner-only editing) ----
// 改密码：在 Cloudflare/Render 等平台配环境变量 ADMIN_PASSWORD=你的新密码，
// 或改下面的 DEFAULT_PASSWORD_HASH 为 hashPassword('你的新密码') 的输出。
const ADMIN_SALT = 'zion-foto::';
// 密码不以明文存：下面是 sha256(ADMIN_SALT + 密码)
// 换密码：node -e "console.log(require('crypto').createHash('sha256').update('zion-foto::新密码').digest('hex'))"
const DEFAULT_PASSWORD_HASH =
  'e25edcdb0e661577b5d8f1e65fd6ac856b57563c5ea2a10521bfe72bb53a3298';

function hashPassword(pw) {
  return crypto.createHash('sha256').update(ADMIN_SALT + String(pw)).digest('hex');
}
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH
  || (process.env.ADMIN_PASSWORD ? hashPassword(process.env.ADMIN_PASSWORD) : DEFAULT_PASSWORD_HASH);

function checkPassword(pw) {
  const h = hashPassword(pw);
  if (h.length !== ADMIN_HASH.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(ADMIN_HASH));
  } catch (e) {
    return false;
  }
}

// Token = 解锁凭证，只在内存里保存（服务重启后需重新输入密码）
const TOKENS = new Map();
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 小时
function issueToken() {
  const tk = crypto.randomBytes(24).toString('hex');
  TOKENS.set(tk, Date.now() + TOKEN_TTL);
  return tk;
}
function tokenOf(req) {
  return req.headers['x-admin-token'] || '';
}
function isAdmin(req) {
  const tk = tokenOf(req);
  if (!tk) return false;
  const exp = TOKENS.get(tk);
  if (!exp) return false;
  if (Date.now() > exp) { TOKENS.delete(tk); return false; }
  return true;
}

fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return []; }
}
function saveDB(arr) {
  fs.writeFileSync(DB_FILE, JSON.stringify(arr, null, 2));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (limit && data.length > limit) { req.destroy(); reject(new Error('payload too large')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function noCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// 这些文件不对外暴露（含服务端源码、密码哈希、元数据）
const BLOCKED = new Set([
  'server.js', 'package.json', 'render.yaml', 'cloudflare-worker.js',
  'package-lock.json', '.gitignore'
]);

function serveStatic(res, urlPath) {
  let filePath = path.join(ROOT, urlPath);
  if (urlPath === '/' || urlPath === '') filePath = path.join(ROOT, 'index.html');
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  if (BLOCKED.has(path.basename(filePath)) || urlPath.startsWith('/data/')
      || urlPath.startsWith('/.') || urlPath.startsWith('/.git')) {
    res.writeHead(404); res.end('not found'); return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  noCache(res);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function serveUpload(res, name) {
  const fp = path.join(UPLOADS, path.basename(name));
  if (!fp.startsWith(UPLOADS) || !fs.existsSync(fp)) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(fp).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000'
  });
  fs.createReadStream(fp).pipe(res);
}

function handleApi(req, res, url) {
  const p = url.pathname;

  // GET list - public (visitors can browse)
  if (req.method === 'GET' && p === '/api/photos') {
    sendJSON(res, 200, loadDB());
    return;
  }

  // POST unlock: {password} -> {token}
  if (req.method === 'POST' && p === '/api/unlock') {
    readBody(req, 4096).then((raw) => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) {}
      if (!checkPassword(body.password || '')) {
        sendJSON(res, 401, { error: 'wrong password' });
        return;
      }
      sendJSON(res, 200, { token: issueToken() });
    }).catch(() => sendJSON(res, 400, { error: 'bad request' }));
    return;
  }

  // GET session: is this token still valid?
  if (req.method === 'GET' && p === '/api/session') {
    if (isAdmin(req)) { sendJSON(res, 200, { ok: true }); return; }
    sendJSON(res, 401, { error: 'unauthorized' });
    return;
  }

  // Everything below can change data -> owner only
  if (!isAdmin(req)) {
    sendJSON(res, 401, { error: 'unauthorized' });
    return;
  }

  // POST create (JSON: {filename, base64, category, captionZh, captionEn})
  if (req.method === 'POST' && p === '/api/photos') {
    readBody(req, 80 * 1024 * 1024).then((raw) => {
      const body = JSON.parse(raw);
      if (!body.base64 && !body.url) {
        sendJSON(res, 400, { error: 'missing base64 or url' });
        return;
      }
      const ext = (String(body.filename || 'x.jpg').split('.').pop() || 'jpg')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
      const id = crypto.randomBytes(8).toString('hex');

      // Prefer Cloudinary URL; fall back to storing the file locally.
      let fname = null;
      if (body.url) {
        fname = body.publicId ? String(body.publicId).replace(/[^a-zA-Z0-9._-]/g, '') : null;
      } else {
        fname = id + '.' + ext;
        fs.writeFileSync(path.join(UPLOADS, fname), Buffer.from(body.base64, 'base64'));
      }

      const db = loadDB();
      const photo = {
        id: id,
        category: body.category || 'urban',
        captionZh: body.captionZh || '',
        captionEn: body.captionEn || '',
        filename: fname,
        url: body.url || null,
        publicId: body.publicId || null,
        ext: ext,
        width: Number(body.width) > 0 ? Number(body.width) : null,
        height: Number(body.height) > 0 ? Number(body.height) : null,
        createdAt: Date.now()
      };
      db.push(photo);
      saveDB(db);
      sendJSON(res, 200, photo);
    }).catch((e) => sendJSON(res, 400, { error: e.message }));
    return;
  }

  // PUT / DELETE single photo
  const m = p.match(/^\/api\/photos\/([a-f0-9]+)$/);
  if (m) {
    const id = m[1];
    const db = loadDB();
    const idx = db.findIndex((x) => x.id === id);
    if (idx === -1) { sendJSON(res, 404, { error: 'not found' }); return; }

    if (req.method === 'PUT') {
      readBody(req, 1024 * 1024).then((raw) => {
        const body = JSON.parse(raw);
        if (body.category !== undefined) db[idx].category = body.category;
        if (body.captionZh !== undefined) db[idx].captionZh = body.captionZh;
        if (body.captionEn !== undefined) db[idx].captionEn = body.captionEn;
        saveDB(db);
        sendJSON(res, 200, db[idx]);
      }).catch((e) => sendJSON(res, 400, { error: e.message }));
      return;
    }
    if (req.method === 'DELETE') {
      try { fs.unlinkSync(path.join(UPLOADS, db[idx].filename)); } catch (e) {}
      db.splice(idx, 1);
      saveDB(db);
      sendJSON(res, 200, { ok: true });
      return;
    }
  }

  sendJSON(res, 404, { error: 'unknown api route' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (p.startsWith('/api/')) { noCache(res); handleApi(req, res, url); return; }
  if (p.startsWith('/uploads/')) { serveUpload(res, path.basename(p)); return; }
  serveStatic(res, p);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Zion photography server listening on http://127.0.0.1:' + PORT);
});
