/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./zapisy/**/*.html",
    "./oferta/**/*.html",
    "./dokumenty/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
