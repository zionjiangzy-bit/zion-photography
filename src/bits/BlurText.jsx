import { motion } from 'framer-motion';

/**
 * React Bits · BlurText
 * 文字逐字（中文按字、英文按词）从模糊中浮现。
 */
export default function BlurText({
  text,
  className = '',
  delay = 60,
  duration = 700,
  animateBy = 'chars'
}) {
  const raw = String(text || '');
  const parts = animateBy === 'words' ? raw.split(' ') : Array.from(raw);

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: duration / 1000, delay: (i * delay) / 1000, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {part}
          {animateBy === 'words' ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
}
