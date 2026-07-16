/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        accentLight: 'var(--color-accent-light)',
        success: 'var(--color-success)',
        textMain: 'var(--color-text-main)',
        textMuted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        surface: 'var(--color-surface)',
        surfaceMuted: 'var(--color-surface-muted)',
        background: 'var(--color-bg)',
        backgroundLight: 'var(--color-bg-light)',
        // Legacy colors used in Devis
        navy: 'var(--color-primary)',
        navyClair: 'var(--color-surface-muted)',
        bleu: '#2563EB',
        rouge: '#DC2626',
        rougeClair: '#FEE2E2',
        vert: '#16A34A',
        orange: '#EA580C',
        argent: '#E2E8F0',
      },
    },
  },
  plugins: [],
}
