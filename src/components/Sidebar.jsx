import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/i18n.js';

// 左侧目录：固定在视口左侧，不随主内容滚动
export default function Sidebar({ lang, t, current, onSelect }) {
  const items = [{ key: 'all', zh: t('heroAll'), en: t('all') }];

  return (
    <nav className="sticky top-[65px] self-start max-h-[calc(100vh-65px)] w-60 shrink-0 overflow-y-auto border-r border-hairline bg-surface px-4 py-6 max-md:static max-md:flex max-md:w-full max-md:max-h-none max-md:flex-row max-md:gap-2 max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:py-3">
      <div className="flex flex-col gap-1 max-md:flex-row">
        <SideItem
          label={t('heroAll')}
          sub={lang === 'zh' ? '全部' : 'All'}
          active={current === 'all'}
          onClick={() => onSelect('all')}
        />

        {Object.keys(CATEGORIES).map((groupKey, gi) => {
          const g = CATEGORIES[groupKey];
          return (
            <div key={groupKey} className={`${gi === 0 ? 'mt-0' : 'mt-4'} max-md:mt-0 max-md:flex max-md:gap-2`}>
              <div className="px-3.5 pb-2 text-[11px] uppercase tracking-label text-faint max-md:hidden">
                {lang === 'zh' ? g.zh : g.en}
              </div>
              <div className="flex flex-col gap-1 max-md:flex-row">
                {Object.keys(g.items).map((key) => (
                  <SideItem
                    key={key}
                    label={lang === 'zh' ? g.items[key].zh : g.items[key].en}
                    sub={lang === 'zh' ? g.items[key].en : g.items[key].zh}
                    active={current === key}
                    onClick={() => onSelect(key)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function SideItem({ label, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative flex flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors max-md:whitespace-nowrap',
        active ? 'bg-ink text-canvas' : 'text-body hover:bg-raised'
      ].join(' ')}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 -z-10 bg-ink"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className="text-sm font-normal tracking-[.02em]">{label}</span>
      <span className={`text-[11px] tracking-[.04em] ${active ? 'text-canvas/70' : 'text-faint'}`}>{sub}</span>
    </button>
  );
}
