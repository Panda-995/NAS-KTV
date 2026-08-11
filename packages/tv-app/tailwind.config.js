/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-2': 'var(--color-paper-2)',
        'paper-3': 'var(--color-paper-3)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        'ink-3': 'var(--color-ink-3)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-active': 'var(--color-accent-active)',
        'accent-soft': 'var(--color-accent-soft)',
        'accent-2': 'var(--color-accent-2)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
        focus: 'var(--color-focus)',
        loading: 'var(--color-loading)',
        border: 'var(--color-border)'
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)'
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
        '5xl': 'var(--space-5xl)'
      },
      fontSize: {
        sm: ['var(--text-sm)', { lineHeight: '1.5' }],
        base: ['var(--text-base)', { lineHeight: '1.5' }],
        lg: ['var(--text-lg)', { lineHeight: '1.4' }],
        xl: ['var(--text-xl)', { lineHeight: '1.3' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.2' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.15' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '1.1' }],
        '5xl': ['var(--text-5xl)', { lineHeight: '1.05' }]
      },
      transitionTimingFunction: {
        'out': 'var(--ease-out)',
        'in': 'var(--ease-in)',
        'in-out': 'var(--ease-in-out)'
      },
      transitionDuration: {
        'fast': 'var(--dur-fast)',
        'base': 'var(--dur-base)',
        'slow': 'var(--dur-slow)'
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)'
      }
    }
  },
  plugins: []
};
