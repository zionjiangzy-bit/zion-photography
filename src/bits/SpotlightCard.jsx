import { useRef, useState } from 'react';

/**
 * React Bits · SpotlightCard
 * 鼠标移到卡片上，跟随光标出现柔光光晕。
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(255,255,255,0.35)',
  size = 260
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMove = (e) => {
    const rect = ref.current && ref.current.getBoundingClientRect();
    if (rect) setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 70%)`
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
