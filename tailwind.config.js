/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7ff',
          100: '#dbeafe',
          500: '#1e5fa8',
          600: '#1a4f8f',
          700: '#163f73',
          900: '#0d2545',
        },
      },
    },
  },
  plugins: [],
}
