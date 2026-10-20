import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BlurText from '../bits/BlurText.jsx';

// 顶栏：滚动时收缩 + 加深毛玻璃与阴影
export default function TopBar({ lang, t, isEditing, onToggleLock, onAdd, onImport }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      className={[
        'sticky top-0 z-40 flex items-center justify-between border-b border-coffee/15',
        'transition-all duration-300 ease-out',
        scrolled
          ? 'bg-cream/80 backdrop-blur-xl shadow-soft py-2.5 px-7'
          : 'bg-cream/95 backdrop-blur-md py-3.5 px-7'
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl sm:text-[26px]">📷</span>
        <div className="flex flex-col leading-[1.15]">
          <BlurText
            text={t('siteTitle')}
            animateBy={lang === 'zh' ? 'chars' : 'words'}
            delay={45}
            className="font-cn font-bold text-espresso text-lg sm:text-xl"
          />
          <span className="text-[11px] uppercase tracking-[.12em] text-muted">{t('siteSub')}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleLock}
          className={[
            'rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors',
            isEditing
              ? 'border-mocha bg-foam text-espresso font-semibold'
              : 'border-coffee/15 text-coffee hover:bg-foam'
          ].join(' ')}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isEditing ? 'on' : 'off'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="inline-block"
            >
              {isEditing ? t('unlockBtn') : t('lockBtn')}
            </motion.span>
          </AnimatePresence>
        </button>

        <button
          onClick={() => { const l = lang === 'zh' ? 'en' : 'zh'; localStorage.setItem('zion-lang', l); window.location.reload(); }}
          className="rounded-full border border-coffee/15 px-3.5 py-2 text-[13px] font-medium text-coffee transition-colors hover:bg-foam"
        >
          {t('langBtn')}
        </button>

        {isEditing && (
          <>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onImport}
              className="rounded-full border border-coffee/15 px-3.5 py-2 text-[13px] font-medium text-coffee transition-colors hover:bg-foam"
            >
              {t('importBtn')}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAdd}
              className="rounded-full bg-mocha px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(176,140,104,.4)] transition-colors hover:bg-coffee"
            >
              {t('addPhoto')}
            </motion.button>
          </>
        )}
      </div>
    </motion.header>
  );
}
