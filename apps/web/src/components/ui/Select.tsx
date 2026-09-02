import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  hint?: string
  error?: string
}

/**
 * Список выбора. Повторяет разметку Field, чтобы подпись и поле
 * выглядели одинаково в одной форме.
 */
export function Select({ label, hint, error, id, className = '', children, ...rest }: Props) {
  const selectId = id ?? `s-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
      >
        {label}
      </label>
      <select
        id={selectId}
        className={
          'w-full rounded-md border bg-surface px-3 py-2 text-ink transition-colors ' +
          'focus:border-accent ' +
          (error ? 'border-danger ' : 'border-line-strong hover:border-ink-faint ') +
          className
        }
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-muted">{hint}</span>
      ) : null}
    </div>
  )
}
