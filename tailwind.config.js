/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        accent: '#1e6b8a',
      },
      fontSize: {
        'display-lg': ['2.5rem',  { lineHeight: '1.08', letterSpacing: '-0.03em',  fontWeight: '600' }],
        'display':    ['2rem',    { lineHeight: '1.12', letterSpacing: '-0.025em', fontWeight: '600' }],
        'title':      ['1.5rem',  { lineHeight: '1.22', letterSpacing: '-0.02em',  fontWeight: '600' }],
        'subtitle':   ['1.125rem',{ lineHeight: '1.35', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'body-lg':    ['0.9375rem',{ lineHeight: '1.65', fontWeight: '400' }],
        'body':       ['0.875rem', { lineHeight: '1.65', fontWeight: '400' }],
        'caption':    ['0.75rem',  { lineHeight: '1.5',  fontWeight: '500' }],
        'micro':      ['0.6875rem',{ lineHeight: '1.4',  fontWeight: '600' }],
      },
      spacing: {
        'micro': '4px',
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
        'xxxl': '64px',
      },
      borderRadius: {
        'card': '8px',
        'element': '6px',
        'small': '4px',
        'pill': '9999px',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.3)',
        'elevation-2': '0 4px 12px rgba(0,0,0,0.35)',
        'elevation-3': '0 8px 24px rgba(0,0,0,0.4)',
        'panel':       '0 1px 3px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in': 'fade-in 180ms ease both',
        'fade-in-up': 'fade-in-up 200ms ease both',
        'slide-up': 'slide-up 200ms ease both',
        'scale-in': 'scale-in 150ms ease both',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      backdropBlur: {
        'xs': '4px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
      },
      transitionTimingFunction: {
        'smooth': 'ease',
      },
    },
  },
  plugins: [],
};
