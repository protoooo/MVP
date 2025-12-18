/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        clay: 'var(--clay)',
        accent: 'var(--accent)',
        ink: 'var(--ink)',
        'ink-80': 'var(--ink-80)',
        'ink-60': 'var(--ink-60)',
        border: 'var(--border)',
        focus: 'var(--focus)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
