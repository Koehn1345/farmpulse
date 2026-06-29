/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        soil: {
          50:  '#fdf8f0',
          100: '#f9eddb',
          200: '#f1d9b5',
          300: '#e6bf85',
          400: '#d99f54',
          500: '#c8832f',
          600: '#b36a22',
          700: '#94521d',
          800: '#78421f',
          900: '#63371c',
        },
        slate: {
          750: '#2d3748',
          850: '#1a2236',
          950: '#0f1623',
        }
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
