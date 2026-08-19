/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B1220',
          50: '#F3F5F8',
          100: '#E3E7EE',
          200: '#C3CAD8',
          300: '#96A1B8',
          400: '#616F8C',
          500: '#3E4A63',
          600: '#2B3549',
          700: '#1D2536',
          800: '#131A28',
          900: '#0B1220',
        },
        paper: {
          DEFAULT: '#F6F7F5',
          dim: '#EDEFEA',
        },
        ledger: {
          DEFAULT: '#0E6E5F',
          50: '#E7F3F0',
          100: '#C7E4DC',
          200: '#95CABB',
          300: '#5EAA96',
          400: '#33886F',
          500: '#0E6E5F',
          600: '#0B5A4E',
          700: '#09473E',
          800: '#06342E',
          900: '#04231F',
        },
        gold: {
          DEFAULT: '#C08A2E',
          50: '#FBF3E4',
          100: '#F3E0BB',
          200: '#E6C078',
          300: '#D6A548',
          400: '#C08A2E',
          500: '#9E7025',
          600: '#7C581D',
        },
        brick: {
          DEFAULT: '#B34630',
          50: '#F8E9E5',
          100: '#EFC7BB',
          200: '#DE9986',
          300: '#CB6C51',
          400: '#B34630',
          500: '#8F3625',
          600: '#6D291C',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.04), 0 4px 16px rgba(11,18,32,0.06)',
        popover: '0 8px 30px rgba(11,18,32,0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'ledger-lines':
          'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(11,18,32,0.05) 28px)',
      },
    },
  },
  plugins: [],
};
