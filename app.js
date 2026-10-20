(function () {
  'use strict';

  // ---- Category definitions ----
  var CATEGORIES = {
    humanities: {
      zh: '人文', en: 'Humanities',
      items: {
        portrait: { zh: '肖像', en: 'Portrait' },
        architecture: { zh: '建筑', en: 'Architecture' },
        urban: { zh: '城市风光', en: 'Urban' }
      }
    },
    nature: {
      zh: '自然', en: 'Nature',
      items: {
        creative: { zh: '创意照片', en: 'Creative' },
        animal: { zh: '动物', en: 'Animal' },
        landscape: { zh: '自然风光', en: 'Landscape' }
      }
    }
  };

  // Folder name inside the zip -> category key
  var FOLDER_MAP = {
    '城市': 'urban', '城市风光': 'urban',
    '肖像': 'portrait', '人像': 'portrait',
    '建筑': 'architecture',
    '创意': 'creative', '创意照片': 'creative',
    '动物': 'animal',
    '风光': 'landscape', '自然风光': 'landscape'
  };

  var IMG_EXT = ['jpg','jpeg','png','webp','gif','bmp','tif','tiff','heic'];

  // ---- Cloudinary (unsigned direct upload) ----
  var CLOUDINARY = {
    cloudName: 'kqgp212o',
    uploadPreset: 'zion_photos',
    folder: 'zion'
  };

  // Cloudinary 免费账户单张上限 10MB；原片动辄 20-50MB，必须先压缩
  var MAX_SIDE = 2400;        // 最长边像素
  var JPEG_QUALITY = 0.85;    // 起始质量
  var MAX_BYTES = 9 * 1024 * 1024;  // 压到 9MB 以下留余量

  function compressImage(blob) {
    return new Promise(function (resolve) {
      // 小图直接传，不做处理
      if (!blob || blob.size <= 1.5 * 1024 * 1024) { resolve(blob); return; }
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (w >= h && w > MAX_SIDE) { h = Math.round(h * MAX_SIDE / w); w = MAX_SIDE; }
          else if (h > MAX_SIDE) { w = Math.round(w * MAX_SIDE / h); h = MAX_SIDE; }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var q = JPEG_QUALITY;
          (function attempt() {
            canvas.toBlob(function (out) {
              if (!out) { resolve(blob); return; }          // 压缩失败就用原图
              if (out.size > MAX_BYTES && q > 0.5) { q -= 0.1; attempt(); return; }
              resolve(out);
            }, 'image/jpeg', q);
          })();
        } catch (e) { resolve(blob); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(blob); };
      img.src = url;
    });
  }

  function cloudinaryUpload(blob, filename) {
    return compressImage(blob).then(function (b) {
      var endpoint = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY.cloudName + '/image/upload';
      var fd = new FormData();
      fd.append('file', b, filename || 'photo.jpg');
      fd.append('upload_preset', CLOUDINARY.uploadPreset);
      if (CLOUDINARY.folder) fd.append('folder', CLOUDINARY.folder);
      return fetch(endpoint, { method: 'POST', body: fd }).then(function (r) {
        return r.json().then(function (j) {
          if (!j.secure_url) {
            throw new Error((j.error && j.error.message) || 'Cloudinary upload failed');
          }
          return { url: j.secure_url, publicId: j.public_id };
        });
      });
    });
  }

  function photoSrc(p) {
    if (p && p.url) return p.url;
    if (p && p.filename) return '/uploads/' + p.filename;
    return '';
  }

  // ---- UI strings ----
  var UI = {
    zh: {
      siteTitle: 'Zion的摄影记录',
      siteSub: "Zion's Photography",
      langBtn: 'EN',
      importBtn: '批量导入',
      addPhoto: '添加照片',
      heroAll: '全部照片',
      heroAllDesc: '光影之间，记录世界的温度。',
      modalTitle: '添加照片',
      editTitle: '编辑说明',
      categoryLabel: '分类',
      imageLabel: '选择照片',
      capZhLabel: '说明（中文）',
      capEnLabel: '说明（English）',
      save: '保存',
      cancel: '取消',
      empty: '这里还没有照片',
      emptyHint: '点击右上角「添加照片」或「批量导入」开始记录',
      deleteConfirm: '确定要删除这张照片吗？',
      noFile: '请先选择一张照片',
      saved: '已保存',
      addedOn: '添加于',
      importDone: '导入完成',
      parsing: '正在解析压缩包...',
      importing: '正在导入',
      uploading: '正在上传...',
      lockBtn: '🔒 编辑',
      unlockBtn: '🔓 编辑中',
      unlockTitle: '输入编辑密码',
      unlockHint: '只有你能添加、修改或删除照片。输入密码后本标签页内无需重复输入。',
      pwLabel: '密码',
      wrongPw: '密码不对，再试一次',
      unlock: '解锁',
      needPw: '请先点右上角「编辑」输入密码',
      unlocked: '已解锁，可以编辑了',
      locked: '已锁定编辑',
      sessionExpired: '登录已过期，请重新输入密码'
    },
    en: {
      siteTitle: "Zion's Photography",
      siteSub: "Zion's photo collection",
      langBtn: '中文',
      importBtn: 'Import Zip',
      addPhoto: 'Add Photo',
      heroAll: 'All Photos',
      heroAllDesc: 'Between light and shadow, recording the warmth of the world.',
      modalTitle: 'Add Photo',
      editTitle: 'Edit Caption',
      categoryLabel: 'Category',
      imageLabel: 'Choose photo',
      capZhLabel: 'Caption (中文)',
      capEnLabel: 'Caption (English)',
      save: 'Save',
      cancel: 'Cancel',
      empty: 'No photos here yet',
      emptyHint: 'Click "Add Photo" or "Import Zip" in the top right to start',
      deleteConfirm: 'Delete this photo?',
      noFile: 'Please choose an image first',
      saved: 'Saved',
      addedOn: 'Added on',
      importDone: 'Import done',
      parsing: 'Parsing zip...',
      importing: 'Importing',
      uploading: 'Uploading...',
      lockBtn: '🔒 Edit',
      unlockBtn: '🔓 Editing',
      unlockTitle: 'Enter edit password',
      unlockHint: 'Only you can add, edit or delete photos. One password per browser tab.',
      pwLabel: 'Password',
      wrongPw: 'Wrong password, try again',
      unlock: 'Unlock',
      needPw: 'Click "Edit" in the top right and enter the password first',
      unlocked: 'Unlocked - you can edit now',
      locked: 'Editing locked',
      sessionExpired: 'Session expired, please enter the password again'
    }
  };

  var lang = localStorage.getItem('zion-lang') || 'zh';
  var currentCat = 'all';
  var cachedPhotos = [];
  var editingId = null;
  var visiblePhotos = [];
  var lbIndex = 0;

  function t(key) { return (UI[lang] && UI[lang][key]) || key; }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function bytesToBase64(bytes) {
    var bin = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        var dataUrl = fr.result;
        var comma = dataUrl.indexOf(',');
        resolve({ base64: dataUrl.slice(comma + 1), filename: file.name });
      };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(file);
    });
  }

  // ---- Admin lock ----
  // Token 存在 sessionStorage：本标签页内刷新/跳转都不用重输，关掉标签页即失效
  var adminToken = '';
  try { adminToken = sessionStorage.getItem('zion-admin-token') || ''; } catch (e) {}
  var isEditing = false;

  function setEditing(on) {
    isEditing = !!on;
    document.body.classList.toggle('locked', !isEditing);
    var b = document.getElementById('lockBtn');
    if (b) {
      b.textContent = isEditing ? t('unlockBtn') : t('lockBtn');
      b.classList.toggle('unlocked', isEditing);
    }
  }

  function sessionExpired() {
    adminToken = '';
    try { sessionStorage.removeItem('zion-admin-token'); } catch (e) {}
    setEditing(false);
  }

  function openPwModal() {
    document.getElementById('pwError').hidden = true;
    document.getElementById('pwInput').value = '';
    document.getElementById('pwModal').hidden = false;
    setTimeout(function () {
      var i = document.getElementById('pwInput');
      if (i) i.focus();
    }, 60);
  }
  function closePwModal() { document.getElementById('pwModal').hidden = true; }

  function tryUnlock() {
    var pw = document.getElementById('pwInput').value;
    if (!pw) return;
    fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j || {} }; });
    }).then(function (res) {
      if (res.status === 200 && res.body.token) {
        adminToken = res.body.token;
        try { sessionStorage.setItem('zion-admin-token', adminToken); } catch (e) {}
        setEditing(true);
        closePwModal();
        showToast(t('unlocked'));
        renderGallery();
      } else {
        document.getElementById('pwError').hidden = false;
        document.getElementById('pwInput').value = '';
        document.getElementById('pwInput').focus();
      }
    }).catch(function () {
      document.getElementById('pwError').hidden = false;
    });
  }

  // ---- API ----
  function apiFetch(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (adminToken) opts.headers['X-Admin-Token'] = adminToken;
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) {
        sessionExpired();
        showToast(t('sessionExpired'));
        openPwModal();
        var e = new Error('unauthorized');
        e.unauthorized = true;
        throw e;
      }
      return r.json();
    });
  }

  function apiList() {
    return fetch('/api/photos').then(function (r) { return r.json(); });
  }
  function apiCreate(obj) {
    return apiFetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
  }
  function apiUpdate(id, obj) {
    return apiFetch('/api/photos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
  }
  function apiDelete(id) {
    return apiFetch('/api/photos/' + id, { method: 'DELETE' });
  }

  // ---- i18n ----
  function applyI18n() {
    document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      if (UI[lang] && UI[lang][k]) nodes[i].textContent = UI[lang][k];
    }
    if (isEditing) {
      var lb = document.getElementById('lockBtn');
      if (lb) lb.textContent = t('unlockBtn');
    }
    document.title = lang === 'zh' ? 'Zion的摄影记录 · Zion\'s Photography' : 'Zion\'s Photography';
  }

  // ---- Sidebar ----
  function renderSidebar() {
    var sb = document.getElementById('sidebar');
    var html = '';
    html += '<a class="nav-item ' + (currentCat === 'all' ? 'active' : '') + '" data-cat="all" href="#all">' +
      '<span class="nav-zh">' + t('heroAll') + '</span>' +
      '<span class="nav-sub">' + (lang === 'zh' ? '全部' : 'All') + '</span></a>';
    Object.keys(CATEGORIES).forEach(function (group) {
      var g = CATEGORIES[group];
      html += '<div class="nav-group"><div class="nav-group-title">' +
        (lang === 'zh' ? g.zh : g.en) + '</div>';
      Object.keys(g.items).forEach(function (item) {
        var active = currentCat === item ? 'active' : '';
        var zh = g.items[item].zh;
        var en = g.items[item].en;
        html += '<a class="nav-item sub ' + active + '" data-cat="' + item + '" href="#' + item + '">' +
          '<span class="nav-zh">' + zh + '</span>' +
          '<span class="nav-sub">' + en + '</span></a>';
      });
      html += '</div>';
    });
    sb.innerHTML = html;
    var items = sb.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function (e) {
        e.preventDefault();
        var cat = this.getAttribute('data-cat');
        location.hash = cat === 'all' ? 'all' : cat;
      });
    }
  }

  // ---- Hero ----
  function updateHero() {
    var title = document.getElementById('heroTitle');
    var tag = document.getElementById('heroTagline');
    if (currentCat === 'all') {
      title.textContent = t('heroAll');
      tag.textContent = t('heroAllDesc');
      return;
    }
    var found = null;
    Object.keys(CATEGORIES).forEach(function (group) {
      if (CATEGORIES[group].items[currentCat]) found = CATEGORIES[group].items[currentCat];
    });
    if (found) {
      title.textContent = lang === 'zh' ? found.zh : found.en;
      tag.textContent = lang === 'zh' ? found.en : found.zh;
    }
  }

  // ---- Gallery ----
  function renderGallery() {
    var gallery = document.getElementById('gallery');
    var empty = document.getElementById('emptyState');
    return apiList().then(function (photos) {
      cachedPhotos = photos || [];
      photos = cachedPhotos.slice();
      photos.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      if (currentCat !== 'all') {
        photos = photos.filter(function (p) { return p.category === currentCat; });
      }
      if (photos.length === 0) {
        gallery.innerHTML = '';
        empty.hidden = false;
        return;
      }
      empty.hidden = true;
      visiblePhotos = photos.slice();
      var html = '';
      photos.forEach(function (p) {
        var caption = lang === 'zh'
          ? (p.captionZh || p.captionEn || '')
          : (p.captionEn || p.captionZh || '');
        var dateStr = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')
          : '';
        var src = photoSrc(p);
        html += '<figure class="photo-card" data-id="' + p.id + '">' +
          '<div class="photo-frame">' +
            '<img src="' + src + '" alt="' + escapeHtml(caption) + '" />' +
            '<button class="edit-btn" title="' + t('editTitle') + '" data-edit="' + p.id + '">✎</button>' +
            '<button class="del-btn" title="' + t('deleteConfirm') + '" data-del="' + p.id + '">×</button>' +
          '</div>' +
          '<figcaption class="photo-caption">' + escapeHtml(caption) + '</figcaption>' +
          '<div class="photo-meta">' + (dateStr ? t('addedOn') + ' ' + dateStr : '') + '</div>' +
        '</figure>';
      });
      gallery.innerHTML = html;

      // double-click a photo to open the lightbox
      var frames = gallery.querySelectorAll('.photo-frame');
      for (var f = 0; f < frames.length; f++) {
        (function (frame) {
          var id = frame.parentNode.getAttribute('data-id');
          frame.addEventListener('dblclick', function (e) {
            e.preventDefault();
            openLightbox(id);
          });
        })(frames[f]);
      }

      var dels = gallery.querySelectorAll('[data-del]');
      for (var j = 0; j < dels.length; j++) {
        dels[j].addEventListener('click', function (e) {
          e.stopPropagation();
          var id = this.getAttribute('data-del');
          if (!window.confirm(t('deleteConfirm'))) return;
          apiDelete(id).then(renderGallery).catch(function (err) {
            if (err && err.unauthorized) return;
            alert((lang === 'zh' ? '删除失败：' : 'Delete failed: ') + err.message);
          });
        });
      }
      var edits = gallery.querySelectorAll('[data-edit]');
      for (var k = 0; k < edits.length; k++) {
        edits[k].addEventListener('click', function (e) {
          e.stopPropagation();
          openEditModal(this.getAttribute('data-edit'));
        });
      }
    }).catch(function (err) {
      gallery.innerHTML = '';
      empty.hidden = false;
    });
  }

  // ---- Add modal ----
  function fillCatSelect(sel, selected) {
    sel.innerHTML = '';
    Object.keys(CATEGORIES).forEach(function (group) {
      var og = document.createElement('optgroup');
      og.label = lang === 'zh' ? CATEGORIES[group].zh : CATEGORIES[group].en;
      Object.keys(CATEGORIES[group].items).forEach(function (item) {
        var o = document.createElement('option');
        o.value = item;
        o.textContent = lang === 'zh' ? CATEGORIES[group].items[item].zh : CATEGORIES[group].items[item].en;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    if (selected && selected !== 'all') sel.value = selected;
  }

  // 未解锁时的统一拦截
  function needEdit() {
    if (isEditing) return false;
    showToast(t('needPw'));
    openPwModal();
    return true;
  }

  function openModal() {
    if (needEdit()) return;
    document.getElementById('modal').hidden = false;
    fillCatSelect(document.getElementById('catSelect'), currentCat);
    resetModalForm();
  }
  function closeModal() { document.getElementById('modal').hidden = true; }
  function resetModalForm() {
    document.getElementById('fileInput').value = '';
    document.getElementById('capZh').value = '';
    document.getElementById('capEn').value = '';
    document.getElementById('preview').hidden = true;
    document.getElementById('previewImg').src = '';
  }

  // ---- Edit modal ----
  function openEditModal(id) {
    var p = cachedPhotos.find(function (x) { return x.id === id; });
    if (!p) return;
    editingId = id;
    fillCatSelect(document.getElementById('editCatSelect'), p.category);
    document.getElementById('editCapZh').value = p.captionZh || '';
    document.getElementById('editCapEn').value = p.captionEn || '';
    document.getElementById('editModal').hidden = false;
  }
  function closeEditModal() {
    document.getElementById('editModal').hidden = true;
    editingId = null;
  }

  // ---- Lightbox ----
  function openLightbox(id) {
    var idx = -1;
    for (var i = 0; i < visiblePhotos.length; i++) {
      if (visiblePhotos[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    lbIndex = idx;
    lbRender();
    document.getElementById('lightbox').hidden = false;
  }

  function closeLightbox() {
    document.getElementById('lightbox').hidden = true;
  }

  function lbRender() {
    var p = visiblePhotos[lbIndex];
    if (!p) return;
    document.getElementById('lbImg').src = photoSrc(p);
    var caption = lang === 'zh'
      ? (p.captionZh || p.captionEn || '')
      : (p.captionEn || p.captionZh || '');
    document.getElementById('lbCaption').textContent = caption;
    document.getElementById('lbCount').textContent =
      (lbIndex + 1) + ' / ' + visiblePhotos.length;
    var many = visiblePhotos.length > 1;
    document.getElementById('lbPrev').hidden = !many;
    document.getElementById('lbNext').hidden = !many;
  }

  function lbStep(delta) {
    if (!visiblePhotos.length) return;
    lbIndex = (lbIndex + delta + visiblePhotos.length) % visiblePhotos.length;
    lbRender();
  }

  // ---- Toast ----
  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4000);
  }

  // ---- Native ZIP parser ----
  function parseZip(buf) {
    var dv = new DataView(buf);
    var eocd = -1;
    for (var i = buf.byteLength - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('不是有效的 zip 文件');
    var total = dv.getUint16(eocd + 10, true);
    var offset = dv.getUint32(eocd + 16, true);
    var entries = [];
    for (var n = 0; n < total; n++) {
      if (dv.getUint32(offset, true) !== 0x02014b50) break;
      var method = dv.getUint16(offset + 10, true);
      var compSize = dv.getUint32(offset + 20, true);
      var nameLen = dv.getUint16(offset + 28, true);
      var extraLen = dv.getUint16(offset + 30, true);
      var commentLen = dv.getUint16(offset + 32, true);
      var localOffset = dv.getUint32(offset + 42, true);
      var nameBytes = new Uint8Array(buf, offset + 46, nameLen);
      var name = new TextDecoder('utf-8').decode(nameBytes);
      entries.push({ name: name, method: method, compSize: compSize, localOffset: localOffset });
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  function readEntry(buf, entry) {
    var dv = new DataView(buf);
    var lh = entry.localOffset;
    var nameLen = dv.getUint16(lh + 26, true);
    var extraLen = dv.getUint16(lh + 28, true);
    var dataStart = lh + 30 + nameLen + extraLen;
    var compData = new Uint8Array(buf, dataStart, entry.compSize);
    if (entry.method === 0) return Promise.resolve(compData);
    if (entry.method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('当前浏览器不支持解压，请用新版 Chrome / Edge / Safari');
      }
      var ds = new DecompressionStream('deflate-raw');
      var stream = new Blob([compData]).stream().pipeThrough(ds);
      return new Response(stream).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
    }
    throw new Error('不支持的压缩方式: ' + entry.method);
  }

  function handleImport(file) {
    if (needEdit()) return;
    showToast(t('parsing'));
    file.arrayBuffer().then(function (buf) {
      var entries;
      try {
        entries = parseZip(buf);
      } catch (err) {
        alert(err.message);
        return;
      }
      var tasks = [];
      var skipped = 0, mac = 0, unknown = 0;
      entries.forEach(function (e) {
        if (e.name.charAt(e.name.length - 1) === '/') return;
        if (e.name.indexOf('__MACOSX') !== -1) { mac++; return; }
        var segs = e.name.split('/');
        var fname = segs[segs.length - 1];
        if (fname.charAt(0) === '.' || fname.indexOf('._') === 0) { mac++; return; }
        var lower = e.name.toLowerCase();
        var ext = lower.lastIndexOf('.') >= 0 ? lower.slice(lower.lastIndexOf('.') + 1) : '';
        if (IMG_EXT.indexOf(ext) === -1) { skipped++; return; }
        var folder = segs.length >= 2 ? segs[segs.length - 2] : '';
        var category = FOLDER_MAP[folder];
        if (!category) { unknown++; return; }
        tasks.push({ e: e, fname: fname, ext: ext, category: category });
      });

      var imported = 0, failed = 0;
      var CONCURRENCY = 4;   // 同时传 4 张
      var cursor = 0;

      function runNext() {
        if (cursor >= tasks.length) return Promise.resolve();
        var task = tasks[cursor++];
        return readEntry(buf, task.e).then(function (data) {
          var mime = 'image/' + (task.ext === 'jpg' ? 'jpeg' : task.ext);
          var blob = new Blob([data], { type: mime });
          return cloudinaryUpload(blob, task.fname).then(function (up) {
            return apiCreate({
              filename: task.fname,
              url: up.url,
              publicId: up.publicId,
              category: task.category,
              captionZh: '',
              captionEn: ''
            });
          }).catch(function () {
            // Cloudinary failed for this one - store it on the server instead
            return apiCreate({
              filename: task.fname,
              base64: bytesToBase64(data),
              category: task.category,
              captionZh: '',
              captionEn: ''
            });
          }).then(function () {
            imported++;
            showToast(t('importing') + ' ' + imported + ' / ' + tasks.length);
          });
        }).catch(function () {
          failed++;
        }).then(runNext);
      }

      var pool = [];
      for (var i = 0; i < CONCURRENCY; i++) pool.push(runNext());

      Promise.all(pool).then(function () {
        renderGallery();
        var msg = (lang === 'zh'
          ? t('importDone') + '：' + imported + ' 张'
          : t('importDone') + ': ' + imported + ' photos')
          + (failed ? (lang === 'zh' ? '，失败 ' + failed + ' 张' : ', ' + failed + ' failed') : '')
          + (skipped + mac ? (lang === 'zh' ? '，跳过 RAW/元数据 ' + (skipped + mac) + ' 个'
            : ', skipped ' + (skipped + mac) + ' raw/meta') : '')
          + (unknown ? (lang === 'zh' ? '，未归类 ' + unknown + ' 个' : ', unmatched ' + unknown) : '');
        showToast(msg);
      }).catch(function (err) {
        alert((lang === 'zh' ? '导入失败：' : 'Import failed: ') + err.message);
      });
    }).catch(function (err) {
      alert((lang === 'zh' ? '读取文件失败：' : 'Read failed: ') + err.message);
    });
  }

  // ---- Routing ----
  function parseHash() {
    var h = location.hash.replace('#', '');
    if (!h || h === 'all') { currentCat = 'all'; return; }
    var valid = false;
    Object.keys(CATEGORIES).forEach(function (group) {
      if (CATEGORIES[group].items[h]) valid = true;
    });
    currentCat = valid ? h : 'all';
  }
  function route() {
    parseHash();
    renderSidebar();
    updateHero();
    renderGallery();
  }

  // ---- Init ----
  function init() {
    applyI18n();
    setEditing(false);

    // ---- Admin lock wiring ----
    document.getElementById('lockBtn').addEventListener('click', function () {
      if (isEditing) {
        sessionExpired();
        showToast(t('locked'));
        renderGallery();
      } else {
        openPwModal();
      }
    });
    document.getElementById('pwClose').addEventListener('click', closePwModal);
    document.getElementById('pwCancel').addEventListener('click', closePwModal);
    document.getElementById('pwModal').addEventListener('click', function (e) {
      if (e.target.id === 'pwModal') closePwModal();
    });
    document.getElementById('pwOk').addEventListener('click', tryUnlock);
    document.getElementById('pwInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); }
    });

    // 已保存的令牌：静默校验，有效则直接进入编辑态
    if (adminToken) {
      fetch('/api/session', { headers: { 'X-Admin-Token': adminToken } })
        .then(function (r) {
          if (r.status === 200) { setEditing(true); renderGallery(); }
          else sessionExpired();
        })
        .catch(function () { sessionExpired(); });
    }

    document.getElementById('langToggle').addEventListener('click', function () {
      lang = lang === 'zh' ? 'en' : 'zh';
      localStorage.setItem('zion-lang', lang);
      applyI18n();
      renderSidebar();
      updateHero();
      renderGallery();
    });

    document.getElementById('addBtn').addEventListener('click', openModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', function (e) {
      if (e.target.id === 'modal') closeModal();
    });

    document.getElementById('fileInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      var wrap = document.getElementById('preview');
      var img = document.getElementById('previewImg');
      if (file) {
        var url = URL.createObjectURL(file);
        img.src = url;
        wrap.hidden = false;
      } else {
        wrap.hidden = true;
      }
    });

    document.getElementById('saveBtn').addEventListener('click', function () {
      var file = document.getElementById('fileInput').files[0];
      if (!file) { alert(t('noFile')); return; }
      var category = document.getElementById('catSelect').value;
      var capZh = document.getElementById('capZh').value.trim();
      var capEn = document.getElementById('capEn').value.trim();
      showToast(t('uploading'));
      cloudinaryUpload(file, file.name).then(function (up) {
        return apiCreate({
          filename: file.name,
          url: up.url,
          publicId: up.publicId,
          category: category,
          captionZh: capZh,
          captionEn: capEn
        });
      }).catch(function () {
        // Cloudinary failed - fall back to storing the file on the server
        return fileToBase64(file).then(function (r) {
          return apiCreate({
            filename: r.filename,
            base64: r.base64,
            category: category,
            captionZh: capZh,
            captionEn: capEn
          });
        });
      }).then(function (photo) {
        closeModal();
        if (currentCat !== 'all' && currentCat !== photo.category) {
          location.hash = photo.category;
        } else {
          renderGallery();
        }
        showToast(t('saved'));
      }).catch(function (err) {
        if (err && err.unauthorized) return;
        alert((lang === 'zh' ? '保存失败：' : 'Save failed: ') + err.message);
      });
    });

    document.getElementById('editClose').addEventListener('click', closeEditModal);
    document.getElementById('editCancel').addEventListener('click', closeEditModal);
    document.getElementById('editModal').addEventListener('click', function (e) {
      if (e.target.id === 'editModal') closeEditModal();
    });
    document.getElementById('editSave').addEventListener('click', function () {
      if (!editingId) return;
      apiUpdate(editingId, {
        category: document.getElementById('editCatSelect').value,
        captionZh: document.getElementById('editCapZh').value.trim(),
        captionEn: document.getElementById('editCapEn').value.trim()
      }).then(function (photo) {
        closeEditModal();
        if (currentCat !== 'all' && currentCat !== photo.category) {
          location.hash = photo.category;
        } else {
          renderGallery();
        }
        showToast(t('saved'));
      }).catch(function (err) {
        if (err && err.unauthorized) return;
        alert((lang === 'zh' ? '保存失败：' : 'Save failed: ') + err.message);
      });
    });

    document.getElementById('importBtn').addEventListener('click', function () {
      if (needEdit()) return;
      document.getElementById('importInput').click();
    });
    document.getElementById('importInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      handleImport(file);
      e.target.value = '';
    });

    // Drag & drop a .zip anywhere on the page
    var dropZone = document.querySelector('.content');
    ['dragenter', 'dragover'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.add('drag');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove('drag');
      });
    });
    dropZone.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      if (needEdit()) return;
      var zip = null;
      for (var i = 0; i < files.length; i++) {
        if (files[i].name.toLowerCase().endsWith('.zip')) { zip = files[i]; break; }
      }
      if (zip) handleImport(zip);
      else alert(lang === 'zh' ? '请把摄影集.zip 拖进来' : 'Please drop the .zip file');
    });

    // Lightbox events
    document.getElementById('lbClose').addEventListener('click', closeLightbox);
    document.getElementById('lbPrev').addEventListener('click', function (e) {
      e.stopPropagation();
      lbStep(-1);
    });
    document.getElementById('lbNext').addEventListener('click', function (e) {
      e.stopPropagation();
      lbStep(1);
    });
    document.getElementById('lightbox').addEventListener('click', function (e) {
      // clicking the dark backdrop closes; clicking the image does not
      if (e.target.id === 'lightbox' || e.target.id === 'lbStage') closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (document.getElementById('lightbox').hidden) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lbStep(-1);
      else if (e.key === 'ArrowRight') lbStep(1);
    });

    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
