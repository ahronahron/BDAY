/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F0F5F2',
          100: '#E8F0EC',
          200: '#D0DFD6',
          300: '#A8C5B5',
          400: '#7BA893',
          500: '#4A6B5D',
          600: '#3A5A4A',
          700: '#2D4A3E',
          800: '#1F3329',
          900: '#14241D',
        },
        cream: {
          50: '#FFFDF9',
          100: '#FAF8F5',
          200: '#F5F1EA',
          300: '#EDE8DE',
        },
        mint: {
          100: '#E8F0EC',
          200: '#D5E5DC',
          300: '#C2DACC',
        },
        accent: {
          gold: '#C9A961',
          rose: '#D4727A',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'heart-pop': 'heartPop 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        heartPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
