/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 60-30-10 rule
        background: '#F8F9FA',
        primary: {
          DEFAULT: '#0056D2',
          dark: '#0044A8',
          light: '#3377E8',
        },
        accent: {
          DEFAULT: '#FF9F1C',
          dark: '#E08600',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
