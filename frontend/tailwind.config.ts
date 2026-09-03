import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#598bff',
          500: '#3363f5',
          600: '#1f45d9',
          700: '#1a37ae',
          800: '#1b318a',
          900: '#1c2e6d',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.1)',
        lifted: '0 12px 24px -8px rgba(16, 24, 40, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
