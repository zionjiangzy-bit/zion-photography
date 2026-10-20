import { motion } from 'framer-motion';

/**
 * React Bits · FadeContent
 * 元素进入视口时淡入 + 轻微上浮（可带模糊）。
 * 只用 opacity / transform / filter，不触发重排，66 张照片也不卡。
 */
export default function FadeContent({
  children,
  blur = false,
  duration = 700,
  delay = 0,
  y = 26,
  className = ''
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: blur ? 'blur(12px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: duration / 1000, delay: delay / 1000, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
