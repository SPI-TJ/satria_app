import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Transjakarta corporate blue palette
        primary: {
          50:  '#EFF8FF',
          100: '#DBEFFE',
          200: '#BAE0FD',
          300: '#7CC8FB',
          400: '#38A8F5',
          500: '#0E8EE2',
          600: '#006CB7',  // Transjakarta primary blue
          700: '#0058A0',
          800: '#004780',
          900: '#003660',
          950: '#002244',
        },
        // Transjakarta secondary — teal/cyan accent
        tj: {
          red:   '#E82027',  // Transjakarta logo red
          blue:  '#006CB7',  // Corporate blue
          navy:  '#003660',  // Deep navy
          light: '#E8F4FD',  // Light blue background
        },
      },
      fontFamily: {
        sans: ['PT Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
