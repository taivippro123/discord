/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
} 