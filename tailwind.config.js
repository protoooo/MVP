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
        // Superbase-Inspired Light Theme Colors
        primary: {
          DEFAULT: '#4A90E2', // Soft primary blue
          dark: '#357ABD',    // Darker for hover
          light: '#6BA3E8',   // Lighter for backgrounds
          50: '#EBF4FC',
          100: '#D7E9F9',
          600: '#4A90E2',
          700: '#357ABD',
          800: '#2A6399',
        },
        secondary: {
          DEFAULT: '#059669', // Success green
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#059669',
          700: '#047857',
        },
        accent: {
          DEFAULT: '#F59E0B', // Warm amber
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#F59E0B',
          700: '#D97706',
        },
        // Background colors
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#FAFAF0',
        'bg-tertiary': '#F8F9FA',
        // Border colors
        'border-default': '#E0E0E0',
        'border-light': '#F0F0F0',
        'border-dark': '#D0D0D0',
        // Text colors
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
        'text-tertiary': '#999999',
        // Legacy support
        slate: {
          DEFAULT: '#1A1A1A',
          50: '#F8F9FA',
          100: '#F1F3F4',
          200: '#E0E0E0',
          600: '#666666',
          900: '#1A1A1A',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        base: ['16px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        lg: ['17px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
        md: '0 4px 8px rgba(0, 0, 0, 0.08)',
        lg: '0 8px 16px rgba(0, 0, 0, 0.1)',
        pill: '0 2px 8px rgba(74, 144, 226, 0.15)',
        'pill-hover': '0 4px 12px rgba(74, 144, 226, 0.25)',
        soft: '0 1px 3px rgba(0, 0, 0, 0.06)',
        medium: '0 4px 8px rgba(0, 0, 0, 0.08)',
        strong: '0 8px 16px rgba(0, 0, 0, 0.1)',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
}
