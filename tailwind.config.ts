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
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Neutral grayscale palette - Notion/newspaper inspired
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#FAFAFA',
          tertiary: '#F5F5F5',
          hover: '#F0F0F0',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FAFAFA',
          muted: '#F5F5F5',
        },
        text: {
          primary: '#111111',
          secondary: '#6B6B6B',
          tertiary: '#9B9B9B',
          placeholder: '#BEBEBE',
        },
        border: {
          DEFAULT: '#E6E6E6',
          light: '#F0F0F0',
          medium: '#DCDCDC',
          dark: '#C8C8C8',
        },
        // Agent-specific accent colors (ONLY for agents)
        sage: {
          50: '#F6F8F6',
          100: '#E8EDE8',
          200: '#D1DDD1',
          300: '#B4C9B4',
          400: '#8FAF8F',
          500: '#6B946B',
          600: '#567A56',
          700: '#456145',
          800: '#374E37',
          900: '#2E402E',
        },
        clay: {
          50: '#FAF7F5',
          100: '#F2EBE6',
          200: '#E5D7CD',
          300: '#D4BBAB',
          400: '#BC9580',
          500: '#A67761',
          600: '#8B614D',
          700: '#734F3F',
          800: '#5E4136',
          900: '#4E362D',
        },
        sky: {
          50: '#F5F8FA',
          100: '#E6EFF4',
          200: '#CCE0EA',
          300: '#A8C9DC',
          400: '#7DADC8',
          500: '#5890B0',
          600: '#457393',
          700: '#385D78',
          800: '#2E4D63',
          900: '#274053',
        },
        honey: {
          50: '#FBF8F4',
          100: '#F5EDE1',
          200: '#EBD9C3',
          300: '#DCBE9D',
          400: '#C89D6E',
          500: '#B58048',
          600: '#9A6838',
          700: '#7E532E',
          800: '#68442A',
          900: '#573827',
        },
        lavender: {
          50: '#F8F7FA',
          100: '#EFEDF3',
          200: '#DFD9E8',
          300: '#C8BDD7',
          400: '#AB9AC0',
          500: '#8F7AA7',
          600: '#75618B',
          700: '#604F72',
          800: '#4F425F',
          900: '#42374F',
        },
        // Neutral status colors (grayscale-based)
        success: {
          DEFAULT: '#2D3748',
          light: '#E6E6E6',
          dark: '#1A202C',
        },
        warning: {
          DEFAULT: '#6B6B6B',
          light: '#F0F0F0',
          dark: '#4A4A4A',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#991B1B',
        },
        info: {
          DEFAULT: '#6B6B6B',
          light: '#F0F0F0',
          dark: '#4A4A4A',
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
        'DEFAULT': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(43, 42, 40, 0.08), 0 1px 2px -1px rgba(43, 42, 40, 0.08)',
        'soft-md': '0 4px 6px -1px rgba(43, 42, 40, 0.08), 0 2px 4px -2px rgba(43, 42, 40, 0.08)',
        'soft-lg': '0 10px 15px -3px rgba(43, 42, 40, 0.08), 0 4px 6px -4px rgba(43, 42, 40, 0.08)',
        'soft-xl': '0 20px 25px -5px rgba(43, 42, 40, 0.08), 0 8px 10px -6px rgba(43, 42, 40, 0.08)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(43, 42, 40, 0.04)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;
