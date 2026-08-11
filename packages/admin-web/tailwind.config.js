/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: 'var(--color-paper)', 2: 'var(--color-paper-2)', 3: 'var(--color-paper-3)' },
        ink: { DEFAULT: 'var(--color-ink)', 2: 'var(--color-ink-2)', 3: 'var(--color-ink-3)' },
        accent: { DEFAULT: 'var(--color-accent)', hover: 'var(--color-accent-hover)', soft: 'var(--color-accent-soft)' },
        border: { DEFAULT: 'var(--color-border)', strong: 'var(--color-border-strong)' },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        black: 'var(--color-black)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        'in-out': 'var(--ease-in-out)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    }
  },
  plugins: []
};
