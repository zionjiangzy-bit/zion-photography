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
      importing: '正在导入'
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
      importing: 'Importing'
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

  // ---- API ----
  function apiList() {
    return fetch('/api/photos').then(function (r) { return r.json(); });
  }
  function apiCreate(obj) {
    return fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.json(); });
  }
  function apiUpdate(id, obj) {
    return fetch('/api/photos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.json(); });
  }
  function apiDelete(id) {
    return fetch('/api/photos/' + id, { method: 'DELETE' }).then(function (r) { return r.json(); });
  }

  // ---- i18n ----
  function applyI18n() {
    document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      if (UI[lang] && UI[lang][k]) nodes[i].textContent = UI[lang][k];
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
        var src = '/uploads/' + p.filename;
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
          apiDelete(id).then(renderGallery);
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

  function openModal() {
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
    document.getElementById('lbImg').src = '/uploads/' + p.filename;
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
    showToast(t('parsing'));
    file.arrayBuffer().then(function (buf) {
      var entries;
      try {
        entries = parseZip(buf);
      } catch (err) {
        alert(err.message);
        return;
      }
      var imported = 0, skipped = 0, mac = 0, unknown = 0;
      var chain = Promise.resolve();
      entries.forEach(function (e) {
        chain = chain.then(function () {
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
          return readEntry(buf, e).then(function (data) {
            return apiCreate({
              filename: fname,
              base64: bytesToBase64(data),
              category: category,
              captionZh: '',
              captionEn: ''
            }).then(function () {
              imported++;
              if (imported % 5 === 0) {
                showToast(t('importing') + ' ' + imported + (lang === 'zh' ? ' 张' : ' done'));
              }
            });
          });
        });
      });
      chain.then(function () {
        renderGallery();
        var msg = (lang === 'zh'
          ? t('importDone') + '：' + imported + ' 张'
          : t('importDone') + ': ' + imported + ' photos')
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
      fileToBase64(file).then(function (r) {
        return apiCreate({
          filename: r.filename,
          base64: r.base64,
          category: document.getElementById('catSelect').value,
          captionZh: document.getElementById('capZh').value.trim(),
          captionEn: document.getElementById('capEn').value.trim()
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
        alert((lang === 'zh' ? '保存失败：' : 'Save failed: ') + err.message);
      });
    });

    document.getElementById('importBtn').addEventListener('click', function () {
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
