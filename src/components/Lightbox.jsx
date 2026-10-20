import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { photoSrc } from '../lib/media.js';

export default function Lightbox({ photo, index, total, lang, onClose, onStep }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onStep(-1);
      else if (e.key === 'ArrowRight') onStep(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  const caption = photo
    ? lang === 'zh'
      ? photo.captionZh || photo.captionEn || ''
      : photo.captionEn || photo.captionZh || ''
    : '';

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[rgba(0,0,0,.96)] px-16 py-10 max-md:px-4 max-md:py-14"
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-ink transition-colors hover:bg-white/15"
          >
            ×
          </button>

          {total > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onStep(-1); }}
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-3xl leading-none text-ink transition-colors hover:bg-white/15 max-md:h-10 max-md:w-10 max-md:text-2xl"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onStep(1); }}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-3xl leading-none text-ink transition-colors hover:bg-white/15 max-md:h-10 max-md:w-10 max-md:text-2xl"
              >
                ›
              </button>
            </>
          )}

          <motion.img
            key={photo.id}
            src={photoSrc(photo)}
            alt={caption}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />

          <div className="mt-4 flex max-w-[900px] flex-col items-center gap-1.5 text-center">
            <div className="font-cn text-[15px] leading-relaxed text-strong">{caption}</div>
            <div className="text-xs tracking-[.06em] text-faint">{index + 1} / {total}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
