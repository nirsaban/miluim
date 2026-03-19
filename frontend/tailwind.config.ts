import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        military: {
          50: '#f4f6f0',
          100: '#e5eadb',
          200: '#ccd7b8',
          300: '#adc08d',
          400: '#8fa866',
          500: '#728f4a',
          600: '#5a7339',
          700: '#4a5d23',
          800: '#3d4b1f',
          900: '#343f1d',
          950: '#1a210d',
        },
        olive: {
          DEFAULT: '#4a5d23',
          light: '#5a7339',
          dark: '#3d4b1f',
        },
      },
      fontFamily: {
        sans: ['Rubik', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
