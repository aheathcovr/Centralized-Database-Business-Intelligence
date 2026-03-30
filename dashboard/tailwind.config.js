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
        sans: ['Space Grotesk', 'var(--font-fira-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'var(--font-fira-sans)', 'sans-serif'],
      },
      colors: {
        canvas: '#070b14',
        surface: '#0d1321',
        card: '#111a2e',
        'card-hover': '#152038',
        elevated: '#1a2540',
        accent: {
          DEFAULT: '#22d3ee',
          dim: '#0891b2',
          glow: 'rgba(34, 211, 238, 0.12)',
          'glow-strong': 'rgba(34, 211, 238, 0.25)',
        },
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        glow: '0 0 20px rgba(34, 211, 238, 0.12)',
      },
    },
  },
  plugins: [],
};
