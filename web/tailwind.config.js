/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',
        panel: '#fafafb',
        line: '#ececef',
        ink: '#1b1b1f',
        muted: '#71717a',
        faint: '#a1a1aa',
        accent: {
          DEFAULT: '#2f6bf3',
          soft: '#eef3ff',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,17,26,0.04), 0 1px 3px rgba(16,17,26,0.06)',
        pop: '0 8px 30px rgba(16,17,26,0.12)',
      },
      borderRadius: {
        md: '8px',
      },
    },
  },
  plugins: [],
};
