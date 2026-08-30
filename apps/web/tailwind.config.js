/**
 * SellerHub — пресет Tailwind.
 *
 * Значения здесь НЕ задаются — они ссылаются на токены из
 * src/styles/tokens.css. Благодаря этому тёмная тема работает
 * сама собой: меняется токен — меняется всё, где он использован.
 *
 * Не добавляй сюда hex-значения. Новый цвет — сначала токен.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          active:  'var(--accent-active)',
          soft:    'var(--accent-soft)',
          border:  'var(--accent-border)',
          on:      'var(--on-accent)',
        },
        ground:  'var(--ground)',
        surface: {
          DEFAULT: 'var(--surface)',
          sunken:  'var(--surface-sunken)',
          hover:   'var(--surface-hover)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong:  'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          muted:   'var(--text-muted)',
          faint:   'var(--text-faint)',
        },
        ok:     { DEFAULT: 'var(--ok)',     soft: 'var(--ok-soft)' },
        warn:   { DEFAULT: 'var(--warn)',   soft: 'var(--warn-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
        info:   { DEFAULT: 'var(--info)',   soft: 'var(--info-soft)' },
        mp: {
          uzum: 'var(--mp-uzum)',
          wb:   'var(--mp-wb)',
          ozon: 'var(--mp-ozon)',
          ym:   'var(--mp-ym)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar-bg)',
          text:    'var(--sidebar-text)',
          hover:   'var(--sidebar-hover)',
          active:  'var(--sidebar-active)',
          mark:    'var(--sidebar-mark)',
        },
      },
      spacing: {
        1: 'var(--sp-1)',  2: 'var(--sp-2)',  3: 'var(--sp-3)',
        4: 'var(--sp-4)',  5: 'var(--sp-5)',  6: 'var(--sp-6)',
        8: 'var(--sp-8)', 10: 'var(--sp-10)', 12: 'var(--sp-12)',
      },
      borderRadius: {
        sm:   'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md:   'var(--r-md)',
        lg:   'var(--r-lg)',
        full: 'var(--r-full)',
      },
      boxShadow: {
        sm:    'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        focus: 'var(--focus)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans:    'var(--font-body)',
        mono:    'var(--font-mono)',
      },
    },
  },
  plugins: [],
}
