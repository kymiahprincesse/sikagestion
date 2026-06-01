/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A3A8F',
        secondary: '#4A6DB5',
        accent: '#E60000',
        navy: '#1A3A8F',
        'navy-light': '#4A6DB5',
        navyClair: '#E8ECF4',
        bleu: '#4A6DB5',
        orange: '#E60000',
        orangeClair: '#FFE6E6',
        rouge: '#E60000',
        vert: '#1A7A4A',
        argent: '#C8C8D0',
      },
    },
  },
  plugins: [],
}
