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

function serveStatic(res, urlPath) {
  let filePath = path.join(ROOT, urlPath);
  if (urlPath === '/' || urlPath === '') filePath = path.join(ROOT, 'index.html');
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
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

  // GET list
  if (req.method === 'GET' && p === '/api/photos') {
    sendJSON(res, 200, loadDB());
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
