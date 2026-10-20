import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Masonry from './components/Masonry.jsx';
import Lightbox from './components/Lightbox.jsx';
import { AddModal, EditModal, PasswordModal } from './components/Modals.jsx';
import BlurText from './bits/BlurText.jsx';

import { UI, CATEGORIES, catLabel } from './lib/i18n.js';
import { api, getToken, setToken, UnauthorizedError } from './lib/api.js';
import {
  cloudinaryUpload, measureBlob, fileToBase64, bytesToBase64,
  parseZip, readEntry, buildImportTasks
} from './lib/media.js';

const CONCURRENCY = 4;

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('zion-lang') || 'zh');
  const [current, setCurrent] = useState(() => {
    const h = location.hash.replace('#', '');
    return h || 'all';
  });
  const [photos, setPhotos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editPhoto, setEditPhoto] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [lbId, setLbId] = useState(null);
  const [drag, setDrag] = useState(false);

  const importInput = useRef(null);
  const toastTimer = useRef(null);

  const t = useCallback((key) => (UI[lang] && UI[lang][key]) || key, [lang]);

  const notify = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }, []);

  const reload = useCallback(() => {
    api.list().then((list) => setPhotos(Array.isArray(list) ? list : []));
  }, []);

  // 首屏加载 + 恢复解锁状态
  useEffect(() => {
    reload();
    const token = getToken();
    if (token) {
      api.session(token).then((ok) => {
        if (ok) setIsEditing(true);
        else setToken('');
      });
    }
  }, [reload]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
    document.title = lang === 'zh'
      ? "Zion的摄影记录 · Zion's Photography"
      : "Zion's Photography";
  }, [lang]);

  // hash 路由
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace('#', '') || 'all';
      const valid = h === 'all' || Object.values(CATEGORIES).some((g) => g.items[h]);
      setCurrent(valid ? h : 'all');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const visible = useMemo(() => {
    const list = photos.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return current === 'all' ? list : list.filter((p) => p.category === current);
  }, [photos, current]);

  // ---- 权限 ----
  const lockNow = useCallback(() => {
    setToken('');
    setIsEditing(false);
  }, []);

  const guard = useCallback((err) => {
    if (err && err.unauthorized) {
      lockNow();
      notify(t('sessionExpired'));
      setShowPw(true);
      return true;
    }
    return false;
  }, [lockNow, notify, t]);

  const needEdit = useCallback(() => {
    if (isEditing) return false;
    notify(t('needPw'));
    setShowPw(true);
    return true;
  }, [isEditing, notify, t]);

  // ---- 增删改 ----
  const createPhoto = useCallback(async ({ file, category, captionZh, captionEn }) => {
    if (!file) { alert(t('noFile')); return; }
    notify(t('uploading'));
    try {
      const dim = await measureBlob(file);
      let payload = { filename: file.name, category, captionZh, captionEn, width: dim?.w || null, height: dim?.h || null };
      try {
        const up = await cloudinaryUpload(file, file.name);
        payload.url = up.url;
        payload.publicId = up.publicId;
      } catch (e) {
        const r = await fileToBase64(file);
        payload.filename = r.filename;
        payload.base64 = r.base64;
      }
      const photo = await api.create(payload);
      setShowAdd(false);
      if (current !== 'all' && current !== photo.category) location.hash = photo.category;
      else reload();
      notify(t('saved'));
    } catch (err) {
      if (!guard(err)) alert((lang === 'zh' ? '保存失败：' : 'Save failed: ') + err.message);
    }
  }, [t, notify, current, reload, guard, lang]);

  const saveEdit = useCallback(async ({ category, captionZh, captionEn }) => {
    if (!editPhoto) return;
    try {
      const photo = await api.update(editPhoto.id, { category, captionZh, captionEn });
      setEditPhoto(null);
      if (current !== 'all' && current !== photo.category) location.hash = photo.category;
      else reload();
      notify(t('saved'));
    } catch (err) {
      if (!guard(err)) alert((lang === 'zh' ? '保存失败：' : 'Save failed: ') + err.message);
    }
  }, [editPhoto, t, notify, current, reload, guard, lang]);

  const deletePhoto = useCallback(async (photo) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.remove(photo.id);
      reload();
    } catch (err) {
      if (!guard(err)) alert((lang === 'zh' ? '删除失败：' : 'Delete failed: ') + err.message);
    }
  }, [t, reload, guard, lang]);

  // ---- 批量导入 ----
  const handleImport = useCallback(async (file) => {
    if (needEdit()) return;
    notify(t('parsing'));
    let entries, buf;
    try {
      // 只读取一次，后续所有条目复用同一份 buffer（zip 有 735MB，不能每读一张就读一遍）
      buf = await file.arrayBuffer();
      entries = parseZip(buf);
    } catch (err) {
      alert(err.message);
      return;
    }
    const { tasks, skipped, mac, unknown } = buildImportTasks(entries);
    if (!tasks.length) { notify(t('importDone') + ' 0'); return; }

    let imported = 0, failed = 0, cursor = 0;
    const runNext = async () => {
      if (cursor >= tasks.length) return;
      const task = tasks[cursor++];
      try {
        const data = await readEntry(buf, task);
        const blob = new Blob([data], { type: 'image/' + (task.ext === 'jpg' ? 'jpeg' : task.ext) });
        const dim = await measureBlob(blob);
        const base = { filename: task.fname, category: task.category, captionZh: '', captionEn: '', width: dim?.w || null, height: dim?.h || null };
        try {
          const up = await cloudinaryUpload(blob, task.fname);
          await api.create({ ...base, url: up.url, publicId: up.publicId });
        } catch (e) {
          await api.create({ ...base, base64: bytesToBase64(data) });
        }
        imported++;
        notify(t('importing') + ' ' + imported + ' / ' + tasks.length);
      } catch (e) {
        failed++;
      }
      await runNext();
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => runNext()));
    reload();
    let msg = (lang === 'zh' ? t('importDone') + '：' + imported + ' 张' : t('importDone') + ': ' + imported + ' photos');
    if (failed) msg += lang === 'zh' ? '，失败 ' + failed + ' 张' : ', ' + failed + ' failed';
    if (skipped + mac) msg += lang === 'zh' ? '，跳过 RAW/元数据 ' + (skipped + mac) + ' 个' : ', skipped ' + (skipped + mac) + ' raw/meta';
    if (unknown) msg += lang === 'zh' ? '，未归类 ' + unknown + ' 个' : ', unmatched ' + unknown;
    notify(msg);
  }, [needEdit, notify, t, reload, lang]);

  // ---- Lightbox ----
  const lbIndex = visible.findIndex((p) => p.id === lbId);
  const lbPhoto = lbIndex >= 0 ? visible[lbIndex] : null;
  const lbStep = (d) => {
    if (!visible.length || lbIndex < 0) return;
    setLbId(visible[(lbIndex + d + visible.length) % visible.length].id);
  };

  const heroTitle = catLabel(lang, current);
  const heroTag = current === 'all'
    ? t('heroAllDesc')
    : (() => {
        for (const g of Object.values(CATEGORIES)) {
          if (g.items[current]) return lang === 'zh' ? g.items[current].en : g.items[current].zh;
        }
        return '';
      })();

  return (
    <div className="min-h-screen bg-cream text-espresso">
      <TopBar
        lang={lang}
        t={t}
        isEditing={isEditing}
        onToggleLock={() => {
          if (isEditing) { lockNow(); notify(t('locked')); }
          else setShowPw(true);
        }}
        onAdd={() => { if (!needEdit()) setShowAdd(true); }}
        onImport={() => { if (!needEdit()) importInput.current && importInput.current.click(); }}
      />

      <div className="flex min-h-[calc(100vh-65px)] max-md:flex-col">
        <Sidebar
          lang={lang}
          t={t}
          current={current}
          onSelect={(key) => { location.hash = key; }}
        />

        <main
          className="flex-1 pb-16"
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const files = e.dataTransfer && e.dataTransfer.files;
            if (!files) return;
            const zip = Array.from(files).find((f) => f.name.toLowerCase().endsWith('.zip'));
            if (zip) handleImport(zip);
          }}
        >
          <section className={`bg-gradient-to-br from-mocha to-coffee px-10 py-12 text-white transition-all max-md:px-6 max-md:py-8 ${drag ? 'outline-dashed outline-4 outline-offset-[-12px] outline-white/60' : ''}`}>
            <h1 className="font-serif text-[42px] font-bold leading-tight max-md:text-[32px]">
              <BlurText text={heroTitle} animateBy={lang === 'zh' ? 'chars' : 'words'} delay={40} />
            </h1>
            <p className="mt-2 max-w-[600px] text-[15px] text-white/80">{heroTag}</p>
          </section>

          <section className="px-10 py-8 max-md:px-5">
            {visible.length === 0 ? (
              <div className="py-20 text-center text-muted">
                <p className="font-cn text-xl text-espresso">{t('empty')}</p>
                <p className="mt-2 text-sm">{t('emptyHint')}</p>
              </div>
            ) : (
              <Masonry
                photos={visible}
                lang={lang}
                t={t}
                isEditing={isEditing}
                onEdit={(id) => setEditPhoto(visible.find((p) => p.id === id) || null)}
                onDelete={deletePhoto}
                onOpen={setLbId}
              />
            )}
          </section>
        </main>
      </div>

      <input
        ref={importInput}
        type="file"
        accept=".zip"
        hidden
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) handleImport(f);
          e.target.value = '';
        }}
      />

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onSave={createPhoto} lang={lang} t={t} category={current} />
      <EditModal open={!!editPhoto} onClose={() => setEditPhoto(null)} onSave={saveEdit} lang={lang} t={t} photo={editPhoto} />
      <PasswordModal
        open={showPw}
        onClose={() => setShowPw(false)}
        t={t}
        onSubmit={async (pw) => {
          const token = await api.unlock(pw);
          if (token) {
            setToken(token);
            setIsEditing(true);
            setShowPw(false);
            notify(t('unlocked'));
            reload();
            return true;
          }
          return false;
        }}
      />

      <Lightbox
        photo={lbPhoto}
        index={lbIndex}
        total={visible.length}
        lang={lang}
        onClose={() => setLbId(null)}
        onStep={lbStep}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-espresso px-6 py-3 text-sm text-white shadow-soft"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
