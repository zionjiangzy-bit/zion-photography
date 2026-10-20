/** @type {import('tailwindcss').Config} */
/*
 * Bugatti 设计系统（取自 awesome-design-md / design-md/bugatti/DESIGN.md）
 * 要点：纯黑画布、零圆角（只有 pill 例外）、零阴影、正字距 +4px 的大写感标题、
 *      顶栏透明只留一条 hairline。
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#000000',   // 页面底
        surface: '#0d0d0d',  // 侧栏 / 顶栏
        card: '#141414',     // 卡片
        raised: '#1f1f1f',   // hover / 弹窗
        ink: '#ffffff',      // 主文字
        strong: '#e6e6e6',   // 次强文字
        body: '#cccccc',     // 正文
        muted: '#999999',    // 弱化
        faint: '#666666',    // 极弱
        hairline: '#262626', // 分隔线
        hairline2: '#3a3a3a',// 强分隔线
        link: '#c3d9f3',     // 链接
        warn: '#d4a017'      // 警示
      },
      fontFamily: {
        display: ['"Bugatti Display"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        cn: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif']
      },
      letterSpacing: {
        display: '4px',
        label: '0.16em'
      },
      // Bugatti 零阴影：把旧的两个阴影名全部置空，历史 className 自动失效
      boxShadow: {
        soft: 'none',
        lift: 'none'
      }
    }
  },
  plugins: []
};
