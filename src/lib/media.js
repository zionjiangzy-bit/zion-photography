// Cloudinary 直传 + 压缩 + 原生 zip 解析（从旧版 app.js 移植）
import { IMG_EXT, FOLDER_MAP } from './i18n.js';

export const CLOUDINARY = {
  cloudName: 'kqgp212o',
  uploadPreset: 'zion_photos',
  folder: 'zion'
};

const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.85;
const MAX_BYTES = 9 * 1024 * 1024; // Cloudinary 免费账户单张上限 10MB

export function compressImage(blob) {
  return new Promise((resolve) => {
    if (!blob || blob.size <= 1.5 * 1024 * 1024) return resolve(blob);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w >= h && w > MAX_SIDE) { h = Math.round(h * MAX_SIDE / w); w = MAX_SIDE; }
        else if (h > MAX_SIDE) { w = Math.round(w * MAX_SIDE / h); h = MAX_SIDE; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let q = JPEG_QUALITY;
        const attempt = () => {
          canvas.toBlob((out) => {
            if (!out) return resolve(blob);
            if (out.size > MAX_BYTES && q > 0.5) { q -= 0.1; attempt(); return; }
            resolve(out);
          }, 'image/jpeg', q);
        };
        attempt();
      } catch (e) { resolve(blob); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

export function measureBlob(blob) {
  return new Promise((resolve) => {
    const done = (w, h) => resolve(w && h ? { w, h } : null);
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(blob)
        .then((bmp) => { done(bmp.width, bmp.height); if (bmp.close) bmp.close(); })
        .catch(() => resolve(null));
      return;
    }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); done(img.naturalWidth, img.naturalHeight); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export function cloudinaryUpload(blob, filename) {
  return compressImage(blob).then((b) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
    const fd = new FormData();
    fd.append('file', b, filename || 'photo.jpg');
    fd.append('upload_preset', CLOUDINARY.uploadPreset);
    if (CLOUDINARY.folder) fd.append('folder', CLOUDINARY.folder);
    return fetch(endpoint, { method: 'POST', body: fd })
      .then((r) => r.json())
      .then((j) => {
        if (!j.secure_url) throw new Error((j.error && j.error.message) || 'Cloudinary upload failed');
        return { url: j.secure_url, publicId: j.public_id };
      });
  });
}

export function photoSrc(p) {
  if (p && p.url) return p.url;
  if (p && p.filename) return '/uploads/' + p.filename;
  return '';
}

export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result;
      const comma = dataUrl.indexOf(',');
      resolve({ base64: dataUrl.slice(comma + 1), filename: file.name });
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

// ---- 原生 zip 解析 ----
export function parseZip(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 zip 文件');
  const total = dv.getUint16(eocd + 10, true);
  let offset = dv.getUint32(eocd + 16, true);
  const entries = [];
  for (let n = 0; n < total; n++) {
    if (dv.getUint32(offset, true) !== 0x02014b50) break;
    const method = dv.getUint16(offset + 10, true);
    const compSize = dv.getUint32(offset + 20, true);
    const nameLen = dv.getUint16(offset + 28, true);
    const extraLen = dv.getUint16(offset + 30, true);
    const commentLen = dv.getUint16(offset + 32, true);
    const localOffset = dv.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buf, offset + 46, nameLen);
    const name = new TextDecoder('utf-8').decode(nameBytes);
    entries.push({ name, method, compSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function readEntry(buf, entry) {
  const dv = new DataView(buf);
  const lh = entry.localOffset;
  const nameLen = dv.getUint16(lh + 26, true);
  const extraLen = dv.getUint16(lh + 28, true);
  const dataStart = lh + 30 + nameLen + extraLen;
  const compData = new Uint8Array(buf, dataStart, entry.compSize);
  if (entry.method === 0) return Promise.resolve(compData);
  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持解压，请用新版 Chrome / Edge / Safari');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([compData]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then((ab) => new Uint8Array(ab));
  }
  throw new Error('不支持的压缩方式: ' + entry.method);
}

// 把 zip 条目整理成导入任务（跳过 RAW / macOS 元数据 / 未归类）
export function buildImportTasks(entries) {
  const tasks = [];
  let skipped = 0, mac = 0, unknown = 0;
  entries.forEach((e) => {
    if (e.name.charAt(e.name.length - 1) === '/') return;
    if (e.name.indexOf('__MACOSX') !== -1) { mac++; return; }
    const segs = e.name.split('/');
    const fname = segs[segs.length - 1];
    if (fname.charAt(0) === '.' || fname.indexOf('._') === 0) { mac++; return; }
    const lower = e.name.toLowerCase();
    const ext = lower.lastIndexOf('.') >= 0 ? lower.slice(lower.lastIndexOf('.') + 1) : '';
    if (IMG_EXT.indexOf(ext) === -1) { skipped++; return; }
    const folder = segs.length >= 2 ? segs[segs.length - 2] : '';
    const category = FOLDER_MAP[folder];
    if (!category) { unknown++; return; }
    tasks.push({ e, fname, ext, category });
  });
  return { tasks, skipped, mac, unknown };
}
