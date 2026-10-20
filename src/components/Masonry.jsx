import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import FadeContent from '../bits/FadeContent.jsx';
import SpotlightCard from '../bits/SpotlightCard.jsx';
import { photoSrc } from '../lib/media.js';

const GAP = 24;       // Bugatti spacing.lg
const TARGET = 280;   // 每列理想宽度
const CAPTION = 62;   // 说明 + 日期预留高度

// 瀑布流：保留每张照片的原始比例，按「最短列优先」投放
export default function Masonry({ photos, lang, t, isEditing, onEdit, onDelete, onOpen }) {
  const ref = useRef(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth || 1;
      let n = Math.floor((w + GAP) / (TARGET + GAP));
      n = Math.max(1, Math.min(4, n || 1));
      setCols(n);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buckets = useMemo(() => {
    const arr = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);
    const colW = 300; // 只用相对高度做比较，取固定值即可
    photos.forEach((p) => {
      let idx = 0;
      for (let k = 1; k < cols; k++) if (heights[k] < heights[idx] - 0.5) idx = k;
      arr[idx].push(p);
      const ratio = p.width && p.height ? p.width / p.height : 4 / 3;
      heights[idx] += colW / ratio + CAPTION;
    });
    return arr;
  }, [photos, cols]);

  return (
    <div ref={ref} className="flex items-start gap-[24px]">
      {buckets.map((col, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-[24px]">
          {col.map((p, j) => (
            <FadeContent key={p.id} delay={Math.min(j, 6) * 45} duration={650}>
              <PhotoCard
                photo={p}
                lang={lang}
                t={t}
                isEditing={isEditing}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpen={onOpen}
              />
            </FadeContent>
          ))}
        </div>
      ))}
    </div>
  );
}

function PhotoCard({ photo, lang, t, isEditing, onEdit, onDelete, onOpen }) {
  const caption = lang === 'zh'
    ? photo.captionZh || photo.captionEn || ''
    : photo.captionEn || photo.captionZh || '';
  const ratio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
  const dateStr = photo.createdAt
    ? new Date(photo.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')
    : '';

  return (
    <figure className="m-0">
      <SpotlightCard
        className=""
        spotlightColor="rgba(255,255,255,0.14)"
        size={280}
      >
        <motion.div
          onDoubleClick={() => onOpen(photo.id)}
          whileHover={{ scale: 1.012 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="relative cursor-zoom-in overflow-hidden bg-card"
          style={{ aspectRatio: String(ratio) }}
        >
          <img
            src={photoSrc(photo)}
            alt={caption}
            loading="lazy"
            className="h-full w-full object-cover"
          />

          {isEditing && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(photo.id); }}
                title={t('editTitle')}
                className="absolute left-2.5 top-2.5 flex h-7 items-center justify-center bg-canvas/80 px-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-canvas"
                style={{ opacity: 1 }}
              >
                EDIT
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
                title={t('deleteConfirm')}
                className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/75 text-base text-ink transition-colors hover:bg-ink hover:text-canvas"
                style={{ opacity: 1 }}
              >
                ×
              </button>
            </>
          )}
        </motion.div>
      </SpotlightCard>

      {caption && (
        <figcaption className="mt-3 font-cn text-sm leading-relaxed text-body">{caption}</figcaption>
      )}
      {dateStr && (
        <div className="mt-1 text-[11px] tracking-[.04em] text-faint">{t('addedOn')} {dateStr}</div>
      )}
    </figure>
  );
}
