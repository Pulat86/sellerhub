import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-md ' +
  'border border-transparent cursor-pointer transition-colors disabled:opacity-45 ' +
  'disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active',
  secondary: 'bg-surface text-ink border-line-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'md' | 'sm'
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: Props) {
  const sizing = size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-[13px] px-4 py-2'
  return <button className={`${base} ${variants[variant]} ${sizing} ${className}`} {...rest} />
}
