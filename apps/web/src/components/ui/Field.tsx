import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function Field({ label, hint, error, id, className = '', ...rest }: Props) {
  const inputId = id ?? `f-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-faint"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={
          'w-full rounded-md border bg-surface px-3 py-2 text-ink transition-colors ' +
          'placeholder:text-ink-faint focus:border-accent ' +
          (error ? 'border-danger ' : 'border-line-strong hover:border-ink-faint ') +
          className
        }
        {...rest}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-muted">{hint}</span>
      ) : null}
    </div>
  )
}
