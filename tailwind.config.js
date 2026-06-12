/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['Space Grotesk', 'Outfit', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: '#e8173a',
      },
      fontSize: {
        'display-lg': ['2.5rem',  { lineHeight: '1.08', letterSpacing: '-0.03em',  fontWeight: '700' }],
        'display':    ['2rem',    { lineHeight: '1.12', letterSpacing: '-0.025em', fontWeight: '700' }],
        'title':      ['1.5rem',  { lineHeight: '1.22', letterSpacing: '-0.02em',  fontWeight: '700' }],
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
        'card': '14px',
        'element': '10px',
        'small': '6px',
        'pill': '9999px',
      },
      boxShadow: {
        'elevation-1': '0 1px 2px rgba(0,0,0,0.5)',
        'elevation-2': '0 4px 16px rgba(0,0,0,0.55)',
        'elevation-3': '0 12px 40px rgba(0,0,0,0.65)',
        'panel':       '0 0 0 1px rgba(255,255,255,0.07), 0 4px 16px rgba(0,0,0,0.5)',
        'glow-red':    '0 0 16px rgba(232,23,58,0.20)',
      },
      animation: {
        'pulse-shadow': 'pulse-shadow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 2.5s ease-in-out infinite',
        'fade-in': 'fade-in 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-up': 'fade-in-up 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'ember-float': 'ember-float 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-shadow': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.34), 0 18px 48px rgba(0, 0, 0, 0.32)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(239, 68, 68, 0), 0 18px 48px rgba(0, 0, 0, 0.32)',
          },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
          '50%': { transform: 'translateX(-50%) translateY(-6px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'ember-float': {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.4' },
          '50%': { transform: 'translateY(-20px) scale(1.1)', opacity: '0.8' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '0.4' },
          '100%': { transform: 'scale(0.95)', opacity: '0.8' },
        },
      },
      backdropBlur: {
        'xs': '4px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
