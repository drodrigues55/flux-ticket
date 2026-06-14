/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        cosmic: {
          dark: '#121212',
          slate: '#1E1E1E',
          neon: '#00E5FF',
          grey: '#2C2C2C',
        }
      },
    },
  },
  plugins: [],
}
