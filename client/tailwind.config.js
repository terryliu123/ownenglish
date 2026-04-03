/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OwnEnglish 品牌色
        navy: {
          DEFAULT: '#1e3a5f',
          soft: '#2d4a6f',
        },
        coral: '#e05a3e',
        sage: '#4a8b7a',
        green: '#5a9b6e',
        gold: '#c9943f',
        bg: '#f4efe7',
        paper: '#fffdf9',
        ink: '#1a2744',
        muted: '#5c6b82',
        border: 'rgba(24, 36, 58, 0.08)',
      },
      fontFamily: {
        sans: ['Noto Sans SC', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        'xl': '28px',
        'lg': '22px',
        'md': '16px',
        'sm': '12px',
      },
      boxShadow: {
        'soft': '0 20px 60px rgba(17, 26, 44, 0.12)',
        'soft-lg': '0 28px 80px rgba(17, 26, 44, 0.16)',
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1.5' }],
        'sm': ['0.8125rem', { lineHeight: '1.5' }],
        'base': ['0.9375rem', { lineHeight: '1.6' }],
        'lg': ['1.0625rem', { lineHeight: '1.5' }],
        'xl': ['1.125rem', { lineHeight: '1.4' }],
        '2xl': ['1.375rem', { lineHeight: '1.3' }],
        '3xl': ['1.625rem', { lineHeight: '1.25' }],
        '4xl': ['1.875rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}
