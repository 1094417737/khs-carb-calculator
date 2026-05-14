import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont',
          '"SF Pro Display"', '"SF Pro Text"',
          '"Helvetica Neue"', 'Helvetica',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'Arial', 'sans-serif',
        ],
        mono: ['"SF Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        accent: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Surface colors for dark/light cards
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1c1c1e',
          elevated: '#fafafa',
          'elevated-dark': '#2c2c2e',
        },
        // Zone warning colors (WorkOutDoors style)
        zone: {
          safe:   { light: '#34c759', dark: '#30d158' },
          caution:{ light: '#ffcc00', dark: '#ffd60a' },
          warn:   { light: '#ff9500', dark: '#ff9f0a' },
          danger: { light: '#ff3b30', dark: '#ff453a' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'card-dark': '0 0 0 0.5px rgba(255,255,255,0.08)',
        'card-hover-dark': '0 0 0 0.5px rgba(255,255,255,0.12), 0 4px 16px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
