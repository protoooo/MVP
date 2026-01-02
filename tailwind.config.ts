import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Supabase-inspired dark theme colors
        brand: {
          DEFAULT: '#3ECF8E',
          50: '#E6F9F2',
          100: '#CCF4E5',
          200: '#99E9CB',
          300: '#66DEB1',
          400: '#3ECF8E',
          500: '#24B574',
          600: '#1D9460',
          700: '#16734C',
          800: '#0F5238',
          900: '#083124',
        },
        gray: {
          50: '#F8F9FA',
          100: '#EDEFF1',
          200: '#D6DBDF',
          300: '#B4BCC4',
          400: '#8A96A0',
          500: '#6B7885',
          600: '#525F6C',
          700: '#3E4A56',
          800: '#2B3640',
          900: '#1C2128',
          950: '#0D1117',
        },
        background: {
          DEFAULT: '#0D1117',
          secondary: '#161B22',
          tertiary: '#1C2128',
          hover: '#21262D',
        },
        surface: {
          DEFAULT: '#161B22',
          elevated: '#1C2128',
          muted: '#21262D',
        },
        text: {
          primary: '#E6EDF3',
          secondary: '#7D8590',
          tertiary: '#6E7681',
          placeholder: '#484F58',
        },
        border: {
          DEFAULT: '#30363D',
          light: '#21262D',
          medium: '#30363D',
          dark: '#484F58',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'dark': '0 0 0 1px rgba(48,54,61,0.6), 0 2px 4px rgba(0,0,0,0.2)',
        'dark-sm': '0 0 0 1px rgba(48,54,61,0.6), 0 1px 2px rgba(0,0,0,0.2)',
        'dark-hover': '0 0 0 1px rgba(48,54,61,0.8), 0 4px 8px rgba(0,0,0,0.3)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;
