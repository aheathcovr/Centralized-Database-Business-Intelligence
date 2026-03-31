/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Hepta Slab', 'Georgia', 'Times New Roman', 'serif'],
        display: ['Hepta Slab', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#FFFFFF',
        surface: '#F8F9FA',
        card: '#FFFFFF',
        'card-hover': '#F1F3F5',
        elevated: '#EDF2F7',
        accent: {
          DEFAULT: '#1570B6',
          dim: '#26A2DC',
          light: '#45C6EF',
          glow: 'rgba(21, 112, 182, 0.12)',
          'glow-strong': 'rgba(21, 112, 182, 0.25)',
        },
        navy: {
          DEFAULT: '#283242',
          mid: '#696F7B',
          light: '#CBCED2',
        },
        orange: {
          DEFAULT: '#F47C44',
          mid: '#F6966A',
          light: '#FBCAB4',
        },
        purple: {
          DEFAULT: '#A67FB9',
          mid: '#C49FCA',
          light: '#D6BED7',
        },
        green: {
          DEFAULT: '#3B7E6B',
          mid: '#74C7AD',
          light: '#9DD6C9',
        },
        pink: {
          DEFAULT: '#F6A0AC',
          mid: '#F9BECB',
          light: '#FCDBE2',
        },
        'text-primary': '#283242',
        'text-secondary': '#696F7B',
        'text-muted': '#9CA3AF',
      },
      boxShadow: {
        card: '0 1px 3px rgba(40, 50, 66, 0.06), 0 1px 2px rgba(40, 50, 66, 0.04)',
        'card-hover': '0 4px 12px rgba(40, 50, 66, 0.08), 0 1px 3px rgba(40, 50, 66, 0.06)',
        glow: '0 0 16px rgba(21, 112, 182, 0.12)',
      },
    },
  },
  plugins: [],
};
