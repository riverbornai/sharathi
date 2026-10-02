/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Riverborn brand palette
        forest: '#0D2B22',
        midnight: '#060F0C',
        lime: '#D4F53C',
        frost: '#F2FFEE',
        mist: '#9FCEBE',
        surface: {
          base: '#060F0C',
          panel: 'rgba(13, 43, 34, 0.55)',
          header: 'rgba(6, 15, 12, 0.85)',
          raised: 'rgba(15, 46, 37, 0.7)',
        },
        border: 'rgba(242, 255, 238, 0.08)',
        accent: {
          DEFAULT: '#D4F53C',
          light: '#e2ff6b',
          dark: '#a9c62c',
          glow: 'rgba(212, 245, 60, 0.35)',
        },
        platform: {
          fb: '#1877f2',
          ig: '#e1306c',
          wa: '#25d366',
          tg: '#0088cc',
        },
      },
      fontFamily: {
        sans: ['Sora', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'msg-in': 'msgIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-dot': 'typingBounce 1.4s infinite ease-in-out both',
      },
      keyframes: {
        msgIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        typingBounce: {
          '0%, 80%, 100%': { transform: 'scale(0.6)' },
          '40%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
