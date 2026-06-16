/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#FF3200',
          hover: '#E62D00',
          active: '#CC2800'
        },
        cosmic: {
          dark: '#FAFAFA',
          slate: '#FFFFFF',
          neon: '#FF3200',
          grey: '#EAEAEA',
          border: '#DCDCDC',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
