/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      colors: {
        /* APL brand */
        'apl-teal':       '#1e5c6e',
        'apl-teal-light': '#2a7a90',
        'apl-teal-dark':  '#154552',
        'apl-gold':       '#c9923a',
        'apl-gold-light': '#e0aa55',
        'apl-gold-dark':  '#a87530',
        /* Lineone navy */
        navy: {
          50:  '#e7e9ef',
          100: '#c2c9d6',
          200: '#a3adc2',
          300: '#697a9b',
          400: '#5c6b8a',
          450: '#465675',
          500: '#384766',
          600: '#313e59',
          700: '#26334d',
          750: '#222e45',
          800: '#202b40',
          900: '#192132',
        },
        /* Forest / vanilla aliases kept for backward compat */
        forest: {
          400: '#2a7a90',
          500: '#1e5c6e',
          600: '#154552',
        },
        vanilla: {
          300: '#e0aa55',
          400: '#c9923a',
          500: '#a87530',
        },
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'soft': '0 3px 10px 0 rgba(48,46,56,0.06)',
        'apl':  '0 4px 16px rgba(30,92,110,0.25)',
        'gold': '0 4px 16px rgba(201,146,58,0.25)',
      },
    },
  },
  plugins: [],
};
