/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  // Fixed light theme: no dark mode toggling
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Charte Terre & Registre
        terre: {
          primary: '#352638',    // Encre aubergine
          'primary-hover': '#4A354D',
          secondary: '#AD5138',  // Argile rouge
          accent: '#D8DF72',     // Citron confit
          bg: '#F5F0E7',         // Ivoire de fibre (fond général)
          surface: '#FFFCF6',    // Papier (cartes, formulaires, menus)
          muted: '#70656B',      // Prune grisée (texte secondaire)
          border: '#D8CEC4',     // Lin (séparateurs, contours discrets)
          ring: '#96878E',       // Prune minérale (contour de champs)
          tint: '#EAE2EB',       // Fond teinté aubergine doux
          status: {
            verified: '#435432',
            verifiedBg: '#E5ECD9',
            warning: '#795015',
            warningBg: '#F5E8CC',
            error: '#963C47',
            errorBg: '#F8E6E8',
            progress: '#352638',
            progressBg: '#EAE2EB',
          }
        },
        // Backward compatibility mappings
        forest: {
          50: '#E5ECD9',
          100: '#E5ECD9',
          400: '#435432',
          500: '#435432',
          600: '#352638',
          700: '#352638',
        },
        vanilla: {
          400: '#795015',
          500: '#795015',
          600: '#AD5138',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        btn: '6px',
        card: '8px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(53, 38, 56, 0.05)',
        dropdown: '0 4px 16px rgba(53, 38, 56, 0.08)',
        modal: '0 8px 30px rgba(53, 38, 56, 0.14)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
