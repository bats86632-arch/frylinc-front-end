/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'pulse-shadow': 'pulse-shadow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-shadow': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)',
          },
        },
        'bounce-subtle': {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-5px)',
          },
        },
      },
    },
  },
  plugins: [],
};
