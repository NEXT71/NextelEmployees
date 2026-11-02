/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // adjust if your files are in a different folder
  ],
  theme: {
    extend: {
      // Design tokens — see .superdesign/design-system.md
      colors: {
        ink: { DEFAULT: '#141821', soft: '#3A404C' },
        muted: '#646B78',
        line: '#E3E5EA',
        paper: '#F4F5F7',
        surface: '#FFFFFF',
        shift: { DEFAULT: '#2B59C3', soft: '#E8EEFB' },
        present: { DEFAULT: '#1E8E5A', soft: '#E6F4EC' },
        late: { DEFAULT: '#B7791F', soft: '#FBF1DF' },
        absent: { DEFAULT: '#C2412D', soft: '#FAE7E3' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        condensed: ['"IBM Plex Sans Condensed"', '"IBM Plex Sans"', 'sans-serif'],
      },
      boxShadow: {
        float: '0 8px 24px rgba(20, 24, 33, 0.12)',
      },
    },
  },
  plugins: [],
}
