/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "secondary-fixed-dim": "#4edea3",
        "on-tertiary": "#68000a",
        "surface-tint": "#adc6ff",
        "outline-variant": "#424754",
        "outline": "#8c909f",
        "error": "#ffb4ab",
        "background": "#0e1322",
        "surface-container-lowest": "#090e1c",
        "on-tertiary-container": "#5c0008",
        "surface-container-highest": "#2f3445",
        "inverse-on-surface": "#2b3040",
        "on-error": "#690005",
        "on-primary-container": "#00285d",
        "on-primary": "#002e6a",
        "inverse-primary": "#005ac2",
        "surface-container": "#1a1f2f",
        "primary-fixed": "#d8e2ff",
        "surface-bright": "#343949",
        "tertiary": "#ffb3ad",
        "primary-fixed-dim": "#adc6ff",
        "on-tertiary-fixed": "#410004",
        "tertiary-fixed-dim": "#ffb3ad",
        "on-primary-fixed-variant": "#004395",
        "surface": "#0e1322",
        "tertiary-container": "#ff5451",
        "surface-variant": "#2f3445",
        "error-container": "#93000a",
        "on-surface": "#dee1f7",
        "on-secondary-fixed": "#002113",
        "on-secondary-fixed-variant": "#005236",
        "primary-container": "#4d8eff",
        "secondary": "#4edea3",
        "on-error-container": "#ffdad6",
        "on-secondary": "#003824",
        "surface-dim": "#0e1322",
        "on-primary-fixed": "#001a42",
        "secondary-fixed": "#6ffbbe",
        "tertiary-fixed": "#ffdad7",
        "secondary-container": "#00a572",
        "on-secondary-container": "#00311f",
        "surface-container-high": "#25293a",
        "primary": "#adc6ff",
        "on-tertiary-fixed-variant": "#930013",
        "on-background": "#dee1f7",
        "on-surface-variant": "#c2c6d6",
        "surface-container-low": "#161b2b",
        "inverse-surface": "#dee1f7"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "margin": "32px",
        "xl": "80px",
        "base": "8px",
        "sm": "12px",
        "lg": "48px",
        "gutter": "24px",
        "md": "24px",
        "xs": "4px"
      },
      "fontFamily": {
        "headline-lg": ["Outfit"],
        "headline-md": ["Outfit"],
        "label-sm": ["Inter"],
        "label-md": ["Inter"],
        "body-md": ["Inter"],
        "body-lg": ["Inter"]
      },
      "fontSize": {
        "headline-lg": ["32px", {"lineHeight": "40px", "fontWeight": "600"}],
        "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "500"}],
        "label-md": ["14px", {"lineHeight": "20px", "fontWeight": "500"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}]
      },
      animation: {
        'pulse-alarm': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-shadow': 'pulse-shadow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)', borderColor: 'rgba(239, 68, 68, 0.4)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(239, 68, 68, 0.6)', borderColor: 'rgba(239, 68, 68, 0.8)' },
        },
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
