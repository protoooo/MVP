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
        // Premium Light Theme Colors
        primary: {
          DEFAULT: '#1e40af', // Deep blue - trustworthy, official
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#1e40af',
          700: '#1e3a8a',
        },
        secondary: {
          DEFAULT: '#059669', // Emerald - success, verification
          50: '#ecfdf5',
          100: '#d1fae5',
          600: '#059669',
          700: '#047857',
        },
        accent: {
          DEFAULT: '#d97706', // Amber - warnings, attention
          50: '#fffbeb',
          100: '#fef3c7',
          600: '#d97706',
          700: '#b45309',
        },
        slate: {
          DEFAULT: '#0f172a', // Primary text
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          600: '#64748b', // Secondary text
          900: '#0f172a',
        },
        // Legacy colors for compatibility
        cream: '#FFFDF7',
        'matte-blue': '#1e40af',
        'dark-gray': '#0f172a',
        'medium-gray': '#64748b',
        'light-gray': '#e2e8f0',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Inter',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        // Mobile: 16px base, Desktop: 18px base
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.6' }],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'lift': '0 4px 12px rgba(30, 64, 175, 0.15)',
        'lift-lg': '0 8px 24px rgba(30, 64, 175, 0.2)',
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
    },
  },
  plugins: [],
}
