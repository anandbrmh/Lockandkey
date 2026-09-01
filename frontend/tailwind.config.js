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
        // Wireframe palette - monochrome blueprint
        ink: {
          DEFAULT: '#111111',
          light: '#2d2d2d',
          faint: '#6b7280',
        },
        paper: {
          DEFAULT: '#ffffff',
          faint: '#f9fafb',
          grid: '#e5e7eb',
        },
        wire: {
          border: '#111111',
          dashed: '#9ca3af',
          placeholder: '#f3f4f6',
        },
        // keep primary as ink for compat
        primary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#111111',
          600: '#000000',
          700: '#000000',
          800: '#000000',
          900: '#000000',
          950: '#000000',
        },
      },
      fontFamily: {
        sans: ['Space Mono', 'JetBrains Mono', 'monospace'],
        display: ['Architects Daughter', 'Caveat', 'cursive'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
        hand: ['Caveat', 'Architects Daughter', 'cursive'],
      },
      borderWidth: {
        'wire': '2px',
        'wire-thick': '3px',
      },
      boxShadow: {
        'wire': '4px 4px 0 0 #111111',
        'wire-sm': '2px 2px 0 0 #111111',
        'wire-lg': '6px 6px 0 0 #111111',
      },
      backgroundImage: {
        'grid': "linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)",
        'grid-dark': "linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}
