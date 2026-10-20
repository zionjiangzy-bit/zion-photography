import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '../lib/i18n.js';

function Shell({ open, onClose, title, children, footer, t }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto border border-hairline2 bg-card"
          >
            <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
              <h2 className="font-cn text-xl font-normal tracking-[1px] text-ink">{title}</h2>
              <button onClick={onClose} className="text-2xl leading-none text-faint transition-colors hover:text-ink">×</button>
            </div>
            <div className="flex flex-col gap-3.5 px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2.5 border-t border-hairline px-6 py-4">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CategorySelect({ lang, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-hairline2 bg-canvas px-3 py-2.5 text-sm text-ink"
    >
      {Object.keys(CATEGORIES).map((groupKey) => (
        <optgroup key={groupKey} label={lang === 'zh' ? CATEGORIES[groupKey].zh : CATEGORIES[groupKey].en}>
          {Object.keys(CATEGORIES[groupKey].items).map((key) => (
            <option key={key} value={key}>
              {lang === 'zh' ? CATEGORIES[groupKey].items[key].zh : CATEGORIES[groupKey].items[key].en}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-label text-faint">{label}</span>
      {children}
    </label>
  );
}

const INPUT = 'w-full border border-hairline2 bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-faint';

export function AddModal({ open, onClose, onSave, lang, t, category }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [cat, setCat] = useState(category === 'all' ? 'urban' : category);
  const [zh, setZh] = useState('');
  const [en, setEn] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null); setPreview(''); setZh(''); setEn(''); setBusy(false);
      setCat(category === 'all' ? 'urban' : category);
    }
  }, [open, category]);

  return (
    <Shell open={open} onClose={onClose} title={t('modalTitle')} t={t}
      footer={
        <>
          <button onClick={onClose} className="rounded-full border border-hairline2 px-4 py-2 text-[13px] font-medium text-body transition-colors hover:border-ink hover:text-ink">{t('cancel')}</button>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); await onSave({ file, category: cat, captionZh: zh, captionEn: en }); setBusy(false); }}
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-canvas transition-colors hover:bg-strong disabled:opacity-50"
          >
            {busy ? t('uploading') : t('save')}
          </button>
        </>
      }
    >
      <Field label={t('categoryLabel')}>
        <CategorySelect lang={lang} value={cat} onChange={setCat} />
      </Field>

      <Field label={t('imageLabel')}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            setFile(f || null);
            setPreview(f ? URL.createObjectURL(f) : '');
          }}
          className={`${INPUT} py-2`}
        />
      </Field>

      {preview && (
        <div className="border border-hairline bg-canvas p-2.5">
          <img src={preview} alt="preview" className="block max-h-[220px] w-full object-contain" />
        </div>
      )}

      <Field label={t('capZhLabel')}>
        <textarea rows={2} value={zh} onChange={(e) => setZh(e.target.value)} className={`${INPUT} resize-y`} />
      </Field>
      <Field label={t('capEnLabel')}>
        <textarea rows={2} value={en} onChange={(e) => setEn(e.target.value)} className={`${INPUT} resize-y`} />
      </Field>
    </Shell>
  );
}

export function EditModal({ open, onClose, onSave, lang, t, photo }) {
  const [cat, setCat] = useState('urban');
  const [zh, setZh] = useState('');
  const [en, setEn] = useState('');

  useEffect(() => {
    if (photo) {
      setCat(photo.category || 'urban');
      setZh(photo.captionZh || '');
      setEn(photo.captionEn || '');
    }
  }, [photo]);

  return (
    <Shell open={open} onClose={onClose} title={t('editTitle')} t={t}
      footer={
        <>
          <button onClick={onClose} className="rounded-full border border-hairline2 px-4 py-2 text-[13px] font-medium text-body transition-colors hover:border-ink hover:text-ink">{t('cancel')}</button>
          <button onClick={() => onSave({ category: cat, captionZh: zh, captionEn: en })} className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-canvas transition-colors hover:bg-strong">{t('save')}</button>
        </>
      }
    >
      <Field label={t('categoryLabel')}>
        <CategorySelect lang={lang} value={cat} onChange={setCat} />
      </Field>
      <Field label={t('capZhLabel')}>
        <textarea rows={2} value={zh} onChange={(e) => setZh(e.target.value)} className={`${INPUT} resize-y`} />
      </Field>
      <Field label={t('capEnLabel')}>
        <textarea rows={2} value={en} onChange={(e) => setEn(e.target.value)} className={`${INPUT} resize-y`} />
      </Field>
    </Shell>
  );
}

export function PasswordModal({ open, onClose, onSubmit, t }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setPw(''); setErr(false); setTimeout(() => inputRef.current && inputRef.current.focus(), 80); }
  }, [open]);

  const submit = async () => {
    if (!pw) return;
    const ok = await onSubmit(pw);
    if (!ok) { setErr(true); setPw(''); inputRef.current && inputRef.current.focus(); }
  };

  return (
    <Shell open={open} onClose={onClose} title={t('unlockTitle')} t={t}
      footer={
        <>
          <button onClick={onClose} className="rounded-full border border-hairline2 px-4 py-2 text-[13px] font-medium text-body transition-colors hover:border-ink hover:text-ink">{t('cancel')}</button>
          <button onClick={submit} className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-canvas transition-colors hover:bg-strong">{t('unlock')}</button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-muted">{t('unlockHint')}</p>
      <Field label={t('pwLabel')}>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          className={INPUT}
        />
      </Field>
      {err && <p className="text-[13px] tracking-[.02em] text-warn">{t('wrongPw')}</p>}
    </Shell>
  );
}
