import type { Config } from "tailwindcss";

const config: Config = {
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
        // Notion-inspired neutral palette
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F6F3',
          tertiary: '#EFEEEB',
          hover: '#E9E8E6',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FAFAF9',
          muted: '#F5F5F4',
        },
        text: {
          primary: '#37352F',
          secondary: '#787774',
          tertiary: '#9B9A97',
          placeholder: '#C7C7C5',
        },
        border: {
          DEFAULT: 'rgba(55, 53, 47, 0.09)',
          light: 'rgba(55, 53, 47, 0.06)',
          medium: 'rgba(55, 53, 47, 0.12)',
          dark: 'rgba(55, 53, 47, 0.16)',
        },
        // Subtle agent colors (Notion-inspired)
        sage: {
          50: '#F1F5F0',
          100: '#E1EBD9',
          200: '#C3D6B3',
          300: '#A5C28D',
          400: '#7FA764',
          500: '#5F8A48',
          600: '#4A6D38',
          700: '#3A542C',
          800: '#2D4123',
          900: '#23341C',
        },
        clay: {
          50: '#F7F4F1',
          100: '#EDE7DF',
          200: '#DBCFBF',
          300: '#C9B79F',
          400: '#B79F7F',
          500: '#9D8565',
          600: '#7D6A50',
          700: '#615340',
          800: '#4A3F32',
          900: '#3A3228',
        },
        sky: {
          50: '#F0F5FA',
          100: '#E0EBF5',
          200: '#C1D7EB',
          300: '#A2C3E1',
          400: '#83AFD7',
          500: '#6699C8',
          600: '#5180AC',
          700: '#3F6588',
          800: '#304D67',
          900: '#253B4F',
        },
        honey: {
          50: '#FAF7F2',
          100: '#F4EDE0',
          200: '#E9DBC1',
          300: '#DDC9A2',
          400: '#D2B783',
          500: '#C19F5F',
          600: '#A1824C',
          700: '#7D653C',
          800: '#5E4B2E',
          900: '#473923',
        },
        lavender: {
          50: '#F5F4F8',
          100: '#E8E6EF',
          200: '#D1CDDF',
          300: '#BAB4CF',
          400: '#A39BBF',
          500: '#8B7FAC',
          600: '#72678E',
          700: '#59506F',
          800: '#433D54',
          900: '#332E40',
        },
        indigo: {
          50: '#F0F2F9',
          100: '#E0E4F2',
          200: '#C1C9E5',
          300: '#A2AED8',
          400: '#8393CB',
          500: '#6478BB',
          600: '#4F5FA0',
          700: '#3D4A7D',
          800: '#2E385D',
          900: '#232A46',
        },
        // Minimal status colors
        success: {
          DEFAULT: '#0F766E',
          light: '#F0FDF9',
          dark: '#134E48',
        },
        warning: {
          DEFAULT: '#CA8A04',
          light: '#FEFCE8',
          dark: '#854D0E',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
          dark: '#991B1B',
        },
        info: {
          DEFAULT: '#2563EB',
          light: '#EFF6FF',
          dark: '#1E40AF',
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
        'notion': 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px',
        'notion-sm': 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 2px 4px',
        'notion-hover': 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 5px 10px, rgba(15, 15, 15, 0.2) 0px 15px 40px',
        'inner-notion': 'inset rgba(15, 15, 15, 0.1) 0px 0px 0px 1px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
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
