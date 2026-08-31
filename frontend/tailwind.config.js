/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf6f0',   // Warm skin cream
          100: '#f4ebd8',  // Soft almond / beige
          200: '#e9d5b0',  // Warm tan skin tone
          300: '#dbb981',  // Honey beige
          400: '#cb9a56',  // Warm camel / ochre
          500: '#b77a33',  // Cozy ginger / caramel
          600: '#9b5f25',  // Rich chestnut / terracotta
          700: '#7d491c',  // Dark clay / copper
          800: '#613515',  // Deep coffee
          900: '#47240f',  // Rich dark umber
          950: '#230f05',  // Warm black / espresso
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
