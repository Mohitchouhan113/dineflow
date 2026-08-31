/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#12100E', // warm espresso charcoal
        surface: '#181512',
        'surface-elevated': '#211D19',
        'surface-higher': '#25201B',
        primary: '#f59e0b', // warm amber / burnt orange
        'primary-hover': '#ea580c',
        secondary: '#f7e7ce', // soft cream / champagne
        success: '#10b981',
        text: {
          primary: '#fcf8f2', // warm off-white
          secondary: '#d1c7bd', // warm gray
          muted: '#9e9389'
        },
        border: 'rgba(255, 190, 100, 0.10)', // soft warm border
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
