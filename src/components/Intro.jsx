import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import TechText from '../bits/TechText.jsx';

/**
 * 开始页：Bugatti 风格纯黑封面，ZION 字标用 React Bits 的 TechText 渲染。
 * 点任意位置（或按回车/空格）进入画廊。拖动字母不会误触发进入。
 */
export default function Intro({ lang, t, onEnter }) {
  const down = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        onEnter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEnter]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center bg-canvas px-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.55, ease: [0.25, 0.4, 0.25, 1] }}
      onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
      onClick={(e) => {
        // 拖过字母就不算「点击进入」
        if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) < 10) onEnter();
      }}
    >
      <div className="w-[92vw] max-w-[920px]" style={{ height: 'clamp(150px, 28vh, 280px)' }}>
        <TechText
          text="ZION"
          fontWeight={600}
          fontSize={170}
          letterSpacing={0.08}
          align="center"
          color="#ffffff"
          accentColor="#ffffff"
          reveal="area"
          dashLength={4}
          dashGap={2}
          specks={0}
          intro="type"
          introDuration={1.4}
          clickKick
          guides={false}
          reach={240}
          softness={0.85}
          lineStyle="solid"
          strokeWidth={1}
          labels={false}
          draggable
          sweep
          speed={1}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.35, 1] }}
        transition={{ duration: 2.6, times: [0, 0.3, 0.65, 1], delay: 1.5, repeat: Infinity, repeatDelay: 0.6 }}
        className="mt-8 text-center font-cn text-[12px] font-medium uppercase tracking-[0.34em] text-muted max-md:tracking-[0.22em]"
      >
        {t('enterHint')}
      </motion.p>

      <div className="absolute bottom-10 left-0 right-0 text-center">
        <span className="font-cn text-[11px] tracking-[0.3em] text-faint">{t('introSub')}</span>
      </div>
    </motion.div>
  );
}
