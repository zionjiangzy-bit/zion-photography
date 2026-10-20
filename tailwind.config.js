/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F1E8',
        foam: '#EDE3D5',
        sand: '#E0D2BE',
        tan: '#C9B29B',
        mocha: '#B08C68',
        coffee: '#7F5C3D',
        espresso: '#4A3526',
        muted: '#8A7560'
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Noto Serif SC"', 'serif'],
        cn: ['"Noto Serif SC"', '"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 10px 30px rgba(74,53,38,.12)',
        lift: '0 18px 46px rgba(74,53,38,.22)'
      },
      borderRadius: {
        xl2: '14px'
      }
    }
  },
  plugins: []
};
