/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#18181b', light: '#27272a', faint: '#71717a' },
        paper: { DEFAULT: '#ffffff', faint: '#fafafa', grid: '#e4e4e7' },
        primary: {
          50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
          400: '#a1a1aa', 500: '#18181b', 600: '#09090b', 700: '#000000',
          800: '#000000', 900: '#000000', 950: '#000000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Space Mono', 'monospace'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
        display: ['Inter', 'Space Mono', 'sans-serif'],
        hand: ['Space Mono', 'monospace'],
      },
      borderWidth: { wire: '1px' },
    },
  },
  plugins: [],
}
