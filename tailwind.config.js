/** @type {import('tailwindcss').Config} */
import defaultColors from 'tailwindcss/colors';

// ---------------------------------------------------------------
// SRTNote palette
// The UI is written with stock Tailwind names (slate / blue / indigo /
// purple / cyan …). Re-mapping those scales here re-themes the whole app
// in one place:
//   slate  → graphite: a softer, less saturated neutral than navy slate
//   blue   → iris: the single primary accent
//   indigo → iris (so blue→indigo gradients become one calm hue)
//   purple → violet: AI / summary accent, cooler and less neon
//   cyan   → teal: mind-map accent, harmonises with iris
// ---------------------------------------------------------------
const graphite = {
  50: '#f6f7f9',
  100: '#eceef2',
  200: '#dcdfe5',
  300: '#c2c7d0',
  400: '#9aa1ae',
  500: '#717887',
  600: '#555b69',
  700: '#3d424d',
  800: '#2a2e36',
  850: '#21242b',
  900: '#191b21',
  950: '#111317'
};

const iris = {
  50: '#eef1ff',
  100: '#e0e5ff',
  200: '#c6cfff',
  300: '#a4b1fd',
  400: '#8392f8',
  500: '#6674ef',
  600: '#5159e0',
  700: '#4447c4',
  800: '#383b9e',
  900: '#31357d',
  950: '#1e1f49'
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: graphite,
        blue: iris,
        indigo: iris,
        purple: defaultColors.violet,
        cyan: defaultColors.teal,
        // Theme-aware aliases backed by CSS variables in src/index.css
        app: 'rgb(var(--c-app) / <alpha-value>)',
        panel: {
          DEFAULT: 'rgb(var(--c-panel) / <alpha-value>)',
          raised: 'rgb(var(--c-panel-raised) / <alpha-value>)'
        },
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          strong: 'rgb(var(--c-line-strong) / <alpha-value>)'
        },
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          muted: 'rgb(var(--c-ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--c-ink-subtle) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          alt: 'rgb(var(--c-accent-alt) / <alpha-value>)'
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f7',
          500: '#0e8ce9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b84',
          900: '#0c3f6e',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
