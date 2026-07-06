/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        soil: {
          50:  '#eff5f6',
          100: '#dfeaec',
          200: '#bed5da',
          300: '#97bcc3',
          400: '#5d96a2',
          500: '#3f666e',
          600: '#325157',
          700: '#273f44',
          800: '#203337',
          900: '#182727',
        },
        slate: {
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          750: '#333338',
          800: '#27272a',
          850: '#202023',
          900: '#18181b',
          950: '#09090b',
        }
      },
      fontFamily: {
        display: ['"Barlow"', 'system-ui', 'sans-serif'],
        body: ['"Barlow"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
