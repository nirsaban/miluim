import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
    },
  },
  plugins: [],
};

export default config;
