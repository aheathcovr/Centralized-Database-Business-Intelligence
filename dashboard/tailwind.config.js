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
        sans: ['var(--font-fira-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'ui-monospace', 'monospace'],
      },
      colors: {
        'covr-blue': '#1e40af',
        'covr-teal': '#0d9488',
        'covr-green': '#059669',
        'covr-gray': '#64748b',
      },
    },
  },
  plugins: [],
};